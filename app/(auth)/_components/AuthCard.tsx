"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  configureAuthPersistence,
  supabase,
} from "@/lib/supabaseClient";
import { Landmark, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

interface AuthCardProps {
  mode: AuthMode;
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (normalizedMessage.includes("password")) {
    return "A senha precisa atender aos requisitos mínimos de segurança.";
  }

  if (normalizedMessage.includes("already registered")) {
    return "Este email ja esta cadastrado. Entre na sua conta para continuar.";
  }

  return "Não foi possível concluir a autenticação agora. Tente novamente.";
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberConnected, setRememberConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim();
      const normalizedPassword = password.trim();
      if (!isSignup) {
        configureAuthPersistence(rememberConnected);
      }

      const { error } = isSignup
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: {
              data: {
                name: name.trim(),
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
          });

      if (error) throw error;

      toast.success(isSignup ? "Conta criada com sucesso!" : "Acesso realizado com sucesso!");
      router.refresh();
      router.replace("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? getAuthErrorMessage(error.message)
          : "Não foi possível concluir a autenticação agora. Tente novamente.";

      console.error("Erro de autenticação:", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.055] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-xl">
            <Landmark className="h-5 w-5 text-brand-300" strokeWidth={2} />
          </div>
          <p className="mb-2 text-sm font-medium text-brand-300">Finync</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isSignup ? "Crie sua conta" : "Bem-vindo de volta"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            {isSignup
              ? "Organize cartões, gastos e metas em um painel financeiro simples."
              : "Acesse seu painel e acompanhe seus gastos com clareza."}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Nome
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              E-mail
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Senha
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="********"
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
              minLength={6}
              required
            />
          </label>

          {!isSignup ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-connected"
                checked={rememberConnected}
                disabled={isSubmitting}
                onCheckedChange={(checked) =>
                  setRememberConnected(checked === true)
                }
              />
              <label
                htmlFor="remember-connected"
                className="cursor-pointer text-sm font-medium text-zinc-300"
              >
                Manter-me conectado
              </label>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : null}
            {isSubmitting
              ? isSignup
                ? "Criando conta..."
                : "Entrando..."
              : isSignup
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>

        <div className="mt-6 border-t border-white/[0.08] pt-6 text-center text-sm text-zinc-300">
          {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-brand-300 transition hover:text-brand-100"
          >
            {isSignup ? "Entrar" : "Cadastrar"}
          </Link>
        </div>
      </section>
    </main>
  );
}
