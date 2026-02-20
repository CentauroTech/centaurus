import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Play, UserPlus, UserMinus, Calendar, Users, Edit, Plus, Clock, Tag, FileText, AlertCircle, User as UserIcon, Film, Clapperboard } from "lucide-react";
import { useTaskFiles, useUploadTaskFile, useToggleFileAccessibility, useDeleteTaskFile, FileCategory, FILE_CATEGORIES } from "@/hooks/useTaskFiles";
import { useActivityLog } from "@/hooks/useActivityLog";
import { usePermissions } from "@/hooks/usePermissions";
import { useCommentsRealtime } from "@/hooks/useRealtimeSubscriptions";
import CommentSection from "./comments/CommentSection";
import { FileCategorySection } from "./files/FileCategorySection";
import { FileUploadButton } from "./files/FileUploadButton";
import { Task, User } from "@/types/board";
import { cn } from "@/lib/utils";
import { formatActivityMessage, FormattedActivity } from "@/lib/activityFormatter";

// Parse date string as local date to avoid timezone shift
function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
}

const PHASE_COLORS: Record<string, string> = {
  'On Hold': 'bg-gray-400 text-white',
  'Kickoff': 'bg-gray-900 text-white',
  'Assets': 'bg-cyan-200 text-cyan-800',
  'Translation': 'bg-blue-200 text-blue-800',
  'Adapting': 'bg-teal-500 text-white',
  'Breakdown': 'bg-orange-400 text-orange-900',
  'Casting': 'bg-yellow-400 text-yellow-900',
  'VoiceTests': 'bg-pink-400 text-white',
  'Scheduling': 'bg-lime-400 text-lime-900',
  'Recording': 'bg-red-800 text-white',
  'QC 1': 'bg-purple-200 text-purple-800',
  'Premix': 'bg-pink-200 text-pink-800',
  'QC Premix': 'bg-purple-200 text-purple-800',
  'Retakes': 'bg-purple-600 text-white',
  'Mix': 'bg-blue-300 text-blue-900',
  'QC Mix': 'bg-purple-300 text-purple-900',
  'MixRetakes': 'bg-pink-500 text-white',
  'Deliveries': 'bg-green-500 text-white',
  'Final Delivery': 'bg-green-500 text-white',
};

interface TaskDetailsPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  users?: User[];
  boardId?: string;
  workspaceName?: string;
  viewerIds?: string[];
}

export default function TaskDetailsPanel({
  task,
  isOpen,
  onClose,
  users = [],
  boardId = "",
  workspaceName,
  viewerIds = [],
}: TaskDetailsPanelProps) {
  const { data: files = [] } = useTaskFiles(task.id);
  const { data: activityLogs = [] } = useActivityLog(task.id);
  const { role } = usePermissions();
  const isGuest = role === "guest";

  useCommentsRealtime(task.id, isOpen);

  const uploadFileMutation = useUploadTaskFile(task.id);
  const toggleAccessMutation = useToggleFileAccessibility(task.id);
  const deleteFileMutation = useDeleteTaskFile(task.id);

  const filesByCategory = files.reduce((acc, file) => {
    const category = file.file_category || "General";
    if (!acc[category]) acc[category] = [];
    acc[category].push(file);
    return acc;
  }, {} as Record<string, typeof files>);

  const handleFileUpload = async (file: File, category: FileCategory) => {
    await uploadFileMutation.mutateAsync({ file, category });
  };

  const handleToggleAccess = (fileId: string, isAccessible: boolean) => {
    toggleAccessMutation.mutate({ fileId, isGuestAccessible: isAccessible });
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  const getCategoryInfo = (category: string): { title: string; description?: string } => {
    const cat = FILE_CATEGORIES.find(c => c.value === category);
    if (cat) return { title: cat.label, description: cat.description };
    return { title: category };
  };

  const getActivityIcon = (iconName: FormattedActivity['icon']) => {
    const iconMap = {
      ArrowRight, CheckCircle2, Play, UserPlus, UserMinus,
      Calendar, Users, Edit, Plus, Clock, Tag, FileText, AlertCircle,
    };
    return iconMap[iconName] || Edit;
  };

  const getVal = (field: string): any => (task as any)[field];

  const phase = getVal('currentPhase') || getVal('fase');
  const pm = getVal('projectManager') as User | undefined;
  const clientName = getVal('clientName') || getVal('client_name');
  const woNumber = getVal('workOrderNumber') || getVal('work_order_number');

  const formatDate = (d: any) => {
    if (!d) return null;
    try { return format(parseLocalDate(String(d)), 'MMM d, yyyy'); }
    catch { return String(d); }
  };

  const miamiDueDate = getVal('entregaMiamiEnd');
  const clientDueDate = getVal('entregaCliente');
  const phaseDueDate = getVal('phaseDueDate');
  const lockedRuntime = getVal('lockedRuntime');
  const finalRuntime = getVal('finalRuntime');
  const episodes = getVal('cantidadEpisodios');
  const deliveryDubCard = getVal('entregaFinalScriptItems') as string[] | undefined;
  const deliveryDubAudio = getVal('entregaFinalDubAudioItems') as string[] | undefined;

  const metadataItems: { label: string; shortLabel: string; value: string | null }[] = [
    { label: 'Phase Due Date', shortLabel: 'PDD', value: formatDate(phaseDueDate) },
    { label: 'Miami Due Date', shortLabel: 'MDD', value: formatDate(miamiDueDate) },
    { label: 'Client Due Date', shortLabel: 'CDD', value: formatDate(clientDueDate) },
    { label: 'Locked Runtime', shortLabel: 'LRT', value: lockedRuntime || null },
    { label: 'Final Runtime', shortLabel: 'FRT', value: finalRuntime || null },
    { label: 'Episodes', shortLabel: 'EPS', value: episodes ? String(episodes) : null },
  ];

  const listItems: { label: string; items: string[] }[] = [
    { label: 'Delivery Dub Card', items: deliveryDubCard?.length ? deliveryDubCard : [] },
    { label: 'Delivery Dub Audio', items: deliveryDubAudio?.length ? deliveryDubAudio : [] },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 flex flex-col overflow-hidden border-l border-[hsl(var(--border))]">
        {/* ── Premium Header ── */}
        <div className="px-6 pt-6 pb-5 border-b border-[hsl(var(--border))] bg-background">
          <h2 className="text-[22px] font-semibold text-foreground leading-tight tracking-tight">
            {task.name || "Untitled Task"}
          </h2>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[13px] text-muted-foreground">
            {clientName && (
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {clientName}
              </span>
            )}
            {phase && (
              <Badge className={cn(
                "text-[11px] rounded-full px-2.5 py-0.5 font-medium",
                PHASE_COLORS[phase] || 'bg-muted text-muted-foreground'
              )}>
                {phase}
              </Badge>
            )}
            {pm && (
              <span className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]" style={{ backgroundColor: pm.color }}>
                    {pm.initials}
                  </AvatarFallback>
                </Avatar>
                {pm.name}
              </span>
            )}
            {woNumber && (
              <span className="font-mono text-[12px] text-muted-foreground/70">
                WO# {woNumber}
              </span>
            )}
          </div>
        </div>

        {/* ── Metadata Grid (Collapsible) ── */}
        {(metadataItems.some(m => m.value) || listItems.some(l => l.items.length > 0)) && (
          <Collapsible defaultOpen={false} className="border-b border-[hsl(var(--border))]">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-3 text-[12px] font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/30 transition-colors duration-150">
              <span>Project Details</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-4 bg-muted/20">
                <div className="grid grid-cols-3 gap-3">
                  {metadataItems.map((item) => (
                    <div key={item.shortLabel} className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {item.shortLabel}
                      </span>
                      <span className="text-[13px] font-medium text-foreground">
                        {item.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
                {listItems.some(l => l.items.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] space-y-2.5">
                    {listItems.map((list) => list.items.length > 0 && (
                      <div key={list.label} className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          {list.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {list.items.map((item) => (
                            <Badge key={item} variant="secondary" className="text-[11px] font-normal px-2 py-0.5 rounded-md">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 pt-5 pb-0 bg-background">
            <TabsList className="h-auto p-0 bg-transparent gap-6 rounded-none w-full justify-start border-b border-[hsl(var(--border))]">
              {["updates", "files", "activity"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="relative px-0 pb-3 pt-0 text-[14px] font-medium rounded-none bg-transparent shadow-none
                    data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground
                    data-[state=active]:text-foreground data-[state=active]:shadow-none
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full
                    after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100
                    after:transition-transform after:duration-200 after:origin-left
                    transition-colors duration-150"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="updates" className="h-full m-0">
              <CommentSection 
                taskId={task.id} 
                boardId={boardId} 
                workspaceName={workspaceName}
                kickoffBrief={task.kickoffBrief}
                phase={task.fase}
                viewerIds={viewerIds}
              />
            </TabsContent>

            <TabsContent value="files" className="h-full m-0 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-foreground">Task Files</h3>
                  {!isGuest && (
                    <FileUploadButton 
                      onUpload={handleFileUpload}
                      isUploading={uploadFileMutation.isPending}
                    />
                  )}
                </div>
                {Object.keys(filesByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No files uploaded yet
                  </p>
                ) : (
                  Object.entries(filesByCategory).map(([category, categoryFiles]) => {
                    const { title, description } = getCategoryInfo(category);
                    return (
                      <FileCategorySection
                        key={category}
                        title={title}
                        description={description}
                        files={categoryFiles}
                        isGuest={isGuest}
                        onToggleAccess={handleToggleAccess}
                        onDelete={handleDeleteFile}
                      />
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="h-full m-0 overflow-y-auto">
              <div className="p-6">
                <h3 className="text-[15px] font-semibold text-foreground mb-4">Activity Log</h3>
                {activityLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No activity recorded yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log) => {
                      const { action, description, icon } = formatActivityMessage(log);
                      const IconComponent = getActivityIcon(icon);
                      
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 text-sm pb-4 border-b border-[hsl(var(--border))] last:border-0 last:pb-0"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">
                                {log.user?.name || "System"}
                              </span>
                              {" "}
                              <span className="font-medium text-foreground">{action}</span>
                              {description && <span> {description}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground/70 mt-1.5">
                              {format(new Date(log.created_at), "MMM d 'at' h:mm a")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
