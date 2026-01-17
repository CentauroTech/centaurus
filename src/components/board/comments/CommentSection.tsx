import { useState, useRef } from 'react';
import { Send, AtSign, Smile, Paperclip, MessageSquare, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredMentionUsers = teamMembers?.filter(member =>
    mentionSearch === '' || member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 6) || [];

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
      setMentionCursorPosition(cursorPos - mentionMatch[0].length);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSending) return;

    const mentionPattern = /@([\w]+(?:\s[\w]+)?)/g;
    const mentionedNames: string[] = [];
    let match;
    while ((match = mentionPattern.exec(newComment)) !== null) {
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

    setIsSending(true);
    try {
      await onSendComment(newComment.trim(), mentionedUserIds, isGuestVisible);
      setNewComment('');
      setShowMentions(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSendComment();
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { id: string; name: string }) => {
    const textBeforeMention = newComment.substring(0, mentionCursorPosition);
    const textAfterCursor = newComment.substring(inputRef.current?.selectionStart || newComment.length);
    const cleanAfterText = textAfterCursor.replace(/^@?\w*/, '');

    setNewComment(`${textBeforeMention}@${user.name} ${cleanAfterText}`);
    setShowMentions(false);
    setMentionSearch('');

    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = textBeforeMention.length + user.name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderCommentWithMentions = (content: string): React.ReactNode => {
    const parts = content.split(/(@[\w]+(?:\s[\w]+)?)/g);

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
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

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Loading...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
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
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {renderCommentWithMentions(comment.content)}
                  </div>
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
      </ScrollArea>

      <div className="p-3 border-t border-border bg-card">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={handleCommentChange}
            onKeyDown={handleKeyDown}
            placeholder={`Write ${isGuestVisible ? 'to guest' : 'a team update'}... Use @ to mention`}
            className="w-full min-h-[60px] p-3 pr-20 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setShowMentions(!showMentions);
                setMentionSearch('');
                setMentionCursorPosition(newComment.length);
                if (!showMentions) {
                  setNewComment(prev => prev + '@');
                  inputRef.current?.focus();
                }
              }}
            >
              <AtSign className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleSendComment}
              disabled={!newComment.trim() || isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {showMentions && filteredMentionUsers.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <div className="p-2 text-xs text-muted-foreground border-b border-border">
                {mentionSearch ? `Matching "${mentionSearch}"` : 'Select a person'}
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
