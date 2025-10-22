import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, LayoutGrid, List, ListOrdered, MessageSquare, Star } from "lucide-react";
import gamePlaceholder from "@/assets/game-placeholder.jpg";
import { StarRating } from "@/components/ui/star-rating";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status: string;
  rating: number | null;
  genre: string | null;
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

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
  });

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

  const getPlatformIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('pc') || lowerPlatform.includes('windows')) return 'https://img.icons8.com/color/48/windows-10.png';
    if (lowerPlatform.includes('playstation') || lowerPlatform.includes('ps4') || lowerPlatform.includes('ps5')) return 'https://img.icons8.com/color/48/playstation.png';
    if (lowerPlatform.includes('xbox')) return 'https://img.icons8.com/color/48/xbox.png';
    if (lowerPlatform.includes('nintendo') || lowerPlatform.includes('switch')) return 'https://img.icons8.com/color/48/nintendo-switch.png';
    return 'https://img.icons8.com/color/48/game-controller.png';
  };

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
      const gameData = { title: formData.title, platform: formData.platform, status: formData.status, rating: formData.rating || null, genre: formData.genre || null, cover_url: formData.cover_url || null };
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
    if (userId) await loadGames(userId);
  };

  const resetForm = () => {
    setFormData({ title: "", platform: "", status: "backlog", rating: 0, genre: "", cover_url: "" });
    setEditingGame(null);
  };

  const openEditDialog = (game: Game) => {
    setEditingGame(game);
    setFormData({ title: game.title, platform: game.platform, status: game.status, rating: game.rating || 0, genre: game.genre || "", cover_url: game.cover_url || "" });
    setCommentsDialogOpen(false);
    setAddEditDialogOpen(true);
  };

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setCommentsDialogOpen(true);
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
        <Card key={game.id} className="overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 group">
          <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
            <img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
            <Badge className={`absolute bottom-2 left-2 ${getStatusColor(game.status)}`}>{getStatusLabel(game.status)}</Badge>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white hover:text-yellow-400" onClick={() => toggleFavorite(game.id, game.is_favorite)}>
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
            <Button variant="outline" size="sm" className="mt-auto mt-2 gap-2" onClick={() => openCommentsDialog(game)}>
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
      <div className="min-h-screen bg-background">
        <Header profile={profile} />
        <main className="container py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Meu Catálogo</h1>
              <p className="text-muted-foreground">Gerencie sua coleção de jogos</p>
            </div>
            <div className="flex items-center gap-4">
              <ToggleGroup type="single" defaultValue="card" value={viewMode} onValueChange={(value: "card" | "list") => value && setViewMode(value)}>
                <ToggleGroupItem value="card" aria-label="Mudar para visualização em grade"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="Mudar para visualização em lista"><List className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
              <Dialog open={addEditDialogOpen} onOpenChange={(open) => { setAddEditDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"><Plus className="h-4 w-4" /> Adicionar Jogo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{editingGame ? "Editar Jogo" : "Adicionar Jogo"}</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="title">Título *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
                    <div className="space-y-2"><Label htmlFor="platform">Plataforma *</Label><Input id="platform" placeholder="PC, PS5, Xbox, Switch..." value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} required /></div>
                    <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="backlog">Backlog</SelectItem><SelectItem value="playing">Jogando</SelectItem><SelectItem value="completed">Completo</SelectItem><SelectItem value="dropped">Abandonado</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Nota</Label><StarRating rating={formData.rating} setRating={(rating) => setFormData({ ...formData, rating })} /></div>
                    <div className="space-y-2"><Label htmlFor="genre">Gênero</Label><Input id="genre" placeholder="RPG, FPS, Aventura..." value={formData.genre} onChange={(e) => setFormData({ ...formData, genre: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="cover">URL da Capa</Label><Input id="cover" type="url" placeholder="https://..." value={formData.cover_url} onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })} /></div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">{editingGame ? "Atualizar" : "Adicionar"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

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
        </main>
      </div>

      {/* Dialog de Comentários */}
      <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedGame?.title}</DialogTitle>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => selectedGame && openEditDialog(selectedGame)}><Edit className="h-4 w-4 mr-2"/>Editar Jogo</Button>
              <Button size="sm" variant="destructive" onClick={() => selectedGame && handleDelete(selectedGame.id)}><Trash2 className="h-4 w-4 mr-2"/>Excluir Jogo</Button>
            </div>
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
    </>
  );
};

export default Catalog;
