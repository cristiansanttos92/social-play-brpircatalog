import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  Eye,
  Gamepad2,
  LayoutTemplate,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageContent, PageHeader as StickyPageHeader } from "@/components/PageShell";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/ui/star-rating";
import { toast } from "@/hooks/use-toast";
import { AvatarEditorDialog } from "@/components/AvatarEditorDialog";
import gamePlaceholder from "@/assets/game-placeholder.jpg";

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
}

interface Like {
  id: number;
  game_id: string;
}

interface Comment {
  id: string;
  game_id: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<Like[]>([]);
  const [catalogComments, setCatalogComments] = useState<Comment[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",
    is_profile_public: true,
    show_ratings: true,
    show_favorites: true,
    allow_catalog_comments: true,
    allow_catalog_copy: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    await Promise.all([loadProfile(session.user.id), loadGames(session.user.id)]);
    setPageLoading(false);
  };

  const loadProfile = async (id: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    setProfile(data);
    setFormData({
      username: data.username || "",
      display_name: data.display_name || "",
      bio: data.bio || "",
      avatar_url: data.avatar_url || "",
      banner_url: data.banner_url || "",
      is_profile_public: data.is_profile_public ?? true,
      show_ratings: data.show_ratings ?? true,
      show_favorites: data.show_favorites ?? true,
      allow_catalog_comments: data.allow_catalog_comments ?? true,
      allow_catalog_copy: data.allow_catalog_copy ?? true,
    });
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    if (!userId) return;

    setUploadingAvatar(true);

    try {
      const filePath = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setFormData((current) => ({ ...current, avatar_url: publicUrl }));
      toast({
        title: "Avatar pronto",
        description: "A imagem foi ajustada. Salve o perfil para publicar a alteracao.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadBannerBlob = async (blob: Blob) => {
    if (!userId) return;

    setUploadingBanner(true);

    try {
      const filePath = `${userId}/banner-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setFormData((current) => ({ ...current, banner_url: publicUrl }));
      toast({
        title: "Capa pronta",
        description: "A capa foi ajustada. Salve o perfil para publicar a alteracao.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload da capa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    setPendingAvatarFile(file);
    setAvatarEditorOpen(true);
    if (event.target) event.target.value = "";
  };

  const handleBannerFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    setPendingBannerFile(file);
    setBannerEditorOpen(true);
    if (event.target) event.target.value = "";
  };

  const loadGames = async (id: string) => {
    const { data, error } = await supabase.from("games").select("*").eq("profile_id", id).order("title", { ascending: true });

    if (error) {
      console.error("Error loading games:", error);
      return;
    }

    const catalogGames = (data as Game[]) || [];
    setGames(catalogGames);

    if (catalogGames.length === 0) {
      setReceivedLikes([]);
      setCatalogComments([]);
      return;
    }

    const gameIds = catalogGames.map((game) => game.id);
    const [likesResponse, commentsResponse] = await Promise.all([
      supabase.from("likes").select("id, game_id").in("game_id", gameIds),
      supabase.from("comments").select("id, game_id").in("game_id", gameIds),
    ]);

    if (likesResponse.error) {
      console.error("Error loading received likes:", likesResponse.error);
    } else {
      setReceivedLikes((likesResponse.data as Like[]) || []);
    }

    if (commentsResponse.error) {
      console.error("Error loading catalog comments:", commentsResponse.error);
    } else {
      setCatalogComments((commentsResponse.data as Comment[]) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          display_name: formData.display_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          banner_url: formData.banner_url,
          is_profile_public: formData.is_profile_public,
          show_ratings: formData.show_ratings,
          show_favorites: formData.show_favorites,
          allow_catalog_comments: formData.allow_catalog_comments,
          allow_catalog_copy: formData.allow_catalog_copy,
        })
        .eq("id", userId);

      if (error) throw error;

      await loadProfile(userId);
      toast({
        title: "Perfil atualizado!",
        description: "Suas alteracoes foram salvas e o preview foi atualizado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const favoriteGames = useMemo(() => {
    return [...games]
      .filter((game) => game.is_favorite)
      .sort((a, b) => {
        if (a.favorite_position === null) return 1;
        if (b.favorite_position === null) return -1;
        return a.favorite_position - b.favorite_position;
      })
      .slice(0, 5);
  }, [games]);

  const nowPlaying = useMemo(() => games.filter((game) => game.status === "playing").slice(0, 3), [games]);

  const completedCount = useMemo(() => games.filter((game) => game.status === "completed").length, [games]);

  const averageRating = useMemo(() => {
    const ratedGames = games.filter((game) => typeof game.rating === "number" && game.rating > 0);
    if (ratedGames.length === 0) return "-";
    const total = ratedGames.reduce((sum, game) => sum + (game.rating || 0), 0);
    return (total / ratedGames.length).toFixed(1);
  }, [games]);

  const checklist = useMemo(() => {
    return [
      { label: "Avatar configurado", done: Boolean(formData.avatar_url) },
      { label: "Bio preenchida", done: Boolean(formData.bio.trim()) },
      { label: "Pelo menos 1 favorito", done: favoriteGames.length > 0 },
      { label: "Catalogo publicado", done: games.length > 0 },
      { label: "Jogando agora definido", done: nowPlaying.length > 0 },
    ];
  }, [favoriteGames.length, formData.avatar_url, formData.bio, games.length, nowPlaying.length]);

  const checklistDone = checklist.filter((item) => item.done).length;

  const previewName = formData.display_name.trim() || formData.username.trim() || "Seu nome";
  const previewUsername = formData.username.trim() || "username";
  const previewBio =
    formData.bio.trim() || "Sua bio ainda esta vazia. Use este espaco para dizer o que voce joga e como organiza sua biblioteca.";

  if (pageLoading) {
    return (
      <div className="container py-8 text-center">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <>
      <StickyPageHeader
        title="Meu Perfil"
        description="Edite sua identidade, organize sua vitrine e acompanhe como seu perfil aparece publicamente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/manage-favorites")}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Gerenciar favoritos
            </Button>
            <Button variant="outline" onClick={() => navigate("/catalog")}>
              <BookOpen className="mr-2 h-4 w-4" />
              Abrir catalogo
            </Button>
            {profile ? (
              <Button onClick={() => navigate(`/profile/${profile.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver perfil publico
              </Button>
            ) : null}
          </div>
        }
      />

      <PageContent className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-border/50 bg-gradient-to-br from-background via-background to-muted/50">
            <div className="relative h-44 overflow-hidden border-b border-border/60 bg-muted/40 sm:h-52">
              {formData.banner_url ? (
                <img
                  src={formData.banner_url}
                  alt="Capa do perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,hsl(var(--primary)/0.22),hsl(var(--accent)/0.22))]" />
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                className="absolute right-4 top-4"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadingBanner ? "Enviando capa..." : "Editar capa"}
              </Button>
            </div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-sm sm:h-28 sm:w-28">
                    <AvatarImage src={formData.avatar_url || undefined} alt={previewUsername} />
                    <AvatarFallback>{previewUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold tracking-tight">{previewName}</h1>
                      <Badge variant="secondary">Painel do seu perfil</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{previewUsername}</p>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{previewBio}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        Biblioteca
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{games.length}</div>
                      <p className="mt-1 text-xs text-muted-foreground">jogos cadastrados</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gamepad2 className="h-4 w-4" />
                        Jogando
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{nowPlaying.length}</div>
                      <p className="mt-1 text-xs text-muted-foreground">titulos ativos</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        Completos
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{completedCount}</div>
                      <p className="mt-1 text-xs text-muted-foreground">ja finalizados</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        Nota media
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{averageRating}</div>
                      <p className="mt-1 text-xs text-muted-foreground">dos avaliados</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound className="h-5 w-5" />
                Prontidao do perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium">Checklist concluido</p>
                <p className="mt-1 text-2xl font-semibold">
                  {checklistDone}/{checklist.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">itens essenciais para um perfil forte</p>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <span>{item.label}</span>
                    <Badge variant={item.done ? "default" : "outline"}>{item.done ? "ok" : "pendente"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="identity" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Identidade
            </TabsTrigger>
            <TabsTrigger value="showcase" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Vitrine
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md border border-border/60 data-[state=active]:border-primary">
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <Card className="max-w-3xl border-border/50">
              <CardHeader>
                <CardTitle>Informacoes principais</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de usuario *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display_name">Nome de exibicao</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={5}
                      placeholder="Escreva uma bio curta sobre o que voce joga, coleciona ou gosta de descobrir."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar</Label>
                    <div className="flex gap-3">
                      <Input
                        id="avatar_url"
                        type="url"
                        placeholder="https://..."
                        value={formData.avatar_url}
                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {uploadingAvatar ? "Enviando..." : "Upload"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique no avatar ou use Upload para abrir o editor com preview, zoom e reposicionamento antes de salvar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="banner_url">Capa</Label>
                    <div className="flex gap-3">
                      <Input
                        id="banner_url"
                        type="url"
                        placeholder="https://..."
                        value={formData.banner_url}
                        onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {uploadingBanner ? "Enviando..." : "Upload capa"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A capa aparece no topo do perfil publico. Voce pode colar uma URL ou ajustar uma imagem antes do upload.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-lg border border-border/60 p-4">
                    <div>
                      <h3 className="font-medium">Visibilidade e interacao</h3>
                      <p className="text-sm text-muted-foreground">
                        Controle o que outras pessoas conseguem ver e fazer no seu perfil publico.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="is_profile_public">Perfil publico</Label>
                        <p className="text-xs text-muted-foreground">Oculta o perfil para outros usuarios quando desligado.</p>
                      </div>
                      <Switch
                        id="is_profile_public"
                        checked={formData.is_profile_public}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_profile_public: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="show_favorites">Mostrar favoritos</Label>
                        <p className="text-xs text-muted-foreground">Exibe a sua selecao de favoritos no perfil publico.</p>
                      </div>
                      <Switch
                        id="show_favorites"
                        checked={formData.show_favorites}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_favorites: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="show_ratings">Mostrar notas</Label>
                        <p className="text-xs text-muted-foreground">Permite que outras pessoas vejam suas avaliacoes.</p>
                      </div>
                      <Switch
                        id="show_ratings"
                        checked={formData.show_ratings}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_ratings: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="allow_catalog_comments">Permitir comentarios</Label>
                        <p className="text-xs text-muted-foreground">Deixa outras pessoas comentarem nos jogos do seu catalogo.</p>
                      </div>
                      <Switch
                        id="allow_catalog_comments"
                        checked={formData.allow_catalog_comments}
                        onCheckedChange={(checked) => setFormData({ ...formData, allow_catalog_comments: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="allow_catalog_copy">Permitir copiar para outro catalogo</Label>
                        <p className="text-xs text-muted-foreground">Mostra o atalho para outra pessoa adicionar seus jogos ao catalogo dela.</p>
                      </div>
                      <Switch
                        id="allow_catalog_copy"
                        checked={formData.allow_catalog_copy}
                        onCheckedChange={(checked) => setFormData({ ...formData, allow_catalog_copy: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-gradient-to-r from-primary to-accent hover:opacity-90" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar alteracoes"}
                    </Button>

                    <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                      Voltar ao dashboard
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="showcase">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutTemplate className="h-5 w-5" />
                    Sua vitrine publica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-sm font-medium">Favoritos</p>
                      <p className="mt-1 text-2xl font-semibold">{formData.show_favorites ? favoriteGames.length : "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">jogos no topo do perfil</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-sm font-medium">Curtidas recebidas</p>
                      <p className="mt-1 text-2xl font-semibold">{receivedLikes.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">nos jogos do catalogo</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-sm font-medium">Comentarios</p>
                      <p className="mt-1 text-2xl font-semibold">{catalogComments.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">interacoes acumuladas</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                      <div>
                        <p className="font-medium">Reordenar Top favoritos</p>
                        <p className="text-sm text-muted-foreground">Defina a ordem que aparece no seu perfil publico.</p>
                      </div>
                      <Button variant="outline" onClick={() => navigate("/manage-favorites")}>
                        Abrir
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                      <div>
                        <p className="font-medium">Atualizar biblioteca</p>
                        <p className="text-sm text-muted-foreground">Adicione jogos, notas e status para enriquecer o perfil.</p>
                      </div>
                      <Button variant="outline" onClick={() => navigate("/catalog")}>
                        Ir para catalogo
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                      <div>
                        <p className="font-medium">Ver pagina publica</p>
                        <p className="text-sm text-muted-foreground">Confirme como seu perfil aparece para outras pessoas.</p>
                      </div>
                      <Button variant="outline" onClick={() => profile && navigate(`/profile/${profile.id}`)} disabled={!profile}>
                        Abrir perfil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Destaques atuais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.show_favorites && favoriteGames.length > 0 ? (
                    favoriteGames.map((game, index) => (
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
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <p className="truncate font-medium">{game.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{game.platform}</p>
                          {formData.show_ratings && game.rating ? <StarRating rating={game.rating} readOnly /> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center text-muted-foreground">
                      {formData.show_favorites ? "Nenhum favorito em destaque ainda." : "Os favoritos estao ocultos no perfil publico."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview do perfil publico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/50 p-6">
                    <div className="mb-6 overflow-hidden rounded-xl border border-border/60">
                      {formData.banner_url ? (
                        <img src={formData.banner_url} alt="Capa em preview" className="h-44 w-full object-cover" />
                      ) : (
                        <div className="h-44 w-full bg-[linear-gradient(135deg,hsl(var(--primary)/0.22),hsl(var(--accent)/0.22))]" />
                      )}
                    </div>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                        <AvatarImage src={formData.avatar_url || undefined} alt={previewUsername} />
                        <AvatarFallback>{previewUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <h2 className="text-3xl font-bold tracking-tight">{previewName}</h2>
                          <p className="text-sm text-muted-foreground">@{previewUsername}</p>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{previewBio}</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                            <p className="text-sm text-muted-foreground">Jogos</p>
                            <p className="mt-2 text-2xl font-semibold">{games.length}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                            <p className="text-sm text-muted-foreground">Favoritos</p>
                            <p className="mt-2 text-2xl font-semibold">{formData.show_favorites ? favoriteGames.length : "-"}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
                            <p className="text-sm text-muted-foreground">Curtidas</p>
                            <p className="mt-2 text-2xl font-semibold">{receivedLikes.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Top favoritos</h3>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/manage-favorites")}>
                        Ajustar ordem
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    {formData.show_favorites && favoriteGames.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {favoriteGames.map((game) => (
                          <div key={game.id} className="space-y-2">
                            <div className="overflow-hidden rounded-lg border border-border/60">
                              <img
                                src={game.cover_url || gamePlaceholder}
                                alt={game.title}
                                className="aspect-[3/4] w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = gamePlaceholder;
                                }}
                              />
                            </div>
                            <div>
                              <p className="line-clamp-1 text-sm font-medium">{game.title}</p>
                              <p className="text-xs text-muted-foreground">{game.platform}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-muted-foreground">
                        {formData.show_favorites ? "O preview ainda nao tem favoritos para exibir." : "Os favoritos estao ocultos neste preview."}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Leitura do perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Seu perfil hoje mostra <span className="font-medium text-foreground">{games.length}</span> jogos,
                    <span className="font-medium text-foreground"> {formData.show_favorites ? favoriteGames.length : 0}</span> destaques e
                    <span className="font-medium text-foreground"> {catalogComments.length}</span> interacoes.
                  </p>
                  <Separator />
                  <p>
                    O melhor ganho visual agora vem de uma bio mais forte, avatar definido e uma combinacao coerente entre vitrine e privacidade.
                  </p>
                  <Separator />
                  <p>
                    Quando quiser publicar uma versao melhor do seu perfil, os atalhos principais sao: editar identidade,
                    atualizar catalogo e reorganizar favoritos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>

      <AvatarEditorDialog
        file={pendingAvatarFile}
        open={avatarEditorOpen}
        onOpenChange={(open) => {
          setAvatarEditorOpen(open);
          if (!open) setPendingAvatarFile(null);
        }}
        onConfirm={uploadAvatarBlob}
        title="Ajustar avatar"
        description="Arraste a imagem, aplique zoom e confirme o corte antes de salvar."
        frameWidth={280}
        frameHeight={280}
        roundFrame
        confirmLabel="Usar avatar"
      />

      <AvatarEditorDialog
        file={pendingBannerFile}
        open={bannerEditorOpen}
        onOpenChange={(open) => {
          setBannerEditorOpen(open);
          if (!open) setPendingBannerFile(null);
        }}
        onConfirm={uploadBannerBlob}
        title="Ajustar capa"
        description="Defina o enquadramento da capa do seu perfil antes de salvar."
        frameWidth={560}
        frameHeight={180}
        roundFrame={false}
        confirmLabel="Usar capa"
      />
    </>
  );
};

export default Profile;
