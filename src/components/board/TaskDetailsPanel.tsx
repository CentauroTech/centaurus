import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit2, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaskFiles, useUploadTaskFile, useToggleFileAccessibility, useDeleteTaskFile, FileCategory } from "@/hooks/useTaskFiles";
import { useActivityLog } from "@/hooks/useActivityLog";
import { usePermissions } from "@/hooks/usePermissions";
import CommentSection from "./comments/CommentSection";
import { FileCategorySection } from "./files/FileCategorySection";
import { FileUploadButton } from "./files/FileUploadButton";
import { Task, User } from "@/types/board";

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
  const [isEditingKickoff, setIsEditingKickoff] = useState(false);
  const [kickoffBrief, setKickoffBrief] = useState(task.kickoff_brief || "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const kickoffBriefRef = useRef<string>(task.kickoff_brief || "");
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const currentTaskIdRef = useRef<string>(task.id);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: files = [] } = useTaskFiles(task.id);
  const { data: activityLogs = [] } = useActivityLog(task.id);
  const { role } = usePermissions();
  const isGuest = role === "guest";

  const uploadFileMutation = useUploadTaskFile(task.id);
  const toggleAccessMutation = useToggleFileAccessibility(task.id);
  const deleteFileMutation = useDeleteTaskFile(task.id);

  // Sync state and ref together
  const updateKickoffBrief = useCallback((value: string) => {
    setKickoffBrief(value);
    kickoffBriefRef.current = value;
  }, []);

  const updateHasUnsavedChanges = useCallback((value: boolean) => {
    setHasUnsavedChanges(value);
    hasUnsavedChangesRef.current = value;
  }, []);

  // Immediate save function - uses passed values or refs
  const saveKickoffNow = useCallback(async (taskIdToSave: string, briefToSave: string) => {
    if (!taskIdToSave || briefToSave === undefined) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ kickoff_brief: briefToSave } as any)
        .eq("id", taskIdToSave);

      if (error) throw error;
      updateHasUnsavedChanges(false);
      console.log("Kickoff brief saved successfully for task:", taskIdToSave);
    } catch (error) {
      console.error("Failed to save kickoff brief:", error);
      toast.error("Failed to save kickoff brief");
    } finally {
      setIsSaving(false);
    }
  }, [updateHasUnsavedChanges]);

  // Handle panel close - save first then close
  const handlePanelClose = useCallback(async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    if (hasUnsavedChangesRef.current) {
      await saveKickoffNow(currentTaskIdRef.current, kickoffBriefRef.current);
    }
    onClose();
  }, [onClose, saveKickoffNow]);

  // When task changes, save current and reset for new task
  useEffect(() => {
    if (currentTaskIdRef.current !== task.id) {
      // Save the previous task's changes synchronously before switching
      if (hasUnsavedChangesRef.current) {
        const previousTaskId = currentTaskIdRef.current;
        const previousBrief = kickoffBriefRef.current;
        saveKickoffNow(previousTaskId, previousBrief);
      }

      // Reset for new task
      currentTaskIdRef.current = task.id;
      kickoffBriefRef.current = task.kickoff_brief || "";
      hasUnsavedChangesRef.current = false;
      setKickoffBrief(task.kickoff_brief || "");
      setHasUnsavedChanges(false);
      setIsEditingKickoff(false);
    }
  }, [task.id, task.kickoff_brief, saveKickoffNow]);

  // Also sync when task.kickoff_brief changes externally (same task)
  useEffect(() => {
    if (currentTaskIdRef.current === task.id && !hasUnsavedChangesRef.current) {
      kickoffBriefRef.current = task.kickoff_brief || "";
      setKickoffBrief(task.kickoff_brief || "");
    }
  }, [task.kickoff_brief, task.id]);

  // Auto-save with debounce
  const handleKickoffChange = useCallback((value: string) => {
    updateKickoffBrief(value);
    updateHasUnsavedChanges(true);

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      await saveKickoffNow(currentTaskIdRef.current, kickoffBriefRef.current);
      autoSaveTimeoutRef.current = null;
    }, 1500);
  }, [updateKickoffBrief, updateHasUnsavedChanges, saveKickoffNow]);

  // Cleanup on unmount - use sendBeacon for reliability
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      // Fire-and-forget save on unmount
      if (hasUnsavedChangesRef.current && currentTaskIdRef.current) {
        supabase
          .from("tasks")
          .update({ kickoff_brief: kickoffBriefRef.current } as any)
          .eq("id", currentTaskIdRef.current)
          .then(({ error }) => {
            if (error) console.error("Failed to save on unmount:", error);
          });
      }
    };
  }, []);

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

  const formatActivityValue = (value: string | null) => {
    if (!value) return "—";
    // Try to format as date if it looks like one
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return format(new Date(value), "MMM d, yyyy");
      } catch {
        return value;
      }
    }
    return value;
  };

  const getCategoryTitle = (category: string): string => {
    const categoryMap: Record<string, string> = {
      source: "Source Material",
      translated: "Translated",
      adapted: "Adapted",
      retake_list: "Retake List",
      delivery: "Delivery",
      general: "General",
    };
    return categoryMap[category] || category;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handlePanelClose()}>
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
            <TabsTrigger value="kickoff" className="data-[state=active]:bg-muted">
              Kickoff
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
                  Object.entries(filesByCategory).map(([category, categoryFiles]) => (
                    <FileCategorySection
                      key={category}
                      title={getCategoryTitle(category)}
                      files={categoryFiles}
                      isGuest={isGuest}
                      onToggleAccess={handleToggleAccess}
                      onDelete={handleDeleteFile}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="kickoff" className="h-full m-0 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Kickoff Brief</h3>
                  {!isGuest && (
                    !isEditingKickoff ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingKickoff(true)}
                        className="gap-1.5"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {hasUnsavedChanges ? "Saving..." : "Saved"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (autoSaveTimeoutRef.current) {
                              clearTimeout(autoSaveTimeoutRef.current);
                              autoSaveTimeoutRef.current = null;
                            }
                            await saveKickoffNow(currentTaskIdRef.current, kickoffBriefRef.current);
                            setIsEditingKickoff(false);
                          }}
                          className="gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Done
                        </Button>
                      </div>
                    )
                  )}
                </div>
                {isEditingKickoff ? (
                  <Textarea
                    value={kickoffBrief}
                    onChange={(e) => handleKickoffChange(e.target.value)}
                    placeholder="Enter kickoff brief details..."
                    className="min-h-[300px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-sm bg-muted/30 rounded-md p-4 min-h-[100px]">
                    {kickoffBrief || (
                      <span className="text-muted-foreground italic">
                        No kickoff brief added yet.{!isGuest && " Click Edit to add one."}
                      </span>
                    )}
                  </div>
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
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 text-sm border-b border-border pb-3 last:border-0"
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback
                            style={{ backgroundColor: log.user?.color || "#888" }}
                            className="text-white text-xs"
                          >
                            {log.user?.initials || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {log.user?.name || "System"}
                            </span>
                            <span>changed</span>
                            <span className="font-medium text-foreground">
                              {log.field || "field"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="line-through">
                              {formatActivityValue(log.old_value)}
                            </span>
                            <span className="mx-1.5">→</span>
                            <span className="font-medium text-foreground">
                              {formatActivityValue(log.new_value)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>
                    ))}
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
