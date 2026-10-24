"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Link2Off, Loader2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

import {
  AuthField,
  AuthFormError,
  AuthShell,
  PasswordStrength,
  authEase as ease,
  authSubmitClassName,
  authTitleClassName,
} from "../_components/AuthLayout";

type LinkStatus = "checking" | "valid" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");

  useEffect(() => {
    async function verifyRecoverySession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          throw error ?? new Error("Sessão de recuperação ausente.");
        }

        setLinkStatus("valid");
      } catch (error) {
        console.error("Erro ao validar link de redefinição:", error);
        setLinkStatus("invalid");
      }
    }

    void verifyRecoverySession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (linkStatus !== "valid") return;

    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (normalizedPassword.length < 6) {
      setFormError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

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
      setFormError("Não foi possível atualizar sua senha. Solicite um novo link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibilityToggle = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setShowPassword((current) => !current)}
      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
      className="size-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:bg-secondary"
    >
      {showPassword ? <EyeOff /> : <Eye />}
    </Button>
  );

  return (
    <AuthShell>
      <AnimatePresence mode="wait" initial={false}>
        {linkStatus === "checking" ? (
          <motion.p
            key="checking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[15px] text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin text-primary" />
            Verificando link de segurança...
          </motion.p>
        ) : linkStatus === "invalid" ? (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease }}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Link2Off className="size-6" />
            </span>
            <h1 className={cn("mt-6", authTitleClassName)}>Link expirado</h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
              Este link de recuperação é inválido ou já foi usado. Peça um novo para
              criar sua senha.
            </p>

            <Button asChild size="lg" className={cn(authSubmitClassName, "mt-8 w-full")}>
              <Link href="/recuperar-senha">
                Solicitar novo link
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <p className="mt-8 border-t border-border pt-5 text-center text-[14px] text-muted-foreground">
              Voltar para o{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                login
              </Link>
            </p>
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
              <ShieldCheck className="size-6" />
            </span>
            <h1 className={cn("mt-6", authTitleClassName)}>Crie uma nova senha</h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
              Depois de salvar, você volta direto para o seu painel.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2.5">
                <AuthField
                  id="new-password"
                  label="Nova senha"
                  icon={Lock}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (formError) setFormError("");
                  }}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
                  disabled={isSubmitting}
                  autoFocus
                  required
                  trailing={visibilityToggle}
                />
                <PasswordStrength password={password} />
              </div>

              <AuthField
                id="confirm-new-password"
                label="Confirmar nova senha"
                icon={Lock}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (formError) setFormError("");
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                minLength={6}
                disabled={isSubmitting}
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
                {isSubmitting ? "Salvando..." : "Salvar nova senha"}
                {!isSubmitting ? (
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
