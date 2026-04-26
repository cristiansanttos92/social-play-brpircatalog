import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, LayoutGrid, List, ListOrdered, MessageSquare, Star } from "lucide-react";
import gamePlaceholder from "@/assets/game-placeholder.jpg";
import { StarRating } from "@/components/ui/star-rating";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageContent, PageHeader } from "@/components/PageShell";
import { searchGames, IGDBGame, getIGDBImageUrl } from "@/lib/igdb";
import { GameDetailsDialog } from "@/components/GameDetailsDialog";
import { getPlatformIcon } from "@/lib/platform-icons";

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status: string;
  rating: number | null;
  genre: string | null;
  summary?: string | null;
  storyline?: string | null;
  summary_pt?: string | null;
  storyline_pt?: string | null;
  igdb_id?: number | null;
  igdb_url?: string | null;
  aggregated_rating?: number | null;
  first_release_date?: number | null;
  total_rating?: number | null;
  total_rating_count?: number | null;
  rating_count?: number | null;
  game_modes?: string[];
  player_perspectives?: string[];
  themes?: string[];
  involved_companies?: string[];
  is_favorite: boolean;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profile_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Catalog = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameActionsDialogOpen, setGameActionsDialogOpen] = useState(false);
  const [actionGame, setActionGame] = useState<Game | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [supportsGameMetadata, setSupportsGameMetadata] = useState(true);

  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    platform: "",
    status: "backlog",
    rating: 0,
    genre: "",
    cover_url: "",
    summary: "",
    storyline: "",
    igdb_id: null as number | null,
    igdb_url: "",
    aggregated_rating: null as number | null,
    first_release_date: null as number | null,
    total_rating: null as number | null,
    total_rating_count: null as number | null,
    rating_count: null as number | null,
    game_modes: [] as string[],
    player_perspectives: [] as string[],
    themes: [] as string[],
    involved_companies: [] as string[],
  });

  // IGDB search states
  const [igdbSearchQuery, setIgdbSearchQuery] = useState("");
  const [igdbSearchResults, setIgdbSearchResults] = useState<IGDBGame[]>([]);
  const [igdbSearching, setIgdbSearching] = useState(false);
  const [igdbGamePreview, setIgdbGamePreview] = useState<IGDBGame | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Read query params to prefill add dialog when coming from another profile
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const title = search.get('title');
    if (title) {
      setFormData({
        title: search.get('title') || '',
        platform: search.get('platform') || '',
        status: (search.get('status') as any) || 'backlog',
        rating: search.get('rating') ? Number(search.get('rating')) : 0,
        genre: search.get('genre') || '',
        cover_url: search.get('cover_url') || '',
      });
      setEditingGame(null);
      setAddEditDialogOpen(true);
      // remove params from URL to avoid reopening
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadComments(selectedGame.id);
    }
  }, [selectedGame]);

  useEffect(() => {
    const uniquePlatforms = [...new Set(games.map(game => game.platform))];
    setPlatforms(uniquePlatforms);
  }, [games]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await Promise.all([
      loadGames(session.user.id),
      loadProfile(session.user.id),
    ]);
    await detectGameMetadataSupport();
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) console.error("Error loading profile:", error);
    else setProfile(data);
  };

  const loadGames = async (profileId: string) => {
    const { data, error } = await supabase.from("games").select("*").eq("profile_id", profileId).order("title", { ascending: true });
    if (error) {
      console.error("Error loading games:", error);
    } else {
      const allGames = data || [];
      const favorites = allGames.filter(g => g.is_favorite);
      
      favorites.sort((a, b) => {
        if (a.favorite_position === null) return 1;
        if (b.favorite_position === null) return -1;
        return a.favorite_position - b.favorite_position;
      });

      setFavoriteGames(favorites.slice(0, 10));
      setGames(allGames);
    }
  };

  const toggleFavorite = async (gameId: string, isFavorite: boolean) => {
    if (!userId) return;
    const { error } = await supabase.from('games').update({ is_favorite: !isFavorite }).eq('id', gameId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Jogo ${!isFavorite ? 'adicionado aos' : 'removido dos'} favoritos!` });
      await loadGames(userId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      const gameData: Record<string, any> = {
        title: formData.title,
        platform: formData.platform,
        status: formData.status,
        rating: formData.rating || null,
        genre: formData.genre || null,
        cover_url: formData.cover_url || null,
      };

      if (supportsGameMetadata) {
        if (formData.summary) gameData.summary = formData.summary;
        if (formData.storyline) gameData.storyline = formData.storyline;
        if (formData.igdb_id !== null && formData.igdb_id !== undefined) gameData.igdb_id = formData.igdb_id;
        if (formData.igdb_url) gameData.igdb_url = formData.igdb_url;
        if (formData.aggregated_rating !== null && formData.aggregated_rating !== undefined) gameData.aggregated_rating = formData.aggregated_rating;
        if (formData.first_release_date !== null && formData.first_release_date !== undefined) gameData.first_release_date = formData.first_release_date;
        if (formData.total_rating !== null && formData.total_rating !== undefined) gameData.total_rating = formData.total_rating;
        if (formData.total_rating_count !== null && formData.total_rating_count !== undefined) gameData.total_rating_count = formData.total_rating_count;
        if (formData.rating_count !== null && formData.rating_count !== undefined) gameData.rating_count = formData.rating_count;
        if (formData.game_modes.length > 0) gameData.game_modes = formData.game_modes;
        if (formData.player_perspectives.length > 0) gameData.player_perspectives = formData.player_perspectives;
        if (formData.themes.length > 0) gameData.themes = formData.themes;
        if (formData.involved_companies.length > 0) gameData.involved_companies = formData.involved_companies;
      }
      if (editingGame) {
        const { error } = await supabase.from("games").update(gameData).eq("id", editingGame.id);
        if (error) throw error;
        toast({ title: "Jogo atualizado!" });
      } else {
        const { error } = await supabase.from("games").insert({ ...gameData, profile_id: userId });
        if (error) throw error;
        toast({ title: "Jogo adicionado!" });
      }
      setAddEditDialogOpen(false);
      resetForm();
      await loadGames(userId);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este jogo?")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Jogo removido!" });
    setCommentsDialogOpen(false);
    setGameActionsDialogOpen(false);
    setActionGame(null);
    if (userId) await loadGames(userId);
  };

  const detectGameMetadataSupport = async () => {
    const { error } = await supabase.from('games').select('summary').limit(1);
    if (error) {
      console.warn('Game metadata columns not available:', error.message);
      setSupportsGameMetadata(false);
    }
  };

  const handleIGDBSearch = async (query: string) => {
    if (!query.trim()) {
      setIgdbSearchResults([]);
      return;
    }
    setIgdbSearching(true);
    try {
      const results = await searchGames(query);
      setIgdbSearchResults(results);
    } catch (error) {
      console.error("Erro ao buscar na IGDB:", error);
      toast({ title: "Erro", description: "Falha ao buscar jogos na IGDB", variant: "destructive" });
    } finally {
      setIgdbSearching(false);
    }
  };

  const selectIGDBGame = (game: IGDBGame) => {
    setIgdbGamePreview(game);
  };

  const confirmIGDBSelection = (game: IGDBGame) => {
    setFormData({
      title: game.name,
      platform: game.platforms?.[0]?.name || "",
      status: "backlog",
      rating: game.rating ? Math.round(game.rating / 10) : 0,
      genre: game.genres?.[0]?.name || "",
      cover_url: game.cover ? getIGDBImageUrl(game.cover.url) : "",
      summary: game.summary || "",
      storyline: game.storyline || "",
      igdb_id: game.id,
      igdb_url: game.url || "",
      aggregated_rating: game.aggregated_rating ?? null,
      first_release_date: game.first_release_date ?? null,
      total_rating: game.total_rating ?? null,
      total_rating_count: game.total_rating_count ?? null,
      rating_count: game.rating_count ?? null,
      game_modes: game.game_modes?.map((mode) => mode.name) || [],
      player_perspectives: game.player_perspectives?.map((perspective) => perspective.name) || [],
      themes: game.themes?.map((theme) => theme.name) || [],
      involved_companies: game.involved_companies?.map((ic) => ic.company?.name || "") || [],
    });
    setIgdbSearchQuery("");
    setIgdbSearchResults([]);
    setIgdbGamePreview(null);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      platform: "",
      status: "backlog",
      rating: 0,
      genre: "",
      cover_url: "",
      summary: "",
      storyline: "",
      igdb_id: null,
      igdb_url: "",
      aggregated_rating: null,
      first_release_date: null,
      total_rating: null,
      total_rating_count: null,
      rating_count: null,
      game_modes: [],
      player_perspectives: [],
      themes: [],
      involved_companies: [],
    });
    setEditingGame(null);
    setIgdbSearchQuery("");
    setIgdbSearchResults([]);
  };

  const openEditDialog = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      platform: game.platform,
      status: game.status,
      rating: game.rating || 0,
      genre: game.genre || "",
      cover_url: game.cover_url || "",
      summary: game.summary || "",
      storyline: game.storyline || "",
      igdb_id: game.igdb_id ?? null,
      igdb_url: game.igdb_url || "",
      aggregated_rating: game.aggregated_rating ?? null,
      first_release_date: game.first_release_date ?? null,
      total_rating: game.total_rating ?? null,
      total_rating_count: game.total_rating_count ?? null,
      rating_count: game.rating_count ?? null,
      game_modes: game.game_modes || [],
      player_perspectives: game.player_perspectives || [],
      themes: game.themes || [],
      involved_companies: game.involved_companies || [],
    });
    setCommentsDialogOpen(false);
    setGameActionsDialogOpen(false);
    setActionGame(null);
    setAddEditDialogOpen(true);
  };

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setCommentsDialogOpen(true);
  };

  const openGameActionsDialog = (game: Game) => {
    setActionGame(game);
    setGameActionsDialogOpen(true);
  };

  const saveGameTranslation = async (
    game: Game,
    translation: { summary_pt: string | null; storyline_pt: string | null },
  ) => {
    const { error } = await supabase
      .from("games")
      .update(translation)
      .eq("id", game.id);

    if (error) {
      throw error;
    }

    setGames((current) =>
      current.map((item) => (item.id === game.id ? { ...item, ...translation } : item)),
    );
    setFavoriteGames((current) =>
      current.map((item) => (item.id === game.id ? { ...item, ...translation } : item)),
    );
    setActionGame((current) => (current?.id === game.id ? { ...current, ...translation } : current));
  };

  const loadComments = async (gameId: string) => {
    const { data, error } = await supabase.from('comments').select('*, profile_id, profiles(username, avatar_url)').eq('game_id', gameId).order('created_at', { ascending: false });
    if (error) console.error('Error loading comments:', error);
    else setComments(data as any);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedGame || !profile) return;
    const { error } = await supabase.from('comments').insert({ game_id: selectedGame.id, profile_id: profile.id, comment: newComment });
    if (error) console.error('Error submitting comment:', error);
    else {
      setNewComment('');
      loadComments(selectedGame.id);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) console.error('Error deleting comment:', error);
    else loadComments(selectedGame!.id);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    const { error } = await supabase.from('comments').update({ comment: editingCommentText }).eq('id', commentId);
    if (error) console.error('Error updating comment:', error);
    else {
      setEditingCommentId(null);
      setEditingCommentText('');
      loadComments(selectedGame!.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "playing": return "bg-primary";
      case "completed": return "bg-accent";
      case "backlog": return "bg-secondary";
      case "dropped": return "bg-destructive";
      default: return "bg-muted";
    }
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

  const filteredGames = games.filter(game =>
    (statusFilter === "all" || game.status === statusFilter) &&
    (platformFilter === "all" || game.platform === platformFilter) &&
    (game.title.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const FavoriteGamesSection = () => {
    const getRankClasses = (index: number) => {
      switch (index) {
        case 0: // Gold
          return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/50";
        case 1: // Silver
          return "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-500/50";
        case 2: // Bronze
          return "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-amber-500/50";
        default:
          return "bg-slate-700 text-white";
      }
    };

    return (
      <Card className="mb-8 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Star className="text-yellow-400 mr-2"/> Top 10 Favoritos</CardTitle>
          {favoriteGames.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/manage-favorites")}>
              <ListOrdered className="h-4 w-4" />
              Gerenciar Ordem
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {favoriteGames.length > 0 ? (
            <div className="flex justify-center space-x-3 overflow-x-auto pb-4">
              {favoriteGames.map((game, index) => (
                <div key={game.id} className="flex-shrink-0 w-28">
                  <Card className="overflow-hidden relative group h-full">
                    <img src={game.cover_url || gamePlaceholder} alt={game.title} className="aspect-[3/4] w-full h-full object-cover" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
                    <div className={`absolute top-0 left-0 rounded-br-lg px-2 py-1 font-bold text-base ${getRankClasses(index)}`}>
                      {index + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
                      <h3 className="font-semibold text-white text-center text-sm truncate">{game.title}</h3>
                      <Button variant="ghost" size="sm" className="mt-2 text-yellow-400 hover:text-yellow-300" onClick={() => toggleFavorite(game.id, game.is_favorite)}>
                        <Star className="h-5 w-5 fill-current"/>
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Marque seus jogos favoritos com uma estrela para vê-los aqui.</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCardView = () => (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filteredGames.map((game) => (
        <Card
          key={game.id}
          className="cursor-pointer overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 group"
          onClick={() => openGameActionsDialog(game)}
        >
          <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
            <img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
            <Badge className={`absolute bottom-2 left-2 ${getStatusColor(game.status)}`}>{getStatusLabel(game.status)}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:text-yellow-400"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(game.id, game.is_favorite);
              }}
            >
              <Star className={`h-5 w-5 ${game.is_favorite ? 'fill-yellow-400' : 'fill-transparent'}`} />
            </Button>
          </div>
          <CardContent className="p-4 flex flex-col flex-grow">
            <h3 className="font-semibold truncate mb-1">{game.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate mb-2">
              <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" />
              <span>{game.platform}</span>
            </div>
            {game.rating ? <StarRating rating={game.rating} readOnly /> : <div className="h-5"></div>}
            <Button
              variant="outline"
              size="sm"
              className="mt-auto mt-2 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                openCommentsDialog(game);
              }}
            >
              <MessageSquare className="h-4 w-4"/> Comentar
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[32px]"></TableHead>
            <TableHead className="w-[80px]">Capa</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="hidden md:table-cell">Plataforma</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGames.map((game) => (
            <TableRow key={game.id}>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => toggleFavorite(game.id, game.is_favorite)}>
                  <Star className={`h-5 w-5 ${game.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                </Button>
              </TableCell>
              <TableCell><img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-16 object-cover rounded-sm" onError={(e) => (e.currentTarget.src = gamePlaceholder)} /></TableCell>
              <TableCell className="font-medium">{game.title}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" />
                  <span>{game.platform}</span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell"><Badge className={getStatusColor(game.status)}>{getStatusLabel(game.status)}</Badge></TableCell>
              <TableCell>{game.rating ? <StarRating rating={game.rating} readOnly/> : "-"}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openCommentsDialog(game)}>
                  <MessageSquare className="h-4 w-4"/> Comentar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Meu Catálogo"
        description="Gerencie sua coleção de jogos"
        actions={
          <>
            <ToggleGroup type="single" defaultValue="card" value={viewMode} onValueChange={(value: "card" | "list") => value && setViewMode(value)}>
              <ToggleGroupItem value="card" aria-label="Mudar para visualização em grade"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Mudar para visualização em lista"><List className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
            <Dialog open={addEditDialogOpen} onOpenChange={(open) => { setAddEditDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"><Plus className="h-4 w-4" /> Adicionar Jogo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingGame ? "Editar Jogo" : "Adicionar Jogo"}</DialogTitle><DialogDescription>Preencha os dados do jogo ou busque na IGDB</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!editingGame && (
                    <div className="space-y-2">
                      <Label htmlFor="igdb-search">Buscar na IGDB</Label>
                      <Input
                        id="igdb-search"
                        placeholder="Digite o nome do jogo..."
                        value={igdbSearchQuery}
                        onChange={(e) => {
                          setIgdbSearchQuery(e.target.value);
                          handleIGDBSearch(e.target.value);
                        }}
                      />
                      {igdbSearching && <p className="text-sm text-muted-foreground">Buscando...</p>}
                      {igdbSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                          {igdbSearchResults.map((game) => (
                            <div
                              key={game.id}
                              className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer rounded"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                selectIGDBGame(game);
                              }}
                            >
                              {game.cover && (
                                <img
                                  src={getIGDBImageUrl(game.cover.url)}
                                  alt={game.name}
                                  className="w-8 h-8 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="text-sm font-medium">{game.name}</p>
                                {game.platforms && game.platforms.length > 0 && (
                                  <p className="text-xs text-muted-foreground">{game.platforms[0].name}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                  <div className="space-y-2"><Label htmlFor="platform">Plataforma *</Label><Input id="platform" placeholder="PC, PS5, Xbox, Switch..." value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} required /></div>
                  <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="backlog">Backlog</SelectItem><SelectItem value="playing">Jogando</SelectItem><SelectItem value="completed">Completo</SelectItem><SelectItem value="dropped">Abandonado</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Nota</Label><StarRating rating={formData.rating} setRating={(rating) => setFormData({ ...formData, rating })} /></div>
                  <div className="space-y-2"><Label htmlFor="genre">Gênero</Label><Input id="genre" placeholder="RPG, FPS, Aventura..." value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="cover">URL da Capa (opcional)</Label><Input id="cover" type="url" placeholder="https://... ou deixe vazio para usar imagem da IGDB" value={formData.cover_url} onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })} /></div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">{editingGame ? "Atualizar" : "Adicionar"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />
      <PageContent>

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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
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
          {(games.length > 0 || favoriteGames.length > 0) && filteredGames.length === 0 ? (
            <div className="text-center py-12"><p className="text-muted-foreground">Nenhum jogo encontrado com os filtros selecionados.</p></div>
          ) : (games.length === 0 && favoriteGames.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Seu catálogo está vazio</p>
              <Button onClick={() => setAddEditDialogOpen(true)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Adicionar Primeiro Jogo</Button>
            </div>
          ) : (
            viewMode === 'card' ? renderCardView() : renderListView()
          )}
      </PageContent>

      {/* Dialog de Comentários */}
      <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedGame?.title}</DialogTitle>
            <DialogDescription>Veja e deixe comentários sobre este jogo</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <div className="space-y-4 mt-4">
              <h4 className="font-semibold text-lg">Comentários</h4>
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Textarea placeholder="Deixe seu comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1" />
                <Button type="submit">Enviar</Button>
              </form>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={comment.profiles.avatar_url || undefined} />
                      <AvatarFallback>{comment.profiles.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{comment.profiles.username}</p>
                        <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <Textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                          <div className="flex gap-2"><Button size="sm" onClick={() => handleUpdateComment(comment.id)}>Salvar</Button><Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancelar</Button></div>
                        </div>
                      ) : (
                        <p className="text-sm">{comment.comment}</p>
                      )}
                    </div>
                    {profile && profile.id === comment.profile_id && !editingCommentId && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.comment); }}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>Excluir</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {false && <Dialog
        open={gameActionsDialogOpen}
        onOpenChange={(open) => {
          setGameActionsDialogOpen(open);
          if (!open) {
            setActionGame(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">{actionGame?.title}</DialogTitle>
            <DialogDescription>Detalhes do seu jogo no catálogo com opções de editar e excluir.</DialogDescription>
          </DialogHeader>
          {actionGame && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-1">
                  <img
                    src={actionGame.cover_url || gamePlaceholder}
                    alt={actionGame.title}
                    className="w-full rounded-2xl border shadow-lg object-cover"
                    onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                  />
                </div>
                <div className="col-span-3 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <img src={getPlatformIcon(actionGame.platform)} alt={actionGame.platform} className="w-5 h-5" />
                      <span>{actionGame.platform}</span>
                    </div>
                    <Badge className={getStatusColor(actionGame.status)}>{getStatusLabel(actionGame.status)}</Badge>
                    {actionGame.genre && <Badge variant="outline">{actionGame.genre}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-secondary/70 p-4 border">
                      <p className="text-sm text-muted-foreground">Nota</p>
                      <div className="mt-2 flex items-center gap-2">
                        {actionGame.rating ? <StarRating rating={actionGame.rating} readOnly /> : <span className="text-sm">Sem nota</span>}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-secondary/70 p-4 border">
                      <p className="text-sm text-muted-foreground">Favorito</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Star className={`h-5 w-5 ${actionGame.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        <span>{actionGame.is_favorite ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {actionGame.aggregated_rating !== null && actionGame.aggregated_rating !== undefined && (
                      <div className="rounded-2xl bg-secondary/70 p-4 border">
                        <p className="text-sm text-muted-foreground">Avaliação agregada</p>
                        <div className="mt-2 text-lg font-bold">{actionGame.aggregated_rating.toFixed(1)}</div>
                      </div>
                    )}
                    {actionGame.first_release_date && (
                      <div className="rounded-2xl bg-secondary/70 p-4 border">
                        <p className="text-sm text-muted-foreground">Lançamento</p>
                        <div className="mt-2 text-lg font-bold">{new Date(actionGame.first_release_date * 1000).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    )}
                    {(actionGame.total_rating !== null || actionGame.total_rating_count !== null || actionGame.rating_count !== null) && (
                      <div className="rounded-2xl bg-secondary/70 p-4 border">
                        <p className="text-sm text-muted-foreground">Dados IGDB</p>
                        <div className="mt-2 text-sm space-y-1">
                          {actionGame.total_rating !== null && actionGame.total_rating !== undefined && <div>Pontuação total: {actionGame.total_rating}</div>}
                          {actionGame.total_rating_count !== null && actionGame.total_rating_count !== undefined && <div>Avaliações: {actionGame.total_rating_count}</div>}
                          {actionGame.rating_count !== null && actionGame.rating_count !== undefined && <div>Notas: {actionGame.rating_count}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                  {actionGame.cover_url && (
                    <div className="rounded-2xl bg-secondary/70 p-4 border">
                      <p className="text-sm text-muted-foreground">URL da capa</p>
                      <p className="break-all text-sm mt-2">{actionGame.cover_url}</p>
                    </div>
                  )}
                  {actionGame.igdb_url && (
                    <div className="rounded-2xl bg-secondary/70 p-4 border">
                      <p className="text-sm text-muted-foreground">Link IGDB</p>
                      <a href={actionGame.igdb_url} target="_blank" rel="noreferrer" className="break-all text-sm mt-2 text-primary underline block">
                        {actionGame.igdb_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {(actionGame.summary || actionGame.storyline) && (
                <div className="border-t pt-6 space-y-3">
                  <h3 className="text-xl font-semibold">Descrição</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{actionGame.summary || actionGame.storyline}</p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                {actionGame.total_rating !== null && actionGame.total_rating !== undefined && (
                  <div className="rounded-2xl bg-secondary/70 p-4 border">
                    <p className="text-sm text-muted-foreground">Pontuação média</p>
                    <div className="mt-2 text-lg font-bold">{actionGame.total_rating}</div>
                  </div>
                )}
                {actionGame.total_rating_count !== null && actionGame.total_rating_count !== undefined && (
                  <div className="rounded-2xl bg-secondary/70 p-4 border">
                    <p className="text-sm text-muted-foreground">Total de avaliações</p>
                    <div className="mt-2 text-lg font-bold">{actionGame.total_rating_count}</div>
                  </div>
                )}
                {actionGame.rating_count !== null && actionGame.rating_count !== undefined && (
                  <div className="rounded-2xl bg-secondary/70 p-4 border">
                    <p className="text-sm text-muted-foreground">Contagem de notas</p>
                    <div className="mt-2 text-lg font-bold">{actionGame.rating_count}</div>
                  </div>
                )}
              </div>

              {actionGame.game_modes && actionGame.game_modes.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Modos de Jogo</h3>
                  <div className="flex flex-wrap gap-2">
                    {actionGame.game_modes.map((mode) => (
                      <Badge key={mode} variant="secondary" className="px-3 py-1">{mode}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {actionGame.player_perspectives && actionGame.player_perspectives.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Perspectivas</h3>
                  <div className="flex flex-wrap gap-2">
                    {actionGame.player_perspectives.map((perspective) => (
                      <Badge key={perspective} variant="outline" className="px-3 py-1">{perspective}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {actionGame.themes && actionGame.themes.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Temas</h3>
                  <div className="flex flex-wrap gap-2">
                    {actionGame.themes.map((theme) => (
                      <Badge key={theme} variant="ghost" className="px-3 py-1">{theme}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {actionGame.involved_companies && actionGame.involved_companies.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Companhias Envolvidas</h3>
                  <div className="flex flex-wrap gap-2">
                    {actionGame.involved_companies.map((company) => (
                      <Badge key={company} variant="secondary" className="px-3 py-1">{company}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="flex-1 min-w-[180px] gap-2"
                    variant="outline"
                    onClick={() => actionGame && openEditDialog(actionGame)}
                  >
                    <Edit className="h-4 w-4" />
                    Editar jogo
                  </Button>
                  <Button
                    className="flex-1 min-w-[180px] gap-2"
                    variant="destructive"
                    onClick={() => actionGame && handleDelete(actionGame.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir jogo
                  </Button>
                  <Button
                    className="flex-1 min-w-[180px] gap-2"
                    variant="secondary"
                    onClick={() => {
                      openCommentsDialog(actionGame);
                      setGameActionsDialogOpen(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Ver comentários
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>}

      <GameDetailsDialog
        game={actionGame}
        open={gameActionsDialogOpen}
        onOpenChange={(open) => {
          setGameActionsDialogOpen(open);
          if (!open) {
            setActionGame(null);
          }
        }}
        onEdit={(game) => openEditDialog(game)}
        onDelete={(game) => handleDelete(game.id)}
        onComments={(game) => {
          openCommentsDialog(game);
          setGameActionsDialogOpen(false);
        }}
        onSaveTranslation={saveGameTranslation}
      />

      {/* Dialog de Preview de Jogo IGDB */}
      <Dialog open={!!igdbGamePreview} onOpenChange={(open) => !open && setIgdbGamePreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl">{igdbGamePreview?.name}</DialogTitle>
            <DialogDescription>Detalhes completos do jogo - Clique em "Adicionar ao Catálogo" para continuar</DialogDescription>
          </DialogHeader>
          {igdbGamePreview && (
            <div className="space-y-6">
              {/* Capa e Info Principal */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-1">
                  {igdbGamePreview.cover && (
                    <img
                      src={getIGDBImageUrl(igdbGamePreview.cover.url)}
                      alt={igdbGamePreview.name}
                      className="w-full rounded-lg border-2 shadow-lg"
                      onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                    />
                  )}
                </div>
                <div className="col-span-3 space-y-4">
                  {/* Avaliação */}
                  {igdbGamePreview.aggregated_rating && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Avaliação IGDB</p>
                      <div className="flex items-center gap-3">
                        <div className="text-4xl font-bold text-yellow-500">{(igdbGamePreview.aggregated_rating / 10).toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">/10</div>
                        <div className="ml-auto text-xs text-muted-foreground">Crítica Agregada</div>
                      </div>
                      {igdbGamePreview.total_rating_count && (
                        <p className="text-xs text-muted-foreground mt-1">{igdbGamePreview.total_rating_count} avaliações</p>
                      )}
                    </div>
                  )}
                  {igdbGamePreview.rating && (
                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Nota interna</p>
                      <div className="text-lg font-semibold">{igdbGamePreview.rating.toFixed(0)}%</div>
                    </div>
                  )}
                  {igdbGamePreview.total_rating && (
                    <div className="bg-slate-500/10 p-4 rounded-lg border border-slate-200 dark:border-slate-900">
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Pontuação total</p>
                      <div className="text-lg font-semibold">{igdbGamePreview.total_rating.toFixed(0)}</div>
                    </div>
                  )}

                  {/* Data de Lançamento */}
                  {igdbGamePreview.first_release_date && (
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                      <p className="text-sm font-semibold text-muted-foreground">Data de Lançamento</p>
                      <p className="text-lg font-semibold">{new Date(igdbGamePreview.first_release_date * 1000).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  )}

                  {/* Plataforma */}
                  {igdbGamePreview.platforms && igdbGamePreview.platforms.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Plataformas</p>
                      <div className="flex flex-wrap gap-2">
                        {igdbGamePreview.platforms.map((p) => (
                          <Badge key={p.id} variant="secondary" className="px-3 py-1">{p.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gêneros */}
                  {igdbGamePreview.genres && igdbGamePreview.genres.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Gêneros</p>
                      <div className="flex flex-wrap gap-2">
                        {igdbGamePreview.genres.map((g) => (
                          <Badge key={g.id} variant="outline" className="px-3 py-1">{g.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {igdbGamePreview.game_modes && igdbGamePreview.game_modes.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Modos de Jogo</p>
                      <div className="flex flex-wrap gap-2">
                        {igdbGamePreview.game_modes.map((mode) => (
                          <Badge key={mode.id} variant="secondary" className="px-3 py-1">{mode.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {igdbGamePreview.player_perspectives && igdbGamePreview.player_perspectives.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Perspectivas</p>
                      <div className="flex flex-wrap gap-2">
                        {igdbGamePreview.player_perspectives.map((perspective) => (
                          <Badge key={perspective.id} variant="outline" className="px-3 py-1">{perspective.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {igdbGamePreview.themes && igdbGamePreview.themes.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Temas</p>
                      <div className="flex flex-wrap gap-2">
                        {igdbGamePreview.themes.map((theme) => (
                          <Badge key={theme.id} variant="ghost" className="px-3 py-1">{theme.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição */}
              {(igdbGamePreview.summary || igdbGamePreview.storyline) && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Sobre o Jogo</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{igdbGamePreview.summary || igdbGamePreview.storyline}</p>
                </div>
              )}
              {igdbGamePreview.url && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Mais informações</h3>
                  <a href={igdbGamePreview.url} target="_blank" rel="noreferrer" className="text-primary underline">Ver página no IGDB</a>
                </div>
              )}

              {/* Companhias Envolvidas */}
              {igdbGamePreview.involved_companies && igdbGamePreview.involved_companies.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Companhias Envolvidas</h3>
                  <div className="space-y-2">
                    {igdbGamePreview.involved_companies.map((ic) => (
                      <div key={ic.id} className="flex items-center gap-2 bg-secondary/50 p-2 rounded">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ic.company.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setIgdbGamePreview(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => confirmIGDBSelection(igdbGamePreview)}
                >
                  ✓ Adicionar ao Catálogo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Catalog;
