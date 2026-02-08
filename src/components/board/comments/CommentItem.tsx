import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Reply, ThumbsUp, Pencil, Paperclip, FileIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextDisplay, MentionUser } from "./RichTextEditor";
import { CommentWithUser } from "@/hooks/useComments";
import { CommentLike } from "@/hooks/useCommentLikes";
import { CommentAttachment } from "@/hooks/useCommentAttachments";

const COLLAPSED_HEIGHT = 100;

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentId: string, files?: File[]) => void;
  onEdit: (commentId: string, content: string) => void;
  onToggleLike: (commentId: string, isLiked: boolean) => void;
  mentionUsers: MentionUser[];
  isSending: boolean;
  replies?: CommentWithUser[];
  isGuest?: boolean;
  activeTab?: "team" | "guest";
  likes: CommentLike[];
  attachments: CommentAttachment[];
  isReplyOpen: boolean;
  onOpenReply: (commentId: string | null) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function AttachmentList({ attachments }: { attachments: CommentAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att) => (
        <a
          key={att.id}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors"
        >
          <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate max-w-[140px]">{att.name}</span>
          <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
        </a>
      ))}
    </div>
  );
}

function TruncatedContent({ content, className }: { content: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;
    setOverflowing(ref.current.scrollHeight > COLLAPSED_HEIGHT);
  }, [content]);

  return (
    <div>
      <div
        ref={ref}
        style={{ maxHeight: expanded ? "none" : COLLAPSED_HEIGHT }}
        className="relative overflow-hidden"
      >
        <RichTextDisplay content={content} className={className} />
        {!expanded && overflowing && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {overflowing && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline mt-0.5"
        >
          {expanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

/* ─── Reply item (lighter weight, nested) ─── */
function ReplyItem({
  reply,
  currentUserId,
  onDelete,
  onEdit,
  onToggleLike,
  likeCount,
  isLiked,
  attachments,
  mentionUsers,
}: {
  reply: CommentWithUser;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onToggleLike: (id: string, isLiked: boolean) => void;
  likeCount: number;
  isLiked: boolean;
  attachments: CommentAttachment[];
  mentionUsers: MentionUser[];
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const isAuthor = currentUserId === reply.user_id;
  const isEdited = !!(reply as any).edited_at;

  const handleSaveEdit = () => {
    const text = editContent.replace(/<[^>]*>/g, "").trim();
    if (!text) return;
    onEdit(reply.id, editContent);
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2 py-2.5">
      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
        <AvatarFallback
          style={{ backgroundColor: reply.user?.color || "#888" }}
          className="text-white text-[10px]"
        >
          {reply.user?.initials || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{reply.user?.name || "Unknown"}</span>
          <span className="text-[11px] text-muted-foreground">
            {format(new Date(reply.created_at), "MMM d, h:mm a")}
          </span>
          {isEdited && <span className="text-[10px] text-muted-foreground italic">Edited</span>}
        </div>
        {editing ? (
          <div className="mt-1">
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              onSend={handleSaveEdit}
              placeholder="Edit reply..."
              className="text-sm [&_.ProseMirror]:min-h-[48px] [&_.ProseMirror]:p-2 [&_.ProseMirror]:text-[13px]"
              mentionUsers={mentionUsers}
              showEveryoneOption={true}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={handleSaveEdit} className="text-xs text-primary font-medium hover:underline">Save</button>
              <button onClick={() => { setEditing(false); setEditContent(reply.content); }} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <TruncatedContent content={reply.content} className="mt-0.5 text-[13px]" />
            <AttachmentList attachments={attachments} />
          </>
        )}
        <div className="flex items-center gap-1 mt-1 -ml-1">
          <button
            onClick={() => onToggleLike(reply.id, isLiked)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors",
              isLiked
                ? "text-primary font-medium hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ThumbsUp className={cn("h-3 w-3", isLiked && "fill-primary")} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          {isAuthor && (
            <>
              <button
                onClick={() => { setEditing(true); setEditContent(reply.content); }}
                className="px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => onDelete(reply.id)}
                className="px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main CommentItem ─── */
export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onEdit,
  onToggleLike,
  mentionUsers,
  isSending,
  replies = [],
  isGuest,
  activeTab,
  likes,
  attachments,
  isReplyOpen,
  onOpenReply,
}: CommentItemProps) {
  const [replyContent, setReplyContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commentLikes = likes.filter((l) => l.comment_id === comment.id);
  const isLiked = commentLikes.some((l) => l.user_id === currentUserId);
  const commentAttachments = attachments.filter((a) => a.comment_id === comment.id);
  const isAuthor = currentUserId === comment.user_id;
  const isEdited = !!(comment as any).edited_at;

  const handleSendReply = () => {
    const textContent = replyContent.replace(/<[^>]*>/g, "").trim();
    if (!textContent) return;
    onReply(replyContent, comment.id, replyFiles);
    setReplyContent("");
    setReplyFiles([]);
    onOpenReply(null);
  };

  const handleSaveEdit = () => {
    const text = editContent.replace(/<[^>]*>/g, "").trim();
    if (!text) return;
    onEdit(comment.id, editContent);
    setEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasRepliesOrComposer = replies.length > 0 || isReplyOpen;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback
            style={{ backgroundColor: comment.user?.color || "#888" }}
            className="text-white text-xs font-semibold"
          >
            {comment.user?.initials || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.user?.name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "MMM d, h:mm a")}
            </span>
            {comment.is_guest_visible && (
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                Guest visible
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pb-1">
        {editing ? (
          <div>
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              onSend={handleSaveEdit}
              placeholder="Edit update..."
              mentionUsers={mentionUsers}
              showEveryoneOption={true}
            />
            <div className="flex gap-2 mt-1.5 mb-2">
              <button onClick={handleSaveEdit} className="text-xs text-primary font-medium hover:underline">Save</button>
              <button onClick={() => { setEditing(false); setEditContent(comment.content); }} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <TruncatedContent content={comment.content} className="mt-0" />
            <AttachmentList attachments={commentAttachments} />
          </>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className={cn("px-4 pb-2", hasRepliesOrComposer && "border-b border-border")}>
        <div className="flex items-center gap-1 mt-1 -ml-1">
          <button
            onClick={() => onToggleLike(comment.id, isLiked)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
              isLiked
                ? "text-primary font-medium hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ThumbsUp className={cn("h-3.5 w-3.5", isLiked && "fill-primary")} />
            {commentLikes.length > 0 && <span>{commentLikes.length}</span>}
          </button>

          <button
            onClick={() => onOpenReply(isReplyOpen ? null : comment.id)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
            {replies.length > 0 && <span className="text-muted-foreground">· {replies.length}</span>}
          </button>

          {isAuthor && (
            <>
              <button
                onClick={() => { setEditing(true); setEditContent(comment.content); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}

          {isEdited && (
            <span className="text-[10px] text-muted-foreground italic ml-auto">Edited</span>
          )}
        </div>
      </div>

      {/* ── Replies container (visually nested) ── */}
      {hasRepliesOrComposer && (
        <div className="ml-6 mr-3 my-2 border-l-2 border-muted pl-4">
          {/* Existing replies */}
          {replies.length > 0 && (
            <div className="divide-y divide-border/50">
              {replies.map((reply) => {
                const replyLikes = likes.filter((l) => l.comment_id === reply.id);
                const replyIsLiked = replyLikes.some((l) => l.user_id === currentUserId);
                const replyAttachments = attachments.filter((a) => a.comment_id === reply.id);
                return (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    currentUserId={currentUserId}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onToggleLike={onToggleLike}
                    likeCount={replyLikes.length}
                    isLiked={replyIsLiked}
                    attachments={replyAttachments}
                    mentionUsers={mentionUsers}
                  />
                );
              })}
            </div>
          )}

          {/* Inline reply composer (compact, secondary) */}
          {isReplyOpen && (
            <div className="py-2.5">
              <RichTextEditor
                content={replyContent}
                onChange={setReplyContent}
                onSend={handleSendReply}
                placeholder="Write a reply… Use @ to mention"
                isSending={isSending}
                mentionUsers={mentionUsers}
                showEveryoneOption={true}
                hideToolbar={true}
                className="text-[13px] [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:text-[13px]"
              />
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Paperclip className="h-3 w-3" />
                  Attach
                </button>
                <span className="text-[10px] text-muted-foreground">Ctrl+Enter to send</span>
                <button
                  onClick={() => { onOpenReply(null); setReplyContent(""); setReplyFiles([]); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  Cancel
                </button>
              </div>
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {replyFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded">
                      <FileIcon className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[100px]">{f.name}</span>
                      <button onClick={() => setReplyFiles((prev) => prev.filter((_, j) => j !== i))}>
                        <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
