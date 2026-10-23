"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle, CalendarX2, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { Transaction } from "@/store/useFinanceStore";

interface RecurringDeleteDialogProps {
  transaction: Transaction;
  children?: ReactNode;
  onDeleteSingle: (transaction: Transaction) => Promise<void> | void;
  onDeleteFuture: (transaction: Transaction) => Promise<void> | void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "delete" | "cancelSubscription";
}

type DeleteScope = "single" | "future";

export function RecurringDeleteDialog({
  transaction,
  children,
  onDeleteSingle,
  onDeleteFuture,
  open,
  onOpenChange,
  mode = "delete",
}: RecurringDeleteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isDeleteDialogOpen = open ?? internalOpen;
  const setIsDeleteDialogOpen = onOpenChange ?? setInternalOpen;
  const isCancelSubscription = mode === "cancelSubscription";

  async function handleConfirmDelete(scope: DeleteScope) {
    setHasError(false);
    setIsDeleting(true);

    try {
      if (scope === "future") {
        await onDeleteFuture(transaction);
      } else {
        await onDeleteSingle(transaction);
      }

      setIsDeleteDialogOpen(false);
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={isDeleteDialogOpen}
      onOpenChange={(nextOpen) => {
        if (isDeleting) return;
        setHasError(false);
        setIsDeleteDialogOpen(nextOpen);
      }}
    >
      {children ? (
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent className="sm:max-w-[460px]">
        <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-400/12 text-rose-300 ring-1 ring-inset ring-rose-400/20">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>
              {isCancelSubscription
                ? "Cancelar assinatura?"
                : "Excluir despesa recorrente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCancelSubscription
                ? "Esta ação remove a cobrança deste mês e as próximas cobranças da mesma assinatura. O histórico anterior será preservado."
                : "Escolha se deseja remover apenas o lançamento deste mês ou este e os próximos lançamentos da mesma recorrência."}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="space-y-2 px-6 pb-5">
          <Button
            variant="destructive"
            disabled={isDeleting || !transaction.groupId}
            onClick={() => void handleConfirmDelete("future")}
            className="h-auto min-h-12 w-full justify-start rounded-xl bg-rose-500 px-4 py-3 text-left font-semibold text-white hover:bg-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isCancelSubscription
              ? "Cancelar assinatura"
              : "Excluir este e os próximos"}
          </Button>

          {isCancelSubscription ? null : (
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => void handleConfirmDelete("single")}
              className="h-auto min-h-12 w-full justify-start rounded-xl border-0 bg-white/[0.03] px-4 py-3 text-left ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.06]"
            >
              <CalendarX2 className="size-4" />
              Somente este mês
            </Button>
          )}
          {hasError ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-inset ring-rose-500/20"
            >
              Não foi possível concluir a exclusão. Tente novamente.
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
              Voltar
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
