import { useState } from "react";
import { useComments, useAddComment, useDeleteComment } from "@/hooks/useComments";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { usePermissions } from "@/hooks/usePermissions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  taskId: string;
  boardId?: string;
}

// Extract @mentions from plain text
function extractMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // The ID is in the second capture group
  }
  return mentions;
}

export default function CommentSection({ taskId, boardId = "" }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isGuestVisible, setIsGuestVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"team" | "guest">("team");
  
  const { data: comments = [], isLoading } = useComments(taskId);
  const { data: currentUser } = useCurrentTeamMember();
  const { role } = usePermissions();
  const addCommentMutation = useAddComment(taskId, boardId);
  const deleteCommentMutation = useDeleteComment(taskId, boardId);

  const isGuest = role === "guest";

  const handleSendComment = async () => {
    const textContent = newComment.trim();
    if (!textContent || !currentUser?.id) return;

    const mentionedUserIds = extractMentions(newComment);
    
    // Guest comments are always guest-visible
    // Team comments in guest tab are guest-visible
    const shouldBeGuestVisible = isGuest || activeTab === "guest";

    try {
      await addCommentMutation.mutateAsync({
        content: textContent,
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
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
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
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a message..."
              className="min-h-[60px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
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
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              activeTab === "guest"
                ? "Write to guest..."
                : "Write a team update..."
            }
            className="min-h-[60px] resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSendComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {activeTab === "guest"
            ? "This message will be visible to guests • Ctrl+Enter to send"
            : "Team only • Ctrl+Enter to send"}
        </p>
      </div>
    </div>
  );
}
