"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  Receipt,
  Repeat2,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import { getInstallmentProgress } from "@/components/cards/useCardsData";
import { usePrivateCurrency } from "@/components/dashboard/shared";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import { formatDateOnlyBR, getLocalTodayDateOnly } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";

type ViewFilter =
  | "all"
  | "purchase"
  | "installment"
  | "last-installment"
  | "subscription"
  | "scheduled"
  | "dependent"
  | "credit";

const viewOptions: Array<{ value: ViewFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "purchase", label: "Compras" },
  { value: "installment", label: "Parcelados" },
  { value: "last-installment", label: "Última parcela" },
  { value: "subscription", label: "Assinaturas" },
  { value: "scheduled", label: "Agendados" },
  { value: "dependent", label: "Dependentes" },
  { value: "credit", label: "Créditos" },
];

export function InvoiceTransactions({
  transactions,
  dependentNames,
  className,
}: {
  transactions: Transaction[];
  dependentNames: Map<string, string>;
  className?: string;
}) {
  const formatValue = usePrivateCurrency();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<ViewFilter>("all");
  const today = getLocalTodayDateOnly();

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions.map(
            (transaction) => transaction.category?.trim() || "Sem categoria",
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    [transactions],
  );

  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");

    return transactions.filter((transaction) => {
      const transactionCategory =
        transaction.category?.trim() || "Sem categoria";
      const dependentName = transaction.dependentId
        ? (dependentNames.get(transaction.dependentId) ?? "")
        : "";
      const { current, total } = getInstallmentProgress(transaction);
      const matchesSearch =
        !normalized ||
        [transaction.description, transactionCategory, dependentName].some(
          (value) => value.toLocaleLowerCase("pt-BR").includes(normalized),
        );
      const matchesCategory =
        category === "all" || transactionCategory === category;
      const matchesView =
        view === "all" ||
        (view === "purchase" &&
          !transaction.is_recurring &&
          total <= 1 &&
          !isCardCreditAdjustment(transaction)) ||
        (view === "installment" && total > 1) ||
        (view === "last-installment" && total > 1 && current === total) ||
        (view === "subscription" && transaction.is_recurring === true) ||
        (view === "scheduled" && !shouldCountCardCharge(transaction, today)) ||
        (view === "dependent" && Boolean(transaction.dependentId)) ||
        (view === "credit" && Boolean(isCardCreditAdjustment(transaction)));

      return matchesSearch && matchesCategory && matchesView;
    });
  }, [category, dependentNames, search, today, transactions, view]);

  const hasFilters =
    search.trim() !== "" || category !== "all" || view !== "all";

  return (
    <AnalyticsPanel
      title="Lançamentos da fatura"
      description={
        hasFilters
          ? `${filtered.length} de ${transactions.length} lançamentos`
          : `${transactions.length} ${transactions.length === 1 ? "lançamento" : "lançamentos"}`
      }
      className={className}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lançamento"
            aria-label="Buscar lançamentos da fatura"
            className="h-10 rounded-xl border-white/[0.08] bg-zinc-950/50 pl-10 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            className="h-10 w-full rounded-xl border-white/[0.08] bg-zinc-950/50"
            aria-label="Categoria"
          >
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        role="radiogroup"
        aria-label="Tipo de lançamento"
        className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {viewOptions.map((option) => {
          const isActive = view === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setView(option.value)}
              className={cn(
                "relative h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                isActive
                  ? "text-zinc-950"
                  : "text-zinc-400 ring-1 ring-inset ring-white/[0.08] hover:text-zinc-100",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="card-invoice-view-pill"
                  className="absolute inset-0 rounded-full bg-emerald-400"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>

      {filtered.length ? (
        <ul className="-mx-2 mt-3 divide-y divide-white/[0.04]">
          {filtered.map((transaction, index) => {
            const isCredit = Boolean(isCardCreditAdjustment(transaction));
            const isScheduled = !shouldCountCardCharge(transaction, today);
            const { current, total } = getInstallmentProgress(transaction);
            const isInstallment = total > 1;
            const isLast = isInstallment && current === total;
            const dependentName = transaction.dependentId
              ? dependentNames.get(transaction.dependentId)
              : null;
            const Icon = isCredit
              ? ArrowUpRight
              : transaction.is_recurring
                ? Repeat2
                : isScheduled
                  ? CalendarClock
                  : ShoppingBag;

            return (
              <motion.li
                key={transaction.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(index * 0.025, 0.25),
                }}
                className={cn(
                  "flex items-center gap-3 px-2 py-2.5",
                  isScheduled && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    isCredit
                      ? "bg-emerald-500/10 text-emerald-300"
                      : transaction.is_recurring
                        ? "bg-violet-500/10 text-violet-300"
                        : "bg-zinc-800/80 text-zinc-400",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-zinc-100">
                      <TransactionDescription transaction={transaction} />
                    </span>
                    {isLast && (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-300">
                        Última
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
                    <span>{formatDateOnlyBR(transaction.date)}</span>
                    <span>·</span>
                    <span className="truncate">
                      {transaction.category?.trim() || "Sem categoria"}
                    </span>
                    {isScheduled && (
                      <>
                        <span>·</span>
                        <span className="text-amber-300">Agendada</span>
                      </>
                    )}
                    {dependentName && (
                      <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-1.5 py-px text-[11px] text-cyan-300">
                        <UserRound className="size-3" />
                        {dependentName}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    isCredit ? "text-emerald-300" : "text-zinc-100",
                  )}
                >
                  {isCredit ? "+" : "-"}
                  {formatValue(transaction.amount)}
                </span>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <Receipt className="size-7 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {hasFilters
              ? "Nenhum lançamento corresponde aos filtros."
              : "Nenhuma compra neste cartão no mês selecionado."}
          </p>
        </div>
      )}
    </AnalyticsPanel>
  );
}
