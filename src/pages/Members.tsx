
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const Members = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) console.error('Error loading current user profile:', error);
        else setCurrentUserProfile(data);
      }
    };
    fetchCurrentUserProfile();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (error) {
        console.error('Error loading members:', error);
      } else {
        setMembers(data || []);
      }
      setLoading(false);
    };

    fetchMembers();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header profile={currentUserProfile} />
      <main className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Membros</h1>
        {loading ? (
          <p>Carregando membros...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <Link to={`/profile/${member.id}`} key={member.id}>
                <Card className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.username} />
                    <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold">{member.display_name || member.username}</h2>
                    <p className="text-sm text-muted-foreground">@{member.username}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Members;
