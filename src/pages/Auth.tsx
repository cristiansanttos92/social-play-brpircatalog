import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import heroBanner from "@/assets/hero-banner.jpg";

type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Bem-vindo de volta!",
          description: "Login realizado com sucesso.",
        });
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
          options: {
            emailRedirectTo: `${window.location.origin}/profile-setup`,
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Confira seu email para ativar a conta e continuar.",
        });
        setAuthMode("login");
        resetForm();
        return;
      }

      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) throw error;

        toast({
          title: "Email enviado",
          description: "Verifique seu email para redefinir sua senha.",
        });
        setAuthMode("login");
        resetForm();
        return;
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    resetForm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBanner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />

      <Card className="w-full max-w-md relative z-10 border-primary/20">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Gamepad2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            BrpirCatalog
          </CardTitle>
          <CardDescription>
            {authMode === "login" && "Entre na sua conta para acessar seu catálogo."}
            {authMode === "signup" && "Crie sua conta e comece a organizar seus jogos."}
            {authMode === "reset" && "Redefina sua senha enviando um link para o seu email."}
          </CardDescription>
        </CardHeader>

        <CardContent>
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

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading
                ? "Processando..."
                : authMode === "login"
                ? "Entrar"
                : authMode === "signup"
                ? "Criar Conta"
                : "Enviar link de redefinição"}
            </Button>

            <div className="flex flex-col gap-2">
              {authMode === "login" && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange("reset")}>Esqueci minha senha</Button>
              )}
              <Button type="button" variant="ghost" className="w-full" onClick={() => handleModeChange(authMode === "signup" ? "login" : "signup")}> 
                {authMode === "signup" ? "Já tem conta? Entre" : "Não tem conta? Cadastre-se"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
