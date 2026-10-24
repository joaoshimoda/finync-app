"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Field, fieldClassName } from "@/components/modals/ModalKit";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

const CONFIRMATION_WORD = "EXCLUIR";

const removedItems = [
  "Cartões, faturas e pagamentos",
  "Transações, contas fixas e receitas",
  "Dependentes, acertos e orçamentos",
  "Categorias, preferências, histórico e foto",
];

async function removeAvatarFiles(userId: string) {
  const { data: files, error } = await supabase.storage.from("avatars").list(userId);
  if (error || !files?.length) return;

  await supabase.storage
    .from("avatars")
    .remove(files.map((file) => `${userId}/${file.name}`));
}

function clearLocalData() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      // The theme belongs to the device, not to the account.
      if (key.startsWith("finync") && key !== "finync-theme") {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/* Irreversible: re-checks the password and a typed confirmation, removes the
   avatar files, then calls the database function that deletes the auth user
   (everything else cascades from it). */
export function DeleteAccountDialog({ children }: { children: React.ReactNode }) {
  const authUser = useFinanceStore((state) => state.authUser);
  const clearFinanceState = useFinanceStore((state) => state.clearFinanceState);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const canConfirm =
    confirmation.trim().toUpperCase() === CONFIRMATION_WORD && password.length > 0;

  function handleOpenChange(nextOpen: boolean) {
    if (isDeleting) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setPassword("");
      setConfirmation("");
      setError("");
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authUser?.email || !canConfirm) return;

    setIsDeleting(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password,
      });

      if (signInError) {
        setError("Senha incorreta. Confira e tente novamente.");
        return;
      }

      await removeAvatarFiles(authUser.id);

      const { error: deleteError } = await supabase.rpc("finync_delete_my_account");
      if (deleteError) throw deleteError;

      await supabase.auth.signOut({ scope: "local" });
      clearLocalData();
      clearFinanceState();
      window.location.replace("/");
    } catch (deleteError) {
      void reportAppError(deleteError, {
        source: "SUPABASE",
        context: { operation: "Excluir conta" },
      });
      setError(
        "Não foi possível excluir a conta agora. Nada foi apagado; tente novamente em instantes.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleDelete}>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-400/12 text-rose-300 ring-1 ring-inset ring-rose-400/20">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso apaga tudo de forma permanente. Não dá para desfazer nem
                recuperar depois.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 px-6 pb-5">
            <ul className="grid gap-1.5 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 ring-1 ring-inset ring-white/[0.08]">
              {removedItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
                  {item}
                </li>
              ))}
            </ul>

            <Field label="Sua senha" htmlFor="delete-password">
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isDeleting}
                className={fieldClassName("rose")}
                required
              />
            </Field>

            <Field
              label={
                <>
                  Digite <span className="font-semibold text-zinc-100">{CONFIRMATION_WORD}</span> para confirmar
                </>
              }
              htmlFor="delete-confirmation"
            >
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                disabled={isDeleting}
                className={fieldClassName("rose")}
                required
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-inset ring-rose-500/20"
              >
                {error}
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={isDeleting}
                className="h-11 rounded-xl px-4 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-50"
              >
                Cancelar
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={!canConfirm || isDeleting}
              className="h-11 rounded-xl bg-rose-500 px-5 font-semibold text-on-color hover:bg-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isDeleting ? "Excluindo..." : "Excluir para sempre"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
