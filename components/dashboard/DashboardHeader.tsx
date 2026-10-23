"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  Eye,
  EyeOff,
  PlusCircle,
} from "lucide-react";

import { dashboardReveal } from "@/components/dashboard/shared";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFinanceStore } from "@/store/useFinanceStore";

interface DashboardHeaderProps {
  firstName: string;
  periodLabel: string;
  onNewExpense: () => void;
  onNewIncome: () => void;
  onNewCard: () => void;
}

export function DashboardHeader({
  firstName,
  periodLabel,
  onNewExpense,
  onNewIncome,
  onNewCard,
}: DashboardHeaderProps) {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const hideBalancesByDefault = useFinanceStore(
    (state) => state.hideBalancesByDefault,
  );
  const toggleHideBalancesByDefault = useFinanceStore(
    (state) => state.toggleHideBalancesByDefault,
  );

  return (
    <motion.header
      variants={dashboardReveal}
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
          Olá, {firstName}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{periodLabel}</p>
      </div>

      <div className="grid w-full grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-center gap-2 sm:flex sm:w-auto">
        <div className="min-w-0 sm:shrink-0">
          <AnimatedMonthSelector
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPreviousMonth={prevMonth}
            onNextMonth={nextMonth}
            isLoading={isFetching}
          />
        </div>
        <button
          type="button"
          data-tour="dashboard-privacy"
          onClick={toggleHideBalancesByDefault}
          aria-label={
            hideBalancesByDefault ? "Mostrar valores" : "Ocultar valores"
          }
          className="flex size-11 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-900/70 text-zinc-300 transition-colors hover:border-white/[0.16] hover:text-zinc-100"
        >
          {hideBalancesByDefault ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </button>
        <ThemeToggleButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Criar novo item"
              data-tour="dashboard-new"
              className="hidden h-11 gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 md:inline-flex"
            >
              <PlusCircle className="size-5" />
              Novo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[calc(100vw-2rem)] max-w-80 p-2"
          >
            <DropdownMenuItem
              className="cursor-pointer gap-4 rounded-xl p-3"
              onClick={onNewExpense}
            >
              <div className="rounded-full bg-red-500/10 p-2.5 text-red-500">
                <ArrowDown className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-medium">Nova Despesa</span>
                <span className="text-xs text-muted-foreground">
                  Registre um gasto, pix ou boleto
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-4 rounded-xl p-3"
              onClick={onNewIncome}
            >
              <div className="rounded-full bg-green-500/10 p-2.5 text-green-500">
                <ArrowUp className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-medium">Nova Receita</span>
                <span className="text-xs text-muted-foreground">
                  Adicione seu salário ou entrada
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-4 rounded-xl p-3"
              onClick={onNewCard}
            >
              <div className="rounded-full bg-purple-500/10 p-2.5 text-purple-500">
                <CreditCard className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-medium">Novo Cartão</span>
                <span className="text-xs text-muted-foreground">
                  Cadastre um cartão de crédito
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
