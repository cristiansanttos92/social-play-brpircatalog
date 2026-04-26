import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Plus, LayoutGrid, List } from "lucide-react";
import gamePlaceholder from "@/assets/game-placeholder.jpg";
import { StarRating } from "@/components/ui/star-rating";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CommentsDialog } from "@/components/CommentsDialog";
import { PageContent, PageHeader } from "@/components/PageShell";
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
  aggregated_rating?: number | null;
  first_release_date?: number | null;
  total_rating_count?: number | null;
  game_modes?: string[];
  player_perspectives?: string[];
  themes?: string[];
  involved_companies?: string[];
  igdb_id?: number | null;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const UserCatalog = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [games, setGames] = useState<Game[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [detailsGame, setDetailsGame] = useState<Game | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [userId]);

  const openCommentsDialog = (game: Game) => {
    setSelectedGame(game);
    setIsCommentsDialogOpen(true);
  };

  const openDetailsDialog = (game: Game) => {
    setDetailsGame(game);
    setIsDetailsDialogOpen(true);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadCurrentUserProfile(session.user.id);
    if (userId) {
      loadUserProfile(userId);
      loadGames(userId);
    }
  };

  const loadCurrentUserProfile = async (id: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) console.error("Error loading current user profile:", error);
    else setCurrentUserProfile(data);
  };

  const loadUserProfile = async (id: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) console.error("Error loading user profile:", error);
    else setUserProfile(data);
  };

  const loadGames = async (profileId: string) => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("profile_id", profileId)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error loading games:", error);
      return;
    }
    setGames(data || []);
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

  const filteredGames = games.filter(game => statusFilter === "all" || game.status === statusFilter);

  const renderCardView = () => (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filteredGames.map((game) => (
        <Card key={game.id} className="overflow-hidden border-border/40 flex flex-col cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg" onClick={() => openDetailsDialog(game)}>
          <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
            <img
              src={game.cover_url || gamePlaceholder}
              alt={game.title}
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.src = gamePlaceholder)}
            />
            <Badge className={`absolute bottom-2 left-2 ${getStatusColor(game.status)}`}>
              {getStatusLabel(game.status)}
            </Badge>
          </div>
          <CardContent className="p-4 flex flex-col flex-grow">
            <h3 className="font-semibold truncate mb-1">{game.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate mb-2">
              <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" />
              <span>{game.platform}</span>
            </div>
            {game.rating && <StarRating rating={game.rating} readOnly />}
            <div className="flex items-center gap-2 mt-auto pt-4">
              <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); openCommentsDialog(game); }}>
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
            <TableHead className="w-[80px]">Capa</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="hidden md:table-cell">Plataforma</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGames.map((game) => (
            <TableRow key={game.id} className="cursor-pointer" onClick={() => openDetailsDialog(game)}>
              <TableCell>
                <img 
                  src={game.cover_url || gamePlaceholder} 
                  alt={game.title} 
                  className="w-12 h-16 object-cover rounded-sm"
                  onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                />
              </TableCell>
              <TableCell className="font-medium">{game.title}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <img src={getPlatformIcon(game.platform)} alt={game.platform} className="w-4 h-4" />
                  <span>{game.platform}</span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge className={getStatusColor(game.status)}>{getStatusLabel(game.status)}</Badge>
              </TableCell>
              <TableCell>
                {game.rating ? <StarRating rating={game.rating} readOnly /> : "-"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); openCommentsDialog(game); }}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
        title={`Catálogo de ${userProfile?.display_name || userProfile?.username || ''}`}
        description="Explorando a coleção de jogos."
        actions={
          <ToggleGroup 
            type="single" 
            defaultValue="card"
            value={viewMode}
            onValueChange={(value: "card" | "list") => value && setViewMode(value)}
          >
            <ToggleGroupItem value="card" aria-label="Mudar para visualização em grade">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Mudar para visualização em lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <PageContent>
          <div className="mb-6">
            <ToggleGroup 
              type="single" 
              defaultValue="all"
              value={statusFilter}
              onValueChange={(value) => value && setStatusFilter(value)}
              className="justify-start"
            >
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="playing">Jogando</ToggleGroupItem>
              <ToggleGroupItem value="completed">Completo</ToggleGroupItem>
              <ToggleGroupItem value="backlog">Backlog</ToggleGroupItem>
              <ToggleGroupItem value="dropped">Abandonado</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Este catálogo ainda está vazio.</p>
            </div>
          ) : (
            viewMode === 'card' ? renderCardView() : renderListView()
          )}
      </PageContent>
      <CommentsDialog 
        game={selectedGame}
        currentUser={currentUserProfile}
        isOpen={isCommentsDialogOpen}
        onOpenChange={setIsCommentsDialogOpen}
      />
      <GameDetailsDialog
        game={detailsGame}
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setDetailsGame(null);
          }
        }}
        onComments={(game) => {
          openCommentsDialog(game);
          setIsDetailsDialogOpen(false);
        }}
      />
    </>
  );
};

export default UserCatalog;
