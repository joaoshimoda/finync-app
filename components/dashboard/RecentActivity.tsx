"use client";

import { ArrowDownLeft, ArrowUpRight, CreditCard, Inbox } from "lucide-react";

import {
  DashboardSectionHeader,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import {
  getTransactionCardId,
  isPositiveTransaction,
  type RecentActivityGroup,
} from "@/components/dashboard/useDashboardData";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";

const typeLabel: Record<Transaction["type"], string> = {
  card: "Cartão",
  fixed: "Débito/PIX",
  income: "Receita",
};

function getTransactionFallbackLabel(transaction: Transaction) {
  if (
    transaction.is_recurring &&
    (transaction.type === "card" || Boolean(transaction.cardId))
  ) {
    return "Assinatura";
  }

  if (transaction.type === "fixed" && transaction.is_recurring) return "Fixo";

  return typeLabel[transaction.type];
}

export function RecentActivity({
  groups,
  cardNamesById,
  isFetching,
}: {
  groups: RecentActivityGroup[];
  cardNamesById: Map<string, string>;
  isFetching: boolean;
}) {
  const formatPrivateCurrency = usePrivateCurrency();

  return (
    <section
      aria-labelledby="dashboard-recent-title"
      className={cn(dashboardPanelClassName, "min-w-0 p-5 sm:p-6")}
    >
      <DashboardSectionHeader
        id="dashboard-recent-title"
        title="Movimentações recentes"
        href="/dashboard/transactions"
        actionLabel="Ver todas"
      />
      <div
        className={cn(
          "mt-4 transition-opacity duration-300",
          isFetching && "pointer-events-none opacity-50",
        )}
      >
        {groups.length ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-medium text-zinc-500">
                  {group.label}
                </p>
                <ul className="-mx-2 mt-0.5">
                  {group.transactions.map((transaction) => {
                    const isPositive = isPositiveTransaction(transaction);
                    const cardName =
                      transaction.type === "card"
                        ? cardNamesById.get(
                            getTransactionCardId(transaction) ?? "",
                          )
                        : undefined;

                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-zinc-800/80 text-zinc-400",
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="size-3.5" />
                          ) : transaction.type === "card" ? (
                            <CreditCard className="size-3.5" />
                          ) : (
                            <ArrowDownLeft className="size-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-200">
                            <TransactionDescription transaction={transaction} />
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {transaction.category ||
                              getTransactionFallbackLabel(transaction)}
                            {cardName && ` · ${cardName}`}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            isPositive ? "text-emerald-300" : "text-zinc-100",
                          )}
                        >
                          {isPositive ? "+" : "-"}
                          {formatPrivateCurrency(transaction.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
            <Inbox className="size-7 text-zinc-600" />
            Nenhuma movimentação até agora neste mês.
          </div>
        )}
      </div>
    </section>
  );
}
