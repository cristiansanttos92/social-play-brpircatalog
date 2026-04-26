import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  LayoutDashboard,
  Library,
  LogOut,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/catalog', label: 'Meu Catalogo', icon: Library },
  { to: '/members', label: 'Membros', icon: Users },
  { to: '/profile', label: 'Perfil', icon: User },
];

const AppSidebarLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Ate logo!',
      description: 'Voce saiu da sua conta.',
    });
    navigate('/auth');
  };

  return (
    <div className="min-h-dvh bg-background md:grid md:min-h-dvh md:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="w-full border-b border-border/60 bg-card md:sticky md:top-0 md:flex md:h-dvh md:w-72 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-5">
          <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-2">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold leading-none">BrpirCatalog</p>
            <p className="text-sm text-muted-foreground">Navegacao</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="app-shell-scroll min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppSidebarLayout;
