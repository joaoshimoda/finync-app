"use client";

import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";
import { CalendarDays, DollarSign, Save, Wallet, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

export function AddIncomeModal({
  isOpen,
  onClose,
  editingTransaction = null,
}: AddIncomeModalProps) {
  if (!isOpen) return null;

  return (
    <IncomeModalContent
      key={editingTransaction?.id ?? "new-income"}
      editingTransaction={editingTransaction}
      onClose={onClose}
    />
  );
}

function IncomeModalContent({
  editingTransaction,
  onClose,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
}) {
  const addIncome = useFinanceStore((state) => state.addIncome);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);

  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    editingTransaction?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const incomePayload = {
      amount: Number(amount.replace(",", ".")) || 0,
      date,
      description: description.trim(),
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          ...incomePayload,
          category: "Receita",
          type: "income",
          status: "confirmed",
          cardId: null,
          owner: editingTransaction.owner ?? "eu",
          dependentIds: editingTransaction.dependentIds?.length
            ? editingTransaction.dependentIds
            : ["eu"],
          tagIds: [],
          notes: "Receita",
        });
      } else {
        await addIncome(incomePayload);
      }

      toast.success(
        editingTransaction
          ? "Receita atualizada com sucesso!"
          : "Receita salva com sucesso!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao salvar receita:", error);
      toast.error("Erro ao salvar receita.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-950/95 p-6 text-white shadow-2xl shadow-black/50">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <Wallet className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              Entrada de dinheiro
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {editingTransaction ? "Editar receita" : "Nova receita"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Registre entradas como salário, freelance ou reembolso. Receitas não
              são vinculadas a cartões.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Descrição
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              type="text"
              placeholder="Ex: Salário, freelance"
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-emerald-500/10"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                  Valor (R$)
                </span>
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                  Data
                </span>
              </span>
              <input
                value={date}
                onChange={(event) => setDate(event.target.value)}
                type="date"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-emerald-400/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-bold text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.16)] transition hover:bg-emerald-300 hover:shadow-[0_0_36px_rgba(52,211,153,0.26)] focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
            >
              <Save className="h-4 w-4" strokeWidth={2} />
              Salvar receita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
