"use client";

import { FormEvent, useState } from "react";
import { AtSign, MailCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Field, PrimaryButton, SecondaryButton, fieldClassName } from "@/components/modals/ModalKit";
import { Input } from "@/components/ui/input";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

import { AvatarEditor } from "./AvatarEditor";
import { SettingsPanel } from "./SettingsPanel";

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function AccountSettings() {
  const authUser = useFinanceStore((state) => state.authUser);
  const updateAuthUser = useFinanceStore((state) => state.updateAuthUser);
  const metadataName = authUser?.user_metadata?.name;
  const currentName = typeof metadataName === "string" ? metadataName.trim() : "";
  const email = authUser?.email || "";
  const pendingEmail = authUser?.new_email;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [nextEmail, setNextEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const resolvedDisplayName = displayName ?? currentName;
  const isNameDirty = resolvedDisplayName.trim() !== currentName;

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = resolvedDisplayName.trim();

    if (!normalizedName) {
      toast.error("Informe um nome de exibição.");
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { ...authUser?.user_metadata, name: normalizedName },
      });

      if (error) throw error;

      if (data.user) {
        updateAuthUser(data.user);
      }

      setDisplayName(null);
      toast.success("Perfil atualizado!");
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Atualizar perfil" },
      });
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = nextEmail.trim().toLowerCase();

    if (!normalizedEmail || normalizedEmail === email.toLowerCase()) {
      toast.error("Informe um e-mail diferente do atual.");
      return;
    }

    setIsChangingEmail(true);

    try {
      const { data, error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/configuracoes`,
        },
      );

      if (error) throw error;

      if (data.user) {
        updateAuthUser(data.user);
      }

      setIsEditingEmail(false);
      setNextEmail("");
      toast.success("Enviamos um link de confirmação para o novo e-mail.");
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        severity: "WARNING",
        context: { operation: "Alterar e-mail" },
      });
      toast.error("Não foi possível alterar o e-mail. Ele pode já estar em uso.");
    } finally {
      setIsChangingEmail(false);
    }
  }

  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <SettingsPanel
        id="settings-profile"
        icon={UserRound}
        title="Perfil"
        description="Como você aparece no Finync."
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <AvatarEditor displayName={resolvedDisplayName} />
          <div className="min-w-0 flex-1">
            <Field label="Nome de exibição" htmlFor="display-name">
              <div className="flex gap-2">
                <Input
                  id="display-name"
                  value={resolvedDisplayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Como você quer ser chamado"
                  autoComplete="name"
                  className={fieldClassName("emerald")}
                  required
                />
                {isNameDirty ? (
                  <PrimaryButton
                    accent="emerald"
                    type="submit"
                    loading={isSaving}
                    className="flex-none"
                  >
                    Salvar
                  </PrimaryButton>
                ) : null}
              </div>
            </Field>
            <p className="mt-2 text-xs text-zinc-500">
              Toque na foto para trocar. JPG ou PNG de até 5 MB.
            </p>
          </div>
        </form>
      </SettingsPanel>

      <SettingsPanel
        id="settings-email"
        icon={AtSign}
        title="E-mail de acesso"
        description="Usado para entrar e recuperar a senha."
      >
        {isEditingEmail ? (
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <Field label="Novo e-mail" htmlFor="next-email">
              <Input
                id="next-email"
                type="email"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
                placeholder="novo@email.com"
                autoComplete="email"
                autoFocus
                className={fieldClassName("emerald")}
                required
              />
            </Field>
            <p className="text-xs leading-5 text-zinc-500">
              A troca só vale depois que você clicar no link que vamos enviar.
            </p>
            <div className="flex justify-end gap-2">
              <SecondaryButton
                onClick={() => setIsEditingEmail(false)}
                disabled={isChangingEmail}
                className="flex-none"
              >
                Cancelar
              </SecondaryButton>
              <PrimaryButton
                accent="emerald"
                type="submit"
                loading={isChangingEmail}
                loadingLabel="Enviando..."
                className="flex-none"
              >
                Enviar confirmação
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-inset ring-white/[0.08]">
              <span className="min-w-0 truncate text-sm text-zinc-100">{email}</span>
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="shrink-0 text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
              >
                Alterar
              </button>
            </div>
            {pendingEmail ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 px-3.5 py-3 text-xs leading-5 text-amber-200">
                <MailCheck className="mt-0.5 size-4 shrink-0" />
                Aguardando confirmação de {pendingEmail}. Abra o link enviado
                para concluir a troca.
              </p>
            ) : null}
            {authUser?.created_at ? (
              <p className="text-xs text-zinc-500">
                Conta criada em {longDateFormatter.format(new Date(authUser.created_at))}.
              </p>
            ) : null}
          </div>
        )}
      </SettingsPanel>
    </div>
  );
}
