import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Gamepad2, Library, TrendingUp, Users } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBanner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        
        <div className="relative container py-24 sm:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="flex justify-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent">
                <Gamepad2 className="h-16 w-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                BrpirCatalog
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Organize seu catálogo de jogos, acompanhe seu progresso e compare com outros jogadores
            </p>

            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8"
                onClick={() => navigate("/auth")}
              >
                Começar Agora
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={() => navigate("/auth")}
              >
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Library className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Catálogo Organizado</h3>
            <p className="text-muted-foreground">
              Mantenha todos os seus jogos organizados por plataforma, status e avaliação
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur hover:border-accent/40 transition-colors">
            <div className="p-3 rounded-lg bg-accent/10 w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acompanhe seu Progresso</h3>
            <p className="text-muted-foreground">
              Veja estatísticas detalhadas sobre seus jogos, horas jogadas e conquistas
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border/40 bg-card/50 backdrop-blur hover:border-primary/40 transition-colors">
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Compare com Amigos</h3>
            <p className="text-muted-foreground">
              Descubra jogos em comum e veja o que outros jogadores estão jogando
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
