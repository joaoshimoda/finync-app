"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Save } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      tagIds: [],
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
    <DialogContent className="border-white/[0.08] bg-zinc-950/95 text-white sm:max-w-xl">
      <DialogHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <ArrowUp className="size-5" />
        </div>
        <DialogTitle>
          {editingTransaction ? "Editar receita" : "Nova receita"}
        </DialogTitle>
        <DialogDescription>
          Registre entradas sem vincular a uma fatura de cartão.
        </DialogDescription>
      </DialogHeader>

      <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="income-amount">Valor (R$)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              R$
            </span>
            <Input
              id="income-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="h-16 px-12 text-center text-3xl font-bold text-emerald-400 placeholder:text-zinc-700"
              required
            />
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="income-description">Descrição</Label>
            <Input
              id="income-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              type="text"
              placeholder="Ex: Salário, freelance"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-date">Data</Label>
            <Input
              id="income-date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              className="[color-scheme:dark]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
        </div>
        <div className="col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="gap-2 bg-emerald-500 text-white hover:bg-emerald-400"
          >
            <Save className="size-4" />
            {isSubmitting ? "Salvando..." : "Salvar receita"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
