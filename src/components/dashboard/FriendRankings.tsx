import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Star, Gamepad2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface PlayerRanking {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  totalGames: number;
  completedGames: number;
  averageRating: number;
}

export const FriendRankings = ({ userId }: { userId: string }) => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'completed' | 'rating'>('completed');
  const navigate = useNavigate();

  useEffect(() => {
    loadRankings();
  }, [userId]);

  const loadRankings = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url');

    if (profilesError) {
      console.error('Error loading profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('profile_id, status, rating');

    if (gamesError) {
      console.error('Error loading games:', gamesError);
      setLoading(false);
      return;
    }

    const playerStats = profiles.map(profile => {
      const playerGames = games.filter(g => g.profile_id === profile.id);
      const completedGames = playerGames.filter(g => g.status === 'completed');
      const ratedGames = playerGames.filter(g => g.rating !== null);
      const avgRating = ratedGames.length > 0
        ? ratedGames.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGames.length
        : 0;

      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        totalGames: playerGames.length,
        completedGames: completedGames.length,
        averageRating: avgRating,
      };
    });

    const filtered = playerStats.filter(p => p.totalGames > 0);
    setRankings(filtered);
    setLoading(false);
  };

  const getSortedRankings = () => {
    const sorted = [...rankings];
    switch (selectedMetric) {
      case 'total':
        return sorted.sort((a, b) => b.totalGames - a.totalGames);
      case 'completed':
        return sorted.sort((a, b) => b.completedGames - a.completedGames);
      case 'rating':
        return sorted.sort((a, b) => b.averageRating - a.averageRating);
      default:
        return sorted;
    }
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-gradient-to-br from-yellow-400 to-amber-500';
      case 1: return 'bg-gradient-to-br from-slate-300 to-slate-400';
      case 2: return 'bg-gradient-to-br from-orange-400 to-amber-600';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando rankings...
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return null;
  }

  const sortedRankings = getSortedRankings().slice(0, 10);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Rankings de Jogadores
          </CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={selectedMetric === 'completed' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedMetric('completed')}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Completados
            </Badge>
            <Badge
              variant={selectedMetric === 'total' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedMetric('total')}
            >
              <Gamepad2 className="h-3 w-3 mr-1" />
              Total
            </Badge>
            <Badge
              variant={selectedMetric === 'rating' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedMetric('rating')}
            >
              <Star className="h-3 w-3 mr-1" />
              Avaliações
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedRankings.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-muted/50 cursor-pointer ${
                player.id === userId ? 'bg-primary/10 border-2 border-primary' : ''
              }`}
              onClick={() => navigate(`/profile/${player.id}`)}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeColor(index)}`}>
                {index + 1}
              </div>
              <Avatar className="h-10 w-10 border-2 border-background">
                <AvatarImage src={player.avatar_url || undefined} />
                <AvatarFallback>
                  {player.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {player.display_name || player.username}
                  {player.id === userId && (
                    <Badge variant="outline" className="ml-2">Você</Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedMetric === 'total' && `${player.totalGames} jogos`}
                  {selectedMetric === 'completed' && `${player.completedGames} completados`}
                  {selectedMetric === 'rating' && `${player.averageRating.toFixed(1)} de 10`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {selectedMetric === 'total' && player.totalGames}
                  {selectedMetric === 'completed' && player.completedGames}
                  {selectedMetric === 'rating' && player.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
