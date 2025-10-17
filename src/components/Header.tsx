
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gamepad2, Library, LogOut, User, Users, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Notification {
  id: number;
  user_id: string;
  actor_id: string;
  type: 'comment.reply' | 'game.like';
  metadata: any;
  is_read: boolean;
  created_at: string;
  profiles: Profile; // Representa o ator
}

interface HeaderProps {
  profile: Profile | null;
}

const Header = ({ profile }: HeaderProps) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (profile) {
      fetchNotifications();

      const channel = supabase
        .channel(`notifications:${profile.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          (payload) => {
            // Apenas uma maneira simples de refetch, o ideal seria mais otimizado
            fetchNotifications();
            toast({ title: "Nova notificação!" });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*, profiles:actor_id(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data as any || []);
    }
  };

  const markNotificationsAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error("Error marking notifications as read:", error);
    } else {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Até logo!", description: "Você saiu da sua conta." });
    navigate("/auth");
  };

  const getInitials = () => {
    const name = profile?.display_name || profile?.username || "";
    return name.substring(0, 2).toUpperCase();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotificationText = (notification: Notification) => {
    const actorName = notification.profiles.display_name || notification.profiles.username;
    switch (notification.type) {
      case 'comment.reply':
        return (
          <p className="text-sm">
            <Link to={`/profile/${notification.actor_id}`} className="font-bold hover:underline">{actorName}</Link>
            {' '}
            comentou no jogo {' '}
            <span className="font-semibold">{notification.metadata.game_title}</span> em que você também comentou.
          </p>
        );
      case 'game.like':
        return (
          <p className="text-sm">
            <Link to={`/profile/${notification.actor_id}`} className="font-bold hover:underline">{actorName}</Link>
            {' '}
            curtiu seu jogo {' '}
            <span className="font-semibold">{notification.metadata.game_title}</span>.
          </p>
        );
      default:
        return <p className="text-sm">Nova notificação</p>;
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent"><Gamepad2 className="h-5 w-5 text-white" /></div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">BrpirCatalog</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="gap-2"><Library className="h-4 w-4" />Meu Catálogo</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/members")} className="gap-2"><Users className="h-4 w-4" />Membros</Button>

          <Popover onOpenChange={(open) => { if (open) markNotificationsAsRead(); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="p-4">
                <h4 className="font-medium leading-none">Notificações</h4>
              </div>
              <div className="p-1">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 rounded-lg ${!n.is_read ? 'bg-muted/50' : ''}`}>
                      {renderNotificationText(n)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground p-4">Nenhuma notificação ainda.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8"><AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} /><AvatarFallback>{getInitials()}</AvatarFallback></Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.display_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">@{profile?.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}><User className="mr-2 h-4 w-4" /><span>Editar Perfil</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /><span>Sair</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
