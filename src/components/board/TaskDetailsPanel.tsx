import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Play, UserPlus, UserMinus, Calendar, Users, Edit, Plus, Clock, Tag, FileText, AlertCircle } from "lucide-react";
import { useTaskFiles, useUploadTaskFile, useToggleFileAccessibility, useDeleteTaskFile, FileCategory, FILE_CATEGORIES } from "@/hooks/useTaskFiles";
import { useActivityLog } from "@/hooks/useActivityLog";
import { usePermissions } from "@/hooks/usePermissions";
import { useCommentsRealtime } from "@/hooks/useRealtimeSubscriptions";
import CommentSection from "./comments/CommentSection";
import { FileCategorySection } from "./files/FileCategorySection";
import { FileUploadButton } from "./files/FileUploadButton";
import { Task, User } from "@/types/board";
import { formatActivityMessage, FormattedActivity } from "@/lib/activityFormatter";

interface TaskDetailsPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  users?: User[];
  boardId?: string;
}

export default function TaskDetailsPanel({
  task,
  isOpen,
  onClose,
  users = [],
  boardId = "",
}: TaskDetailsPanelProps) {
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-semibold truncate pr-8">
            {task.name || "Untitled Task"}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0">
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
              <CommentSection taskId={task.id} boardId={boardId} />
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
