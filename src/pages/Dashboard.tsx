
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gamepad2, MessageSquare, Star, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Activity {
  id: number;
  created_at: string;
  type: 'game.new' | 'game.update' | 'comment.new';
  metadata: any;
  profiles: Profile;
}

// Componente para um item da atividade
const ActivityItem = ({ activity }: { activity: Activity }) => {
  const { profiles: profile, type, metadata, created_at } = activity;

  const renderContent = () => {
    switch (type) {
      case 'game.new':
        return (
          <p>
            adicionou <Link to={`/games/${metadata.game_id}`} className="font-semibold hover:underline">{metadata.game_title}</Link> ao seu catálogo.
          </p>
        );
      case 'game.update':
        if (metadata.new_status && metadata.old_status !== metadata.new_status) {
          return (
            <p>
              atualizou o status de <Link to={`/games/${metadata.game_id}`} className="font-semibold hover:underline">{metadata.game_title}</Link> para <span className="font-semibold">{getStatusLabel(metadata.new_status)}</span>.
            </p>
          );
        }
        if (metadata.new_rating && metadata.old_rating !== metadata.new_rating) {
          return (
            <p>
              avaliou <Link to={`/games/${metadata.game_id}`} className="font-semibold hover:underline">{metadata.game_title}</Link> com {metadata.new_rating} estrelas.
            </p>
          );
        }
        return null; // Não renderiza se não houver mudança relevante
      case 'comment.new':
        return (
          <p>
            comentou em <Link to={`/games/${metadata.game_id}`} className="font-semibold hover:underline">{metadata.game_title}</Link>.
          </p>
        );
      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div className="flex items-start gap-4 py-4">
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Link to={`/profile/${profile.id}`} className="font-bold hover:underline">{profile.display_name || profile.username}</Link>
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {content}
        </div>
      </div>
    </div>
  );
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "playing": return "Jogando";
    case "completed": return "Completo";
    case "backlog": return "Backlog";
    case "dropped": return "Abandonado";
    default: return status;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setLoading(true);
      await Promise.all([
        loadCurrentUserProfile(session.user.id),
        loadActivities(),
      ]);
      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const loadCurrentUserProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      console.error("Error loading current user profile:", error);
      navigate("/profile-setup");
    } else {
      setCurrentUserProfile(data);
    }
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading activities:', error);
    } else {
      setActivities(data as any[] || []);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header profile={currentUserProfile} />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold">Feed de Atividades</h1>
                <p className="text-muted-foreground">Veja o que a comunidade está jogando e comentando.</p>
            </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando atividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">Nenhuma atividade ainda</h3>
            <p className="text-muted-foreground mt-2">Seja o primeiro a adicionar um jogo ou fazer um comentário!</p>
            <Button className="mt-4" onClick={() => navigate("/catalog")}><Plus className="mr-2 h-4 w-4"/>Adicionar Jogo</Button>
          </div>
        ) : (
          <Card>
            <CardContent className="divide-y">
              {activities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
