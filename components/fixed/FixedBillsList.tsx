"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Trash2,
  Undo2,
} from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { CategoryGlyph } from "@/components/finance/categoryIcons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/store/useFinanceStore";

import { getDueLabel } from "./RecurringSummary";
import type { FixedBill, FixedBillGroup } from "./useRecurringData";

const groups: Array<{
  id: FixedBillGroup;
  title: string;
  hint: string;
  dot: string;
}> = [
  { id: "overdue", title: "Atrasadas", hint: "Passaram do vencimento", dot: "bg-red-400" },
  { id: "soon", title: "Próximos 7 dias", hint: "Vencem nesta semana", dot: "bg-amber-400" },
  { id: "later", title: "Mais adiante", hint: "Ainda neste mês", dot: "bg-zinc-500" },
  { id: "paid", title: "Pagas", hint: "Já baixadas no mês", dot: "bg-emerald-400" },
];

const iconTone: Record<FixedBillGroup, string> = {
  overdue: "bg-red-500/10 text-red-300",
  soon: "bg-amber-500/10 text-amber-300",
  later: "bg-white/[0.04] text-zinc-300",
  paid: "bg-emerald-500/10 text-emerald-300",
};

const dueTone: Record<FixedBillGroup, string> = {
  overdue: "text-red-300",
  soon: "text-amber-300",
  later: "text-zinc-500",
  paid: "text-emerald-300/80",
};

function BillRow({
  bill,
  selected,
  isUpdating,
  onToggleSelect,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  bill: FixedBill;
  selected: boolean;
  isUpdating: boolean;
  onToggleSelect: () => void;
  onTogglePaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { transaction, group, daysUntil } = bill;
  const isPaid = group === "paid";
  const day = getDateOnlyParts(transaction.date).day;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3, ease: dashboardEase }}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[0.025] sm:px-4",
        selected && "bg-emerald-400/[0.04] hover:bg-emerald-400/[0.06]",
      )}
    >
      <Checkbox
        aria-label={`Selecionar ${transaction.description}`}
        checked={selected}
        disabled={isPaid}
        onCheckedChange={onToggleSelect}
        className={cn("border-zinc-600", isPaid && "invisible")}
      />
      <span
        className={cn(
          "relative hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex",
          iconTone[group],
        )}
      >
        <CategoryGlyph name={bill.categoryIcon ?? undefined} className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isPaid ? "text-zinc-400" : "text-zinc-100",
          )}
        >
          {transaction.description}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          <span className="hidden sm:inline">
            {transaction.category || "Sem categoria"} ·{" "}
          </span>
          Dia {day}
          <span className={cn("sm:hidden", dueTone[group])}>
            {" "}· {isPaid ? "paga" : getDueLabel(daysUntil)}
          </span>
        </p>
      </div>

      <p className={cn("hidden w-36 shrink-0 text-xs sm:block", dueTone[group])}>
        {isPaid ? "Paga" : getDueLabel(daysUntil)}
      </p>

      <p
        className={cn(
          "shrink-0 text-right text-sm font-semibold tabular-nums",
          isPaid ? "text-zinc-500 line-through decoration-zinc-600" : "text-zinc-50",
        )}
      >
        {formatValue(transaction.amount)}
      </p>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isUpdating}
          onClick={onTogglePaid}
          aria-label={
            isPaid
              ? `Marcar ${transaction.description} como pendente`
              : `Marcar ${transaction.description} como paga`
          }
          className={cn(
            "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
            isPaid
              ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              : "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200",
          )}
        >
          {isUpdating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isPaid ? (
            <Undo2 className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          <span className="hidden md:inline">{isPaid ? "Desfazer" : "Pagar"}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações de ${transaction.description}`}
              className="size-8 text-zinc-500 hover:text-zinc-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar conta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
}

export function FixedBillsList({
  bills,
  selectedIds,
  updatingIds,
  isFiltered,
  onToggleSelect,
  onSelectGroup,
  onTogglePaid,
  onEdit,
  onDelete,
  onCreate,
}: {
  bills: FixedBill[];
  selectedIds: string[];
  updatingIds: string[];
  isFiltered: boolean;
  onToggleSelect: (id: string) => void;
  onSelectGroup: (ids: string[], select: boolean) => void;
  onTogglePaid: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onCreate: () => void;
}) {
  const formatValue = usePrivateCurrency();

  if (!bills.length) {
    return (
      <div
        className={cn(
          dashboardPanelClassName,
          "flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
          <ReceiptText className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-zinc-100">
          {isFiltered ? "Nada encontrado" : "Nenhuma conta fixa neste mês"}
        </h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
          {isFiltered
            ? "Ajuste a busca ou o filtro para ver outras contas."
            : "Aluguel, luz, internet: cadastre uma vez e o Finync repete todo mês."}
        </p>
        {!isFiltered && (
          <Button
            type="button"
            onClick={onCreate}
            className="mt-5 h-10 gap-2 bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Adicionar conta fixa
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const items = bills.filter((bill) => bill.group === group.id);
        if (!items.length) return null;

        const total = items.reduce((sum, bill) => sum + bill.transaction.amount, 0);
        const selectableIds = items
          .filter((bill) => bill.group !== "paid")
          .map((bill) => bill.transaction.id);
        const allSelected =
          selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

        return (
          <section
            key={group.id}
            aria-labelledby={`fixed-group-${group.id}`}
            className={cn(dashboardPanelClassName, "overflow-hidden")}
          >
            <header className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
              <Checkbox
                aria-label={`Selecionar todas em ${group.title}`}
                checked={allSelected}
                disabled={!selectableIds.length}
                onCheckedChange={() => onSelectGroup(selectableIds, !allSelected)}
                className={cn("border-zinc-600", !selectableIds.length && "invisible")}
              />
              <span className={cn("size-2 rounded-full", group.dot)} />
              <div className="min-w-0 flex-1">
                <h3
                  id={`fixed-group-${group.id}`}
                  className="text-sm font-semibold text-zinc-100"
                >
                  {group.title}
                  <span className="ml-2 font-normal text-zinc-500">{items.length}</span>
                </h3>
              </div>
              <p className="hidden text-xs text-zinc-500 sm:block">{group.hint}</p>
              <p className="text-sm font-semibold tabular-nums text-zinc-300">
                {formatValue(total)}
              </p>
            </header>
            <ul className="divide-y divide-white/[0.04]">
              <AnimatePresence initial={false}>
                {items.map((bill) => (
                  <BillRow
                    key={bill.transaction.id}
                    bill={bill}
                    selected={selectedIds.includes(bill.transaction.id)}
                    isUpdating={updatingIds.includes(bill.transaction.id)}
                    onToggleSelect={() => onToggleSelect(bill.transaction.id)}
                    onTogglePaid={() => onTogglePaid(bill.transaction)}
                    onEdit={() => onEdit(bill.transaction)}
                    onDelete={() => onDelete(bill.transaction)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}
