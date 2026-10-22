"use client";

import { motion } from "framer-motion";
import { Check, CreditCard, Repeat2, Wallet, X } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  hasCard: boolean;
  hasIncome: boolean;
  hasRecurringBill: boolean;
  onAddCard: () => void;
  onAddIncome: () => void;
  onAddRecurringBill: () => void;
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  hasCard,
  hasIncome,
  hasRecurringBill,
  onAddCard,
  onAddIncome,
  onAddRecurringBill,
  onDismiss,
}: OnboardingChecklistProps) {
  const steps = [
    {
      id: "card",
      icon: CreditCard,
      title: "Cadastre um cartão",
      description:
        "Com fechamento e vencimento, cada compra cai na fatura certa.",
      actionLabel: "Adicionar cartão",
      done: hasCard,
      onAction: onAddCard,
    },
    {
      id: "income",
      icon: Wallet,
      title: "Registre sua receita",
      description: "Salário e outras entradas calculam quanto vai sobrar.",
      actionLabel: "Adicionar receita",
      done: hasIncome,
      onAction: onAddIncome,
    },
    {
      id: "recurring",
      icon: Repeat2,
      title: "Adicione suas contas fixas",
      description: "Aluguel, internet e assinaturas entram nos próximos meses.",
      actionLabel: "Adicionar conta fixa",
      done: hasRecurringBill,
      onAction: onAddRecurringBill,
    },
  ];
  const completedCount = steps.filter((step) => step.done).length;

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="dashboard-setup-title"
      className={cn(
        dashboardPanelClassName,
        "relative overflow-hidden p-5 sm:p-7",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-500/[0.08] to-transparent" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-300">
            Primeiros passos
          </p>
          <h2
            id="dashboard-setup-title"
            className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl"
          >
            Vamos deixar seu Finync pronto
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-zinc-400">
            Complete estes passos para ver sua sobra do mês, faturas e gráficos
            com os seus dados.
          </p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="flex-1 sm:flex-none sm:text-right">
            <p className="text-sm font-semibold tabular-nums text-zinc-100">
              {completedCount} de {steps.length}
            </p>
            <div className="mt-1.5 h-1.5 w-full sm:w-24 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / steps.length) * 100}%` }}
                transition={{ duration: 0.6, ease: dashboardEase }}
              />
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Ocultar primeiros passos"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <ol className="relative mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-col gap-4 rounded-xl p-4 ring-1 ring-inset transition-colors",
                step.done
                  ? "bg-emerald-500/[0.05] ring-emerald-500/20"
                  : "bg-white/[0.03] ring-white/[0.06]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    step.done
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-800 text-zinc-300",
                  )}
                >
                  {step.done ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className="text-xs tabular-nums text-zinc-600">
                  Passo {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <h3
                  className={cn(
                    "text-sm font-semibold",
                    step.done ? "text-zinc-400 line-through" : "text-zinc-100",
                  )}
                >
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {step.description}
                </p>
              </div>
              {step.done ? (
                <p className="text-xs font-medium text-emerald-300">
                  Concluído
                </p>
              ) : (
                <Button
                  type="button"
                  onClick={step.onAction}
                  className="h-9 w-full bg-emerald-400 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
                >
                  {step.actionLabel}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}
