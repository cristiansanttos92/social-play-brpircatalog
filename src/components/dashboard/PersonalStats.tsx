import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, TrendingUp, Star, Trophy } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface PersonalStatsProps {
  totalGames: number;
  playingCount: number;
  completedCount: number;
  backlogCount: number;
  droppedCount: number;
  averageRating: number;
}

export const PersonalStats = ({
  totalGames,
  playingCount,
  completedCount,
  backlogCount,
  droppedCount,
  averageRating,
}: PersonalStatsProps) => {
  const statusData = [
    { name: 'Jogando', value: playingCount, color: 'hsl(var(--primary))' },
    { name: 'Completo', value: completedCount, color: 'hsl(var(--accent))' },
    { name: 'Backlog', value: backlogCount, color: 'hsl(var(--secondary))' },
    { name: 'Abandonado', value: droppedCount, color: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Jogos</CardTitle>
          <Gamepad2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGames}</div>
          <p className="text-xs text-muted-foreground">no seu catálogo</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Jogando Agora</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{playingCount}</div>
          <p className="text-xs text-muted-foreground">em progresso</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completados</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedCount}</div>
          <p className="text-xs text-muted-foreground">
            {totalGames > 0 ? `${Math.round((completedCount / totalGames) * 100)}% do catálogo` : 'nenhum jogo'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média de Avaliações</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">de 10 estrelas</p>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {totalGames > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Adicione jogos ao seu catálogo para ver estatísticas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
