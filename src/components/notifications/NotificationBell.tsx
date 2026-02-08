import { useState, useMemo } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useNotifications, 
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  Notification,
} from '@/hooks/useNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

// Generate board slug matching Index.tsx format: wsPrefix-boardSlug
function createBoardSlug(workspaceName: string, boardName: string): string {
  const wsPrefix = workspaceName.toLowerCase().replace(/\s+/g, '-').slice(0, 3);
  const boardSlug = boardName.toLowerCase().replace(/\s+/g, '-');
  return `${wsPrefix}-${boardSlug}`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { role } = usePermissions();
  const { data: workspaces } = useAccessibleWorkspaces();

  // Build boardId -> slug map
  const boardIdToSlug = useMemo(() => {
    const map = new Map<string, string>();
    workspaces?.forEach(ws => {
      ws.boards.forEach(board => {
        map.set(board.id, createBoardSlug(ws.name, board.name));
      });
    });
    return map;
  }, [workspaces]);

  const recentNotifications = notifications?.slice(0, 10) ?? [];

  const handleNotificationClick = (notification: Notification) => {
    markRead.mutate(notification.id);
    setOpen(false);
    
    if (notification.task_id) {
      if (role === 'guest') {
        navigate(`/guest-dashboard?task=${notification.task_id}`);
      } else {
        // Look up the correct slug using the board ID
        const boardId = notification.task?.group?.board?.id;
        const slug = boardId ? boardIdToSlug.get(boardId) : null;
        if (slug) {
          navigate(`/${slug}?task=${notification.task_id}`);
        } else {
          navigate(`/?task=${notification.task_id}`);
        }
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center",
              "min-w-[18px] h-[18px] px-1 rounded-full",
              "bg-destructive text-destructive-foreground text-[10px] font-medium"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You'll see mentions and assignments here
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {recentNotifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              className="w-full text-sm" 
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
