import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Library, TrendingUp, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
      <div className="relative h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background" />

        <div className="relative h-full container mx-auto px-4 py-10 text-foreground">
          <div className="grid gap-12 xl:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Gamepad2 className="h-5 w-5" />
                Bem-vindo ao seu catálogo de jogos
              </div>
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
                  Controle seus jogos, descubra novidades e jogue com propósito.
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  BrpirCatalog une gestão de backlog, estatísticas, comentários e inspiração em um só lugar.
                  Faça login ou crie sua conta para começar a organizar seus jogos agora mesmo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/50 bg-card/95 p-6 shadow-xl shadow-slate-900/10 backdrop-blur">
                  <h3 className="text-lg font-semibold text-foreground">Seu jogo hoje</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Encontre inspirações com capas e destaques dos jogos mais comentados do momento.
                  </p>
                </div>
                <div className="rounded-3xl border border-border/50 bg-card/95 p-6 shadow-xl shadow-slate-900/10 backdrop-blur">
                  <h3 className="text-lg font-semibold text-foreground">Organização rápida</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Adicione jogos ao catálogo, marque favoritos e acompanhe suas horas de jogo com facilidade.
                  </p>
                </div>
              </div>
            </div>

            <Card className="relative overflow-hidden border border-primary/10 bg-card/95 shadow-2xl shadow-slate-900/10">
              <CardHeader className="space-y-3 text-center px-8 pt-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  {authMode === "login" ? "Entrar" : authMode === "signup" ? "Criar conta" : "Recuperar senha"}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {authMode === "login" && "Use seu email para acessar seu catálogo."}
                  {authMode === "signup" && "Crie uma conta gratuita em poucos segundos."}
                  {authMode === "reset" && "Receba um link para redefinir sua senha."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8">
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

                <div className="mt-6 grid gap-2">
                  {authMode === "login" && (
                    <Button type="button" variant="outline" className="w-full" onClick={() => handleModeChange("reset")}>Esqueci minha senha</Button>
                  )}
                  <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange(authMode === "signup" ? "login" : "signup")}> 
                    {authMode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-border/50 bg-card/95 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
            <div className="inline-flex items-center justify-center rounded-3xl bg-primary/10 p-3 mb-4 text-primary">
              <Library className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Catálogo Organizado</h3>
            <p className="text-sm text-muted-foreground">
              Classifique seus jogos por plataforma, status e favoritos, com visual moderno.
            </p>
          </div>

          <div className="rounded-3xl border border-border/50 bg-card/95 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
            <div className="inline-flex items-center justify-center rounded-3xl bg-accent/10 p-3 mb-4 text-accent">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Acompanhe estatísticas</h3>
            <p className="text-sm text-muted-foreground">
              Veja seu progresso, horas jogadas e seus títulos favoritos.
            </p>
          </div>

          <div className="rounded-3xl border border-border/50 bg-card/95 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
            <div className="inline-flex items-center justify-center rounded-3xl bg-primary/10 p-3 mb-4 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Conexão social</h3>
            <p className="text-sm text-muted-foreground">
              Descubra amigos, compare coleções e veja recomendações personalizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
