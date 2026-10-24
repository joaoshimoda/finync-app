"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LaptopMinimal, LogOut, MonitorSmartphone, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Field, PrimaryButton, fieldClassName } from "@/components/modals/ModalKit";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

import { SettingsPanel, settingsSecondaryButtonClassName } from "./SettingsPanel";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function describeDevice(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Navegador";
  const system = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/.test(userAgent);

  return { label: system ? `${browser} no ${system}` : browser, isMobile };
}

export function SecuritySettings() {
  const router = useRouter();
  const authUser = useFinanceStore((state) => state.authUser);
  const email = authUser?.email || "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [device] = useState(() =>
    describeDevice(typeof navigator === "undefined" ? "" : navigator.userAgent),
  );
  const DeviceIcon = device.isMobile ? Smartphone : LaptopMinimal;
  const passwordType = showPasswords ? "text" : "password";

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("A senha atual está incorreta.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha atualizada!");
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        severity: "WARNING",
        context: { operation: "Atualizar senha" },
      });
      toast.error("Não foi possível atualizar a senha.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        severity: "WARNING",
        context: { operation: "Encerrar outras sessões" },
      });
      throw error;
    }
    toast.success("Os outros aparelhos foram desconectados.");
  }

  async function signOutHere() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsSigningOut(false);
      toast.error("Não foi possível sair agora.");
      return;
    }
    router.replace("/login");
  }

  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <SettingsPanel
        id="settings-password"
        icon={KeyRound}
        title="Senha"
        description="Confirme a senha atual para criar uma nova."
        action={
          <button
            type="button"
            onClick={() => setShowPasswords((current) => !current)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          >
            {showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showPasswords ? "Ocultar" : "Mostrar"}
          </button>
        }
      >
        <form onSubmit={handleUpdatePassword} className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual" htmlFor="current-password" className="sm:col-span-2">
            <Input
              id="current-password"
              type={passwordType}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={fieldClassName("emerald")}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nova senha" htmlFor="new-password">
            <Input
              id="new-password"
              type={passwordType}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className={fieldClassName("emerald")}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type={passwordType}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={fieldClassName("emerald")}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <Link
              href="/recuperar-senha"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-200"
            >
              Esqueceu a senha atual?
            </Link>
            <PrimaryButton
              accent="emerald"
              type="submit"
              loading={isUpdatingPassword}
              loadingLabel="Atualizando..."
              className="flex-none"
            >
              Atualizar senha
            </PrimaryButton>
          </div>
        </form>
      </SettingsPanel>

      <SettingsPanel
        id="settings-sessions"
        icon={MonitorSmartphone}
        title="Aparelhos conectados"
        description="Perdeu um celular ou usou um computador emprestado? Desconecte daqui."
      >
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-inset ring-white/[0.08]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
            <DeviceIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-100">
              {device.label}
            </span>
            <span className="block text-xs text-zinc-500">
              Este aparelho
              {authUser?.last_sign_in_at
                ? ` · login em ${dateTimeFormatter.format(new Date(authUser.last_sign_in_at))}`
                : ""}
            </span>
          </span>
        </div>

        <div className="mt-3 grid gap-2">
          <ConfirmDialog
            title="Desconectar outros aparelhos?"
            description="Todos os outros navegadores e celulares vão precisar entrar de novo. Este aparelho continua conectado."
            confirmLabel="Desconectar"
            loadingLabel="Desconectando..."
            errorMessage="Não foi possível desconectar os outros aparelhos. Tente novamente."
            onConfirm={signOutOthers}
          >
            <Button type="button" variant="ghost" className={cn(settingsSecondaryButtonClassName, "w-full")}>
              Sair de todos os outros aparelhos
            </Button>
          </ConfirmDialog>
          <Button
            type="button"
            variant="ghost"
            disabled={isSigningOut}
            onClick={() => void signOutHere()}
            className="h-10 w-full rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <LogOut className="size-4" />
            Sair deste aparelho
          </Button>
        </div>
      </SettingsPanel>
    </div>
  );
}
