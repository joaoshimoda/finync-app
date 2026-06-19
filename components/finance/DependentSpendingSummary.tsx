import { UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dependent, Transaction } from "@/store/useFinanceStore";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface DependentSpendingSummaryProps {
  dependents: Dependent[];
  transactions: Transaction[];
}

export function DependentSpendingSummary({
  dependents,
  transactions,
}: DependentSpendingSummaryProps) {
  const summaries = dependents
    .map((dependent) => ({
      ...dependent,
      total: transactions
        .filter(
          (transaction) =>
            transaction.type !== "income" &&
            transaction.dependentId === dependent.id,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter((dependent) => dependent.total > 0)
    .sort((left, right) => right.total - left.total);

  return (
    <Card className="border-zinc-800 bg-zinc-950 shadow-none">
      <CardHeader className="border-b border-zinc-800">
        <CardDescription>Valores a receber</CardDescription>
        <CardTitle className="text-xl">Gastos por Dependente</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {summaries.length ? (
          <div className="divide-y divide-zinc-800">
            {summaries.map((dependent) => (
              <div
                key={dependent.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
                    <UserRound className="size-4" />
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-200">
                    {dependent.name}
                  </span>
                </div>
                <strong className="shrink-0 text-base font-semibold text-zinc-50">
                  {brlFormatter.format(dependent.total)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-zinc-500">
            Nenhum gasto vinculado a dependentes neste período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
