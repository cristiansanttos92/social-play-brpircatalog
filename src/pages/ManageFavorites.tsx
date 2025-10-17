
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import gamePlaceholder from "@/assets/game-placeholder.jpg";

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status: string;
  rating: number | null;
  genre: string | null;
  is_favorite: boolean;
  favorite_position: number | null;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const SortableGameItem = ({ game }: { game: Game }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: game.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center bg-muted p-2 rounded-lg mb-2">
      <Button variant="ghost" size="icon" {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5" />
      </Button>
      <img src={game.cover_url || gamePlaceholder} alt={game.title} className="w-12 h-16 object-cover rounded-sm ml-4" onError={(e) => (e.currentTarget.src = gamePlaceholder)} />
      <p className="font-medium ml-4">{game.title}</p>
    </div>
  );
};

const ManageFavorites = () => {
  const navigate = useNavigate();
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await Promise.all([
      loadFavoriteGames(session.user.id),
      loadProfile(session.user.id),
    ]);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) console.error("Error loading profile:", error);
    else setProfile(data);
  };

  const loadFavoriteGames = async (profileId: string) => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("profile_id", profileId)
      .eq("is_favorite", true)
      .order("favorite_position", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error loading favorite games:", error);
    } else {
      setFavoriteGames(data || []);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFavoriteGames((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!userId) return;

    const updatePromises = favoriteGames.map((game, index) =>
      supabase
        .from("games")
        .update({ favorite_position: index + 1 })
        .eq("id", game.id)
    );

    const results = await Promise.all(updatePromises);
    const firstError = results.find(res => res.error)?.error;

    if (firstError) {
      toast({ title: "Erro ao salvar a ordem", description: firstError.message, variant: "destructive" });
    } else {
      toast({ title: "Ordem dos favoritos salva com sucesso!" });
      if (userId) loadFavoriteGames(userId);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header profile={profile} />
        <main className="container py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Gerenciar Favoritos</h1>
              <p className="text-muted-foreground">Arraste e solte para reordenar seus jogos favoritos.</p>
            </div>
            <Button onClick={handleSaveChanges} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Salvar Ordem</Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {favoriteGames.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={favoriteGames.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    {favoriteGames.map(game => (
                      <SortableGameItem key={game.id} game={game} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="text-center text-muted-foreground py-4">Você ainda não tem jogos favoritos.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default ManageFavorites;
