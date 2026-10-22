"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import {
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Transaction } from "@/store/useFinanceStore";

export function VariableIncomeConfirmation({
  incomes,
  values,
  onValueChange,
  onConfirm,
}: {
  incomes: Transaction[];
  values: Record<string, string>;
  onValueChange: (incomeId: string, value: string) => void;
  onConfirm: (income: Transaction) => void;
}) {
  const formatPrivateCurrency = usePrivateCurrency();

  return (
    <motion.section
      variants={dashboardReveal}
      className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06]"
    >
      <div className="flex items-center gap-3 border-b border-emerald-500/15 px-4 py-3 sm:px-5">
        <Sparkles className="size-4 shrink-0 text-emerald-300" />
        <div>
          <h2 className="text-sm font-semibold text-emerald-50">
            Confirme suas rendas variáveis
          </h2>
          <p className="text-xs text-emerald-200/70">
            Informe o valor final recebido neste mês.
          </p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:p-4">
        {incomes.map((income) => (
          <div
            key={income.id}
            className="grid gap-3 rounded-lg border border-emerald-500/15 bg-zinc-950/60 p-3 sm:grid-cols-[1fr_180px_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-50">
                {income.description}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Estimado: {formatPrivateCurrency(income.amount)}
              </p>
            </div>
            <Input
              value={values[income.id] ?? ""}
              onChange={(event) => onValueChange(income.id, event.target.value)}
              inputMode="decimal"
              placeholder="Valor final"
              aria-label={`Valor final de ${income.description}`}
              className="border-emerald-500/30 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
            />
            <Button
              type="button"
              className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              onClick={() => onConfirm(income)}
            >
              Confirmar
            </Button>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
