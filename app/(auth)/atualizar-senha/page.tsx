"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    async function verifyRecoverySession() {
      setIsVerifyingLink(true);
      setLinkError("");

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          throw error ?? new Error("Sessão de recuperação ausente.");
        }
      } catch (error) {
        console.error("Erro ao validar link de redefinição:", error);
        setLinkError(
          "Link expirado ou inválido. Solicite um novo link de recuperação.",
        );
      } finally {
        setIsVerifyingLink(false);
      }
    }

    void verifyRecoverySession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isVerifyingLink || linkError) return;

    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (normalizedPassword.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: normalizedPassword,
      });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      router.refresh();
      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      toast.error("Não foi possível atualizar sua senha. Solicite um novo link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormDisabled = isVerifyingLink || Boolean(linkError) || isSubmitting;

  return (
    <main className="grid min-h-svh bg-zinc-50 text-zinc-950 lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />

        <Link href="/" className="relative flex w-fit items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white text-zinc-950">
            <Landmark className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Finync</span>
        </Link>

        <div className="relative my-auto max-w-2xl py-16">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
            Nova senha
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Proteja sua conta com uma nova senha.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-400">
            Depois da atualização, você será levado de volta ao painel.
          </p>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col bg-zinc-50 px-5 py-6 sm:px-10 lg:justify-center lg:px-16 xl:px-24">
        <Link href="/" className="mb-12 flex w-fit items-center gap-2.5 lg:hidden">
          <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
            <Landmark className="size-4" strokeWidth={2.2} />
          </span>
          <span className="font-semibold tracking-tight">Finync</span>
        </Link>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-9">
            <p className="mb-3 text-sm font-semibold text-emerald-700">
              Redefinição de senha
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Crie uma nova senha
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Use uma senha segura para recuperar o acesso à sua conta.
            </p>
          </div>

          {isVerifyingLink ? (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
              <Loader2 className="size-4 animate-spin text-emerald-700" />
              Verificando link de segurança...
            </div>
          ) : null}

          {linkError ? (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {linkError}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-zinc-800">
                Nova senha
              </Label>
              <Input
                id="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-emerald-600/20"
                minLength={6}
                disabled={isFormDisabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-zinc-800">
                Confirmar nova senha
              </Label>
              <Input
                id="confirm-new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-12 border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-emerald-600/20"
                minLength={6}
                disabled={isFormDisabled}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isFormDisabled}
              className="h-12 w-full bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isSubmitting ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </form>

          <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600">
            Voltar para{" "}
            <Link
              href="/login"
              className="font-semibold text-zinc-950 underline-offset-4 transition hover:underline"
            >
              login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
