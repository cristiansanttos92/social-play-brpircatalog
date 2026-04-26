import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Clock3,
  Gamepad2,
  Heart,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  UserRound,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StarRating } from '@/components/ui/star-rating';
import { CommentsDialog } from '@/components/CommentsDialog';
import { PageContent, PageHeader } from '@/components/PageShell';
import { getPlatformIcon } from '@/lib/platform-icons';
import { toast } from '@/hooks/use-toast';
import gamePlaceholder from '@/assets/game-placeholder.jpg';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  is_profile_public?: boolean | null;
  show_ratings?: boolean | null;
  show_favorites?: boolean | null;
  allow_catalog_comments?: boolean | null;
  allow_catalog_copy?: boolean | null;
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
  created_at?: string | null;
}

interface Like {
  id: number;
  user_id: string;
  game_id: string;
}

interface Comment {
  id: string;
  game_id: string;
}

interface ProfileStat {
  label: string;
  value: string | number;
  icon: typeof Gamepad2;
  helper: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  playing: { label: 'Jogando', className: 'bg-primary' },
  completed: { label: 'Completo', className: 'bg-accent' },
  backlog: { label: 'Backlog', className: 'bg-secondary' },
  dropped: { label: 'Abandonado', className: 'bg-destructive' },
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<Like[]>([]);
  const [catalogComments, setCatalogComments] = useState<Comment[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [currentUserGames, setCurrentUserGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const isOwnProfile = currentUserProfile?.id === profile?.id;
  const isProfileVisible = profile?.is_profile_public !== false || isOwnProfile;
  const canShowRatings = profile?.show_ratings !== false || isOwnProfile;
  const canShowFavorites = profile?.show_favorites !== false || isOwnProfile;
  const canCommentOnCatalog = profile?.allow_catalog_comments !== false || isOwnProfile;
  const canCopyCatalogGames = profile?.allow_catalog_copy !== false || isOwnProfile;

  useEffect(() => {
    const fetchCurrentUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const [profileResponse, likesResponse, gamesResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('likes').select('*').eq('user_id', session.user.id),
        supabase.from('games').select('*').eq('profile_id', session.user.id),
      ]);

      if (profileResponse.error) {
        console.error('Error loading current user profile:', profileResponse.error);
      } else {
        setCurrentUserProfile(profileResponse.data);
      }

      if (likesResponse.error) {
        console.error('Error loading likes:', likesResponse.error);
      } else {
        setLikes(likesResponse.data || []);
      }

      if (gamesResponse.error) {
        console.error('Error loading current user games:', gamesResponse.error);
      } else {
        setCurrentUserGames((gamesResponse.data as Game[]) || []);
      }
    };

    fetchCurrentUserData();
  }, []);

  useEffect(() => {
    if (!userId) {
      setError('User ID not found.');
      setLoading(false);
      return;
    }

    const fetchProfileAndGames = async () => {
      setLoading(true);
      setError(null);

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
        setLoading(false);
        return;
      }

      const allGames = ((gamesData as Game[]) || []).map((game) => ({
        ...game,
        created_at: game.created_at || null,
      }));

      setGames(allGames);

      if (allGames.length === 0) {
        setReceivedLikes([]);
        setCatalogComments([]);
        setLoading(false);
        return;
      }

      const gameIds = allGames.map((game) => game.id);
      const [likesResponse, commentsResponse] = await Promise.all([
        supabase.from('likes').select('*').in('game_id', gameIds),
        supabase.from('comments').select('id, game_id').in('game_id', gameIds),
      ]);

      if (likesResponse.error) {
        console.error('Error loading profile likes:', likesResponse.error);
      } else {
        setReceivedLikes(likesResponse.data || []);
      }

      if (commentsResponse.error) {
        console.error('Error loading profile comments:', commentsResponse.error);
      } else {
        setCatalogComments((commentsResponse.data as Comment[]) || []);
      }

      setLoading(false);
    };

    fetchProfileAndGames();
  }, [userId]);

  const favoriteGames = useMemo(() => {
    return [...games]
      .filter((game) => game.is_favorite)
      .sort((a, b) => {
        if (a.favorite_position === null) return 1;
        if (b.favorite_position === null) return -1;
        return a.favorite_position - b.favorite_position;
      })
      .slice(0, 10);
  }, [games]);

  const platforms = useMemo(() => {
    return [...new Set(games.map((game) => game.platform).filter(Boolean))];
  }, [games]);

  const filteredGames = useMemo(() => {
    return games.filter(
      (game) =>
        (statusFilter === 'all' || game.status === statusFilter) &&
        (platformFilter === 'all' || game.platform === platformFilter) &&
        game.title.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [games, platformFilter, searchFilter, statusFilter]);

  const recentGames = useMemo(() => {
    return [...games]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [games]);

  const nowPlayingGames = useMemo(() => games.filter((game) => game.status === 'playing').slice(0, 4), [games]);

  const topRatedGames = useMemo(() => {
    return [...games]
      .filter((game) => typeof game.rating === 'number' && game.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);
  }, [games]);

  const commonGames = useMemo(() => {
    const currentTitles = new Set(currentUserGames.map((game) => game.title.toLowerCase()));
    return games.filter((game) => currentTitles.has(game.title.toLowerCase())).slice(0, 4);
  }, [currentUserGames, games]);

  const catalogStats = useMemo(() => {
    const completed = games.filter((game) => game.status === 'completed').length;
    const playing = games.filter((game) => game.status === 'playing').length;
    const favorites = games.filter((game) => game.is_favorite).length;
    const ratings = games.filter((game) => typeof game.rating === 'number' && game.rating > 0).map((game) => game.rating || 0);
    const averageRating = ratings.length
      ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)
      : '-';

    const stats: ProfileStat[] = [
      { label: 'Jogos', value: games.length, icon: BookOpen, helper: 'na biblioteca' },
      { label: 'Jogando', value: playing, icon: Gamepad2, helper: 'agora' },
      { label: 'Completos', value: completed, icon: Trophy, helper: 'finalizados' },
      { label: 'Favoritos', value: canShowFavorites ? favorites : '-', icon: Star, helper: canShowFavorites ? 'em destaque' : 'ocultos' },
      { label: 'Curtidas', value: receivedLikes.length, icon: ThumbsUp, helper: 'recebidas' },
      { label: 'Nota media', value: canShowRatings ? averageRating : '-', icon: Sparkles, helper: canShowRatings ? 'dos avaliados' : 'oculta' },
    ];

    return stats;
  }, [canShowFavorites, canShowRatings, games, receivedLikes.length]);

  const activityItems = useMemo(() => {
    const items: Array<{ title: string; description: string; icon: typeof Clock3 }> = [];

    if (recentGames.length > 0) {
      items.push({
        title: 'Biblioteca em movimento',
        description: `${recentGames.length} adicoes recentes ao catalogo.`,
        icon: Clock3,
      });
    }

    if (favoriteGames.length > 0) {
      items.push({
        title: 'Lista de favoritos ativa',
        description: `${favoriteGames.length} jogos destacados no Top 10 pessoal.`,
        icon: Star,
      });
    }

    if (catalogComments.length > 0) {
      items.push({
        title: 'Conversas abertas',
        description: `${catalogComments.length} comentarios distribuidos pelos jogos do perfil.`,
        icon: MessageSquare,
      });
    }

    if (receivedLikes.length > 0) {
      items.push({
        title: 'Catalogo com tracao',
        description: `${receivedLikes.length} curtidas recebidas nos jogos publicados.`,
        icon: Heart,
      });
    }

    return items;
  }, [catalogComments.length, favoriteGames.length, receivedLikes.length, recentGames.length]);

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setIsCommentsDialogOpen(true);
  };

  const addToMyCatalog = (game: Game) => {
    const params = new URLSearchParams();
    params.set('title', game.title);
    params.set('platform', game.platform);
    params.set('status', game.status || 'backlog');
    if (game.rating !== null && game.rating !== undefined) params.set('rating', String(game.rating));
    if ((game as Game & { genre?: string | null }).genre) params.set('genre', (game as Game & { genre?: string | null }).genre || '');
    if (game.cover_url) params.set('cover_url', game.cover_url);

    navigate(`/catalog?${params.toString()}`);
  };

  const toggleLike = async (gameId: string) => {
    if (!currentUserProfile) {
      toast({ title: 'Voce precisa estar logado para curtir jogos.', variant: 'destructive' });
      return;
    }

    const existingLike = likes.find((like) => like.game_id === gameId);

    if (existingLike) {
      const { error } = await supabase.from('likes').delete().match({ id: existingLike.id });
      if (error) {
        toast({ title: 'Erro ao descurtir', description: error.message, variant: 'destructive' });
        return;
      }

      setLikes((currentLikes) => currentLikes.filter((like) => like.id !== existingLike.id));
      if (games.some((game) => game.id === gameId)) {
        setReceivedLikes((currentLikes) => currentLikes.filter((like) => like.id !== existingLike.id));
      }
      return;
    }

    const { data, error } = await supabase
      .from('likes')
      .insert({ user_id: currentUserProfile.id, game_id: gameId })
      .select('*')
      .single();

    if (error) {
      toast({ title: 'Erro ao curtir', description: error.message, variant: 'destructive' });
      return;
    }

    setLikes((currentLikes) => [...currentLikes, data]);
    if (games.some((game) => game.id === gameId)) {
      setReceivedLikes((currentLikes) => [...currentLikes, data]);
    }
  };

  const isGameLikedByCurrentUser = (gameId: string) => likes.some((like) => like.game_id === gameId);

  const getStatusLabel = (status: string) => statusConfig[status]?.label || status;

  const getStatusColor = (status: string) => statusConfig[status]?.className || 'bg-muted';

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Sem data registrada';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderGameCard = (game: Game, compact = false) => (
    <Card
      key={game.id}
      className="overflow-hidden border-border/50 bg-card/80 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
        <img
          src={game.cover_url || gamePlaceholder}
          alt={game.title}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = gamePlaceholder;
          }}
        />
        <Badge className={`absolute bottom-2 left-2 ${getStatusColor(game.status)}`}>{getStatusLabel(game.status)}</Badge>
      </div>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold leading-tight">{game.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <img src={getPlatformIcon(game.platform)} alt={game.platform} className="h-4 w-4" />
              <span className="truncate">{game.platform}</span>
            </div>
          </div>
          {canShowRatings ? (
            game.rating ? <StarRating rating={game.rating} readOnly /> : <span className="text-sm text-muted-foreground">Sem nota registrada</span>
          ) : (
            <span className="text-sm text-muted-foreground">Notas ocultas neste perfil</span>
          )}
          {!compact ? (
            <div className="flex items-center gap-2 pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isGameLikedByCurrentUser(game.id) ? 'secondary' : 'outline'} size="icon" onClick={() => toggleLike(game.id)}>
                    <ThumbsUp className={`h-4 w-4 ${isGameLikedByCurrentUser(game.id) ? 'text-primary' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isGameLikedByCurrentUser(game.id) ? 'Descurtir' : 'Curtir'}</p>
                </TooltipContent>
              </Tooltip>
              {canCommentOnCatalog ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => openCommentsDialog(game)}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comentar</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {!isOwnProfile && canCopyCatalogGames ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => addToMyCatalog(game)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adicionar ao meu catalogo</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container py-8 text-center">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-8 text-center">
        <p>Usuario nao encontrado.</p>
      </div>
    );
  }

  if (!isProfileVisible) {
    return (
      <>
        <PageHeader title="Perfil privado" description="Este usuario optou por ocultar a pagina publica." />
        <PageContent>
          <Card className="max-w-2xl border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium">Perfil indisponivel para visitantes</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A biblioteca e as interacoes deste usuario estao privadas no momento.
              </p>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={profile.display_name || profile.username}
        description={`@${profile.username} ${isOwnProfile ? '• seu espaco publico' : '• biblioteca e atividade'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isOwnProfile ? (
              <Button variant="outline" onClick={() => navigate(`/user/${profile.id}/catalog`)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Ver catalogo completo
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/profile')}>
                <UserRound className="mr-2 h-4 w-4" />
                Editar perfil
              </Button>
            )}
            <Button onClick={() => navigate('/members')}>
              <Sparkles className="mr-2 h-4 w-4" />
              Explorar membros
            </Button>
          </div>
        }
      />

      <PageContent className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-muted/50">
            <div className="h-44 overflow-hidden border-b border-border/60 bg-muted/40 sm:h-52">
              {profile.banner_url ? (
                <img src={profile.banner_url} alt="Capa do perfil" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,hsl(var(--primary)/0.22),hsl(var(--accent)/0.22))]" />
              )}
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm sm:h-28 sm:w-28">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                  <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold tracking-tight">{profile.display_name || profile.username}</h1>
                      {canShowFavorites && favoriteGames.length > 0 ? <Badge variant="secondary">Top {favoriteGames.length} em destaque</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {profile.bio || 'Ainda sem bio. O perfil ja funciona como vitrine da biblioteca e das interacoes com outros jogadores.'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {catalogStats.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="rounded-lg border border-border/60 bg-background/80 p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon className="h-4 w-4" />
                            <span>{stat.label}</span>
                          </div>
                          <div className="mt-2 text-2xl font-semibold">{stat.value}</div>
                          <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Resumo social
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-medium">Jogando agora</p>
                <p className="mt-1 text-2xl font-semibold">{nowPlayingGames.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">titulos ativos no momento</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-medium">Comentarios no catalogo</p>
                <p className="mt-1 text-2xl font-semibold">{catalogComments.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">conversas geradas pelos jogos</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-sm font-medium">Plataformas ativas</p>
                <p className="mt-1 text-2xl font-semibold">{platforms.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{platforms.slice(0, 3).join(', ') || 'nenhuma registrada'}</p>
              </div>
              {!isOwnProfile && currentUserProfile ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Em comum com voce</p>
                  <p className="mt-1 text-2xl font-semibold">{commonGames.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    jogos compartilhados entre a sua biblioteca e este perfil
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Visao geral
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Atividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Top favoritos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canShowFavorites && favoriteGames.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {favoriteGames.slice(0, 5).map((game, index) => (
                        <div key={game.id} className="space-y-2">
                          <div className="relative overflow-hidden rounded-lg border border-border/60">
                            <img
                              src={game.cover_url || gamePlaceholder}
                              alt={game.title}
                              className="aspect-[3/4] w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = gamePlaceholder;
                              }}
                            />
                            <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs font-semibold">
                              #{index + 1}
                            </div>
                          </div>
                          <div>
                            <p className="line-clamp-1 text-sm font-medium">{game.title}</p>
                            <p className="text-xs text-muted-foreground">{game.platform}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      {canShowFavorites ? 'Ainda nao ha favoritos destacados neste perfil.' : 'Os favoritos estao ocultos neste perfil.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    Jogando agora
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nowPlayingGames.length > 0 ? (
                    nowPlayingGames.map((game) => (
                      <div key={game.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                        <img
                          src={game.cover_url || gamePlaceholder}
                          alt={game.title}
                          className="h-16 w-12 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.src = gamePlaceholder;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{game.title}</p>
                          <p className="text-sm text-muted-foreground">{game.platform}</p>
                          {canShowRatings && game.rating ? <StarRating rating={game.rating} readOnly /> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-muted-foreground">Nenhum jogo marcado como jogando no momento.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5" />
                    Entradas recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentGames.length > 0 ? (
                    <div className="space-y-3">
                      {recentGames.map((game) => (
                        <div key={game.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                          <img
                            src={game.cover_url || gamePlaceholder}
                            alt={game.title}
                            className="h-16 w-12 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.src = gamePlaceholder;
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate font-medium">{game.title}</p>
                              <span className="text-xs text-muted-foreground">{formatDate(game.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{game.platform}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-muted-foreground">Sem historico recente de adicoes neste perfil.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Maiores notas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canShowRatings && topRatedGames.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {topRatedGames.map((game) => renderGameCard(game, true))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-muted-foreground">
                      {canShowRatings ? 'Este perfil ainda nao avaliou jogos o suficiente para destacar rankings.' : 'As notas estao ocultas neste perfil.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            {!isOwnProfile && currentUserProfile ? (
              <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Em comum com voce
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commonGames.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {commonGames.map((game) => renderGameCard(game, true))}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-muted-foreground">Ainda nao ha interseccao entre a sua biblioteca e este perfil.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Leitura rapida
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>
                      Este perfil concentra <span className="font-medium text-foreground">{games.length}</span> jogos e
                      destaca <span className="font-medium text-foreground">{canShowFavorites ? favoriteGames.length : 0}</span> favoritos.
                    </p>
                    <Separator />
                    <p>
                      Ha <span className="font-medium text-foreground">{commonGames.length}</span> jogos em comum com a sua
                      biblioteca e <span className="font-medium text-foreground">{catalogComments.length}</span> interacoes
                      publicas no catalogo.
                    </p>
                    <Separator />
                    <p>
                      A combinacao entre status, {canShowRatings ? 'notas' : 'sinais de biblioteca'} e favoritos ajuda a
                      ler o gosto desse usuario.
                    </p>
                  </CardContent>
                </Card>
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por titulo..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as plataformas</SelectItem>
                    {platforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ToggleGroup
                  type="single"
                  defaultValue="all"
                  value={statusFilter}
                  onValueChange={(value) => value && setStatusFilter(value)}
                  className="justify-start overflow-x-auto"
                >
                  <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                  <ToggleGroupItem value="playing">Jogando</ToggleGroupItem>
                  <ToggleGroupItem value="completed">Completo</ToggleGroupItem>
                  <ToggleGroupItem value="backlog">Backlog</ToggleGroupItem>
                  <ToggleGroupItem value="dropped">Abandonado</ToggleGroupItem>
                </ToggleGroup>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Biblioteca</h2>
                <p className="text-sm text-muted-foreground">{filteredGames.length} jogos visiveis com os filtros atuais.</p>
              </div>
            </div>

            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {filteredGames.map((game) => renderGameCard(game))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum jogo encontrado com os filtros selecionados.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5" />
                  Sinais de atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityItems.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {activityItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="rounded-lg border border-border/60 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="h-4 w-4 text-primary" />
                            {item.title}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">Ainda ha pouco sinal social para montar uma timeline util.</p>
                )}
              </CardContent>
            </Card>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Jogos com conversa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {games.length > 0 ? (
                    <div className="space-y-3">
                      {games
                        .map((game) => ({
                          game,
                          comments: catalogComments.filter((comment) => comment.game_id === game.id).length,
                        }))
                        .filter((entry) => entry.comments > 0)
                        .sort((a, b) => b.comments - a.comments)
                        .slice(0, 4)
                        .map((entry) => (
                          <div key={entry.game.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <img
                              src={entry.game.cover_url || gamePlaceholder}
                              alt={entry.game.title}
                              className="h-16 w-12 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.src = gamePlaceholder;
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{entry.game.title}</p>
                              <p className="text-sm text-muted-foreground">{entry.comments} comentarios</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => openCommentsDialog(entry.game)}>
                              Abrir
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  {games.length === 0 || !catalogComments.some((comment) => games.some((game) => game.id === comment.game_id)) ? (
                    <p className="py-6 text-center text-muted-foreground">Ainda nao existem discussoes abertas nos jogos deste perfil.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5" />
                    Jogos com mais curtidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {games.length > 0 ? (
                    <div className="space-y-3">
                      {games
                        .map((game) => ({
                          game,
                          likeCount: receivedLikes.filter((like) => like.game_id === game.id).length,
                        }))
                        .filter((entry) => entry.likeCount > 0)
                        .sort((a, b) => b.likeCount - a.likeCount)
                        .slice(0, 4)
                        .map((entry) => (
                          <div key={entry.game.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                            <img
                              src={entry.game.cover_url || gamePlaceholder}
                              alt={entry.game.title}
                              className="h-16 w-12 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.src = gamePlaceholder;
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{entry.game.title}</p>
                              <p className="text-sm text-muted-foreground">{entry.likeCount} curtidas</p>
                            </div>
                            {!isOwnProfile ? (
                              <Button variant="outline" size="sm" onClick={() => toggleLike(entry.game.id)}>
                                {isGameLikedByCurrentUser(entry.game.id) ? 'Descurtir' : 'Curtir'}
                              </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : null}

                  {games.length === 0 || !receivedLikes.some((like) => games.some((game) => game.id === like.game_id)) ? (
                    <p className="py-6 text-center text-muted-foreground">Este catalogo ainda nao recebeu curtidas suficientes para gerar ranking.</p>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </PageContent>

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
