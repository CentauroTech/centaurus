import { format } from 'date-fns';

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  type: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  context_board?: string | null;
  context_phase?: string | null;
  user_id: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    initials: string;
    color: string;
  } | null;
}

export interface FormattedActivity {
  action: string;
  description: string;
  icon: 'ArrowRight' | 'CheckCircle2' | 'Play' | 'UserPlus' | 'UserMinus' | 'Calendar' | 'Users' | 'Edit' | 'Plus' | 'Clock' | 'Tag' | 'FileText' | 'AlertCircle';
}

// Map database field names to human-readable labels
const FIELD_LABELS: Record<string, string> = {
  project_manager_id: 'Project Manager',
  director_id: 'Director',
  adaptador_id: 'Adaptador',
  traductor_id: 'Traductor',
  tecnico_id: 'Técnico',
  mixer_bogota_id: 'Mixer Bogotá',
  mixer_miami_id: 'Mixer Miami',
  qc_1_id: 'QC 1',
  qc_mix_id: 'QC Mix',
  qc_retakes_id: 'QC Retakes',
  date_assigned: 'Arrival Date',
  date_delivered: 'Delivery Date',
  phase_due_date: 'Phase Due Date',
  guest_due_date: 'Guest Due Date',
  studio_assigned: 'Studio Assigned Date',
  entrega_cliente: 'Client Delivery',
  entrega_miami_start: 'Miami Start',
  entrega_miami_end: 'Miami End',
  entrega_mix_retakes: 'Mix Retakes Delivery',
  entrega_sesiones: 'Sessions Delivery',
  entrega_final_dub_audio: 'Final Dub Audio',
  entrega_final_script: 'Final Script',
  status: 'Status',
  fase: 'Phase',
  board: 'Board',
  people: 'Team Members',
  servicios: 'Services',
  name: 'Task Name',
  titulo_aprobado_espanol: 'Spanish Title',
  work_order_number: 'Work Order',
  studio: 'Studio',
  genre: 'Genre',
  client_name: 'Client',
  locked_runtime: 'Locked Runtime',
  final_runtime: 'Final Runtime',
  is_private: 'Privacy',
  aor_needed: 'AOR Needed',
  aor_complete: 'AOR Complete',
  prueba_de_voz: 'Voice Test',
};

// Status labels for display
const STATUS_LABELS: Record<string, string> = {
  default: 'Not Started',
  working: 'Working on It',
  stuck: 'Stuck',
  waiting: 'Waiting',
  done: 'Done',
};

function getFieldLabel(field: string | null): string {
  if (!field) return 'field';
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDateValue(value: string | null): string {
  if (!value) return '';
  try {
    const date = new Date(value);
    return format(date, 'MMM d, yyyy');
  } catch {
    return value;
  }
}

function getStatusLabel(status: string | null): string {
  if (!status) return 'unknown';
  return STATUS_LABELS[status] || status;
}

function extractPhaseName(boardName: string | null): string {
  if (!boardName) return '';
  // Extract phase from board name (e.g., "Mia-Translation" -> "Translation")
  const dashIndex = boardName.indexOf('-');
  return dashIndex > 0 ? boardName.substring(dashIndex + 1) : boardName;
}

export function formatActivityMessage(log: ActivityLogEntry): FormattedActivity {
  const { type, field, old_value, new_value, context_phase, context_board } = log;

  switch (type) {
    // Task Movement
    case 'task_moved':
    case 'phase_change': {
      const fromPhase = old_value ? extractPhaseName(old_value) : old_value;
      const toPhase = new_value ? extractPhaseName(new_value) : new_value;
      return {
        action: 'moved task',
        description: `from ${fromPhase || 'previous phase'} to ${toPhase || 'next phase'}`,
        icon: 'ArrowRight',
      };
    }

    // Task Delivered
    case 'task_delivered': {
      const phase = context_phase || (new_value ? extractPhaseName(new_value) : '');
      return {
        action: 'marked as delivered',
        description: phase ? `in ${phase}` : '',
        icon: 'CheckCircle2',
      };
    }

    // Task Started
    case 'task_started': {
      const phase = context_phase || '';
      return {
        action: 'started working',
        description: phase ? `in ${phase}` : 'on this task',
        icon: 'Play',
      };
    }

    // Status Changed
    case 'status_changed': {
      const newStatus = getStatusLabel(new_value);
      const oldStatus = getStatusLabel(old_value);
      
      if (new_value === 'done') {
        return {
          action: 'marked as delivered',
          description: context_phase ? `in ${context_phase}` : '',
          icon: 'CheckCircle2',
        };
      }
      
      if (new_value === 'working') {
        return {
          action: 'started working',
          description: context_phase ? `in ${context_phase}` : 'on this task',
          icon: 'Play',
        };
      }
      
      if (new_value === 'stuck') {
        return {
          action: 'marked as stuck',
          description: context_phase ? `in ${context_phase}` : '',
          icon: 'AlertCircle',
        };
      }
      
      if (new_value === 'waiting') {
        return {
          action: 'marked as waiting',
          description: context_phase ? `in ${context_phase}` : '',
          icon: 'Clock',
        };
      }
      
      return {
        action: 'changed status',
        description: `from ${oldStatus} to ${newStatus}`,
        icon: 'Tag',
      };
    }

    // Task Assigned
    case 'task_assigned': {
      const role = getFieldLabel(field);
      return {
        action: `assigned ${new_value || 'someone'}`,
        description: `as ${role}`,
        icon: 'UserPlus',
      };
    }

    // Task Unassigned
    case 'task_unassigned': {
      const role = getFieldLabel(field);
      return {
        action: `removed ${old_value || 'someone'}`,
        description: `from ${role}`,
        icon: 'UserMinus',
      };
    }

    // Date Set
    case 'date_set': {
      const dateLabel = getFieldLabel(field);
      const formattedDate = formatDateValue(new_value);
      return {
        action: `set ${dateLabel}`,
        description: formattedDate ? `to ${formattedDate}` : '',
        icon: 'Calendar',
      };
    }

    // Date Cleared
    case 'date_cleared': {
      const dateLabel = getFieldLabel(field);
      return {
        action: `cleared ${dateLabel}`,
        description: '',
        icon: 'Calendar',
      };
    }

    // People Added
    case 'people_added': {
      return {
        action: 'added team members',
        description: new_value || '',
        icon: 'Users',
      };
    }

    // People Removed
    case 'people_removed': {
      return {
        action: 'removed team members',
        description: old_value || '',
        icon: 'UserMinus',
      };
    }

    // Task Created
    case 'task_created': {
      return {
        action: 'created task',
        description: context_phase ? `in ${context_phase}` : '',
        icon: 'Plus',
      };
    }

    // Services Updated
    case 'services_updated': {
      return {
        action: 'updated services',
        description: new_value || '',
        icon: 'Tag',
      };
    }

    // Field Change (legacy/fallback)
    case 'field_change':
    default: {
      // Handle specific field types with better formatting
      if (field === 'board') {
        const fromPhase = old_value ? extractPhaseName(old_value) : old_value;
        const toPhase = new_value ? extractPhaseName(new_value) : new_value;
        return {
          action: 'moved task',
          description: `from ${fromPhase || 'unknown'} to ${toPhase || 'unknown'}`,
          icon: 'ArrowRight',
        };
      }

      if (field === 'fase') {
        return {
          action: 'changed phase',
          description: `to ${new_value || 'unknown'}`,
          icon: 'ArrowRight',
        };
      }

      if (field === 'status') {
        const newStatus = getStatusLabel(new_value);
        if (new_value === 'done') {
          return {
            action: 'marked as delivered',
            description: context_phase ? `in ${context_phase}` : '',
            icon: 'CheckCircle2',
          };
        }
        if (new_value === 'working') {
          return {
            action: 'started working',
            description: 'on this task',
            icon: 'Play',
          };
        }
        return {
          action: 'changed status',
          description: `to ${newStatus}`,
          icon: 'Tag',
        };
      }

      // Personnel assignment fields
      if (field?.endsWith('_id') && FIELD_LABELS[field]) {
        const role = getFieldLabel(field);
        if (new_value && !old_value) {
          return {
            action: `assigned ${new_value}`,
            description: `as ${role}`,
            icon: 'UserPlus',
          };
        }
        if (!new_value && old_value) {
          return {
            action: `removed ${old_value}`,
            description: `from ${role}`,
            icon: 'UserMinus',
          };
        }
        return {
          action: `reassigned ${role}`,
          description: `from ${old_value || 'unassigned'} to ${new_value || 'unassigned'}`,
          icon: 'UserPlus',
        };
      }

      // Date fields
      if (field?.includes('date') || field?.includes('entrega')) {
        const dateLabel = getFieldLabel(field);
        if (new_value && !old_value) {
          return {
            action: `set ${dateLabel}`,
            description: `to ${formatDateValue(new_value)}`,
            icon: 'Calendar',
          };
        }
        if (!new_value && old_value) {
          return {
            action: `cleared ${dateLabel}`,
            description: '',
            icon: 'Calendar',
          };
        }
        return {
          action: `updated ${dateLabel}`,
          description: `to ${formatDateValue(new_value)}`,
          icon: 'Calendar',
        };
      }

      // People field
      if (field === 'people') {
        if (new_value && !old_value) {
          return {
            action: 'added team members',
            description: new_value,
            icon: 'Users',
          };
        }
        if (!new_value && old_value) {
          return {
            action: 'removed team members',
            description: old_value,
            icon: 'UserMinus',
          };
        }
        return {
          action: 'updated team members',
          description: new_value || '',
          icon: 'Users',
        };
      }

      // Generic field update
      const fieldLabel = getFieldLabel(field);
      if (new_value && !old_value) {
        return {
          action: `set ${fieldLabel}`,
          description: `to ${new_value}`,
          icon: 'Edit',
        };
      }
      if (!new_value && old_value) {
        return {
          action: `cleared ${fieldLabel}`,
          description: '',
          icon: 'Edit',
        };
      }
      return {
        action: `updated ${fieldLabel}`,
        description: new_value ? `to ${new_value}` : '',
        icon: 'Edit',
      };
    }
  }
}
