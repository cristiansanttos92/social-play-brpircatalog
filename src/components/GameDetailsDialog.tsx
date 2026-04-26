import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchGameDetailsByName, getGameDetailsById, getIGDBImageUrl, IGDBGame } from "@/lib/igdb";
import { translateGameTexts } from "@/lib/translate";
import gamePlaceholder from "@/assets/game-placeholder.jpg";
import { CalendarDays, Edit, Languages, Loader2, MessageSquare, Star, Trash2, Trophy, Users } from "lucide-react";

type StoredGame = {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  status?: string;
  rating: number | null;
  genre?: string | null;
  summary?: string | null;
  storyline?: string | null;
  summary_pt?: string | null;
  storyline_pt?: string | null;
  aggregated_rating?: number | null;
  first_release_date?: number | null;
  total_rating_count?: number | null;
  game_modes?: string[] | null;
  player_perspectives?: string[] | null;
  themes?: string[] | null;
  involved_companies?: string[] | null;
  igdb_id?: number | null;
};

interface GameDetailsDialogProps {
  game: StoredGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (game: StoredGame) => void;
  onDelete?: (game: StoredGame) => void;
  onComments?: (game: StoredGame) => void;
  onSaveTranslation?: (
    game: StoredGame,
    translation: { summary_pt: string | null; storyline_pt: string | null },
  ) => Promise<void>;
}

function formatDate(timestamp?: number | null): string | null {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toLocaleDateString("pt-BR");
}

function renderScore(score?: number | null): string | null {
  if (score === null || score === undefined) {
    return null;
  }

  return score.toFixed(0);
}

function splitGenre(genre?: string | null): string[] {
  if (!genre) {
    return [];
  }

  return genre.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeTrailerUrl(videoId?: string): string | null {
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/embed/${videoId}`;
}

export function GameDetailsDialog({
  game,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onComments,
  onSaveTranslation,
}: GameDetailsDialogProps) {
  const [details, setDetails] = useState<IGDBGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedStoryline, setTranslatedStoryline] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    if (!open || !game) {
      setDetails(null);
      setLoading(false);
      setLoadError(null);
      setTranslating(false);
      setTranslationError(null);
      setTranslatedSummary(null);
      setTranslatedStoryline(null);
      setShowTranslation(false);
      return;
    }

    setTranslatedSummary(game.summary_pt ?? null);
    setTranslatedStoryline(game.storyline_pt ?? null);
    setShowTranslation(Boolean(game.summary_pt || game.storyline_pt));

    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const result = game.igdb_id
          ? await getGameDetailsById(game.igdb_id)
          : await searchGameDetailsByName(game.title);

        if (!cancelled) {
          setDetails(result);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Erro ao carregar detalhes do jogo:", error);
          setLoadError("Não foi possível carregar os detalhes completos da IGDB.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [open, game]);

  const screenshots = useMemo(
    () => details?.screenshots?.slice(0, 3).map((item) => getIGDBImageUrl(item.url)) ?? [],
    [details],
  );

  const artworkUrl = useMemo(() => {
    if (!details?.artworks?.length) {
      return null;
    }

    return getIGDBImageUrl(details.artworks[0].url);
  }, [details]);

  const trailerUrl = useMemo(
    () => normalizeTrailerUrl(details?.videos?.[0]?.video_id),
    [details],
  );

  const originalSummary = details?.summary || game?.summary || game?.storyline || "Sem sinopse disponível.";
  const originalStoryline = details?.storyline || game?.storyline || "";
  const activeSummary = showTranslation ? translatedSummary || originalSummary : originalSummary;
  const activeStoryline = showTranslation ? translatedStoryline || originalStoryline : originalStoryline;
  const hasStoredTranslation = Boolean(translatedSummary || translatedStoryline);
  const genres = details?.genres?.map((item) => item.name) ?? splitGenre(game?.genre);
  const platforms = details?.platforms?.map((item) => item.name) ?? (game ? [game.platform] : []);
  const themes = details?.themes?.map((item) => item.name) ?? game?.themes ?? [];
  const modes = details?.game_modes?.map((item) => item.name) ?? game?.game_modes ?? [];
  const perspectives = details?.player_perspectives?.map((item) => item.name) ?? game?.player_perspectives ?? [];
  const companies = details?.involved_companies?.map((item) => item.company.name).filter(Boolean) ?? game?.involved_companies ?? [];
  const releaseDate = formatDate(details?.first_release_date ?? game?.first_release_date);

  const handleTranslate = async () => {
    if (!game) {
      return;
    }

    if (hasStoredTranslation) {
      setShowTranslation((current) => !current);
      return;
    }

    const sourceSummary = details?.summary || game.summary || null;
    const sourceStoryline = details?.storyline || game.storyline || null;

    if (!sourceSummary && !sourceStoryline) {
      setTranslationError("Não há texto disponível para traduzir.");
      return;
    }

    setTranslating(true);
    setTranslationError(null);

    try {
      const translation = await translateGameTexts({
        summary: sourceSummary,
        storyline: sourceStoryline,
      });

      setTranslatedSummary(translation.summary_pt);
      setTranslatedStoryline(translation.storyline_pt);
      setShowTranslation(true);

      if (onSaveTranslation) {
        await onSaveTranslation(game, translation);
      }
    } catch (error) {
      console.error("Erro ao traduzir história do jogo:", error);
      setTranslationError("Não foi possível traduzir a história agora.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        {game && (
          <div className="relative overflow-hidden rounded-lg">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: artworkUrl ? `url(${artworkUrl})` : undefined,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />

            <div className="relative p-6 sm:p-8 space-y-8">
              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-3xl sm:text-4xl">{details?.name || game.title}</DialogTitle>
                <DialogDescription className="max-w-3xl text-sm sm:text-base">
                  {activeSummary}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <img
                    src={details?.cover ? getIGDBImageUrl(details.cover.url) : game.cover_url || gamePlaceholder}
                    alt={details?.name || game.title}
                    className="aspect-[3/4] w-full rounded-xl object-cover shadow-xl"
                    onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                  />

                  <div className="grid gap-3">
                    <div className="rounded-xl border bg-card/70 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Usuários IGDB
                      </div>
                      <p className="mt-2 text-3xl font-semibold">{renderScore(details?.rating) ?? "--"}</p>
                      <p className="text-xs text-muted-foreground">0 a 100</p>
                    </div>
                    <div className="rounded-xl border bg-card/70 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        Crítica agregada
                      </div>
                      <p className="mt-2 text-3xl font-semibold">
                        {renderScore(details?.aggregated_rating ?? game.aggregated_rating) ?? "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">Metacritic / OpenCritic</p>
                    </div>
                    <div className="rounded-xl border bg-card/70 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        Popularidade
                      </div>
                      <p className="mt-2 text-3xl font-semibold">{details?.total_rating_count ?? game.total_rating_count ?? "--"}</p>
                      <p className="text-xs text-muted-foreground">avaliações registradas</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl border bg-card/70 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Lançamento
                      </div>
                      <p className="mt-2 font-medium">{releaseDate ?? "Não informado"}</p>
                    </div>
                    <div className="rounded-xl border bg-card/70 p-4">
                      <p className="text-sm text-muted-foreground">Sua nota</p>
                      <p className="mt-2 font-medium">{game.rating ? `${game.rating}/5` : "Sem nota"}</p>
                    </div>
                    <div className="rounded-xl border bg-card/70 p-4">
                      <p className="text-sm text-muted-foreground">Trailer</p>
                      <p className="mt-2 font-medium">{trailerUrl ? "Disponível" : "Sem trailer"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        className="gap-2"
                        variant="outline"
                        onClick={handleTranslate}
                        disabled={translating}
                      >
                        {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                        {hasStoredTranslation ? (showTranslation ? "Ver original" : "Ver tradução") : "Traduzir história"}
                      </Button>
                      {showTranslation && (
                        <Badge variant="secondary">PT-BR</Badge>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Gêneros</p>
                      <div className="flex flex-wrap gap-2">
                        {genres.length ? genres.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Plataformas</p>
                      <div className="flex flex-wrap gap-2">
                        {platforms.length ? platforms.map((item) => <Badge key={item} variant="outline">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Temas</p>
                      <div className="flex flex-wrap gap-2">
                        {themes.length ? themes.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Modos de jogo</p>
                      <div className="flex flex-wrap gap-2">
                        {modes.length ? modes.map((item) => <Badge key={item} variant="outline">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Perspectiva</p>
                      <div className="flex flex-wrap gap-2">
                        {perspectives.length ? perspectives.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-muted-foreground">Desenvolvedora / Publisher</p>
                      <div className="flex flex-wrap gap-2">
                        {companies.length ? companies.map((item) => <Badge key={item} variant="outline">{item}</Badge>) : <Badge variant="outline">Não informado</Badge>}
                      </div>
                    </div>
                  </div>

                  {trailerUrl && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Trailer oficial</p>
                      <div className="overflow-hidden rounded-xl border bg-black">
                        <iframe
                          className="aspect-video w-full"
                          src={trailerUrl}
                          title={`Trailer de ${details?.name || game.title}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {screenshots.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Gameplay</p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {screenshots.map((url, index) => (
                          <img
                            key={`${url}-${index}`}
                            src={url}
                            alt={`Screenshot ${index + 1} de ${details?.name || game.title}`}
                            className="aspect-video w-full rounded-xl border object-cover"
                            onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeStoryline && activeStoryline !== activeSummary && (
                    <div className="space-y-3 rounded-xl border bg-card/60 p-4">
                      <p className="text-sm font-medium text-muted-foreground">História</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{activeStoryline}</p>
                    </div>
                  )}

                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando dados da IGDB...
                    </div>
                  )}

                  {loadError && (
                    <p className="text-sm text-destructive">{loadError}</p>
                  )}

                  {translationError && (
                    <p className="text-sm text-destructive">{translationError}</p>
                  )}

                  {(onEdit || onDelete || onComments) && (
                    <div className="flex flex-wrap gap-3 border-t pt-4">
                      {onEdit && (
                        <Button className="gap-2" variant="outline" onClick={() => onEdit(game)}>
                          <Edit className="h-4 w-4" />
                          Editar jogo
                        </Button>
                      )}
                      {onDelete && (
                        <Button className="gap-2" variant="destructive" onClick={() => onDelete(game)}>
                          <Trash2 className="h-4 w-4" />
                          Excluir jogo
                        </Button>
                      )}
                      {onComments && (
                        <Button className="gap-2" variant="secondary" onClick={() => onComments(game)}>
                          <MessageSquare className="h-4 w-4" />
                          Ver comentários
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
