"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUp, CalendarDays, ReceiptText, Tag, Wallet } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import {
  useFinanceStore,
  type Transaction,
} from "@/store/useFinanceStore";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

const incomeCategories = [
  "Receita",
  "Salário",
  "Freelance",
  "Reembolso",
  "Investimentos",
  "Outros",
];

export function AddIncomeModal({
  isOpen,
  onClose,
  editingTransaction = null,
}: AddIncomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <IncomeModalContent
          key={editingTransaction?.id ?? "new-income"}
          editingTransaction={editingTransaction}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function IncomeModalContent({
  editingTransaction,
  onClose,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
}) {
  const authUser = useFinanceStore((state) => state.authUser);
  const tags = useFinanceStore((state) => state.tags);
  const fetchTags = useFinanceStore((state) => state.fetchTags);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);

  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    editingTransaction?.date
      ? normalizeDateOnly(editingTransaction.date)
      : getLocalTodayDateOnly(),
  );
  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
  );
  const [category, setCategory] = useState(
    editingTransaction?.category || "Receita",
  );
  const [selectedTagId, setSelectedTagId] = useState(
    editingTransaction?.tagIds?.[0] ?? "",
  );
  const [destinationAccount, setDestinationAccount] = useState("Carteira");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!authUser?.id) {
      toast.error("Faça login novamente para salvar a receita.");
      return;
    }

    const incomePayload = {
      description: description.trim(),
      amount: Number(amount.replace(",", ".")) || 0,
      date: normalizeDateOnly(date),
      category,
      type: "income" as const,
      status: "confirmed" as const,
      cardId: null,
      owner: editingTransaction?.owner ?? "eu",
      dependentIds: editingTransaction?.dependentIds?.length
        ? editingTransaction.dependentIds
        : ["eu"],
      tagIds: selectedTagId ? [selectedTagId] : [],
      notes: "Receita",
    };

    setIsSubmitting(true);

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, incomePayload);
      } else {
        await addTransaction(incomePayload);
      }

      await fetchTransactions();

      toast.success(
        editingTransaction
          ? "Receita atualizada com sucesso!"
          : "Receita adicionada com sucesso!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao salvar receita:", error);
      toast.error("Erro ao salvar receita.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="border border-zinc-800 bg-zinc-950 text-white shadow-2xl sm:max-w-3xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          <ArrowUp className="size-4" />
          Entrada
        </div>
        <DialogTitle>
          {editingTransaction ? "Editar receita" : "Nova receita"}
        </DialogTitle>
        <DialogDescription>
          Registre entradas sem vincular a uma fatura de cart?o.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="space-y-2 text-center">
          <div className="relative mx-auto max-w-sm rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-400">
              R$
            </span>
            <Input
              id="income-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="h-16 border-none bg-transparent px-12 text-center text-4xl font-semibold tracking-tight text-white shadow-none ring-0 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>

          <Input
            id="income-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            type="text"
            placeholder="Descrição da receita"
            className="mx-auto h-10 max-w-md rounded-lg border border-zinc-800/80 bg-zinc-900/30 text-center text-lg text-zinc-100 shadow-none ring-0 placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            required
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <CalendarDays className="size-3.5" />
                Data da Entrada
              </div>
              <Input
                id="income-date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors [color-scheme:dark] hover:border-zinc-600 focus:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <Wallet className="size-3.5" />
                Conta de Destino
              </div>
              <Select value={destinationAccount} onValueChange={setDestinationAccount}>
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nubank">Nubank</SelectItem>
                  <SelectItem value="Ita?">Ita?</SelectItem>
                  <SelectItem value="Carteira">Carteira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <ReceiptText className="size-3.5" />
                Categoria da Receita
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((incomeCategory) => (
                    <SelectItem key={incomeCategory} value={incomeCategory}>
                      {incomeCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <Tag className="size-3.5" />
                Tag Opcional
              </div>
              <Select
                value={selectedTagId || "__no_tag__"}
                onValueChange={(nextValue) =>
                  setSelectedTagId(nextValue === "__no_tag__" ? "" : nextValue)
                }
              >
                <SelectTrigger className="flex h-10 items-center border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 shadow-none transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Sem tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_tag__">Sem tag</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div className="mt-8 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-11 px-5 text-zinc-400 hover:text-zinc-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 min-w-52 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            {isSubmitting ? "Salvando..." : "Salvar receita"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
