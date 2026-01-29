import { formatDistanceToNow } from 'date-fns';
import { AtSign, UserPlus, MoreHorizontal, Mail, MailOpen, Trash2, FileText, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  showActions?: boolean;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'mention':
      return <AtSign className="w-4 h-4" />;
    case 'assignment':
      return <UserPlus className="w-4 h-4" />;
    case 'invoice_submitted':
      return <FileText className="w-4 h-4" />;
    case 'invoice_approved':
      return <CheckCircle2 className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />;
    case 'invoice_rejected':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'invoice_paid':
      return <DollarSign className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />;
    default:
      return <Mail className="w-4 h-4" />;
  }
};

export function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onClick,
  showActions = false,
}: NotificationItemProps) {
  const typeIcon = getNotificationIcon(notification.type);

  const triggeredBy = notification.triggered_by;
  const avatarColor = triggeredBy?.color || 'hsl(209, 100%, 46%)';
  const avatarInitials = triggeredBy?.initials || '??';

  const handleClick = () => {
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onClick?.(notification);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group",
        notification.is_read 
          ? "bg-background hover:bg-muted/50" 
          : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {avatarInitials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{typeIcon}</span>
          <p className={cn(
            "text-sm truncate",
            !notification.is_read && "font-medium"
          )}>
            {notification.title}
          </p>
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        {/* Board name badge */}
        {notification.board_name && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {notification.board_name}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      )}

      {/* Actions dropdown */}
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {notification.is_read ? (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onMarkUnread?.(notification.id);
              }}>
                <Mail className="mr-2 h-4 w-4" />
                Mark as unread
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onMarkRead?.(notification.id);
              }}>
                <MailOpen className="mr-2 h-4 w-4" />
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(notification.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
