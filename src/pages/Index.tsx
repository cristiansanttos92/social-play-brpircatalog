import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Gamepad2, Library, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getPlatformIcon } from "@/lib/platform-icons";

type AuthMode = "login" | "signup" | "reset";

const Index = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
        navigate("/dashboard");
        return;
      }

      if (authMode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/profile-setup` },
        });

        if (error) throw error;

        toast({ title: "Conta criada!", description: "Confira seu email para ativar a conta." });
        setAuthMode("login");
        resetForm();
        return;
      }

      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;

        toast({ title: "Email enviado", description: "Verifique seu email para redefinir sua senha." });
        setAuthMode("login");
        resetForm();
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="relative h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/95 to-background" />

        <div className="relative h-full container mx-auto px-4 py-8">
          <div className="grid h-full gap-8 xl:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-sm shadow-primary/10">
                <Gamepad2 className="h-5 w-5" />
                Catálogo gamificado para sua coleção
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
                  Organize, compare e jogue com propósito.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                  BrpirCatalog oferece um painel estilo gamer, com recursos para manter seu backlog, favoritos e progresso sempre à vista.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { name: "PC", icon: getPlatformIcon("pc") },
                  { name: "PlayStation", icon: getPlatformIcon("playstation") },
                  { name: "Xbox", icon: getPlatformIcon("xbox") },
                  { name: "Switch", icon: getPlatformIcon("nintendo-switch") },
                ].map((platform) => (
                  <div key={platform.name} className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-2 text-sm text-foreground shadow-sm shadow-slate-900/5">
                    <img src={platform.icon} alt={platform.name} className="h-5 w-5" />
                    {platform.name}
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/50 bg-card/90 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Visual impactante</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Um visual escuro e harmônico com realces em azul e ciano para melhor leitura e estilo gamer.
                  </p>
                </div>

                <div className="rounded-3xl border border-border/50 bg-card/90 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-4">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Controle total</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Login rápido, cadastro e recuperação de senha em um painel elegante e fluido.
                  </p>
                </div>
              </div>
            </div>

            <Card className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/90 p-8 shadow-2xl shadow-primary/20 backdrop-blur-xl">
              <div className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute left-[-3rem] bottom-[-3rem] h-28 w-28 rounded-full bg-accent/20 blur-3xl" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 rounded-3xl bg-primary/10 px-4 py-3 text-primary shadow-sm shadow-primary/10">
                    <Gamepad2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Painel rápido</span>
                  </div>
                  <div className="rounded-3xl bg-muted px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Novidade
                  </div>
                </div>

                <CardHeader className="space-y-2 px-0 text-center">
                  <CardTitle className="text-3xl font-bold">{authMode === "login" ? "Entrar" : authMode === "signup" ? "Criar conta" : "Recuperar senha"}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {authMode === "login" && "Acesse seu catálogo com apenas um email e senha."}
                    {authMode === "signup" && "Crie uma conta gratuita e comece a organizar sua biblioteca."}
                    {authMode === "reset" && "Receba um link de redefinição diretamente no seu email."}
                  </p>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {authMode !== "reset" && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                    )}

                    {authMode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar senha</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                    )}

                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity" disabled={loading}>
                      {loading
                        ? "Processando..."
                        : authMode === "login"
                        ? "Entrar"
                        : authMode === "signup"
                        ? "Criar Conta"
                        : "Enviar link de redefinição"}
                    </Button>
                  </form>

                  <div className="mt-6 grid gap-3">
                    {authMode === "login" && (
                      <Button type="button" variant="outline" className="w-full" onClick={() => handleModeChange("reset")}>Esqueci minha senha</Button>
                    )}
                    <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange(authMode === "signup" ? "login" : "signup")}> 
                      {authMode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-3xl border border-border/40 bg-background/70 p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Cpu className="h-4 w-4 text-primary" />
                      Desempenho leve e ágil
                    </div>
                    <div className="flex items-center gap-3">
                      <Library className="h-4 w-4 text-accent" />
                      Biblioteca por plataforma
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Segurança de conta garantida
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
      </div>
    </div>
  );
};

export default Index;
