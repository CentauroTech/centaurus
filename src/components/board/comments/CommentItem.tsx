import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Reply } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextDisplay, MentionUser } from "./RichTextEditor";
import { CommentWithUser } from "@/hooks/useComments";

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentId: string) => void;
  isReplying: boolean;
  mentionUsers: MentionUser[];
  isSending: boolean;
  replies?: CommentWithUser[];
  isGuest?: boolean;
  activeTab?: "team" | "guest";
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

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  isReplying,
  mentionUsers,
  isSending,
  replies = [],
  isGuest,
  activeTab,
}: CommentItemProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleSendReply = () => {
    const textContent = replyContent.replace(/<[^>]*>/g, "").trim();
    if (!textContent) return;
    onReply(replyContent, comment.id);
    setReplyContent("");
    setShowReplyEditor(false);
  };

  return (
    <div>
      <div
        className={cn(
          "rounded-lg border p-3 bg-card",
          comment.is_guest_visible &&
            "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
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
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    Guest visible
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowReplyEditor(!showReplyEditor)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reply"
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <RichTextDisplay content={comment.content} className="mt-1" />
          </div>
        </div>

        {/* Inline reply editor */}
        {showReplyEditor && (
          <div className="mt-3 ml-11 border-l-2 border-muted pl-3">
            <RichTextEditor
              content={replyContent}
              onChange={setReplyContent}
              onSend={handleSendReply}
              placeholder="Write a reply... Use @ to mention"
              isSending={isSending}
              mentionUsers={mentionUsers}
              showEveryoneOption={true}
            />
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">Ctrl+Enter to send</p>
              <button
                onClick={() => {
                  setShowReplyEditor(false);
                  setReplyContent("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={cn(
                "rounded-lg border p-2.5 bg-card",
                reply.is_guest_visible &&
                  "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
              )}
            >
              <div className="flex items-start gap-2.5">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: reply.user?.color || "#888" }}
                    className="text-white text-[10px]"
                  >
                    {reply.user?.initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">
                        {reply.user?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reply.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {currentUserId === reply.user_id && (
                      <button
                        onClick={() => onDelete(reply.id)}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <RichTextDisplay content={reply.content} className="mt-0.5 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
