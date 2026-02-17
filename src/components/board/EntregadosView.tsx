import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, MessageSquare, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { getSignedFileUrl } from '@/hooks/useSignedUrl';
import { useState } from 'react';
import { toast } from 'sonner';

interface CompletedTask {
  id: string;
  task_name: string;
  completed_at: string;
  team_member_id: string;
  delivery_comment: string | null;
  delivery_file_url: string | null;
  delivery_file_name: string | null;
  work_order_number: string | null;
  phase: string;
  role_performed: string;
  branch: string | null;
  locked_runtime: string | null;
  titulo_aprobado_espanol: string | null;
  cantidad_episodios: number | null;
  task_id: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

// The two specific internal members
const INTERNAL_COMPLETION_MEMBER_IDS = [
  '38d73520-d8b4-401b-b32c-dcfc60ce2828', // Jennyfer Homez
  '34688e4e-9477-4b3a-99ae-de8a97e61fe3', // Diana Perilla
];

interface EntregadosViewProps {
  boardPhase: string; // 'Translation' or 'Adapting'
}

export function EntregadosView({ boardPhase }: EntregadosViewProps) {
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Fetch completed tasks for the relevant phase by Jennyfer/Diana
  const { data: completedTasks = [], isLoading } = useQuery({
    queryKey: ['entregados', boardPhase],
    queryFn: async (): Promise<CompletedTask[]> => {
      const { data, error } = await supabase
        .from('guest_completed_tasks')
        .select('*')
        .in('team_member_id', INTERNAL_COMPLETION_MEMBER_IDS)
        .ilike('phase', `%${boardPhase}%`)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch team members for name display
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-entregados'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, initials, color')
        .in('id', INTERNAL_COMPLETION_MEMBER_IDS);
      if (error) throw error;
      return data || [];
    },
  });

  const getMemberName = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    return member?.name || 'Unknown';
  };

  const handleDownload = async (task: CompletedTask) => {
    if (!task.delivery_file_url) return;
    try {
      setDownloadingFile(task.id);
      const signedUrl = await getSignedFileUrl(task.delivery_file_url);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  function parseLocalDate(dateStr: string): Date {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <h3 className="font-medium text-lg mb-1">No deliveries yet</h3>
        <p className="text-sm text-muted-foreground">
          Completed deliveries will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto custom-scrollbar px-[10px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[250px]">Project</TableHead>
            <TableHead className="min-w-[120px]">WO#</TableHead>
            <TableHead className="min-w-[140px]">Completed By</TableHead>
            <TableHead className="min-w-[130px]">Date Completed</TableHead>
            <TableHead className="min-w-[200px]">File</TableHead>
            <TableHead className="min-w-[250px]">Comment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {completedTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="font-medium truncate">{task.task_name}</p>
                  {task.titulo_aprobado_espanol && (
                    <p className="text-xs text-muted-foreground truncate">{task.titulo_aprobado_espanol}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {task.work_order_number ? (
                  <span className="font-mono text-sm">{task.work_order_number}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  {getMemberName(task.team_member_id)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {format(new Date(task.completed_at), 'MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell>
                {task.delivery_file_url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8 text-xs"
                    onClick={() => handleDownload(task)}
                    disabled={downloadingFile === task.id}
                  >
                    {downloadingFile === task.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-[150px]">
                      {task.delivery_file_name || 'Download'}
                    </span>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                {task.delivery_comment ? (
                  <div className="flex items-start gap-1.5 max-w-[250px]">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.delivery_comment}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
