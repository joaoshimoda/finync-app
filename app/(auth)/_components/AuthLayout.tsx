"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { FinyncLogo } from "@/components/branding/FinyncLogo";
import { archivo } from "@/components/landing/fonts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { AuthShowcase } from "./AuthShowcase";

export const authEase = [0.22, 1, 0.36, 1] as const;

// Cooldown, in seconds, before each successive "resend e-mail" is allowed.
export const RESEND_INTERVALS = [30, 60, 180] as const;

export const authTitleClassName =
  "text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] [font-stretch:88%]";

export const authSubmitClassName =
  "group mt-1 h-12 rounded-xl text-[15px] shadow-[0_8px_24px_-10px_rgba(44,96,60,0.7)] hover:bg-primary/90";

const fieldClassName =
  "h-12 rounded-xl border-border bg-ledger-sheet pl-11 text-[15px] shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-primary/15 dark:bg-ledger-sheet [&::-ms-clear]:hidden [&::-ms-reveal]:hidden";

export function AuthField({
  id,
  label,
  icon: Icon,
  trailing,
  aside,
  ...inputProps
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[14px]">
          {label}
        </Label>
        {aside}
      </div>
      <div className="group relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
        />
        <Input
          id={id}
          className={cn(fieldClassName, trailing ? "pr-12" : undefined)}
          {...inputProps}
        />
        {trailing ? (
          <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthFormError({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          key="error"
          role="alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: authEase }}
          className="overflow-hidden"
        >
          <p className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-3 text-[14px] leading-[1.45] text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {message}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const strengthLevels = [
  { label: "Muito curta", tone: "bg-destructive" },
  { label: "Fraca", tone: "bg-ledger-amber" },
  { label: "Razoável", tone: "bg-ledger-amber" },
  { label: "Boa", tone: "bg-primary" },
  { label: "Forte", tone: "bg-primary" },
];

function getPasswordStrength(password: string) {
  if (password.length < 6) return 0;
  let score = 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  return (
    <AnimatePresence initial={false}>
      {password ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: authEase }}
          className="overflow-hidden"
        >
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className="h-1 flex-1 overflow-hidden rounded-full bg-border"
              >
                <motion.span
                  className={cn(
                    "block h-full origin-left rounded-full",
                    strengthLevels[strength].tone,
                  )}
                  initial={false}
                  animate={{ scaleX: strength >= step ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: authEase }}
                />
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground" aria-live="polite">
            Força da senha:{" "}
            <span className="font-medium text-foreground">
              {strengthLevels[strength].label}
            </span>
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* Shared frame of every auth screen: logo header, centered form column,
   privacy footer and the product showcase on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={cn(
          archivo.variable,
          "landing grid min-h-svh bg-background font-landing text-foreground selection:bg-primary selection:text-primary-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:p-3",
        )}
      >
        <div className="relative flex min-h-svh flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:px-12 xl:px-20">
          <div
            aria-hidden
            className="landing-grid pointer-events-none absolute inset-0 lg:hidden"
          />
          <header className="relative flex items-center justify-between">
            <Link
              href="/"
              aria-label="Finync, página inicial"
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FinyncLogo eager className="w-[88px]" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Voltar ao site
            </Link>
          </header>

          <section className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
            {children}
          </section>

          <footer className="relative text-[13px] text-muted-foreground">
            Seus dados financeiros ficam privados na sua conta.
          </footer>
        </div>

        <AuthShowcase />
      </main>
    </MotionConfig>
  );
}
