"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FinyncLogo } from "@/components/branding/FinyncLogo";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/atualizar-senha`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );

      if (error) throw error;

      toast.success("Enviamos o link de recuperação para o seu e-mail.");
      setEmail("");
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      toast.error("Não foi possível enviar o link de recuperação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-zinc-50 text-zinc-950 lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />

        <Link href="/" className="relative flex w-fit items-center gap-3">
          <FinyncLogo eager className="w-32 brightness-125" />
        </Link>

        <div className="relative my-auto max-w-2xl py-16">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
            Recuperação segura
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Volte para sua conta sem perder o controle.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-400">
            Enviaremos um link seguro para você criar uma nova senha.
          </p>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col bg-zinc-50 px-5 py-6 sm:px-10 lg:justify-center lg:px-16 xl:px-24">
        <Link
          href="/"
          className="mb-12 flex w-fit items-center gap-2.5 lg:hidden"
        >
          <FinyncLogo eager className="w-28" />
        </Link>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-9">
            <p className="mb-3 text-sm font-semibold text-emerald-700">
              Esqueci a senha
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Recupere seu acesso
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Informe o e-mail cadastrado para receber o link de redefinição.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="recover-email" className="text-zinc-800">
                E-mail
              </Label>
              <Input
                id="recover-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-12 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-emerald-600/20"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>

          <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600">
            Lembrou a senha?{" "}
            <Link
              href="/login"
              className="font-semibold text-zinc-950 underline-offset-4 transition hover:underline"
            >
              Entrar
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
