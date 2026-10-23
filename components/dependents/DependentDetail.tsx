"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  HandCoins,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { DependentSettlementMethod } from "@/store/useFinanceStore";

import { DependentAvatar, statusPresentation } from "./PeopleList";
import { getDependentAmount, type DependentOverview } from "./useDependentsData";

type KindFilter = "all" | "card" | "direct";

const kindFilters: Array<{ id: KindFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "card", label: "Cartão" },
  { id: "direct", label: "Débito/Pix" },
];

const methodLabels: Record<DependentSettlementMethod, string> = {
  PIX: "Pix",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

/* Plain-text statement to send to the dependent: each purchase, the total
   and what is still open. Always uses real values, even with balances
   hidden on screen. */
function buildStatement(
  person: DependentOverview,
  monthLabel: string,
  format: (value: number) => string,
) {
  const firstName = person.name.trim().split(/\s+/)[0];
  const lines = [...person.transactions]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(
      (transaction) =>
        `• ${formatDateOnlyBR(transaction.date).slice(0, 5)} ${transaction.description} — ${format(getDependentAmount(transaction))}`,
    );

  return [
    `Oi, ${firstName}! Resumo dos seus gastos de ${monthLabel}:`,
    "",
    ...lines,
    "",
    `Total: ${format(person.obligationTotal)}`,
    ...(person.settledTotal > 0 ? [`Já recebido: ${format(person.settledTotal)}`] : []),
    person.outstanding > 0
      ? `Falta acertar: ${format(person.outstanding)}`
      : "Tudo acertado, obrigado!",
  ].join("\n");
}

export function DependentDetail({
  person,
  monthLabel,
  onSettle,
  onEdit,
  onDelete,
}: {
  person: DependentOverview;
  monthLabel: string;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { formatCurrency } = useCurrencyFormatter();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const status = statusPresentation[person.status];
  const statement = useMemo(
    () => buildStatement(person, monthLabel, formatCurrency),
    [formatCurrency, monthLabel, person],
  );
  const visibleTransactions = person.transactions.filter(
    (transaction) =>
      kindFilter === "all" ||
      (kindFilter === "card") === (transaction.type === "card"),
  );
  const largestCategory = person.categories[0]?.amount ?? 0;
  const cardShare =
    person.total > 0 ? Math.min(Math.max(person.cardTotal / person.total, 0), 1) : 0;

  async function copyStatement() {
    try {
      await navigator.clipboard.writeText(statement);
      toast.success("Resumo copiado. É só colar na conversa.");
    } catch {
      toast.error("Não foi possível copiar o resumo.");
    }
  }

  return (
    <motion.div
      key={person.id}
      variants={dashboardStagger}
      initial="hidden"
      animate="visible"
      className="flex min-w-0 flex-col gap-5"
    >
      <motion.section
        variants={dashboardReveal}
        className={cn(dashboardPanelClassName, "relative overflow-hidden p-5 sm:p-6")}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.10),transparent)]"
        />
        <div className="relative flex items-start gap-4">
          <DependentAvatar name={person.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-[-0.02em] text-zinc-50">
              {person.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {person.transactions.length
                ? `${person.transactions.length} ${person.transactions.length === 1 ? "lançamento" : "lançamentos"} em ${monthLabel}`
                : `Nenhum gasto em ${monthLabel}`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Ações de ${person.name}`}
                className="size-9 text-zinc-500 hover:text-zinc-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
                <Pencil className="size-4" />
                Editar nome
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Remover pessoa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative mt-6 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Gasto no mês</p>
            <AnimatedNumber
              value={person.total}
              format={formatValue}
              className="mt-1 block truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-50 sm:text-4xl"
            />
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${person.progress}%` }}
                transition={{ duration: 0.8, ease: dashboardEase }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">
                Recebido{" "}
                <span className="font-medium tabular-nums text-emerald-300">
                  {formatValue(person.settledTotal)}
                </span>
              </span>
              <span className={status.className}>
                {person.outstanding > 0
                  ? `Falta ${formatValue(person.outstanding)}`
                  : status.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              type="button"
              onClick={onSettle}
              disabled={person.outstanding <= 0}
              className="h-10 flex-1 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300 sm:flex-none"
            >
              <HandCoins className="size-4" />
              Registrar acerto
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!person.transactions.length}
              onClick={() => void copyStatement()}
              aria-label="Copiar resumo de cobrança"
              className="h-10 min-w-10 gap-2 rounded-lg border border-white/[0.08] px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50"
            >
              <Copy className="size-4" />
              <span className="hidden sm:inline">Copiar resumo</span>
            </Button>
            <Button
              variant="ghost"
              asChild
              aria-label="Enviar resumo pelo WhatsApp"
              className={cn(
                "h-10 min-w-10 gap-2 rounded-lg border border-white/[0.08] px-3 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50",
                !person.transactions.length && "pointer-events-none opacity-50",
              )}
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent(statement)}`}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!person.transactions.length}
                tabIndex={person.transactions.length ? undefined : -1}
              >
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </Button>
          </div>
        </div>
      </motion.section>

      {person.transactions.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          <AnalyticsPanel title="Para onde foi" description="Categorias do mês">
            <ul className="space-y-3.5">
              {person.categories.slice(0, 5).map((category) => (
                <li key={category.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-zinc-300">{category.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                      {formatValue(category.amount)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-sky-400"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${largestCategory > 0 ? (category.amount / largestCategory) * 100 : 0}%`,
                      }}
                      transition={{ duration: 0.7, ease: dashboardEase }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </AnalyticsPanel>

          <AnalyticsPanel title="Como foi pago" description="Cartão ou direto da conta">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-violet-400"
                initial={{ width: 0 }}
                animate={{ width: `${cardShare * 100}%` }}
                transition={{ duration: 0.7, ease: dashboardEase }}
              />
              <motion.div
                className="h-full rounded-full bg-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${(1 - cardShare) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.1, ease: dashboardEase }}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="size-1.5 rounded-full bg-violet-400" />
                  Cartão
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-100">
                  {formatValue(person.cardTotal)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="size-1.5 rounded-full bg-teal-400" />
                  Débito/Pix
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-100">
                  {formatValue(person.directTotal)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="text-xs font-medium text-zinc-400">Acertos do mês</p>
              {person.settlements.length ? (
                <ul className="mt-2 space-y-2">
                  {person.settlements.map((settlement) => (
                    <li key={settlement.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      <span className="text-zinc-400">
                        {formatDateOnlyBR(settlement.settledAt.slice(0, 10)).slice(0, 5)} ·{" "}
                        {methodLabels[settlement.method]}
                      </span>
                      <span className="ml-auto font-medium tabular-nums text-zinc-100">
                        {formatValue(settlement.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Nenhum acerto registrado ainda.
                </p>
              )}
            </div>
          </AnalyticsPanel>
        </div>
      )}

      <motion.section
        variants={dashboardReveal}
        aria-label={`Lançamentos de ${person.name}`}
        className={cn(dashboardPanelClassName, "overflow-hidden")}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-zinc-100">Lançamentos</h3>
          <div
            role="group"
            aria-label="Filtrar por forma de pagamento"
            className="flex rounded-lg border border-white/[0.07] bg-zinc-900/50 p-0.5"
          >
            {kindFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setKindFilter(filter.id)}
                aria-pressed={kindFilter === filter.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  kindFilter === filter.id
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>

        {visibleTransactions.length ? (
          <ul className="divide-y divide-white/[0.04]">
            <AnimatePresence initial={false}>
              {visibleTransactions.map((transaction) => {
                const isCard = transaction.type === "card";

                return (
                  <motion.li
                    key={transaction.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        isCard
                          ? "bg-violet-500/10 text-violet-300"
                          : "bg-teal-500/10 text-teal-300",
                      )}
                    >
                      {isCard ? (
                        <CreditCard className="size-4" />
                      ) : (
                        <ReceiptText className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        <TransactionDescription transaction={transaction} />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {transaction.category || "Outros"} ·{" "}
                        {formatDateOnlyBR(transaction.date).slice(0, 5)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-50">
                      {formatValue(getDependentAmount(transaction))}
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            {person.transactions.length
              ? "Nenhum lançamento com esse filtro."
              : "Marque compras como deste dependente ao lançar ou importar a fatura."}
          </p>
        )}
      </motion.section>
    </motion.div>
  );
}
