"use client";

import { ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const isDeleteDialogOpen = open ?? internalOpen;
  const setIsDeleteDialogOpen = onOpenChange ?? setInternalOpen;
  const isCancelSubscription = mode === "cancelSubscription";

  async function handleConfirmDelete(scope: DeleteScope) {
    setIsDeleting(true);

    try {
      if (scope === "future") {
        await onDeleteFuture(transaction);
      } else {
        await onDeleteSingle(transaction);
      }

      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {children ? (
        <span onClick={() => setIsDeleteDialogOpen(true)}>{children}</span>
      ) : null}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="p-6 sm:max-w-[400px]">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {isCancelSubscription
                  ? "Cancelar assinatura?"
                  : "Excluir despesa recorrente?"}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isCancelSubscription
                  ? "Esta ação remove a cobrança deste mês e as próximas cobranças da mesma assinatura. O histórico anterior será preservado."
                  : "Escolha se deseja remover apenas o lançamento deste mês ou este e os próximos lançamentos da mesma recorrência."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="destructive"
                disabled={isDeleting || !transaction.groupId}
                onClick={() => handleConfirmDelete("future")}
                className="h-11 w-full cursor-pointer"
              >
                {isCancelSubscription
                  ? "Cancelar assinatura"
                  : "Este e os próximos (Excluir tudo)"}
              </Button>

              {isCancelSubscription ? null : (
                <Button
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete("single")}
                  className="h-11 w-full cursor-pointer"
                >
                  Somente este mês
                </Button>
              )}

              <Button
                variant="ghost"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-11 w-full cursor-pointer hover:bg-zinc-800"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
