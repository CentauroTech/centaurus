import { useState, useRef } from 'react';
import { Send, AtSign, MessageSquare, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CommentWithUser } from '@/hooks/useComments';
import { RichTextEditor, RichTextDisplay } from './RichTextEditor';
import { ExpandableComment } from './ExpandableComment';
interface CommentSectionProps {
  title: string;
  icon: 'team' | 'guest';
  comments: CommentWithUser[];
  isLoading: boolean;
  onSendComment: (content: string, mentionedUserIds: string[], isGuestVisible: boolean) => Promise<void>;
  teamMembers: { id: string; name: string; initials: string; color: string }[];
  isGuestVisible: boolean;
  emptyMessage?: string;
}

export function CommentSection({
  title,
  icon,
  comments,
  isLoading,
  onSendComment,
  teamMembers,
  isGuestVisible,
  emptyMessage = 'No updates yet',
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const mentionButtonRef = useRef<HTMLButtonElement>(null);

  const filteredMentionUsers = teamMembers?.filter(member =>
    mentionSearch === '' || member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 6) || [];

  // Extract mentions from HTML content
  const extractMentionsFromHtml = (html: string): string[] => {
    const mentionPattern = /@([\w]+(?:\s[\w]+)?)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(html)) !== null) {
      mentionedNames.push(match[1]);
    }

    const mentionedUserIds: string[] = [];
    if (teamMembers && mentionedNames.length > 0) {
      for (const name of mentionedNames) {
        const member = teamMembers.find(m =>
          m.name.toLowerCase() === name.toLowerCase() ||
          m.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
        );
        if (member) {
          mentionedUserIds.push(member.id);
        }
      }
    }
    return mentionedUserIds;
  };

  const handleSendComment = async () => {
    // Strip HTML tags for empty check
    const textContent = newComment.replace(/<[^>]*>/g, '').trim();
    if (!textContent || isSending) return;

    const mentionedUserIds = extractMentionsFromHtml(newComment);

    setIsSending(true);
    try {
      await onSendComment(newComment.trim(), mentionedUserIds, isGuestVisible);
      setNewComment('');
      setShowMentions(false);
    } finally {
      setIsSending(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    // Insert mention at the end of current content
    const mentionHtml = `<span class="text-primary font-medium bg-primary/10 px-1 rounded">@${user.name}</span>&nbsp;`;
    setNewComment(prev => {
      // Remove empty paragraph at end if exists
      const cleaned = prev.replace(/<p><\/p>$/, '');
      return cleaned + mentionHtml;
    });
    setShowMentions(false);
    setMentionSearch('');
  };

  const renderCommentContent = (content: string): React.ReactNode => {
    // Check if content is HTML (has tags)
    if (content.includes('<')) {
      // Process mentions in HTML content
      const processedContent = content.replace(
        /@([\w]+(?:\s[\w]+)?)/g,
        '<span class="text-primary font-medium bg-primary/10 px-1 rounded">@$1</span>'
      );
      return <RichTextDisplay content={processedContent} />;
    }
    
    // Plain text fallback - render with mention highlighting
    const parts = content.split(/(@[\w]+(?:\s[\w]+)?)/g);
    return (
      <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
                {part}
              </span>
            );
          }
          return part;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        {icon === 'team' ? (
          <Users className="w-4 h-4 text-muted-foreground" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{title}</span>
        {isGuestVisible && (
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            Visible to Guest
          </Badge>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Loading...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback
                    style={{ backgroundColor: comment.user?.color || 'hsl(0, 0%, 50%)' }}
                    className="text-xs text-white"
                  >
                    {comment.user?.initials || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <ExpandableComment maxLines={20}>
                    {renderCommentContent(comment.content)}
                  </ExpandableComment>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border bg-card shrink-0">
        <div className="relative">
          <RichTextEditor
            content={newComment}
            onChange={setNewComment}
            onSend={handleSendComment}
            placeholder={`Write ${isGuestVisible ? 'to guest' : 'a team update'}... Use @ to mention`}
            isSending={isSending}
          />
          
          {/* Mention button */}
          <div className="absolute top-1.5 right-24 z-10">
            <Button
              ref={mentionButtonRef}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowMentions(!showMentions)}
            >
              <AtSign className="w-4 h-4" />
            </Button>
          </div>

          {showMentions && filteredMentionUsers.length > 0 && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-popover border border-border rounded-lg shadow-lg z-[100]">
              <div className="p-2 text-xs text-muted-foreground border-b border-border">
                {mentionSearch ? `Matching "${mentionSearch}"` : 'Select a person'}
              </div>
              <div className="p-2">
                <input
                  type="text"
                  value={mentionSearch}
                  onChange={(e) => setMentionSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-2 py-1 text-sm border border-border rounded mb-2 bg-background"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredMentionUsers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm text-left transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback style={{ backgroundColor: member.color }} className="text-xs text-white">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}