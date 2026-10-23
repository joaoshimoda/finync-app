"use client";

import { CalendarDays, Repeat2, UserRound } from "lucide-react";

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";

interface TransactionLivePreviewProps {
  type: "expense" | "income";
  amount: string;
  description: string;
  category: string;
  categoryIcon?: string;
  origin: string;
  owner: string;
  date: string;
  recurring: boolean;
  /* e.g. "3x de R$ 40,00" for an installment purchase. */
  detail?: string;
}

export function parsePreviewAmount(value: string) {
  const sanitizedValue = value.trim().replace(/\s/g, "");
  const normalizedValue = sanitizedValue.includes(",")
    ? sanitizedValue.replace(/\./g, "").replace(",", ".")
    : sanitizedValue;
  const parsedAmount = Number(normalizedValue);

  return Number.isFinite(parsedAmount) ? parsedAmount : 0;
}

/* The entry as it will look in the statement, updated while the user types. */
export function TransactionLivePreview({
  type,
  amount,
  description,
  category,
  categoryIcon,
  origin,
  owner,
  date,
  recurring,
  detail,
}: TransactionLivePreviewProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const isExpense = type === "expense";
  const previewAmount = formatCurrency(parsePreviewAmount(amount));

  return (
    <section aria-label="Prévia no extrato">
      <p className="mb-3 text-[13px] text-white/55">Como vai aparecer no extrato</p>

      <div className="rounded-2xl bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              isExpense
                ? "bg-rose-400/15 text-rose-200"
                : "bg-emerald-400/15 text-emerald-200",
            )}
          >
            <CategoryGlyph name={categoryIcon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">
              {description.trim() ||
                (isExpense ? "Nova despesa" : "Nova receita")}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-white/55">
              {category || "Outros"}, {origin}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-[17px] font-semibold tabular-nums tracking-tight",
                isExpense ? "text-rose-200" : "text-emerald-200",
              )}
            >
              {isExpense ? "−" : "+"} {previewAmount}
            </p>
            {detail ? (
              <p className="mt-0.5 text-xs tabular-nums text-white/50">{detail}</p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-white/60">
        <li className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDateOnlyBR(date)}
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <UserRound className="size-3.5 shrink-0" />
          <span className="truncate">{owner}</span>
        </li>
        {recurring ? (
          <li className="flex items-center gap-1.5">
            <Repeat2 className="size-3.5" />
            Todo mês
          </li>
        ) : null}
      </ul>
    </section>
  );
}
