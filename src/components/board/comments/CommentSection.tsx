import { useState, useRef } from 'react';
import { Send, AtSign, MessageSquare, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CommentWithUser } from '@/hooks/useComments';

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

  // Extract mentions from plain text content
  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@([\w]+(?:\s[\w]+)?)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
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
    const textContent = newComment.trim();
    if (!textContent || isSending) return;

    const mentionedUserIds = extractMentions(newComment);

    setIsSending(true);
    try {
      await onSendComment(textContent, mentionedUserIds, isGuestVisible);
      setNewComment('');
      setShowMentions(false);
    } finally {
      setIsSending(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    setNewComment(prev => prev + `@${user.name} `);
    setShowMentions(false);
    setMentionSearch('');
  };

  const renderCommentContent = (content: string): React.ReactNode => {
    // Strip HTML tags if any exist (for legacy content)
    const plainText = content.replace(/<[^>]*>/g, '');
    
    // Render with mention highlighting
    const parts = plainText.split(/(@[\w]+(?:\s[\w]+)?)/g);
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
{renderCommentContent(comment.content)}
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
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Write ${isGuestVisible ? 'to guest' : 'a team update'}... Use @ to mention`}
              className="min-h-[80px] resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                ref={mentionButtonRef}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowMentions(!showMentions)}
              >
                <AtSign className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={handleSendComment}
                disabled={isSending || !newComment.trim()}
                className="h-8 w-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
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