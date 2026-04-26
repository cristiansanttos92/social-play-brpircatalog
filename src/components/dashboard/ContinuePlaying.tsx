import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import gamePlaceholder from '@/assets/game-placeholder.jpg';
import { StarRating } from '@/components/ui/star-rating';
import { useNavigate } from 'react-router-dom';

interface Game {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  rating: number | null;
}

interface ContinuePlayingProps {
  games: Game[];
}

export const ContinuePlaying = ({ games }: ContinuePlayingProps) => {
  const navigate = useNavigate();

  if (games.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Continue Jogando
          </CardTitle>
          <Badge variant="secondary">{games.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
          {games.map(game => (
            <button
              key={game.id}
              type="button"
              className="flex w-full items-center gap-4 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => navigate('/catalog')}
            >
              <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                <img
                  src={game.cover_url || gamePlaceholder}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{game.title}</h3>
                    <p className="text-xs text-muted-foreground">{game.platform}</p>
                  </div>
                  <Badge className="bg-primary">Jogando</Badge>
                </div>
                {game.rating ? (
                  <StarRating rating={game.rating} readOnly />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sem avaliacao ainda
                  </p>
                )}
              </div>
            </button>
          ))}
      </CardContent>
    </Card>
  );
};
