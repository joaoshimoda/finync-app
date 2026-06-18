"use client";

import { FormEvent, useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFinanceStore, type Card } from "@/store/useFinanceStore";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard?: Card | null;
}

function parseOptionalDay(value: string) {
  const day = Number(value);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return undefined;
  }

  return day;
}

export function AddCardModal({
  isOpen,
  onClose,
  editingCard = null,
}: AddCardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <CardModalContent
          key={editingCard?.id ?? "new-card"}
          editingCard={editingCard}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function CardModalContent({
  editingCard,
  onClose,
}: {
  editingCard: Card | null;
  onClose: () => void;
}) {
  const addCard = useFinanceStore((state) => state.addCard);
  const editCard = useFinanceStore((state) => state.editCard);

  const [name, setName] = useState(editingCard?.name ?? "");
  const [limit, setLimit] = useState(
    editingCard?.limitAmount ? String(editingCard.limitAmount).replace(".", ",") : "",
  );
  const [closingDay, setClosingDay] = useState(
    editingCard?.closingDay ? String(editingCard.closingDay) : "",
  );
  const [dueDay, setDueDay] = useState(
    editingCard?.dueDay ? String(editingCard.dueDay) : "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cardPayload = {
      name: name.trim(),
      limitAmount: Number(limit.replace(",", ".")) || 0,
      closingDay: parseOptionalDay(closingDay),
      dueDay: parseOptionalDay(dueDay),
    };

    try {
      if (editingCard) {
        await editCard(editingCard.id, cardPayload);
        toast.success("Cartão atualizado!");
      } else {
        await addCard(cardPayload);
        toast.success("Cartão adicionado!");
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar cartão");
    }
  }

  return (
    <DialogContent className="max-w-lg border-white/[0.08] bg-zinc-950/95 text-white">
      <DialogHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
          <CreditCard className="size-5" />
        </div>
        <DialogTitle>
          {editingCard ? "Editar cartão" : "Adicionar cartão"}
        </DialogTitle>
        <DialogDescription>
          Configure limite, fechamento e vencimento para acompanhar a fatura.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Nome
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            placeholder="Ex: Nubank, Itaú, C6"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Limite
          </span>
          <input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Dia de fechamento
            </span>
            <input
              value={closingDay}
              onChange={(event) => setClosingDay(event.target.value)}
              type="number"
              min={1}
              max={31}
              placeholder="25"
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Dia de vencimento
            </span>
            <input
              value={dueDay}
              onChange={(event) => setDueDay(event.target.value)}
              type="number"
              min={1}
              max={31}
              placeholder="05"
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="lg">
            Salvar cartão
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
