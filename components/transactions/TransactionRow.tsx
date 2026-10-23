"use client";

import { memo } from "react";
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  Landmark,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Trash2,
  UserRound,
} from "lucide-react";

import { TransactionDescription } from "@/components/finance/TransactionDescription";
import {
  getOriginKind,
  isPositiveTransaction,
  type OriginKind,
} from "@/components/transactions/transactionList";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";
import { NewItemGlow } from "@/components/motion/NewItemGlow";

const originStyles: Record<OriginKind, string> = {
  card: "bg-violet-500/10 text-violet-300",
  "debit-pix": "bg-sky-500/10 text-sky-300",
  income: "bg-emerald-500/10 text-emerald-300",
};

const OriginIcon = ({ kind }: { kind: OriginKind }) =>
  kind === "card" ? (
    <CreditCard className="size-4" />
  ) : kind === "income" ? (
    <ArrowUpRight className="size-4" />
  ) : (
    <Landmark className="size-4" />
  );

interface TransactionRowProps {
  transaction: Transaction;
  originLabel: string;
  dependentName?: string | null;
  showDate: boolean;
  showCategory: boolean;
  isSelected: boolean;
  isSelecting: boolean;
  formatAmount: (value: number) => string;
  onOpen: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onToggleSelect: (transactionId: string, checked: boolean) => void;
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  originLabel,
  dependentName,
  showDate,
  showCategory,
  isSelected,
  isSelecting,
  formatAmount,
  onOpen,
  onEdit,
  onDelete,
  onToggleSelect,
}: TransactionRowProps) {
  const originKind = getOriginKind(transaction);
  const isPositive = isPositiveTransaction(transaction);
  const categoryLabel = transaction.category?.trim() || "Sem categoria";
  const meta = [
    showCategory ? categoryLabel : null,
    originLabel,
    showDate ? formatDateOnlyBR(transaction.date) : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "group/row relative flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors sm:px-3",
        isSelected ? "bg-emerald-500/[0.07]" : "hover:bg-white/[0.03]",
      )}
    >
      <NewItemGlow id={transaction.id} reveal />
      <div
        className={cn(
          "flex shrink-0 items-center transition-all duration-200",
          isSelecting
            ? "w-5 opacity-100"
            : "w-0 opacity-0 sm:group-hover/row:w-5 sm:group-hover/row:opacity-100 sm:focus-within:w-5 sm:focus-within:opacity-100",
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) =>
            onToggleSelect(transaction.id, checked === true)
          }
          aria-label={`Selecionar ${transaction.description}`}
          className="border-zinc-600"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          isSelecting
            ? onToggleSelect(transaction.id, !isSelected)
            : onOpen(transaction)
        }
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10",
            originStyles[originKind],
          )}
        >
          <OriginIcon kind={originKind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-zinc-100">
              <TransactionDescription transaction={transaction} />
            </span>
            {transaction.is_recurring && (
              <Repeat2
                className="size-3.5 shrink-0 text-zinc-500"
                aria-label={
                  transaction.type === "card" ? "Assinatura" : "Recorrente"
                }
              />
            )}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
            <span className="truncate">{meta.join(" · ")}</span>
            {dependentName && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-500/10 px-1.5 py-px text-[11px] text-cyan-300">
                <UserRound className="size-3" />
                {dependentName}
              </span>
            )}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            isPositive ? "text-emerald-300" : "text-zinc-100",
          )}
        >
          {isPositive ? "+" : "-"}
          {formatAmount(transaction.amount)}
        </span>
      </button>

      {!isSelecting && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${transaction.description}`}
              className="size-8 shrink-0 rounded-lg text-zinc-500 hover:text-zinc-100 sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onOpen(transaction)}
            >
              <Eye className="size-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onEdit(transaction)}
            >
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={() => onDelete(transaction)}
            >
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
});
