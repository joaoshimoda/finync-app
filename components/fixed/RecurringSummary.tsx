"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { CalendarClock, CircleCheck, Repeat2 } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

import type { RecurringData } from "./useRecurringData";

export function getDueLabel(daysUntil: number) {
  if (daysUntil < -1) return `atrasada há ${Math.abs(daysUntil)} dias`;
  if (daysUntil === -1) return "atrasada desde ontem";
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

function Tile({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Repeat2;
  label: string;
  value: number;
  children: ReactNode;
}) {
  const formatValue = usePrivateCurrency();

  return (
    <div className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 ring-1 ring-inset ring-white/[0.06]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-zinc-500">{label}</p>
        <AnimatedNumber
          value={value}
          format={formatValue}
          className="mt-0.5 block truncate text-xl font-semibold tabular-nums text-zinc-50"
        />
        {children}
      </div>
    </div>
  );
}

function Bar({ segments }: { segments: Array<{ value: number; className: string }> }) {
  return (
    <div className="mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full bg-zinc-800">
      {segments.map((segment, index) => (
        <motion.div
          key={index}
          className={cn("h-full rounded-full", segment.className)}
          initial={{ width: 0 }}
          animate={{ width: `${segment.value}%` }}
          transition={{ duration: 0.8, delay: index * 0.1, ease: dashboardEase }}
        />
      ))}
    </div>
  );
}

export function RecurringSummary({
  data,
  isFetching,
}: {
  data: RecurringData;
  isFetching: boolean;
}) {
  const formatValue = usePrivateCurrency();
  const { totals, openBills, overdueBills, nextBill } = data;
  const fixedShare = totals.commitment > 0 ? (totals.fixed / totals.commitment) * 100 : 0;
  const paidShare = totals.fixed > 0 ? (totals.paid / totals.fixed) * 100 : 0;

  return (
    <motion.section
      variants={dashboardReveal}
      aria-label="Resumo das recorrências"
      className={cn(
        dashboardPanelClassName,
        "grid divide-y divide-white/[0.06] transition-opacity sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        isFetching && "opacity-70",
      )}
    >
      <Tile icon={Repeat2} label="Compromisso do mês" value={totals.commitment}>
        <Bar
          segments={
            totals.commitment > 0
              ? [
                  { value: fixedShare, className: "bg-emerald-400" },
                  { value: 100 - fixedShare, className: "bg-violet-400" },
                ]
              : []
          }
        />
        <p className="mt-1.5 flex flex-wrap gap-x-3 truncate text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Contas {formatValue(totals.fixed)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-violet-400" />
            Assinaturas {formatValue(totals.subscriptions)}
          </span>
        </p>
      </Tile>

      <Tile icon={CircleCheck} label="Contas pagas" value={totals.paid}>
        <Bar
          segments={totals.fixed > 0 ? [{ value: paidShare, className: "bg-emerald-400" }] : []}
        />
        <p className="mt-1.5 truncate text-xs text-zinc-500">
          {totals.fixed === 0
            ? "Nenhuma conta fixa neste mês"
            : openBills.length
              ? `Faltam ${formatValue(totals.open)} em ${openBills.length} ${openBills.length === 1 ? "conta" : "contas"}`
              : "Tudo pago neste mês"}
        </p>
      </Tile>

      <Tile
        icon={CalendarClock}
        label={overdueBills.length ? "Contas atrasadas" : "Próximo vencimento"}
        value={
          overdueBills.length
            ? overdueBills.reduce((total, bill) => total + bill.transaction.amount, 0)
            : (nextBill?.transaction.amount ?? 0)
        }
      >
        <p
          className={cn(
            "mt-1.5 truncate text-xs",
            overdueBills.length ? "text-red-300" : "text-zinc-500",
          )}
        >
          {overdueBills.length
            ? `${overdueBills.length} ${overdueBills.length === 1 ? "conta passou" : "contas passaram"} do vencimento`
            : nextBill
              ? `${nextBill.transaction.description} · ${formatDateOnlyBR(nextBill.transaction.date).slice(0, 5)} · ${getDueLabel(nextBill.daysUntil)}`
              : "Nenhuma conta em aberto"}
        </p>
      </Tile>
    </motion.section>
  );
}
