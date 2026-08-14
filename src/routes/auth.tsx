import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Tioxtm Natural" },
      { name: "description", content: "Acesse o painel administrativo do catálogo Tioxtm Natural." },
      { property: "og:title", content: "Entrar · Tioxtm Natural" },
      { property: "og:description", content: "Acesso ao painel administrativo do catálogo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function isLocalHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("mtxoit@gmail.com");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const { user, isAdmin, isAdminLoading } = useAuth();
  const navigate = useNavigate();
  const local = isLocalHost();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error_description") || params.get("error");
    if (error) toast.error(error);
  }, []);

  useEffect(() => {
    if (!user || isAdminLoading) return;
    navigate({ to: isAdmin ? "/admin" : "/" });
  }, [user, isAdmin, isAdminLoading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("not confirmed")
            ? "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada."
            : "Esta conta entra pelo Google e não tem senha. Use “Enviar código no e-mail”.",
        );
        return;
      }
      toast.success("Bem-vindo de volta!");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("Este e-mail já possui uma conta. Faça login ou recupere a senha.");
      setMode("login");
      return;
    }
    setPending(true);
    toast.success("Enviamos um e-mail de confirmação. Confirme para ativar sua conta.");
  }

  async function sendCode() {
    if (!email) {
      toast.error("Digite o e-mail da conta Google.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAwaitingCode(true);
    toast.success("Código enviado. Abra o Gmail e cole o código de 6 dígitos aqui.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      toast.error("Código inválido ou expirado. Envie outro.");
      return;
    }
    toast.success("Entrou com sucesso.");
  }

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("E-mail de confirmação reenviado.");
  }

  async function google() {
    setBusy(true);
    if (local) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { prompt: "select_account" },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(
          "O botão Google da Lovable não funciona no localhost. Use o código enviado ao Gmail.",
        );
      }
      return;
    }

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message || "Não foi possível entrar com Google.");
      return;
    }
    if (result.redirected) return;
  }

  if (pending) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-3xl">Confirme seu e-mail</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail e confirme
          para ativar sua conta — só é possível uma conta por e-mail.
        </p>
        <div className="surface-card mt-8 space-y-3 p-6">
          <Button className="w-full" onClick={resend} disabled={busy}>
            Reenviar e-mail de confirmação
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setPending(false);
              setMode("login");
            }}
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-20">
      <h1 className="text-3xl">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {local
          ? "No computador local a conta Google não abre o login da Lovable. Envie um código para o Gmail."
          : mode === "login"
            ? "Acesse sua conta para acompanhar seus pedidos."
            : "Uma conta por e-mail, confirmada por e-mail de verificação."}
      </p>

      {awaitingCode ? (
        <form onSubmit={verifyCode} className="surface-card mt-8 space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Código enviado para <strong>{email}</strong>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              required
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Entrar com o código
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={sendCode} disabled={busy}>
            Reenviar código
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="surface-card mt-8 space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode === "login" ? (
            <Button type="button" className="w-full" onClick={sendCode} disabled={busy}>
              Enviar código no e-mail
            </Button>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="password">Senha (só se a conta tiver senha)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              minLength={mode === "signup" ? 6 : undefined}
              required={mode === "signup"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" variant="secondary" disabled={busy || (mode === "login" && !password)}>
            {mode === "login" ? "Entrar com senha" : "Criar conta"}
          </Button>
          {mode === "login" ? (
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={async () => {
                if (!email) {
                  toast.error("Digite seu e-mail para receber o link de senha.");
                  return;
                }
                setBusy(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/auth/redefinir-senha`,
                });
                setBusy(false);
                if (error) toast.error(error.message);
                else toast.success("Enviamos um e-mail para redefinir a senha.");
              }}
            >
              Esqueci a senha
            </button>
          ) : null}
          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy}>
            Continuar com Google
          </Button>
        </form>
      )}

      <button
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setAwaitingCode(false);
          setMode(mode === "login" ? "signup" : "login");
        }}
      >
        {mode === "login" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
