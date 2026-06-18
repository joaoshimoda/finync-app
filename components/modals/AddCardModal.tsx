"use client";

import { FormEvent, useMemo, useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCardGradient } from "@/lib/cardUtils";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Card } from "@/store/useFinanceStore";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard?: Card | null;
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

  const previewName = name.trim() || "Finync Card";
  const previewLimit = Number(limit.replace(",", ".")) || 0;
  const previewGradient = useMemo(
    () => getCardGradient(previewName),
    [previewName],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cardPayload = {
      name: name.trim(),
      limitAmount: previewLimit,
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
    <DialogContent className="border-white/[0.08] bg-zinc-950/95 text-white sm:max-w-xl">
      <DialogHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
          <CreditCard className="size-5" />
        </div>
        <DialogTitle>
          {editingCard ? "Editar cartão" : "Novo cartão"}
        </DialogTitle>
        <DialogDescription>
          Configure limite, fechamento e vencimento para acompanhar a fatura.
        </DialogDescription>
      </DialogHeader>

      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div className="col-span-2 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex justify-center">
            <div
              className={cn(
                "relative h-36 w-full max-w-72 overflow-hidden rounded-2xl p-5 text-white shadow-lg",
                previewGradient,
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-12 left-8 size-28 rounded-full bg-black/20" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="h-7 w-10 rounded-md border border-white/25 bg-gradient-to-br from-white/40 to-white/10 shadow-inner" />
                <CreditCard className="size-5 text-white/80" />
              </div>
              <div className="relative mt-8">
                <p className="truncate text-sm font-medium text-white">
                  {previewName}
                </p>
                <p className="mt-2 text-xs font-medium uppercase text-white/60">
                  Limite
                </p>
                <strong className="block text-xl font-bold tracking-normal text-white">
                  {brlFormatter.format(previewLimit)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-name">Nome do Cartão</Label>
          <Input
            id="card-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            placeholder="Ex: Nubank"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-limit">Limite</Label>
          <Input
            id="card-limit"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-closing-day">Dia de Fechamento</Label>
          <Input
            id="card-closing-day"
            value={closingDay}
            onChange={(event) => setClosingDay(event.target.value)}
            type="number"
            min={1}
            max={31}
            placeholder="25"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-due-day">Dia de Vencimento</Label>
          <Input
            id="card-due-day"
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value)}
            type="number"
            min={1}
            max={31}
            placeholder="05"
          />
        </div>

        <div className="col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" className="gap-2">
            <Save className="size-4" />
            Salvar cartão
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
