"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

interface ConfirmDialogProps {
  title: string;
  description: string;
  children?: ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  errorMessage?: string;
  details?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
  title,
  description,
  children,
  onConfirm,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loadingLabel = "Processando...",
  errorMessage = "Não foi possível concluir a ação. Tente novamente.",
  details,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const open = controlledOpen ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (isConfirming) return;
    setHasError(false);
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  async function handleConfirm() {
    setHasError(false);
    setIsConfirming(true);

    try {
      await onConfirm();
      if (controlledOpen === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    } catch {
      setHasError(true);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children ? (
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent className="sm:max-w-[430px]">
        <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-400/12 text-rose-300 ring-1 ring-inset ring-rose-400/20">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        {details ? (
          <div className="mx-6 mb-5 rounded-xl bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-white/[0.08]">
            {details}
          </div>
        ) : null}
        {hasError ? (
          <p
            role="alert"
            className="mx-6 mb-5 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-inset ring-rose-500/20"
          >
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="ghost"
              disabled={isConfirming}
              className="h-11 rounded-xl px-4 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-50"
            >
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            className="h-11 rounded-xl bg-rose-500 px-5 font-semibold text-on-color hover:bg-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            {isConfirming ? <Loader2 className="size-4 animate-spin" /> : null}
            {isConfirming ? loadingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
