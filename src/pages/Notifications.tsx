import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Filter, CheckCheck, ArrowLeft, AtSign, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMarkNotificationUnread,
  useDeleteNotification,
} from '@/hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markUnread = useMarkNotificationUnread();
  const deleteNotification = useDeleteNotification();
  
  const [filter, setFilter] = useState<'all' | 'mention' | 'assignment'>('all');

  const filteredNotifications = notifications?.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  }) ?? [];

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

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
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
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

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
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
          </TabsList>
        </Tabs>

        {/* Notifications list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {filter === 'all' 
                ? "You're all caught up!" 
                : `No ${filter} notifications yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markRead.mutate(id)}
                onMarkUnread={(id) => markUnread.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
                showActions
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
