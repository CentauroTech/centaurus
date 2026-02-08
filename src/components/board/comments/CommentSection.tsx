import { useState, useMemo } from "react";
import { useComments, useAddComment, useDeleteComment, CommentWithUser } from "@/hooks/useComments";
import { useCurrentTeamMember } from "@/hooks/useCurrentTeamMember";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamMembers } from "@/hooks/useWorkspaces";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, FileText } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor, MentionUser, EVERYONE_MENTION } from "./RichTextEditor";
import CommentItem from "./CommentItem";

interface CommentSectionProps {
  taskId: string;
  boardId?: string;
  workspaceName?: string;
  kickoffBrief?: string;
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

export default function CommentSection({ taskId, boardId = "", workspaceName, kickoffBrief }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"team" | "guest">("team");
  
  const { data: comments = [], isLoading } = useComments(taskId);
  const { data: currentUser } = useCurrentTeamMember();
  const { data: teamMembers = [] } = useTeamMembers();
  const { role } = usePermissions();
  const addCommentMutation = useAddComment(taskId, boardId);
  const deleteCommentMutation = useDeleteComment(taskId, boardId);
  
  const centauroMembers = teamMembers.filter(m => m.email && m.email.toLowerCase().endsWith('@centauro.com'));
  const isGuest = role === "guest";

  const mentionUsers: MentionUser[] = teamMembers.map((member) => ({
    id: member.id,
    name: member.name,
    initials: member.initials,
    color: member.color,
  }));

  // Group comments into threads: top-level + replies
  const { topLevelComments, repliesByParentId } = useMemo(() => {
    const top: CommentWithUser[] = [];
    const replies: Record<string, CommentWithUser[]> = {};
    
    for (const comment of comments) {
      if (comment.parent_id) {
        if (!replies[comment.parent_id]) replies[comment.parent_id] = [];
        replies[comment.parent_id].push(comment);
      } else {
        top.push(comment);
      }
    }

    // Sort replies ascending (oldest first)
    for (const key in replies) {
      replies[key].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    
    return { topLevelComments: top, repliesByParentId: replies };
  }, [comments]);

  const expandEveryoneMention = (mentionedIds: string[]): string[] => {
    const hasEveryone = mentionedIds.includes('everyone');
    if (!hasEveryone || centauroMembers.length === 0) {
      return mentionedIds.filter(id => id !== 'everyone');
    }
    const filtered = mentionedIds.filter(id => id !== 'everyone');
    const centauroIds = centauroMembers
      .filter(m => m.id !== currentUser?.id)
      .map(m => m.id);
    return [...new Set([...filtered, ...centauroIds])];
  };

  const handleSendComment = async () => {
    const textContent = newComment.replace(/<[^>]*>/g, '').trim();
    if (!textContent || !currentUser?.id) return;

    let mentionedUserIds = expandEveryoneMention(extractMentionsFromHtml(newComment));
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

  const handleReply = async (content: string, parentId: string) => {
    if (!currentUser?.id) return;

    let mentionedUserIds = expandEveryoneMention(extractMentionsFromHtml(content));
    const shouldBeGuestVisible = isGuest || activeTab === "guest";

    try {
      await addCommentMutation.mutateAsync({
        content,
        userId: currentUser.id,
        mentionedUserIds,
        isGuestVisible: shouldBeGuestVisible,
        parentId,
      });
      toast.success("Reply added");
    } catch (error) {
      console.error("Failed to add reply:", error);
      toast.error("Failed to add reply");
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

  const teamComments = topLevelComments.filter((c) => !c.is_guest_visible);
  const guestComments = topLevelComments.filter((c) => c.is_guest_visible);

  const renderKickoffBrief = () => {
    if (!kickoffBrief) return null;
    return (
      <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Additional Instructions</span>
              <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                From WO Creation
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{kickoffBrief}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentList = (commentList: CommentWithUser[], showKickoffBrief = false) => {
    if (isLoading) {
      return <div className="text-sm text-muted-foreground p-4">Loading comments...</div>;
    }

    if (commentList.length === 0 && !showKickoffBrief) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No comments yet. Start the conversation!
        </div>
      );
    }

    if (commentList.length === 0 && showKickoffBrief && !kickoffBrief) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No comments yet. Start the conversation!
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-4">
        {showKickoffBrief && renderKickoffBrief()}
        {commentList.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUser?.id}
            onDelete={handleDeleteComment}
            onReply={handleReply}
            isReplying={false}
            mentionUsers={mentionUsers}
            isSending={addCommentMutation.isPending}
            replies={repliesByParentId[comment.id] || []}
            isGuest={isGuest}
            activeTab={activeTab}
          />
        ))}
      </div>
    );
  };

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
            placeholder="Write a message... Use @ to mention"
            isSending={addCommentMutation.isPending}
            mentionUsers={mentionUsers}
            showEveryoneOption={true}
          />
          <p className="text-xs text-muted-foreground mt-1">Ctrl+Enter to send</p>
        </div>
      </div>
    );
  }

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
            {renderCommentList(teamComments, true)}
          </TabsContent>
          <TabsContent value="guest" className="m-0 h-full">
            {renderCommentList(guestComments, false)}
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
              ? "Write to guest... Use @ to mention"
              : "Write a team update... Use @ to mention"
          }
          isSending={addCommentMutation.isPending}
          mentionUsers={mentionUsers}
          showEveryoneOption={true}
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
