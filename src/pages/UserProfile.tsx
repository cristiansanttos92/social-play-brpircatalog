import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import gamePlaceholder from '@/assets/game-placeholder.jpg';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentsDialog } from '@/components/CommentsDialog';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Tipos
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
  is_favorite: boolean;
  favorite_position: number | null;
}

interface Like {
  id: number;
  user_id: string;
  game_id: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Fetch current user's profile and likes
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profileError) console.error('Error loading current user profile:', profileError);
        else setCurrentUserProfile(profileData);

        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', session.user.id);
        if (likesError) console.error('Error loading likes:', likesError);
        else setLikes(likesData || []);
      }
    };
    fetchCurrentUserData();
  }, []);

  // Fetch the viewed user's profile and games
  useEffect(() => {
    if (!userId) {
      setError('User ID not found.');
      setLoading(false);
      return;
    }

    const fetchProfileAndGames = async () => {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setError('Profile not found.');
        setLoading(false);
        return;
      }
      setProfile(profileData);

      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('profile_id', userId)
        .order('title', { ascending: true });

      if (gamesError) {
        console.error('Error loading games:', gamesError);
        setError('Failed to load games.');
      } else {
        const allGames = gamesData as Game[] || [];
        const favorites = allGames.filter(g => g.is_favorite);
        
        favorites.sort((a, b) => {
          if (a.favorite_position === null) return 1;
          if (b.favorite_position === null) return -1;
          return a.favorite_position - b.favorite_position;
        });

        setFavoriteGames(favorites.slice(0, 10));
        setGames(allGames);
        const uniquePlatforms = [...new Set(allGames.map(game => game.platform))];
        setPlatforms(uniquePlatforms);
      }

      setLoading(false);
    };

    fetchProfileAndGames();
  }, [userId]);

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setIsCommentsDialogOpen(true);
  };

  const toggleLike = async (gameId: string) => {
    if (!currentUserProfile) {
      toast({ title: "Você precisa estar logado para curtir jogos.", variant: "destructive" });
      return;
    }

    const existingLike = likes.find(like => like.game_id === gameId);

    if (existingLike) {
      const { error } = await supabase.from('likes').delete().match({ id: existingLike.id });
      if (error) {
        toast({ title: "Erro ao descurtir", description: error.message, variant: "destructive" });
      } else {
        setLikes(likes.filter(like => like.id !== existingLike.id));
      }
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: currentUserProfile.id, game_id: gameId });
      if (error) {
        toast({ title: "Erro ao curtir", description: error.message, variant: "destructive" });
      } else {
        const { data } = await supabase.from('likes').select('*').eq('user_id', currentUserProfile.id);
        setLikes(data || []);
      }
    }
  };

  const isGameLikedByCurrentUser = (gameId: string) => {
    return likes.some(like => like.game_id === gameId);
  };

  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('pc') || lowerPlatform.includes('windows')) return 'https://img.icons8.com/color/48/windows-10.png';
    if (lowerPlatform.includes('playstation') || lowerPlatform.includes('ps4') || lowerPlatform.includes('ps5')) return 'https://img.icons8.com/color/48/playstation.png';
    if (lowerPlatform.includes('xbox')) return 'https://img.icons8.com/color/48/xbox.png';
    if (lowerPlatform.includes('nintendo') || lowerPlatform.includes('switch')) return 'https://img.icons8.com/color/48/nintendo-switch.png';
    return 'https://img.icons8.com/color/48/game-controller.png';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'playing': return 'bg-primary';
      case 'completed': return 'bg-accent';
      case 'backlog': return 'bg-secondary';
      case 'dropped': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'playing': return 'Jogando';
      case 'completed': return 'Completo';
      case 'backlog': return 'Backlog';
      case 'dropped': return 'Abandonado';
      default: return status;
    }
  };

  const filteredGames = games.filter(game =>
    (statusFilter === "all" || game.status === statusFilter) &&
    (platformFilter === "all" || game.platform === platformFilter) &&
    (game.title.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const FavoriteGamesSection = () => {
    const getRankClasses = (index: number) => {
      switch (index) {
        case 0: return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/50";
        case 1: return "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-500/50";
        case 2: return "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-amber-500/50";
        default: return "bg-slate-700 text-white";
      }
    };

    return (
      <Card className="mb-8 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center"><Star className="text-yellow-400 mr-2"/> Top 10 Favoritos</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteGames.length > 0 ? (
            <div className="flex space-x-3 overflow-x-auto pb-4 justify-center">
              {favoriteGames.map((game, index) => (
                <div key={game.id} className="flex-shrink-0 w-28">
                  <Card className="overflow-hidden relative group h-full">
                    <img src={game.cover_url || gamePlaceholder} alt={game.title} className="aspect-[3/4] w-full h-full object-cover" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
                    <div className={`absolute top-0 left-0 rounded-br-lg px-2 py-1 font-bold text-base ${getRankClasses(index)}`}>
                      {index + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
                      <h3 className="font-semibold text-white text-center text-sm truncate">{game.title}</h3>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Este usuário ainda não marcou seus jogos favoritos.</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header profile={currentUserProfile} />
        <div className="container py-8 text-center"><p>Carregando perfil...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header profile={currentUserProfile} />
        <div className="container py-8 text-center"><p className="text-destructive">{error}</p></div>
      </div>
    );
  }

  if (!profile) {
    return (
        <div className="min-h-screen bg-background">
            <Header profile={currentUserProfile} />
            <div className="container py-8 text-center"><p>Usuário não encontrado.</p></div>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header profile={currentUserProfile} />
        <main className="container py-8">
          <Card className="mb-8 p-6 flex items-center gap-6 border-border/40">
            <Avatar className="h-24 w-24"><AvatarImage src={profile.avatar_url || undefined} alt={profile.username} /><AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div>
              <h1 className="text-3xl font-bold">{profile.display_name || profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-2">{profile.bio}</p>}
            </div>
          </Card>

          <FavoriteGamesSection />

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Pesquisar por título..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              </div>
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plataformas</SelectItem>
                {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" defaultValue="all" value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)} className="justify-start">
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="playing">Jogando</ToggleGroupItem>
              <ToggleGroupItem value="completed">Completo</ToggleGroupItem>
              <ToggleGroupItem value="backlog">Backlog</ToggleGroupItem>
              <ToggleGroupItem value="dropped">Abandonado</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <h2 className="text-2xl font-bold mb-4">Catálogo de Jogos ({filteredGames.length})</h2>
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredGames.map((game) => (
                <Card key={game.id} className="overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 group">
                  <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
                    <img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
                    <Badge className={`absolute bottom-2 left-2 ${getStatusColor(game.status)}`}>{getStatusLabel(game.status)}</Badge>
                  </div>
                  <CardContent className="p-3 flex flex-col flex-grow">
                    <h3 className="font-semibold truncate mb-1">{game.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground truncate mb-2">
                      <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" />
                      <span>{game.platform}</span>
                    </div>
                    {game.rating && <StarRating rating={game.rating} readOnly />}
                    <div className="mt-auto pt-2 flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant={isGameLikedByCurrentUser(game.id) ? "secondary" : "outline"} size="icon" onClick={() => toggleLike(game.id)}>
                            <ThumbsUp className={`h-4 w-4 ${isGameLikedByCurrentUser(game.id) ? 'text-primary' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isGameLikedByCurrentUser(game.id) ? 'Descurtir' : 'Curtir'}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => openCommentsDialog(game)}>
                        <MessageSquare className="h-4 w-4"/> Comentar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">Nenhum jogo encontrado com os filtros selecionados.</p>
          )}
        </main>
      </div>

      <CommentsDialog 
        game={selectedGame}
        currentUser={currentUserProfile}
        isOpen={isCommentsDialogOpen}
        onOpenChange={setIsCommentsDialogOpen}
      />
    </>
  );
};

export default UserProfile;