"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { configureAuthPersistence, supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

import {
  AuthField as Field,
  AuthFormError,
  AuthShell,
  PasswordStrength,
  RESEND_INTERVALS,
  authEase as ease,
  authSubmitClassName,
  authTitleClassName,
} from "./AuthLayout";

type AuthMode = "login" | "signup";

const copy = {
  login: {
    title: "Bem-vindo de volta",
    description: "Entre para acompanhar seu mês com clareza.",
    submit: "Entrar",
    submitting: "Entrando...",
  },
  signup: {
    title: "Crie sua conta",
    description: "Organize a próxima fatura em poucos minutos. É grátis.",
    submit: "Criar conta",
    submitting: "Criando conta...",
  },
} as const;

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
    return "Este e-mail já está cadastrado. Entre na sua conta para continuar.";
  }

  return "Não foi possível concluir a autenticação agora. Tente novamente.";
}

export function AuthCard({ mode: initialMode }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [rememberConnected, setRememberConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(RESEND_INTERVALS[0]);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!isOtpStep || timeLeft <= 0) return;

    const intervalId = window.setInterval(() => {
      setTimeLeft((currentTime) => Math.max(currentTime - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isOtpStep, timeLeft]);

  // Switching tabs swaps the form in place; the URL follows so refresh and
  // sharing keep the chosen mode without remounting the page.
  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode || isSubmitting) return;
    setMode(nextMode);
    setFormError("");
    window.history.replaceState(null, "", nextMode === "signup" ? "/signup" : "/login");
  }

  async function handleResendOtp() {
    if (timeLeft > 0 || isResending) return;

    setIsResending(true);
    setOtpError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) throw error;

      const nextResendCount = Math.min(
        resendCount + 1,
        RESEND_INTERVALS.length - 1,
      );

      setResendCount(nextResendCount);
      setTimeLeft(RESEND_INTERVALS[nextResendCount]);
      toast.success("Novo código enviado.");
    } catch (error) {
      console.error("Erro ao reenviar código OTP:", error);
      setOtpError("Não foi possível reenviar o código. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleVerifyOtp(token: string) {
    if (token.length !== 6 || isOtpLoading) return;

    setIsOtpLoading(true);
    setOtpError("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email",
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error(
          "A sessão não foi criada após a verificação do código.",
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error("Não foi possível confirmar a sessão.");
      }

      toast.success("E-mail verificado com sucesso!");
      router.refresh();
      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao verificar código OTP:", error);
      setOtpValue("");
      setOtpError("Código inválido ou expirado. Solicite um novo código.");
    } finally {
      setIsOtpLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const normalizedEmail = email.trim();
      const normalizedPassword = password.trim();
      if (isSignup) {
        configureAuthPersistence(false);
      } else {
        configureAuthPersistence(rememberConnected);
      }

      const { error } = isSignup
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: {
              data: {
                name: name.trim(),
                onboarding_completed: false,
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
          });

      if (error) throw error;

      if (isSignup) {
        setIsOtpStep(true);
        toast.success("Código enviado para o seu e-mail.");
        return;
      }

      toast.success("Acesso realizado com sucesso!");
      window.location.href = "/dashboard";
    } catch (error) {
      const message =
        error instanceof Error
          ? getAuthErrorMessage(error.message)
          : "Não foi possível concluir a autenticação agora. Tente novamente.";

      console.error("Erro de autenticação:", error);
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AnimatePresence mode="wait" initial={false}>
        {isOtpStep ? (
          <motion.div
            key="otp"
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
            <h1 className={cn("mt-6", authTitleClassName)}>
              Verifique seu e-mail
            </h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-medium text-foreground">{email.trim()}</span>.
            </p>

            <div className="mt-8 grid gap-4">
              <InputOTP
                autoFocus
                maxLength={6}
                value={otpValue}
                disabled={isOtpLoading}
                onChange={(value) => {
                  setOtpValue(value);
                  if (otpError) setOtpError("");
                }}
                onComplete={(value) => void handleVerifyOtp(value)}
                containerClassName="justify-start"
              >
                <InputOTPGroup className="w-full gap-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-14 min-w-0 flex-1 rounded-xl border border-border bg-ledger-sheet text-xl font-semibold text-foreground shadow-none first:rounded-xl first:border last:rounded-xl data-[active=true]:border-primary data-[active=true]:ring-3 data-[active=true]:ring-primary/15 dark:bg-ledger-sheet"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <AnimatePresence>
                {otpError ? (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-[14px] font-medium text-destructive"
                  >
                    <AlertCircle className="size-4" />
                    {otpError}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {isOtpLoading ? (
                <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Verificando código...
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[14px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtpValue("");
                    setOtpError("");
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Usar outro e-mail
                </button>
                <button
                  type="button"
                  disabled={timeLeft > 0 || isResending}
                  onClick={() => void handleResendOtp()}
                  className="cursor-pointer font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                >
                  {isResending
                    ? "Reenviando..."
                    : timeLeft > 0
                      ? `Reenviar em ${timeLeft}s`
                      : "Reenviar código"}
                </button>
              </div>
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              role="group"
              aria-label="Escolha entre entrar ou criar conta"
              className="grid grid-cols-2 rounded-full border border-border bg-secondary/60 p-1 text-[14px]"
            >
              {(["login", "signup"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => switchMode(option)}
                  className={cn(
                    "relative cursor-pointer rounded-full py-2 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mode === option
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === option ? (
                    <motion.span
                      layoutId="auth-mode-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-ledger-sheet shadow-[0_1px_3px_rgba(18,38,26,0.12)] ring-1 ring-border"
                    />
                  ) : null}
                  <span className="relative">
                    {option === "login" ? "Entrar" : "Criar conta"}
                  </span>
                </button>
              ))}
            </motion.div>

            <div className="mt-9 min-h-[92px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <h1 className={authTitleClassName}>
                    {copy[mode].title}
                  </h1>
                  <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
                    {copy[mode].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <AnimatePresence initial={false}>
                {isSignup ? (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="-m-1 overflow-hidden p-1"
                  >
                    <Field
                      id="auth-name"
                      label="Nome"
                      icon={UserRound}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      type="text"
                      autoComplete="name"
                      placeholder="Como podemos te chamar?"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Field
                id="auth-email"
                label="E-mail"
                icon={Mail}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
              />

              <div className="grid gap-2.5">
                <Field
                  id="auth-password"
                  label="Senha"
                  icon={Lock}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "Mínimo de 6 caracteres" : "Sua senha"}
                  minLength={6}
                  required
                  aside={
                    !isSignup ? (
                      <Link
                        href="/recuperar-senha"
                        className="text-[13px] font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Esqueci minha senha
                      </Link>
                    ) : null
                  }
                  trailing={
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
                  }
                />

                <PasswordStrength password={isSignup ? password : ""} />
              </div>

              <AnimatePresence initial={false}>
                {!isSignup ? (
                  <motion.div
                    key="remember"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className="-m-1 overflow-hidden p-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="remember-connected"
                        checked={rememberConnected}
                        disabled={isSubmitting}
                        className="size-[18px] rounded-[5px] border-border bg-ledger-sheet data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        onCheckedChange={(checked) =>
                          setRememberConnected(checked === true)
                        }
                      />
                      <Label
                        htmlFor="remember-connected"
                        className="cursor-pointer text-[14px] font-normal text-muted-foreground"
                      >
                        Manter-me conectado
                      </Label>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AuthFormError message={formError} />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className={authSubmitClassName}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                {isSubmitting ? copy[mode].submitting : copy[mode].submit}
                {!isSubmitting ? (
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>

              {isSignup ? (
                <p className="text-center text-[13px] leading-[1.5] text-muted-foreground">
                  Sem cartão de crédito. Você confirma o e-mail com um
                  código no próximo passo. Ao criar a conta, você concorda
                  com os{" "}
                  <Link href="/termos" target="_blank" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Termos de uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" target="_blank" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Política de privacidade
                  </Link>
                  .
                </p>
              ) : null}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
