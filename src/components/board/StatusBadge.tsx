import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Send, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status, STATUS_CONFIG } from '@/types/board';
import { AVAILABLE_PHASES } from '@/hooks/useBulkTaskActions';

interface StatusBadgeProps {
  status: Status;
  onStatusChange: (status: Status) => void;
  isKickoffPhase?: boolean;
  onSendToPhase?: (phase: string) => void;
}

// Grid layout matching the image: 4 columns of statuses
const STATUS_GRID: Status[][] = [
  ['delivered', 'ready_for_translation', 'ready_for_retakes', 'pending_client_approval'],
  ['in_progress', 'ready_for_adapting', 'ready_for_qc_retakes', 'delayed'],
  ['delayed', 'ready_for_casting', 'ready_for_mix', 'no_retakes'],
  ['no_retakes', 'ready_for_recording', 'ready_for_qc_mix', 'on_hold'],
  ['on_hold', 'ready_for_premix', 'ready_for_qc_mix_retakes', 'ready_for_assets'],
  ['ready_for_assets', 'ready_for_qc_premix', 'ready_for_final_delivery', 'default'],
];

// Unique statuses for the grid (remove duplicates from the visual layout)
const UNIQUE_STATUSES: Status[] = [
  'delivered', 'ready_for_translation', 'ready_for_retakes', 'pending_client_approval',
  'in_progress', 'ready_for_adapting', 'ready_for_qc_retakes', 'delayed',
  'ready_for_casting', 'ready_for_mix', 'no_retakes', 'ready_for_recording',
  'ready_for_qc_mix', 'on_hold', 'ready_for_premix', 'ready_for_qc_mix_retakes',
  'ready_for_assets', 'ready_for_qc_premix', 'ready_for_final_delivery',
];

export function StatusBadge({ status, onStatusChange, isKickoffPhase = false, onSendToPhase }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhaseMenu, setShowPhaseMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // In Kickoff phase, show "Launch" instead of "Delivered"
  const getDisplayConfig = (statusKey: Status) => {
    if (isKickoffPhase && statusKey === 'delivered') {
      return { label: 'Launch', className: STATUS_CONFIG.delivered.className };
    }
    if (!isKickoffPhase && statusKey === 'launch') {
      return null;
    }
    return STATUS_CONFIG[statusKey];
  };

  const config = getDisplayConfig(status) || STATUS_CONFIG[status];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPhaseMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1.5 rounded text-xs font-medium min-w-[100px] text-center transition-smooth",
          "flex items-center justify-center gap-1",
          config.className,
          "hover:opacity-90"
        )}
      >
        <span className="truncate">{config.label}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 left-0 bg-card rounded-lg shadow-dropdown border border-border p-3 min-w-[420px] animate-fade-in">
          {/* Status grid - 4 columns */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {UNIQUE_STATUSES.map((statusKey) => {
              const displayConfig = getDisplayConfig(statusKey);
              if (!displayConfig) return null;
              
              return (
                <button
                  key={statusKey}
                  onClick={() => {
                    onStatusChange(statusKey);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "px-2 py-1.5 rounded text-xs font-medium text-center truncate transition-smooth",
                    displayConfig.className,
                    status === statusKey && "ring-2 ring-offset-1 ring-primary"
                  )}
                  title={displayConfig.label}
                >
                  {displayConfig.label}
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div className="h-px bg-border my-2" />

          {/* Bottom actions */}
          <div className="flex flex-col gap-1">
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth flex items-center gap-2 rounded"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Edit Labels</span>
            </button>

            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth flex items-center gap-2 rounded"
            >
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Auto-assign labels</span>
            </button>

            {/* Send to phase button */}
            {onSendToPhase && (
              <div className="relative">
                <button
                  onClick={() => setShowPhaseMenu(!showPhaseMenu)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth flex items-center gap-2 rounded"
                >
                  <Send className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-medium">Send to...</span>
                  <ChevronDown className="w-3 h-3 ml-auto" />
                </button>

                {showPhaseMenu && (
                  <div className="absolute left-full bottom-0 ml-1 bg-card rounded-lg shadow-dropdown border border-border py-1 min-w-[140px] max-h-[300px] overflow-y-auto animate-fade-in z-[10000]">
                    {AVAILABLE_PHASES.map((phase) => (
                      <button
                        key={phase}
                        onClick={() => {
                          onSendToPhase(phase);
                          setIsOpen(false);
                          setShowPhaseMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-smooth whitespace-nowrap"
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
