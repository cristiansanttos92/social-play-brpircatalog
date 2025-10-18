import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, MessageSquare } from 'lucide-react';
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
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Continue Jogando
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {games.map(game => (
            <Card
              key={game.id}
              className="overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 group cursor-pointer"
              onClick={() => navigate('/catalog')}
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
                <img
                  src={game.cover_url || gamePlaceholder}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                />
                <Badge className="absolute top-2 right-2 bg-primary">
                  Jogando
                </Badge>
              </div>
              <CardContent className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold truncate mb-1 text-sm">{game.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{game.platform}</p>
                {game.rating && <StarRating rating={game.rating} readOnly />}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
