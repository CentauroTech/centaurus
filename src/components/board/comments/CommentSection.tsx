import { useState } from "react";
import { useComments, useAddComment, useDeleteComment } from "@/hooks/useComments";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { usePermissions } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextDisplay } from "./RichTextEditor";

interface CommentSectionProps {
  taskId: string;
  boardId?: string;
}

// Extract @mentions from HTML content
function extractMentionsFromHtml(html: string): string[] {
  const mentionRegex = /data-id="([^"]+)"/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(html)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

export default function CommentSection({ taskId, boardId = "" }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"team" | "guest">("team");
  
  const { data: comments = [], isLoading } = useComments(taskId);
  const { data: currentUser } = useCurrentTeamMember();
  const { role } = usePermissions();
  const addCommentMutation = useAddComment(taskId, boardId);
  const deleteCommentMutation = useDeleteComment(taskId, boardId);

  const isGuest = role === "guest";

  const handleSendComment = async () => {
    const textContent = newComment.replace(/<[^>]*>/g, '').trim();
    if (!textContent || !currentUser?.id) return;

    const mentionedUserIds = extractMentionsFromHtml(newComment);
    
    // Guest comments are always guest-visible
    // Team comments in guest tab are guest-visible
    const shouldBeGuestVisible = isGuest || activeTab === "guest";

    try {
      await addCommentMutation.mutateAsync({
        content: newComment,
        userId: currentUser.id,
        mentionedUserIds,
        isGuestVisible: shouldBeGuestVisible,
      });
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Filter comments based on tab
  const teamComments = comments.filter((c) => !c.is_guest_visible);
  const guestComments = comments.filter((c) => c.is_guest_visible);

  const renderCommentList = (commentList: typeof comments) => {
    if (isLoading) {
      return <div className="text-sm text-muted-foreground p-4">Loading comments...</div>;
    }

    if (commentList.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No comments yet. Start the conversation!
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-4">
        {commentList.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "rounded-lg border p-3 bg-card",
              comment.is_guest_visible && "border-blue-200 bg-blue-50/50"
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback
                  style={{ backgroundColor: comment.user?.color || "#888" }}
                  className="text-white text-xs"
                >
                  {comment.user?.initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.user?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, h:mm a")}
                    </span>
                    {comment.is_guest_visible && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Guest visible
                      </span>
                    )}
                  </div>
                  {currentUser?.id === comment.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <RichTextDisplay content={comment.content} className="mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Guests only see guest-visible comments in a single list
  if (isGuest) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {renderCommentList(guestComments)}
        </div>
        <div className="border-t p-3 bg-background">
          <RichTextEditor
            content={newComment}
            onChange={setNewComment}
            onSend={handleSendComment}
            placeholder="Write a message..."
            isSending={addCommentMutation.isPending}
          />
          <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to send</p>
        </div>
      </div>
    );
  }

  // Team members see tabbed view
  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "team" | "guest")}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="team" className="gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />
            Team Updates
          </TabsTrigger>
          <TabsTrigger value="guest" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Guest Communication
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <TabsContent value="team" className="m-0 h-full">
            {renderCommentList(teamComments)}
          </TabsContent>
          <TabsContent value="guest" className="m-0 h-full">
            {renderCommentList(guestComments)}
          </TabsContent>
        </div>
      </Tabs>

      <div className="border-t p-3 bg-background">
        <RichTextEditor
          content={newComment}
          onChange={setNewComment}
          onSend={handleSendComment}
          placeholder={
            activeTab === "guest"
              ? "Write to guest..."
              : "Write a team update..."
          }
          isSending={addCommentMutation.isPending}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {activeTab === "guest"
            ? "This message will be visible to guests • Ctrl+Enter to send"
            : "Team only • Ctrl+Enter to send"}
        </p>
      </div>
    </div>
  );
}
