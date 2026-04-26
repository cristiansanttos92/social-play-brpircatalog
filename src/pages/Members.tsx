import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Search, UserRound, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageContent, PageHeader } from '@/components/PageShell';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_profile_public?: boolean | null;
}

type ViewMode = 'grid' | 'list';

const Members = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) console.error('Error loading current user profile:', error);
      else setCurrentUserProfile(data);
    };

    const fetchMembers = async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('username', { ascending: true });

      if (error) {
        console.error('Error loading members:', error);
      } else {
        setMembers((data || []) as Profile[]);
      }
      setLoading(false);
    };

    fetchCurrentUserProfile();
    fetchMembers();
  }, []);

  const visibleMembers = useMemo(() => {
    return members.filter((member) => {
      if (member.id !== currentUserProfile?.id && member.is_profile_public === false) return false;

      const haystack = [member.username, member.display_name || '', member.bio || ''].join(' ').toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [currentUserProfile?.id, members, search]);

  const publicCount = members.filter((member) => member.is_profile_public !== false).length;

  return (
    <>
      <PageHeader
        title="Membros"
        description="Explore perfis, encontre bibliotecas interessantes e navegue pela comunidade."
        actions={
          <ToggleGroup type="single" value={viewMode} onValueChange={(value: ViewMode) => value && setViewMode(value)}>
            <ToggleGroupItem value="grid" aria-label="Visualizacao em grade">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Visualizacao em lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <PageContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Comunidade
              </div>
              <p className="mt-2 text-2xl font-semibold">{members.length}</p>
              <p className="text-xs text-muted-foreground">perfis cadastrados</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                Visiveis
              </div>
              <p className="mt-2 text-2xl font-semibold">{publicCount}</p>
              <p className="text-xs text-muted-foreground">perfis publicos para explorar</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                Resultado atual
              </div>
              <p className="mt-2 text-2xl font-semibold">{visibleMembers.length}</p>
              <p className="text-xs text-muted-foreground">membros filtrados pela busca</p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, usuario ou bio..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p>Carregando membros...</p>
        ) : visibleMembers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum membro encontrado com os filtros atuais.
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleMembers.map((member) => {
              const isCurrentUser = currentUserProfile?.id === member.id;

              return (
                <Link to={isCurrentUser ? '/profile' : `/profile/${member.id}`} key={member.id}>
                  <Card className="h-full border-border/50 transition-transform duration-200 hover:-translate-y-1 hover:bg-muted/30">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={member.avatar_url || undefined} alt={member.username} />
                          <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-semibold">{member.display_name || member.username}</h2>
                            {isCurrentUser ? <Badge variant="secondary">voce</Badge> : null}
                          </div>
                          <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
                        </div>
                      </div>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {member.bio || 'Sem bio publicada ainda.'}
                      </p>
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                        <span>{member.is_profile_public === false && !isCurrentUser ? 'privado' : 'perfil visivel'}</span>
                        <span>{isCurrentUser ? 'editar meu perfil' : 'abrir perfil'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Lista de membros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleMembers.map((member) => {
                const isCurrentUser = currentUserProfile?.id === member.id;

                return (
                  <Link to={isCurrentUser ? '/profile' : `/profile/${member.id}`} key={member.id}>
                    <div className="flex items-center gap-4 rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/30">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={member.avatar_url || undefined} alt={member.username} />
                        <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{member.display_name || member.username}</p>
                          {isCurrentUser ? <Badge variant="secondary">voce</Badge> : null}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{member.bio || 'Sem bio publicada ainda.'}</p>
                      </div>
                      <span className="rounded-md border border-border/60 px-3 py-2 text-sm">
                        {isCurrentUser ? 'Editar' : 'Ver perfil'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
};

export default Members;
