import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Play, UserPlus, UserMinus, Calendar, Users, Edit, Plus, Clock, Tag, FileText, AlertCircle, User as UserIcon, Film, Clapperboard, ChevronDown, ChevronUp } from "lucide-react";
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
  const [infoExpanded, setInfoExpanded] = useState(false);
  const { data: files = [] } = useTaskFiles(task.id);
  const { data: activityLogs = [] } = useActivityLog(task.id);
  const { role } = usePermissions();
  const isGuest = role === "guest";

  // Real-time subscription for comments
  useCommentsRealtime(task.id, isOpen);

  const uploadFileMutation = useUploadTaskFile(task.id);
  const toggleAccessMutation = useToggleFileAccessibility(task.id);
  const deleteFileMutation = useDeleteTaskFile(task.id);

  // Group files by category
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
    if (cat) {
      return { title: cat.label, description: cat.description };
    }
    return { title: category };
  };

  // Map icon names to components
  const getActivityIcon = (iconName: FormattedActivity['icon']) => {
    const iconMap = {
      ArrowRight: ArrowRight,
      CheckCircle2: CheckCircle2,
      Play: Play,
      UserPlus: UserPlus,
      UserMinus: UserMinus,
      Calendar: Calendar,
      Users: Users,
      Edit: Edit,
      Plus: Plus,
      Clock: Clock,
      Tag: Tag,
      FileText: FileText,
      AlertCircle: AlertCircle,
    };
    return iconMap[iconName] || Edit;
  };

  // Helper to get task value from either camelCase or snake_case
  const getVal = (field: string): any => (task as any)[field];

  const phase = getVal('currentPhase') || getVal('fase');
  const pm = getVal('projectManager') as User | undefined;
  const miamiDueDate = getVal('entregaMiamiEnd');
  const clientDueDate = getVal('entregaCliente');
  const clientName = getVal('clientName') || getVal('client_name');
  const runtime = getVal('lockedRuntime') || getVal('locked_runtime') || getVal('finalRuntime') || getVal('final_runtime');
  const episodes = getVal('cantidadEpisodios') || getVal('cantidad_episodios');
  const services = getVal('servicios') as string[] | undefined;
  const scriptItems = getVal('entregaFinalScriptItems') || getVal('entrega_final_script_items');
  const dubAudioItems = getVal('entregaFinalDubAudioItems') || getVal('entrega_final_dub_audio_items');

  const formatDate = (d: any) => {
    if (!d) return null;
    try {
      return format(parseLocalDate(String(d)), 'MMM d, yyyy');
    } catch { return String(d); }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {phase && (
                <Badge className={cn(
                  "mb-2 text-xs rounded-md px-3 py-1",
                  PHASE_COLORS[phase] || 'bg-muted text-muted-foreground'
                )}>
                  {phase}
                </Badge>
              )}
              <SheetTitle className="text-lg font-semibold truncate pr-8">
                {task.name || "Untitled Task"}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        {/* Collapsible Project Info Section */}
        <div className="border-b border-border bg-primary/10 shrink-0">
          <button
            onClick={() => setInfoExpanded(!infoExpanded)}
            className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              Project Info
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary/70">
              {infoExpanded ? 'Collapse' : 'Show'}
              {infoExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {infoExpanded && (
            <div className="px-4 pb-3 pt-2 space-y-3 bg-card">
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                {pm && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]" style={{ backgroundColor: pm.color }}>
                        {pm.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">PM:</span>
                    <span className="font-medium truncate">{pm.name}</span>
                  </div>
                )}
                {clientName && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium truncate">{clientName}</span>
                  </div>
                )}
                {miamiDueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Miami Due:</span>
                    <span className="font-medium">{formatDate(miamiDueDate)}</span>
                  </div>
                )}
                {clientDueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Client Due:</span>
                    <span className="font-medium">{formatDate(clientDueDate)}</span>
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Runtime:</span>
                    <span className="font-medium">{runtime}</span>
                  </div>
                )}
                {episodes && (
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Episodes:</span>
                    <span className="font-medium">{episodes}</span>
                  </div>
                )}
                {services && services.length > 0 && (
                  <div className="flex items-start gap-2 col-span-2">
                    <Clapperboard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Services:</span>
                    <div className="flex flex-wrap gap-1">
                      {services.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {scriptItems && scriptItems.length > 0 && (
                  <div className="flex items-start gap-2 col-span-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Script:</span>
                    <div className="flex flex-wrap gap-1">
                      {scriptItems.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {dubAudioItems && dubAudioItems.length > 0 && (
                  <div className="flex items-start gap-2 col-span-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Dub Audio:</span>
                    <div className="flex flex-wrap gap-1">
                      {dubAudioItems.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="h-12 px-4 border-b border-border shrink-0 w-full justify-start gap-1 rounded-none bg-transparent">
            <TabsTrigger value="updates" className="data-[state=active]:bg-muted">
              Updates
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-muted">
              Files
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-muted">
              Activity
            </TabsTrigger>
          </TabsList>

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
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Task Files</h3>
                  {!isGuest && (
                    <FileUploadButton 
                      onUpload={handleFileUpload}
                      isUploading={uploadFileMutation.isPending}
                    />
                  )}
                </div>
                {Object.keys(filesByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
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
              <div className="p-4">
                <h3 className="font-medium mb-3">Activity Log</h3>
                {activityLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No activity recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => {
                      const { action, description, icon } = formatActivityMessage(log);
                      const IconComponent = getActivityIcon(icon);
                      
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0"
                        >
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {log.user?.name || "System"}
                              </span>
                              {" "}
                              <span className="font-medium text-foreground">{action}</span>
                              {description && (
                                <span> {description}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
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
