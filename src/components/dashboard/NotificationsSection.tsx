import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MessageSquare, ThumbsUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Notification {
  id: number;
  type: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const NotificationsSection = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (id, username, display_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading notifications:', error);
    } else {
      setNotifications(data as any || []);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: number) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('like')) return <ThumbsUp className="h-4 w-4" />;
    if (type.includes('comment')) return <MessageSquare className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.display_name || notification.actor.username;

    switch (notification.type) {
      case 'like.game':
        return (
          <>
            <strong>{actorName}</strong> curtiu seu jogo{' '}
            <strong>{notification.metadata.game_title}</strong>
          </>
        );
      case 'comment.reply':
        return (
          <>
            <strong>{actorName}</strong> comentou em{' '}
            <strong>{notification.metadata.game_title}</strong>
          </>
        );
      default:
        return `Notificação de ${actorName}`;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando notificações...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Marcar todas como lidas
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhuma notificação ainda
          </p>
        ) : (
          <div className="space-y-4">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={notification.actor.avatar_url || undefined} />
                  <AvatarFallback>
                    {notification.actor.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getNotificationIcon(notification.type)}
                    <span className="text-sm">
                      {getNotificationText(notification)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
