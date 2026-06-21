"use client";

import { FormEvent, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function getPreviewCardBackground(bankName: string) {
  const normalizedBankName = bankName.toLowerCase();

  if (normalizedBankName.includes("nubank")) {
    return "bg-gradient-to-br from-purple-600 to-purple-900";
  }

  if (normalizedBankName.includes("itaú") || normalizedBankName.includes("itau")) {
    return "bg-gradient-to-br from-orange-500 to-blue-700";
  }

  if (normalizedBankName.includes("inter")) {
    return "bg-orange-500";
  }

  return "bg-zinc-800";
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
  const previewBackground = useMemo(
    () => getPreviewCardBackground(previewName),
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
    <DialogContent className="border border-zinc-800 bg-zinc-950 text-white shadow-2xl sm:max-w-3xl">
      <DialogHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
          <CreditCard className="size-5" />
        </div>
        <DialogTitle>{editingCard ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        <DialogDescription>
          Configure nome, limite, fechamento e vencimento da fatura.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-6">
          <div
            className={cn(
              "mx-auto flex h-44 w-full max-w-sm flex-col justify-between rounded-xl p-6 text-white transition-all duration-500",
              previewBackground,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="h-7 w-10 rounded-md border border-white/25 bg-gradient-to-br from-white/40 to-white/10 shadow-inner" />
              <CreditCard className="size-5 text-white/80" />
            </div>
            <div className="space-y-1">
              <p className="truncate text-sm font-medium text-white/80">
                Cartão de crédito
              </p>
              <p className="truncate text-xl font-semibold text-white">
                {previewName}
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
                Limite {brlFormatter.format(previewLimit)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="card-name" className="text-xs text-zinc-400">
              Nome do Cartão
            </Label>
            <Input
              id="card-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              placeholder="Nubank, Itaú, Inter..."
              className="h-10 border border-zinc-700 bg-zinc-900 text-zinc-100 transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="card-limit" className="text-xs text-zinc-400">
              Limite Total (R$)
            </Label>
            <Input
              id="card-limit"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="h-10 border border-zinc-700 bg-zinc-900 text-zinc-100 transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="card-closing-day" className="text-xs text-zinc-400">
              Dia de Fechamento
            </Label>
            <Input
              id="card-closing-day"
              value={closingDay}
              onChange={(event) => setClosingDay(event.target.value)}
              type="number"
              min={1}
              max={31}
              placeholder="25"
              className="h-10 border border-zinc-700 bg-zinc-900 text-zinc-100 transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="card-due-day" className="text-xs text-zinc-400">
              Dia de Vencimento
            </Label>
            <Input
              id="card-due-day"
              value={dueDay}
              onChange={(event) => setDueDay(event.target.value)}
              type="number"
              min={1}
              max={31}
              placeholder="05"
              className="h-10 border border-zinc-700 bg-zinc-900 text-zinc-100 transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="lg"
            className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            {editingCard ? "Salvar cartão" : "Adicionar Cartão"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
