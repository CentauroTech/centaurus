import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Filter, CheckCheck, ArrowLeft, AtSign, UserPlus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMarkNotificationUnread,
  useDeleteNotification,
  Notification,
} from '@/hooks/useNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { useAccessibleWorkspaces } from '@/hooks/useAccessibleWorkspaces';
import { InboxChat } from '@/components/inbox/InboxChat';
import { cn } from '@/lib/utils';

function createBoardSlug(workspaceName: string, boardName: string): string {
  const wsPrefix = workspaceName.toLowerCase().replace(/\s+/g, '-').slice(0, 3);
  const boardSlug = boardName.toLowerCase().replace(/\s+/g, '-');
  return `${wsPrefix}-${boardSlug}`;
}

function extractInvoiceId(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/invoice_id::([a-f0-9-]+)/);
  return match ? match[1] : null;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markUnread = useMarkNotificationUnread();
  const deleteNotification = useDeleteNotification();
  const { role } = usePermissions();
  const { data: workspaces } = useAccessibleWorkspaces();

  const [tab, setTab] = useState<string>('all');

  const boardIdToSlug = useMemo(() => {
    const map = new Map<string, string>();
    workspaces?.forEach(ws => {
      ws.boards.forEach(board => {
        map.set(board.id, createBoardSlug(ws.name, board.name));
      });
    });
    return map;
  }, [workspaces]);

  const filteredNotifications = notifications?.filter((n) => {
    if (tab === 'all') return true;
    if (tab === 'mention') return n.type === 'mention';
    if (tab === 'assignment') return n.type === 'assignment';
    return true;
  }) ?? [];

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const handleNotificationClick = (notification: Notification) => {
    markRead.mutate(notification.id);

    const invoiceId = extractInvoiceId(notification.message);
    if (notification.type.startsWith('invoice_')) {
      if (role === 'guest') {
        navigate(invoiceId
          ? `/guest-dashboard?tab=invoices&invoice=${invoiceId}`
          : `/guest-dashboard?tab=invoices`);
      } else {
        navigate(invoiceId ? `/billing?invoice=${invoiceId}` : `/billing`);
      }
      return;
    }

    if (notification.task_id) {
      if (role === 'guest') {
        navigate(`/guest-dashboard?task=${notification.task_id}`);
      } else {
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

  const isNotificationsTab = tab !== 'messages';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Inbox
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          {isNotificationsTab && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      <main className={cn("mx-auto px-4 py-6", tab === 'messages' ? 'max-w-5xl' : 'max-w-3xl')}>
        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Filter className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="mention" className="gap-2">
              <AtSign className="w-4 h-4" />
              Mentions
            </TabsTrigger>
            <TabsTrigger value="assignment" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Notifications tabs */}
          <TabsContent value="all">
            <NotificationsList
              notifications={filteredNotifications}
              isLoading={isLoading}
              filter="all"
              onMarkRead={(id) => markRead.mutate(id)}
              onMarkUnread={(id) => markUnread.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
              onClick={handleNotificationClick}
            />
          </TabsContent>
          <TabsContent value="mention">
            <NotificationsList
              notifications={filteredNotifications}
              isLoading={isLoading}
              filter="mention"
              onMarkRead={(id) => markRead.mutate(id)}
              onMarkUnread={(id) => markUnread.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
              onClick={handleNotificationClick}
            />
          </TabsContent>
          <TabsContent value="assignment">
            <NotificationsList
              notifications={filteredNotifications}
              isLoading={isLoading}
              filter="assignment"
              onMarkRead={(id) => markRead.mutate(id)}
              onMarkUnread={(id) => markUnread.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
              onClick={handleNotificationClick}
            />
          </TabsContent>

          {/* Messages tab */}
          <TabsContent value="messages">
            <InboxChat />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function NotificationsList({
  notifications,
  isLoading,
  filter,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onClick,
}: {
  notifications: Notification[];
  isLoading: boolean;
  filter: string;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (n: Notification) => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No notifications</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {filter === 'all'
            ? "You're all caught up!"
            : `No ${filter} notifications yet`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onDelete={onDelete}
          onClick={onClick}
          showActions
        />
      ))}
    </div>
  );
}

