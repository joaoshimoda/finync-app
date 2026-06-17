"use client";

import { ReactNode, useState } from "react";
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
  children: ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  title,
  description,
  children,
  onConfirm,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    setIsConfirming(true);

    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isConfirming}
            className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="h-10 rounded-xl bg-red-500 px-4 text-sm font-bold text-white shadow-[0_0_28px_rgba(239,68,68,0.18)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isConfirming ? "Removendo..." : confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
