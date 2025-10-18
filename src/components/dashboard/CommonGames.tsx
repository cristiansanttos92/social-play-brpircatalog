import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import gamePlaceholder from '@/assets/game-placeholder.jpg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

interface CommonGame {
  title: string;
  cover_url: string | null;
  myGame: {
    id: string;
    status: string;
    rating: number | null;
  };
  friends: Array<{
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    game_status: string;
  }>;
}

export const CommonGames = ({ userId }: { userId: string }) => {
  const [commonGames, setCommonGames] = useState<CommonGame[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCommonGames();
  }, [userId]);

  const loadCommonGames = async () => {
    const { data: myGames } = await supabase
      .from('games')
      .select('id, title, cover_url, status, rating')
      .eq('profile_id', userId);

    if (!myGames || myGames.length === 0) {
      setLoading(false);
      return;
    }

    const myGameTitles = myGames.map(g => g.title);

    const { data: otherGames, error } = await supabase
      .from('games')
      .select('title, status, profile_id, profiles(id, username, display_name, avatar_url)')
      .neq('profile_id', userId)
      .in('title', myGameTitles);

    if (error) {
      console.error('Error loading common games:', error);
      setLoading(false);
      return;
    }

    const commonGameMap = new Map<string, CommonGame>();

    myGames.forEach(myGame => {
      const friendsWithGame = otherGames
        ?.filter((g: any) => g.title === myGame.title)
        .map((g: any) => ({
          id: g.profiles.id,
          username: g.profiles.username,
          display_name: g.profiles.display_name,
          avatar_url: g.profiles.avatar_url,
          game_status: g.status,
        })) || [];

      if (friendsWithGame.length > 0) {
        commonGameMap.set(myGame.title, {
          title: myGame.title,
          cover_url: myGame.cover_url,
          myGame: {
            id: myGame.id,
            status: myGame.status || 'backlog',
            rating: myGame.rating,
          },
          friends: friendsWithGame,
        });
      }
    });

    const sorted = Array.from(commonGameMap.values())
      .sort((a, b) => b.friends.length - a.friends.length)
      .slice(0, 6);

    setCommonGames(sorted);
    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'playing': return 'Jogando';
      case 'completed': return 'Completou';
      case 'backlog': return 'Na lista';
      case 'dropped': return 'Abandonou';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando jogos em comum...
        </CardContent>
      </Card>
    );
  }

  if (commonGames.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Jogos em Comum com Amigos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {commonGames.map(game => (
            <Card
              key={game.title}
              className="overflow-hidden border-border/40 flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
              onClick={() => navigate('/catalog')}
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
                <img
                  src={game.cover_url || gamePlaceholder}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = gamePlaceholder)}
                />
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                  {game.friends.length}
                </div>
              </div>
              <CardContent className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold truncate mb-2 text-sm">{game.title}</h3>
                <div className="flex flex-wrap gap-1 mt-auto">
                  {game.friends.slice(0, 4).map(friend => (
                    <Tooltip key={friend.id}>
                      <TooltipTrigger>
                        <Avatar
                          className="h-6 w-6 border-2 border-background cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${friend.id}`);
                          }}
                        >
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {friend.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{friend.display_name || friend.username}</p>
                        <p className="text-xs text-muted-foreground">{getStatusLabel(friend.game_status)}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {game.friends.length > 4 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{game.friends.length - 4}
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
