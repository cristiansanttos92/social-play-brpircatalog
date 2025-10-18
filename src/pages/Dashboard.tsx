
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PersonalStats } from '@/components/dashboard/PersonalStats';
import { NotificationsSection } from '@/components/dashboard/NotificationsSection';
import { ContinuePlaying } from '@/components/dashboard/ContinuePlaying';
import { FriendRecommendations } from '@/components/dashboard/FriendRecommendations';
import { CommonGames } from '@/components/dashboard/CommonGames';
import { FriendRankings } from '@/components/dashboard/FriendRankings';

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
  type: 'game.new' | 'game.update' | 'comment.new' | 'like.game';
  metadata: any;
  profiles: Profile;
}

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status: string;
  rating: number | null;
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
      case 'like.game':
        return (
          <p>
            curtiu o jogo <Link to={`/games/${metadata.game_id}`} className="font-semibold hover:underline">{metadata.game_title}</Link>.
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
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    playingCount: 0,
    completedCount: 0,
    backlogCount: 0,
    droppedCount: 0,
    averageRating: 0,
  });

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
        loadGames(session.user.id),
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

  const loadGames = async (userId: string) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('profile_id', userId);

    if (error) {
      console.error('Error loading games:', error);
    } else {
      const allGames = data || [];
      setGames(allGames);

      const playing = allGames.filter(g => g.status === 'playing').length;
      const completed = allGames.filter(g => g.status === 'completed').length;
      const backlog = allGames.filter(g => g.status === 'backlog').length;
      const dropped = allGames.filter(g => g.status === 'dropped').length;
      const ratedGames = allGames.filter(g => g.rating !== null);
      const avgRating = ratedGames.length > 0
        ? ratedGames.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGames.length
        : 0;

      setStats({
        totalGames: allGames.length,
        playingCount: playing,
        completedCount: completed,
        backlogCount: backlog,
        droppedCount: dropped,
        averageRating: avgRating,
      });
    }
  };

  const playingGames = games.filter(g => g.status === 'playing').slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={currentUserProfile} />
      <main className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo de volta! Veja suas estatísticas e atividades da comunidade.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <>
            <PersonalStats
              totalGames={stats.totalGames}
              playingCount={stats.playingCount}
              completedCount={stats.completedCount}
              backlogCount={stats.backlogCount}
              droppedCount={stats.droppedCount}
              averageRating={stats.averageRating}
            />

            <div className="grid gap-8 lg:grid-cols-3 mb-8">
              <div className="lg:col-span-2">
                {currentUserProfile && (
                  <NotificationsSection userId={currentUserProfile.id} />
                )}
              </div>
              <div>
                {currentUserProfile && playingGames.length > 0 && (
                  <ContinuePlaying games={playingGames} />
                )}
              </div>
            </div>

            {currentUserProfile && (
              <>
                <FriendRecommendations userId={currentUserProfile.id} />
                <CommonGames userId={currentUserProfile.id} />
                <FriendRankings userId={currentUserProfile.id} />
              </>
            )}

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Feed de Atividades</h2>
                {activities.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">Nenhuma atividade ainda</h3>
                    <p className="text-muted-foreground mt-2">Seja o primeiro a adicionar um jogo ou fazer um comentário!</p>
                    <Button className="mt-4" onClick={() => navigate("/catalog")}><Plus className="mr-2 h-4 w-4"/>Adicionar Jogo</Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activities.map(activity => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
