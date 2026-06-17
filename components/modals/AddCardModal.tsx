"use client";

import { useFinanceStore } from "@/store/useFinanceStore";
import { CreditCard, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function parseOptionalDay(value: string) {
  const day = Number(value);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return undefined;
  }

  return day;
}

export function AddCardModal({ isOpen, onClose }: AddCardModalProps) {
  const addCard = useFinanceStore((state) => state.addCard);

  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await addCard({
        name: name.trim(),
        limitAmount: Number(limit.replace(",", ".")) || 0,
        closingDay: parseOptionalDay(closingDay),
        dueDay: parseOptionalDay(dueDay),
      });

      toast.success("Cartão adicionado!");
      setName("");
      setLimit("");
      setClosingDay("");
      setDueDay("");
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar cartão:", error);
      toast.error("Erro ao adicionar cartão");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-950/95 p-6 text-white shadow-2xl shadow-black/50">
        <div>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-brand-300">
                <CreditCard className="h-4 w-4 text-brand-500" strokeWidth={2} />
                Novo cartão
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Adicionar cartão
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Cadastre um cartão para acompanhar limite, fechamento, vencimento e
                gastos por fatura.
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
                  Dia de Fechamento
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
                  Dia de Vencimento
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
              <button
                type="button"
                onClick={onClose}
                className="h-12 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-12 rounded-2xl bg-brand-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
              >
                Salvar cartão
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
