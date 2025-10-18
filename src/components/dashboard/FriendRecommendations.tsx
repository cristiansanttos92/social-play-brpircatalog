import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import gamePlaceholder from '@/assets/game-placeholder.jpg';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GameRecommendation {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  count: number;
  players: Array<{
    id: string;
    username: string;
    avatar_url: string | null;
  }>;
}

export const FriendRecommendations = ({ userId }: { userId: string }) => {
  const [recommendations, setRecommendations] = useState<GameRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    const { data: myGames } = await supabase
      .from('games')
      .select('title')
      .eq('profile_id', userId);

    const myGameTitles = myGames?.map(g => g.title) || [];

    const { data: otherGames, error } = await supabase
      .from('games')
      .select('id, title, cover_url, platform, profile_id, profiles(id, username, avatar_url)')
      .neq('profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading recommendations:', error);
      setLoading(false);
      return;
    }

    const gameMap = new Map<string, GameRecommendation>();

    otherGames?.forEach((game: any) => {
      if (myGameTitles.includes(game.title)) return;

      if (gameMap.has(game.title)) {
        const existing = gameMap.get(game.title)!;
        existing.count++;
        if (!existing.players.find(p => p.id === game.profiles.id)) {
          existing.players.push({
            id: game.profiles.id,
            username: game.profiles.username,
            avatar_url: game.profiles.avatar_url,
          });
        }
      } else {
        gameMap.set(game.title, {
          id: game.id,
          title: game.title,
          cover_url: game.cover_url,
          platform: game.platform,
          count: 1,
          players: [{
            id: game.profiles.id,
            username: game.profiles.username,
            avatar_url: game.profiles.avatar_url,
          }],
        });
      }
    });

    const sorted = Array.from(gameMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    setRecommendations(sorted);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando recomendações...
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Populares Entre Amigos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {recommendations.map(game => (
            <Card
              key={game.id}
              className="overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
                <img
                  src={game.cover_url || gamePlaceholder}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                />
                <Badge className="absolute top-2 right-2 bg-accent">
                  {game.count} {game.count === 1 ? 'amigo' : 'amigos'}
                </Badge>
              </div>
              <CardContent className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold truncate mb-1 text-sm">{game.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{game.platform}</p>
                <div className="flex -space-x-2 mt-auto">
                  {game.players.slice(0, 3).map(player => (
                    <Tooltip key={player.id}>
                      <TooltipTrigger>
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {player.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{player.username}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {game.players.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{game.players.length - 3}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
