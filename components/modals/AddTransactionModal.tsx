"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  ReceiptText,
  Save,
  Tags,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  "Alimentação",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Casa",
  "Assinatura",
  "Outros",
];

const tagOptions = [
  { id: "alimentacao", label: "Alimentação", color: "#fb923c" },
  { id: "transporte", label: "Transporte", color: "#38bdf8" },
  { id: "lazer", label: "Lazer", color: "#a78bfa" },
  { id: "saude", label: "Saúde", color: "#34d399" },
  { id: "assinatura", label: "Assinatura", color: "#f472b6" },
  { id: "educacao", label: "Educação", color: "#fbbf24" },
  { id: "casa", label: "Casa", color: "#86efac" },
];

const dependentOptions = [
  { id: "eu", label: "Eu", color: "#2dd4bf" },
  { id: "joao", label: "Joao", color: "#c084fc" },
  { id: "maria", label: "Maria", color: "#60a5fa" },
];

type PaymentMethod = "debit_pix" | "credit_card";

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const cards = useFinanceStore((state) => state.cards);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const addTransaction = useFinanceStore((state) => state.addTransaction);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(categories[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debit_pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [owner, setOwner] = useState("eu");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [splitWith, setSplitWith] = useState<string[]>(["eu"]);

  useEffect(() => {
    if (isOpen) {
      fetchCards();
    }
  }, [fetchCards, isOpen]);

  const selectedCard = useMemo(() => {
    if (paymentMethod !== "credit_card") return null;

    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, paymentMethod, selectedCardId]);

  const transactionCardId = paymentMethod === "credit_card" ? selectedCardId || null : null;

  if (!isOpen) return null;

  function toggleTag(tagId: string) {
    setSelectedTags((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  }

  function toggleSplitWith(dependentId: string) {
    setSplitWith((current) =>
      current.includes(dependentId)
        ? current.filter((item) => item !== dependentId)
        : [...current, dependentId],
    );
  }

  function resetForm() {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(categories[0]);
    setPaymentMethod("debit_pix");
    setSelectedCardId("");
    setOwner("eu");
    setSelectedTags([]);
    setSplitWith(["eu"]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSplit = Array.from(new Set([owner, ...splitWith].filter(Boolean)));

    if (paymentMethod === "credit_card" && !transactionCardId) {
      toast.error("Selecione um cartão para lançar no crédito.");
      return;
    }

    try {
      await addTransaction({
        description: description.trim(),
        amount: Number(amount.replace(",", ".")) || 0,
        date,
        category,
        type: paymentMethod === "credit_card" ? "card" : "fixed",
        status: "confirmed",
        cardId: transactionCardId,
        owner,
        dependentIds: normalizedSplit.length ? normalizedSplit : [owner],
        tagIds: selectedTags,
        notes: selectedCard ? `Cartão: ${selectedCard.name}` : "Débito/PIX",
      });

      toast.success("Despesa salva com sucesso!");
      resetForm();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      toast.error("Erro ao salvar despesa.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/[0.08] bg-zinc-950/95 p-6 text-white shadow-2xl shadow-black/50">
        <div>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-brand-300">
                <ReceiptText className="h-4 w-4 text-brand-500" strokeWidth={2} />
                Lançamento
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Nova despesa
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Registre cartão, etiquetas e rateio para manter a fatura organizada.
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
                placeholder="Ex: Mercado, assinatura, transporte"
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  <span className="inline-flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                    Tipo de pagamento
                  </span>
                </span>
                <select
                  value={paymentMethod}
                  onChange={(event) => {
                    const nextPaymentMethod = event.target.value as PaymentMethod;

                    setPaymentMethod(nextPaymentMethod);
                    setSelectedCardId(
                      nextPaymentMethod === "credit_card" ? selectedCardId : "",
                    );
                  }}
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                >
                  <option value="debit_pix" className="bg-[#071014] text-white">
                    Débito/PIX
                  </option>
                  <option value="credit_card" className="bg-[#071014] text-white">
                    Cartão de Crédito
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Categoria
                </span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                >
                  {categories.map((item) => (
                    <option key={item} value={item} className="bg-[#071014] text-white">
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {paymentMethod === "credit_card" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Selecionar Cartão
                </span>
                <select
                  value={selectedCardId}
                  onChange={(event) => setSelectedCardId(event.target.value)}
                  disabled={!cards.length}
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 text-sm text-white outline-none transition [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-50 focus:border-brand-500/60 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/10"
                >
                  <option value="" className="bg-[#071014] text-white">
                    Selecione um cartão
                  </option>
                  {cards.length ? (
                    cards.map((card) => (
                      <option key={card.id} value={card.id} className="bg-[#071014] text-white">
                        {card.name}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-[#071014] text-white">
                      Nenhum cartão cadastrado
                    </option>
                  )}
                </select>
              </label>
            ) : null}

            <label className="block">
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

            <fieldset className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
              <legend className="px-1 text-sm font-medium text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <Tags className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                  Etiquetas
                </span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {tagOptions.map((tag) => {
                  const active = selectedTags.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="rounded-full border px-3 py-2 text-xs font-semibold transition"
                      style={{
                        borderColor: active ? tag.color : "rgba(255,255,255,0.1)",
                        backgroundColor: active ? `${tag.color}22` : "rgba(255,255,255,0.04)",
                        color: active ? tag.color : "#a1a1aa",
                      }}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
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
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                O dono sempre entra no rateio, seguindo a estrutura antiga de dono e splitWith.
              </p>
            </fieldset>

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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
              >
                <Save className="h-4 w-4" strokeWidth={2} />
                Salvar despesa
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
