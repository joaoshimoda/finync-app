"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Sparkles,
} from "lucide-react";

import { FilterChip, SegmentedControl } from "@/components/dashboard/controls";
import {
  dashboardEase,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";

import type { Subscription } from "./useRecurringData";

type SortKey = "next" | "amount" | "name";

const sortOptions: Array<{ id: SortKey; label: string }> = [
  { id: "next", label: "Próxima cobrança" },
  { id: "amount", label: "Maior valor" },
  { id: "name", label: "A–Z" },
];

/* Monogram tints, picked by name so a service keeps its colour. */
const monogramTones = [
  "bg-violet-500/15 text-violet-200",
  "bg-sky-500/15 text-sky-200",
  "bg-rose-500/15 text-rose-200",
  "bg-amber-500/15 text-amber-200",
  "bg-teal-500/15 text-teal-200",
  "bg-fuchsia-500/15 text-fuchsia-200",
];

function getMonogramTone(name: string) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return monogramTones[hash % monogramTones.length];
}

function getChargeLabel(daysUntil: number) {
  if (daysUntil < 0) return "Já na fatura";
  if (daysUntil === 0) return "Cobra hoje";
  if (daysUntil === 1) return "Cobra amanhã";
  return `Cobra em ${daysUntil} dias`;
}

function SubscriptionCard({
  subscription,
  onEdit,
  onCancel,
}: {
  subscription: Subscription;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { transaction, daysUntil } = subscription;
  const isCharged = daysUntil < 0;
  const isSoon = daysUntil >= 0 && daysUntil <= 3;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: dashboardEase }}
      className={cn(
        dashboardPanelClassName,
        "group flex min-w-0 flex-col p-4 transition-colors hover:border-white/[0.12] sm:p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
            getMonogramTone(transaction.description),
          )}
        >
          {transaction.description.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {transaction.description}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
            <CreditCard className="size-3 shrink-0" />
            {subscription.cardName}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${transaction.description}`}
              className="-mt-1 -mr-1 size-8 text-zinc-500 hover:text-zinc-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={onCancel}
            >
              <Ban className="size-4" />
              Cancelar assinatura
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="min-w-0">
          <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums text-zinc-50">
            {formatValue(transaction.amount)}
          </span>
          <span className="ml-1 text-xs text-zinc-500">/mês</span>
        </p>
        <p className="shrink-0 text-xs tabular-nums text-zinc-500">
          {formatValue(transaction.amount * 12)}/ano
        </p>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-violet-400"
          initial={{ width: 0 }}
          animate={{ width: `${subscription.share * 100}%` }}
          transition={{ duration: 0.7, ease: dashboardEase }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs">
        <span className="text-zinc-500">
          Dia {subscription.chargeDay} · {Math.round(subscription.share * 100)}% do total
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-medium",
            isCharged
              ? "bg-sky-500/10 text-sky-300"
              : isSoon
                ? "bg-amber-500/10 text-amber-300"
                : "bg-white/[0.05] text-zinc-300",
          )}
        >
          {getChargeLabel(daysUntil)}
        </span>
      </div>
    </motion.li>
  );
}

export function SubscriptionsGrid({
  subscriptions,
  total,
  query,
  onEdit,
  onCancel,
  onCreate,
}: {
  subscriptions: Subscription[];
  total: number;
  query: string;
  onEdit: (transaction: Transaction) => void;
  onCancel: (transaction: Transaction) => void;
  onCreate: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("next");
  const [cardFilter, setCardFilter] = useState<string | null>(null);

  const cardTotals = useMemo(() => {
    const totals = new Map<string, number>();
    subscriptions.forEach((subscription) => {
      totals.set(
        subscription.cardName,
        (totals.get(subscription.cardName) ?? 0) + subscription.transaction.amount,
      );
    });
    return Array.from(totals.entries()).sort((left, right) => right[1] - left[1]);
  }, [subscriptions]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const upcomingFirst = (subscription: Subscription) =>
      subscription.daysUntil < 0 ? 1000 + subscription.chargeDay : subscription.daysUntil;

    return subscriptions
      .filter(
        (subscription) =>
          (!cardFilter || subscription.cardName === cardFilter) &&
          (!normalizedQuery ||
            subscription.transaction.description
              .toLocaleLowerCase("pt-BR")
              .includes(normalizedQuery)),
      )
      .sort((left, right) => {
        if (sortKey === "amount") return right.transaction.amount - left.transaction.amount;
        if (sortKey === "name") {
          return left.transaction.description.localeCompare(
            right.transaction.description,
            "pt-BR",
          );
        }
        return upcomingFirst(left) - upcomingFirst(right);
      });
  }, [cardFilter, query, sortKey, subscriptions]);

  const largest = subscriptions.reduce<Subscription | null>(
    (current, subscription) =>
      !current || subscription.transaction.amount > current.transaction.amount
        ? subscription
        : current,
    null,
  );

  if (!subscriptions.length) {
    return (
      <div
        className={cn(
          dashboardPanelClassName,
          "flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <CreditCard className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-zinc-100">
          Nenhuma assinatura nesta fatura
        </h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
          Streaming, apps e academia entram sozinhos na fatura do cartão todo
          mês. Cadastre para saber quanto eles pesam no ano.
        </p>
        <Button
          type="button"
          onClick={onCreate}
          className="mt-5 h-10 gap-2 bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          Adicionar assinatura
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          dashboardPanelClassName,
          "relative overflow-hidden p-4 sm:p-5",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.16),transparent)]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-zinc-300">
                Suas assinaturas somam{" "}
                <strong className="font-semibold text-zinc-50">
                  {formatValue(total * 12)} por ano
                </strong>
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatValue(total)} por mês
                {largest &&
                  ` · ${largest.transaction.description} é a maior (${Math.round(largest.share * 100)}%)`}
              </p>
            </div>
          </div>
          {cardTotals.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por cartão">
              <FilterChip
                tone="violet"
                active={cardFilter === null}
                onClick={() => setCardFilter(null)}
              >
                Todos
              </FilterChip>
              {cardTotals.map(([cardName, cardTotal]) => (
                <FilterChip
                  key={cardName}
                  tone="violet"
                  active={cardFilter === cardName}
                  onClick={() => setCardFilter(cardFilter === cardName ? null : cardName)}
                  count={formatValue(cardTotal)}
                >
                  {cardName}
                </FilterChip>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {visible.length} de {subscriptions.length}{" "}
          {subscriptions.length === 1 ? "assinatura" : "assinaturas"}
        </p>
        <SegmentedControl
          ariaLabel="Ordenar"
          options={sortOptions}
          value={sortKey}
          onChange={setSortKey}
        />
      </div>

      {visible.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={() => onEdit(subscription.transaction)}
                onCancel={() => onCancel(subscription.transaction)}
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className={cn(dashboardPanelClassName, "px-6 py-10 text-center text-sm text-zinc-500")}>
          Nenhuma assinatura encontrada com esses filtros.
        </p>
      )}
    </div>
  );
}
