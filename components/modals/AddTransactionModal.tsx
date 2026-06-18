"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  ReceiptText,
  Save,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import {
  useFinanceStore,
  type CreateTransactionInput,
  type Transaction,
} from "@/store/useFinanceStore";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

type ExpenseTransactionType = "fixed" | "card";

const categories = [
  "Alimentacao",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saude",
  "Educacao",
  "Outros",
];

const dependentOptions = [
  { id: "eu", label: "Eu", color: "#2dd4bf" },
  { id: "joao", label: "Joao", color: "#c084fc" },
  { id: "maria", label: "Maria", color: "#60a5fa" },
];

export function AddTransactionModal({
  isOpen,
  onClose,
  editingTransaction = null,
}: AddTransactionModalProps) {
  if (!isOpen) return null;

  return (
    <TransactionModalContent
      key={editingTransaction?.id ?? "new-transaction"}
      editingTransaction={editingTransaction}
      onClose={onClose}
    />
  );
}

function TransactionModalContent({
  editingTransaction,
  onClose,
}: {
  editingTransaction: Transaction | null;
  onClose: () => void;
}) {
  const cards = useFinanceStore((state) => state.cards);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);

  const [description, setDescription] = useState(
    editingTransaction?.description ?? "",
  );
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace(".", ",") : "",
  );
  const [date, setDate] = useState(
    editingTransaction?.date
      ? normalizeDateOnly(editingTransaction.date)
      : getLocalTodayDateOnly(),
  );
  const [category, setCategory] = useState(
    editingTransaction?.category || categories[0],
  );
  const [transactionType, setTransactionType] =
    useState<ExpenseTransactionType>(
      editingTransaction?.type === "card" ? "card" : "fixed",
    );
  const [selectedCardId, setSelectedCardId] = useState(
    editingTransaction?.cardId ?? "",
  );
  const [owner, setOwner] = useState(editingTransaction?.owner ?? "eu");
  const [splitWith, setSplitWith] = useState<string[]>(
    editingTransaction?.dependentIds?.length
      ? editingTransaction.dependentIds
      : ["eu"],
  );

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  const selectedCard = useMemo(() => {
    if (transactionType !== "card") return null;

    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId, transactionType]);

  const transactionCardId =
    transactionType === "card" ? selectedCardId || null : null;

  function toggleSplitWith(dependentId: string) {
    setSplitWith((current) =>
      current.includes(dependentId)
        ? current.filter((item) => item !== dependentId)
        : [...current, dependentId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSplit = Array.from(
      new Set([owner, ...splitWith].filter(Boolean)),
    );

    if (transactionType === "card" && !transactionCardId) {
      toast.error("Selecione um cartao para lancar no credito.");
      return;
    }

    const transactionPayload: CreateTransactionInput = {
      description: description.trim(),
      amount: Number(amount.replace(",", ".")) || 0,
      date: normalizeDateOnly(date),
      category,
      type: transactionType,
      status: "confirmed",
      cardId: transactionCardId,
      owner,
      dependentIds: normalizedSplit.length ? normalizedSplit : [owner],
      tagIds: [],
      notes: selectedCard ? `Cartao: ${selectedCard.name}` : "Debito/PIX",
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionPayload);
      } else {
        await addTransaction(transactionPayload);
      }

      toast.success(
        editingTransaction
          ? "Transacao atualizada com sucesso!"
          : "Transacao salva com sucesso!",
      );
      onClose();
    } catch (error) {
      console.error("Erro ao salvar transacao:", error);
      toast.error("Erro ao salvar transacao.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/[0.08] bg-zinc-950/95 p-6 text-white shadow-2xl shadow-black/50">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-300">
              <ReceiptText className="h-4 w-4 text-brand-500" strokeWidth={2} />
              Lancamento
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {editingTransaction ? "Editar transacao" : "Nova transacao"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Registre saidas por debito, PIX ou cartao de credito.
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

        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Descricao
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                type="text"
                placeholder="Ex: Mercado, assinatura, transporte"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                required
              />
            </label>

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
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
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
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                required
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Categoria
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
              >
                {categories.map((item) => (
                  <option key={item} value={item} className="bg-[#071014] text-white">
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                  Tipo
                </span>
              </span>
              <select
                value={transactionType}
                onChange={(event) => {
                  const nextType = event.target.value as ExpenseTransactionType;

                  setTransactionType(nextType);
                  if (nextType !== "card") {
                    setSelectedCardId("");
                  }
                }}
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
              >
                <option value="fixed" className="bg-[#071014] text-white">
                  Debito/PIX
                </option>
                <option value="card" className="bg-[#071014] text-white">
                  Cartao de Credito
                </option>
              </select>
            </label>

            {transactionType === "card" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Cartao
                </span>
                <select
                  value={selectedCardId}
                  onChange={(event) => setSelectedCardId(event.target.value)}
                  disabled={!cards.length}
                  required
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-50 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                >
                  <option value="" className="bg-[#071014] text-white">
                    Selecione um cartao
                  </option>
                  {cards.length ? (
                    cards.map((card) => (
                      <option key={card.id} value={card.id} className="bg-[#071014] text-white">
                        {card.name}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-[#071014] text-white">
                      Nenhum cartao cadastrado
                    </option>
                  )}
                </select>
              </label>
            ) : null}
          </div>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Dono
            </span>
            <select
              value={owner}
              onChange={(event) => {
                setOwner(event.target.value);
                setSplitWith((current) =>
                  current.includes(event.target.value)
                    ? current
                    : [event.target.value, ...current],
                );
              }}
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
            >
              {dependentOptions.map((dependent) => (
                <option key={dependent.id} value={dependent.id} className="bg-[#071014] text-white">
                  {dependent.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 md:col-span-2">
            <legend className="px-1 text-sm font-medium text-zinc-200">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                Dividir igualmente com
              </span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {dependentOptions.map((dependent) => {
                const active = splitWith.includes(dependent.id);

                return (
                  <button
                    key={dependent.id}
                    type="button"
                    onClick={() => toggleSplitWith(dependent.id)}
                    className="rounded-full border px-3 py-2 text-xs font-semibold transition"
                    style={{
                      borderColor: active ? dependent.color : "rgba(255,255,255,0.1)",
                      backgroundColor: active
                        ? `${dependent.color}22`
                        : "rgba(255,255,255,0.04)",
                      color: active ? dependent.color : "#a1a1aa",
                    }}
                  >
                    {dependent.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 pt-2 md:col-span-2">
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
            >
              <Save className="h-4 w-4" strokeWidth={2} />
              Salvar transacao
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
