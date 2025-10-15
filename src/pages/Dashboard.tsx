import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gamepad2, TrendingUp, Users, Award, MessageSquare, Sparkles } from "lucide-react";
import gamePlaceholder from "@/assets/game-placeholder.jpg";
import { StarRating } from "@/components/ui/star-rating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CommentsDialog } from "@/components/CommentsDialog";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status: string;
  rating: number | null;
  genre: string | null;
  profile_id?: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string | null;
  };
}

interface CommonGame extends Game {}

interface CatalogStats {
  total: number;
  playing: number;
  completed: number;
  backlog: number;
  dropped: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [commonGames, setCommonGames] = useState<CommonGame[]>([]);
  const [stats, setStats] = useState<CatalogStats>({ total: 0, playing: 0, completed: 0, backlog: 0, dropped: 0 });
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);

  const [recentlyCommentedGames, setRecentlyCommentedGames] = useState<any[]>([]);
  const [recentGamesFromOthers, setRecentGamesFromOthers] = useState<Game[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setIsCommentsDialogOpen(true);
  };

  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('pc') || lowerPlatform.includes('windows')) return 'https://img.icons8.com/color/48/windows-10.png';
    if (lowerPlatform.includes('playstation') || lowerPlatform.includes('ps4') || lowerPlatform.includes('ps5')) return 'https://img.icons8.com/color/48/playstation.png';
    if (lowerPlatform.includes('xbox')) return 'https://img.icons8.com/color/48/xbox.png';
    if (lowerPlatform.includes('nintendo') || lowerPlatform.includes('switch')) return 'https://img.icons8.com/color/48/nintendo-switch.png';
    return 'https://img.icons8.com/color/48/game-controller.png';
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

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await Promise.all([
      loadProfile(session.user.id),
      loadGames(session.user.id),
      loadAllProfiles(session.user.id),
      loadRecentlyCommentedGames(),
      loadRecentGamesFromOthers(session.user.id),
    ]);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      console.error("Error loading profile:", error);
      navigate("/profile-setup");
      return;
    }
    setProfile(data);
  };

  const loadAllProfiles = async (currentUserId: string) => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) console.error("Error loading profiles:", error);
    else setAllProfiles(data?.filter(p => p.id !== currentUserId) || []);
  };

  const loadGames = async (userId: string) => {
    const { data, error } = await supabase.from("games").select("*").eq("profile_id", userId).order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading games:", error);
      return;
    }
    setGames(data || []);
    const newStats: CatalogStats = { total: data?.length || 0, playing: data?.filter((g) => g.status === "playing").length || 0, completed: data?.filter((g) => g.status === "completed").length || 0, backlog: data?.filter((g) => g.status === "backlog").length || 0, dropped: data?.filter((g) => g.status === "dropped").length || 0 };
    setStats(newStats);
  };

  const loadRecentlyCommentedGames = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url), games(*, profiles(display_name))')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading recently commented games:', error);
    } else {
      const uniqueGames = data.reduce((acc, comment) => {
        if (comment.games && !acc.some(g => g.id === comment.games.id)) {
          acc.push({ ...comment.games, latest_comment: comment });
        }
        return acc;
      }, [] as any[]);
      setRecentlyCommentedGames(uniqueGames);
    }
  };

  const loadRecentGamesFromOthers = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('games')
      .select('*, profiles(id, username, display_name)')
      .not('profile_id', 'eq', currentUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading recent games from others:", error);
    } else {
      setRecentGamesFromOthers(data as any || []);
    }
  };

  const handleCompare = async (otherUserId: string) => {
    if (!otherUserId) {
      setCommonGames([]);
      return;
    }
    setComparisonLoading(true);
    const { data: otherUserGames, error } = await supabase.from("games").select("*, profiles(display_name)").eq("profile_id", otherUserId);
    if (error) {
      console.error("Error loading other user's games:", error);
      setComparisonLoading(false);
      return;
    }
    const currentUserGameTitles = new Set(games.map(g => g.title.toLowerCase()));
    const foundCommonGames = otherUserGames?.filter(otherGame => currentUserGameTitles.has(otherGame.title.toLowerCase())) || [];
    setCommonGames(foundCommonGames);
    setComparisonLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Gamepad2 className="h-12 w-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const topRatedGames = games.filter((g) => g.rating !== null).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
  const recentGames = games.slice(0, 5);
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header profile={profile} />
        <main className="container py-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Bem-vindo, {profile?.display_name || profile?.username}!</h1>
            <p className="text-muted-foreground">Aqui está um resumo da sua atividade e da comunidade.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary/20"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Jogos</CardTitle><Gamepad2 className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">{stats.playing} jogando agora</p></CardContent></Card>
            <Card className="border-accent/20"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Concluídos</CardTitle><Award className="h-4 w-4 text-accent" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.completed}</div><Progress value={completionRate} className="mt-2" /><p className="text-xs text-muted-foreground mt-1">{completionRate}% do catálogo</p></CardContent></Card>
            <Card className="border-primary/20"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Backlog</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.backlog}</div><p className="text-xs text-muted-foreground">Jogos para jogar</p></CardContent></Card>
            <Card className="border-accent/20"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Explorar Perfis</CardTitle><Users className="h-4 w-4 text-accent" /></CardHeader><CardContent className="space-y-4"><Select onValueChange={setSelectedProfileId}><SelectTrigger><SelectValue placeholder="Selecione um perfil..." /></SelectTrigger><SelectContent>{allProfiles.map(p => (<SelectItem key={p.id} value={p.id}>{p.display_name || p.username}</SelectItem>))}</SelectContent></Select><div className="flex gap-2"><Button onClick={() => selectedProfileId && handleCompare(selectedProfileId)} disabled={!selectedProfileId || comparisonLoading} className="w-full" variant="secondary">{comparisonLoading ? "Comparando..." : "Comparar Jogos"}</Button><Button onClick={() => selectedProfileId && navigate(`/user/${selectedProfileId}/catalog`)} disabled={!selectedProfileId} className="w-full">Ver Catálogo</Button></div></CardContent></Card>
          </div>

          {commonGames.length > 0 && (<Card><CardHeader><CardTitle>Jogos em comum com {allProfiles.find(p => p.id === selectedProfileId)?.display_name}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{commonGames.map(game => (<div key={game.id} className="relative group"><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-full aspect-[3/4] object-cover rounded-md transition-transform group-hover:scale-105"/><div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-center rounded-b-md"><p className="text-sm font-bold truncate">{game.title}</p></div></div>))}</CardContent></Card>)}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-primary/20">
              <CardHeader><CardTitle>⭐ Suas Melhores Avaliações</CardTitle></CardHeader>
              <CardContent>{topRatedGames.length > 0 ? (<div className="space-y-3">{topRatedGames.map((game) => (<div key={game.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-12 rounded object-cover"/><div className="flex-1 min-w-0"><p className="font-medium truncate">{game.title}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" /><span>{game.platform}</span></div></div>{game.rating && <StarRating rating={game.rating} className="ml-auto" />}
                <Button variant="ghost" size="sm" onClick={() => openCommentsDialog(game)}>Comentar</Button></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">Avalie seus jogos para ver os melhores aqui!</p>)}
              </CardContent>
            </Card>
            <Card className="border-accent/20">
              <CardHeader><CardTitle>🔍 Seus Jogos Recentes</CardTitle></CardHeader>
              <CardContent>{recentGames.length > 0 ? (<div className="space-y-3">{recentGames.map((game) => (<div key={game.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-12 rounded object-cover"/><div className="flex-1 min-w-0"><p className="font-medium truncate">{game.title}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" /><span>{game.platform}</span></div></div><Badge variant="outline" className="ml-auto">{getStatusLabel(game.status)}</Badge>
                <Button variant="ghost" size="sm" onClick={() => openCommentsDialog(game)}>Comentar</Button></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">Adicione jogos ao seu catálogo para começar!</p>)}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center"><MessageSquare className="h-5 w-5 text-primary mr-2"/> <CardTitle>Atividade da Comunidade</CardTitle></CardHeader>
              <CardContent>{recentlyCommentedGames.length > 0 ? (<div className="space-y-3">{recentlyCommentedGames.map((game) => (<div key={game.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-16 rounded object-cover"/><div className="flex-1 min-w-0"><p className="font-medium truncate">{game.title}</p><p className="text-xs text-muted-foreground">Comentado por{' '}<span className="font-semibold">{game.latest_comment.profiles.username}</span> no catálogo de{' '}<span className="font-semibold">{game.profiles.display_name}</span></p><p className="text-sm truncate mt-1">"{game.latest_comment.comment}"</p></div>
                <Button variant="ghost" size="sm" onClick={() => openCommentsDialog(game)}>Ver</Button></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">Nenhuma atividade recente.</p>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center"><Sparkles className="h-5 w-5 text-accent mr-2"/> <CardTitle>Adições na Comunidade</CardTitle></CardHeader>
              <CardContent>{recentGamesFromOthers.length > 0 ? (<div className="space-y-3">{recentGamesFromOthers.map((game) => (<div key={game.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-16 rounded object-cover"/><div className="flex-1 min-w-0"><p className="font-medium truncate">{game.title}</p><p className="text-xs text-muted-foreground">Adicionado por{' '}<Link to={`/user/${game.profiles?.id}/catalog`} className="font-semibold hover:underline">{game.profiles?.display_name || game.profiles?.username}</Link></p></div>
                <Button variant="ghost" size="sm" onClick={() => openCommentsDialog(game)}>Comentar</Button></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">Nenhuma adição recente na comunidade.</p>)}
              </CardContent>
            </Card>
          </div>

        </main>
      </div>

      <CommentsDialog 
        game={selectedGame}
        currentUser={profile}
        isOpen={isCommentsDialogOpen}
        onOpenChange={setIsCommentsDialogOpen}
        onCommentsUpdated={loadRecentlyCommentedGames}
      />
    </>
  );
};

export default Dashboard;