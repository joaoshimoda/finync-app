"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { CategoryGlyph } from "@/components/finance/categoryIcons";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBudgetTransactionAmount } from "@/lib/categoryBudgets";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

import { budgetStatusTone } from "./BudgetOverview";
import type { BudgetRow } from "./useBudgetsData";

const PREVIEW_COUNT = 4;

function BudgetCard({
  row,
  pace,
  onEdit,
  onDelete,
}: {
  row: BudgetRow;
  pace: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const tone = budgetStatusTone[row.status];
  const projectedOver =
    row.projected !== null && row.status !== "exceeded" && row.projected > row.amount;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: dashboardEase }}
      className={cn(
        dashboardPanelClassName,
        "flex min-w-0 flex-col p-4 transition-colors hover:border-white/[0.12] sm:p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone.pill,
          )}
        >
          <CategoryGlyph name={row.categoryIcon ?? undefined} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {row.categoryLabel}
          </p>
          <p className={cn("mt-0.5 text-xs", tone.text)}>
            {tone.label} · {Math.round(row.percentage)}%
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações do orçamento de ${row.categoryLabel}`}
              className="-mt-1 -mr-1 size-8 text-zinc-500 hover:text-zinc-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar limite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Excluir orçamento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums text-zinc-50">
          {formatValue(row.spent)}
        </span>
        <span className="truncate text-xs text-zinc-500">
          de {formatValue(row.amount)}
        </span>
      </p>

      {/* Bar with the alert threshold and today's pace marked on it. */}
      <div className="relative mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className={cn("h-full rounded-full", tone.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${row.progress}%` }}
            transition={{ duration: 0.8, ease: dashboardEase }}
          />
        </div>
        <span
          aria-hidden
          title={`Alerta em ${row.alertThresholdPercent}%`}
          className="absolute top-0 h-2 w-px bg-amber-200/50"
          style={{ left: `${row.alertThresholdPercent}%` }}
        />
        {pace !== null && (
          <span
            aria-hidden
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-zinc-100"
            style={{ left: `calc(${pace * 100}% - 1px)` }}
          />
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3 text-xs">
        <p
          className={cn(
            row.status === "exceeded" ? "text-rose-300" : "text-zinc-400",
          )}
        >
          {row.status === "exceeded"
            ? `${formatValue(row.exceededBy)} acima`
            : `Sobram ${formatValue(row.available)}`}
          {row.dailyAllowance !== null && row.status !== "exceeded" && (
            <span className="text-zinc-500">
              {" "}· {formatValue(row.dailyAllowance)}/dia
            </span>
          )}
        </p>
        {row.projected !== null && (
          <p
            className={cn(
              "shrink-0 text-right",
              projectedOver ? "text-amber-300" : "text-zinc-500",
            )}
          >
            Projeção {formatValue(row.projected)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        disabled={!row.transactions.length}
        className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-500 transition-colors hover:text-zinc-200 disabled:cursor-default disabled:hover:text-zinc-500"
      >
        {row.transactions.length
          ? `${row.transactions.length} ${row.transactions.length === 1 ? "lançamento" : "lançamentos"}`
          : "Nenhum lançamento ainda"}
        {row.transactions.length > 0 && (
          <ChevronDown
            className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: dashboardEase }}
            className="overflow-hidden"
          >
            {row.transactions.slice(0, PREVIEW_COUNT).map((transaction) => {
              const amount = getBudgetTransactionAmount(transaction);

              return (
                <li
                  key={transaction.id}
                  className="flex items-center gap-3 pt-2.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-zinc-300">
                    <TransactionDescription transaction={transaction} />
                  </span>
                  <span className="shrink-0 text-zinc-500">
                    {formatDateOnlyBR(transaction.date).slice(0, 5)}
                  </span>
                  <span className="w-20 shrink-0 text-right font-medium tabular-nums text-zinc-100">
                    {formatValue(amount)}
                  </span>
                  <span className="hidden w-8 shrink-0 text-right text-zinc-600 sm:inline">
                    {row.spent > 0 ? `${Math.round((amount / row.spent) * 100)}%` : ""}
                  </span>
                </li>
              );
            })}
            {row.transactions.length > PREVIEW_COUNT && (
              <li className="pt-2.5 text-xs text-zinc-500">
                + {row.transactions.length - PREVIEW_COUNT} menores
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function BudgetCards({
  rows,
  pace,
  onEdit,
  onDelete,
}: {
  rows: BudgetRow[];
  pace: number | null;
  onEdit: (row: BudgetRow) => void;
  onDelete: (row: BudgetRow) => void;
}) {
  return (
    <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <BudgetCard
            key={row.id}
            row={row}
            pace={pace}
            onEdit={() => onEdit(row)}
            onDelete={() => onDelete(row)}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}
