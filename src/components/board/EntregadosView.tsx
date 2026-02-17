import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, MessageSquare, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
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

const MEMBER_GROUPS = [
  {
    id: '38d73520-d8b4-401b-b32c-dcfc60ce2828',
    name: 'Jennyfer Homez',
    color: 'hsl(217, 91%, 60%)', // blue
    bgColor: 'hsl(217, 91%, 60%)',
  },
  {
    id: '34688e4e-9477-4b3a-99ae-de8a97e61fe3',
    name: 'Diana Perilla',
    color: 'hsl(330, 80%, 60%)', // pink
    bgColor: 'hsl(330, 80%, 60%)',
  },
];

interface EntregadosViewProps {
  boardPhase: string;
}

export function EntregadosView({ boardPhase }: EntregadosViewProps) {
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: completedTasks = [], isLoading } = useQuery({
    queryKey: ['entregados', boardPhase],
    queryFn: async (): Promise<CompletedTask[]> => {
      const { data, error } = await supabase
        .from('guest_completed_tasks')
        .select('*')
        .in('team_member_id', MEMBER_GROUPS.map(m => m.id))
        .ilike('phase', `%${boardPhase}%`)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

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

  const toggleGroup = (memberId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  };

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
    <div className="flex-1 overflow-auto custom-scrollbar px-[10px] space-y-4 py-2">
      {MEMBER_GROUPS.map((group) => {
        const groupTasks = completedTasks.filter(t => t.team_member_id === group.id);
        const isCollapsed = collapsedGroups.has(group.id);

        return (
          <div key={group.id}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-t-lg"
              style={{ backgroundColor: group.bgColor }}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-white" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white" />
              )}
              <span className="font-semibold text-white text-sm">
                {group.name}
              </span>
              <span className="text-white/70 text-xs ml-1">
                ({groupTasks.length} {groupTasks.length === 1 ? 'delivery' : 'deliveries'})
              </span>
            </button>

            {/* Group Table */}
            {!isCollapsed && (
              <div className="border border-t-0 rounded-b-lg" style={{ borderColor: `${group.bgColor}40` }}>
                {groupTasks.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No deliveries yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Project</TableHead>
                        <TableHead className="min-w-[120px]">WO#</TableHead>
                        <TableHead className="min-w-[130px]">Date Completed</TableHead>
                        <TableHead className="min-w-[200px]">File</TableHead>
                        <TableHead className="min-w-[250px]">Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupTasks.map((task) => (
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
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
