"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  configureAuthPersistence,
  supabase,
} from "@/lib/supabaseClient";
import { Landmark, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

const RESEND_INTERVALS = [30, 60, 180] as const;

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
        throw new Error("A sessão não foi criada após a verificação do código.");
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
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-zinc-50 text-zinc-950 lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_160_160%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.9%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%221%22/%3E%3C/svg%3E')]" />

        <Link href="/" className="relative flex w-fit items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white text-zinc-950">
            <Landmark className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Finync</span>
        </Link>

        <div className="relative my-auto max-w-2xl py-16">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
            Finanças sem atrito
          </p>
          <h2 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Controle financeiro que respeita o seu tempo.
          </h2>
          <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-400">
            Cartões, despesas e receitas organizados em uma visão objetiva para
            você decidir com clareza.
          </p>
        </div>

        <div className="relative flex items-center gap-3 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <ShieldCheck className="size-5 text-emerald-400" strokeWidth={1.8} />
          Seus dados financeiros permanecem privados e protegidos.
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
          {isOtpStep ? (
            <div className="space-y-8">
              <div>
                <p className="mb-3 text-sm font-semibold text-emerald-700">
                  Verificação de segurança
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  Verifique seu e-mail
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Código enviado para{" "}
                  <span className="font-medium text-zinc-950">{email.trim()}</span>
                </p>
              </div>

              <div className="space-y-4">
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
                        className="h-13 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white text-lg font-semibold text-zinc-950 shadow-none first:rounded-lg first:border last:rounded-lg data-[active=true]:border-emerald-600 data-[active=true]:ring-2 data-[active=true]:ring-emerald-600/15"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <button
                  type="button"
                  disabled={timeLeft > 0 || isResending}
                  onClick={() => void handleResendOtp()}
                  className="cursor-pointer text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {isResending
                    ? "Reenviando..."
                    : timeLeft > 0
                      ? `Aguarde ${timeLeft} segundos para reenviar`
                      : "Reenviar código"}
                </button>

                {otpError ? (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {otpError}
                  </p>
                ) : null}

                {isOtpLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="size-4 animate-spin" />
                    Verificando código...
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-9">
                <p className="mb-3 text-sm font-semibold text-emerald-700">
                  {isSignup ? "Comece agora" : "Acesso seguro"}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  {isSignup ? "Crie sua conta" : "Bem-vindo de volta"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {isSignup
                    ? "Organize sua vida financeira em poucos minutos."
                    : "Entre para acompanhar seu mês com clareza."}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {isSignup ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-800">
                      Nome
                    </span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-800">
                    E-mail
                  </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-800">
                    Senha
                  </span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                    minLength={6}
                    required
                  />
                </label>

                {!isSignup ? (
                  <div className="flex justify-end">
                    <Link
                      href="/recuperar-senha"
                      className="text-sm font-semibold text-zinc-700 underline-offset-4 transition hover:text-zinc-950 hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                ) : null}

                {!isSignup ? (
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="remember-connected"
                      checked={rememberConnected}
                      disabled={isSubmitting}
                      className="border-zinc-300 dark:border-zinc-700"
                      onCheckedChange={(checked) =>
                        setRememberConnected(checked === true)
                      }
                    />
                    <label
                      htmlFor="remember-connected"
                      className="cursor-pointer text-sm font-medium text-zinc-900"
                    >
                      Manter-me conectado
                    </label>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
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

              <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600">
                {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
                <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="font-semibold text-zinc-950 underline-offset-4 transition hover:underline"
                >
                  {isSignup ? "Entrar" : "Cadastrar"}
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
