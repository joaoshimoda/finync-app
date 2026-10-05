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
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        {details ? (
          <div className="mx-6 mb-5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
            {details}
          </div>
        ) : null}
        {hasError ? (
          <p
            role="alert"
            className="mx-6 mb-5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={isConfirming}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            {isConfirming ? <Loader2 className="size-4 animate-spin" /> : null}
            {isConfirming ? loadingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
