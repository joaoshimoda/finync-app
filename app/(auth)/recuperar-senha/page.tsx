"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

import {
  AuthField,
  AuthFormError,
  AuthShell,
  RESEND_INTERVALS,
  authEase as ease,
  authSubmitClassName,
  authTitleClassName,
} from "../_components/AuthLayout";

async function sendRecoveryEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/atualizar-senha`,
  });
  if (error) throw error;
}

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(RESEND_INTERVALS[0]);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!sentTo || timeLeft <= 0) return;

    const intervalId = window.setInterval(() => {
      setTimeLeft((currentTime) => Math.max(currentTime - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sentTo, timeLeft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFormError("Informe seu e-mail.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await sendRecoveryEmail(normalizedEmail);
      setSentTo(normalizedEmail);
      setResendCount(0);
      setTimeLeft(RESEND_INTERVALS[0]);
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      setFormError("Não foi possível enviar o link de recuperação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (timeLeft > 0 || isResending) return;

    setIsResending(true);

    try {
      await sendRecoveryEmail(sentTo);

      const nextResendCount = Math.min(resendCount + 1, RESEND_INTERVALS.length - 1);
      setResendCount(nextResendCount);
      setTimeLeft(RESEND_INTERVALS[nextResendCount]);
      toast.success("Enviamos um novo link.");
    } catch (error) {
      console.error("Erro ao reenviar link de recuperação:", error);
      toast.error("Não foi possível reenviar o link. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell>
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease }}
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"
            >
              <MailCheck className="size-6" />
            </motion.span>
            <h1 className={cn("mt-6", authTitleClassName)}>Verifique seu e-mail</h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
              Se houver uma conta com{" "}
              <span className="font-medium text-foreground">{sentTo}</span>, você vai
              receber um link para criar uma nova senha.
            </p>
            <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">
              Não chegou? Confira a caixa de spam ou promoções.
            </p>

            <Button asChild size="lg" className={cn(authSubmitClassName, "mt-8 w-full")}>
              <Link href="/login">
                Voltar para o login
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[14px]">
              <button
                type="button"
                onClick={() => setSentTo("")}
                className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Usar outro e-mail
              </button>
              <button
                type="button"
                disabled={timeLeft > 0 || isResending}
                onClick={() => void handleResend()}
                className="cursor-pointer font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                {isResending
                  ? "Reenviando..."
                  : timeLeft > 0
                    ? `Reenviar em ${timeLeft}s`
                    : "Reenviar link"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease }}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-6" />
            </span>
            <h1 className={cn("mt-6", authTitleClassName)}>Esqueceu a senha?</h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
              Informe o e-mail da sua conta e enviaremos um link para você criar uma
              nova senha.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <AuthField
                id="recover-email"
                label="E-mail"
                icon={Mail}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (formError) setFormError("");
                }}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                autoFocus
                required
              />

              <AuthFormError message={formError} />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className={authSubmitClassName}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
                {!isSubmitting ? (
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>
            </form>

            <p className="mt-8 border-t border-border pt-5 text-center text-[14px] text-muted-foreground">
              Lembrou a senha?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Entrar
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
