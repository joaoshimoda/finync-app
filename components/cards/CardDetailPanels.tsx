"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarClock,
  Edit3,
  Lightbulb,
  MoreHorizontal,
  Repeat2,
  Trash2,
} from "lucide-react";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import type { useCardsData } from "@/components/cards/useCardsData";
import {
  dashboardEase,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { TransactionDescription } from "@/components/finance/TransactionDescription";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateOnlyBR, getDateOnlyParts } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import type { CardInvoiceStatus } from "@/store/useFinanceStore";

type SelectedCard = NonNullable<ReturnType<typeof useCardsData>["selected"]>;

const statusStyles: Record<
  CardInvoiceStatus | "none",
  { label: string; className: string }
> = {
  open: { label: "Aberta", className: "bg-sky-500/10 text-sky-300" },
  closed: { label: "Fechada", className: "bg-amber-500/10 text-amber-300" },
  partially_paid: {
    label: "Parcialmente paga",
    className: "bg-violet-500/10 text-violet-300",
  },
  paid: { label: "Paga", className: "bg-emerald-500/10 text-emerald-300" },
  none: { label: "Sem fatura", className: "bg-zinc-800 text-zinc-400" },
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
});

function formatMonth(date: string) {
  const { year, month } = getDateOnlyParts(date);

  return monthFormatter.format(new Date(year, month - 1, 1)).replace(".", "");
}

function getDueText(
  daysUntil: number | null,
  isPaid: boolean,
  hasOpenAmount: boolean,
) {
  if (isPaid) return "Fatura quitada";
  if (!hasOpenAmount) return "Nada a pagar neste mês";
  if (daysUntil === null) return "Sem vencimento definido";
  if (daysUntil < 0)
    return `Venceu há ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? "dia" : "dias"}`;
  if (daysUntil === 0) return "Vence hoje";
  if (daysUntil === 1) return "Vence amanhã";
  return `Vence em ${daysUntil} dias`;
}

export function InvoicePanel({
  selected,
  monthLabel,
  onPay,
  onEdit,
  onDelete,
}: {
  selected: SelectedCard;
  monthLabel: string;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const status = statusStyles[selected.invoice?.status ?? "none"];
  const isPaid = selected.invoice?.status === "paid";
  const hasOpenAmount = selected.openAmount > 0;
  const canPay = Boolean(
    selected.invoice &&
    !isPaid &&
    selected.invoice.totalAmount > selected.invoice.paidAmount,
  );
  const paidProgress =
    selected.projectedTotal > 0
      ? Math.min((selected.paidAmount / selected.projectedTotal) * 100, 100)
      : 0;
  const sharesTotal = selected.shares.reduce(
    (sum, share) => sum + share.amount,
    0,
  );
  const dueTone = isPaid
    ? "text-emerald-300"
    : !hasOpenAmount
      ? "text-zinc-400"
      : selected.daysUntilDue !== null && selected.daysUntilDue < 0
        ? "text-rose-300"
        : selected.daysUntilDue !== null && selected.daysUntilDue <= 3
          ? "text-amber-300"
          : "text-zinc-400";

  return (
    <AnalyticsPanel
      title={`Fatura de ${monthLabel}`}
      description={`Ciclo de ${formatDateOnlyBR(selected.cycle.startDate)} a ${formatDateOnlyBR(selected.cycle.endDate)}`}
      action={
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              status.className,
            )}
          >
            {status.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Ações do cartão ${selected.card.name}`}
                className="size-8 text-zinc-400 hover:text-zinc-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
                <Edit3 className="size-4" />
                Editar cartão
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Excluir cartão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      className="lg:col-span-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">Lançado até agora</p>
          <AnimatedNumber
            value={selected.invoiceTotal}
            format={formatValue}
            className="mt-1 block text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-zinc-50"
          />
          <p
            className={cn(
              "mt-2 flex items-center gap-1.5 text-sm font-medium",
              dueTone,
            )}
          >
            {isPaid ? (
              <CalendarCheck className="size-4" />
            ) : (
              <CalendarClock className="size-4" />
            )}
            {getDueText(selected.daysUntilDue, isPaid, hasOpenAmount)}
            {selected.dueDate && !isPaid && hasOpenAmount && (
              <span className="font-normal text-zinc-500">
                · {formatDateOnlyBR(selected.dueDate)}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          disabled={!canPay}
          onClick={onPay}
          className="h-11 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          {isPaid ? "Fatura paga" : "Pagar fatura"}
        </Button>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 rounded-xl bg-zinc-950/50 p-4 ring-1 ring-inset ring-white/[0.05]">
        {[
          { label: "Previsto no fechamento", value: selected.projectedTotal },
          { label: "Já pago", value: selected.paidAmount },
          { label: "Em aberto", value: selected.openAmount },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="truncate text-[11px] text-zinc-500 sm:text-xs">
              {item.label}
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">
              {formatValue(item.value)}
            </dd>
          </div>
        ))}
        <div className="col-span-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${paidProgress}%` }}
              transition={{ duration: 0.8, ease: dashboardEase }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {paidProgress.toFixed(0)}% da fatura paga
            {selected.scheduledTotal > 0 &&
              ` · ${formatValue(selected.scheduledTotal)} ainda vão entrar`}
          </p>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400">Quem gastou</p>
          {selected.shares.length ? (
            <>
              <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-zinc-800">
                {selected.shares.map((share) => (
                  <motion.div
                    key={share.id}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ backgroundColor: share.color }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${sharesTotal > 0 ? (share.amount / sharesTotal) * 100 : 0}%`,
                    }}
                    transition={{ duration: 0.8, ease: dashboardEase }}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {selected.shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: share.color }}
                      />
                      <span className="truncate">{share.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-100">
                      {formatValue(share.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum gasto nesta fatura.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400">Composição</p>
          <ul className="mt-3 space-y-2">
            {selected.composition.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-zinc-400">{item.label}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    item.key === "credit" && item.amount > 0
                      ? "text-emerald-300"
                      : "text-zinc-100",
                  )}
                >
                  {item.key === "credit" && item.amount > 0 ? "-" : ""}
                  {formatValue(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AnalyticsPanel>
  );
}

export function LimitPanel({
  selected,
  onEdit,
}: {
  selected: SelectedCard;
  onEdit: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const hasLimit = selected.limitAmount > 0;
  const usage = selected.limitUsage;
  const color = usage >= 90 ? "#d03b3b" : usage >= 70 ? "#c98500" : "#059669";
  const { closingDay, dueDay } = selected.card;

  return (
    <AnalyticsPanel
      title="Limite e ciclo"
      description="Quanto você pode gastar e quando cada compra é cobrada"
      className="lg:col-span-5"
    >
      {hasLimit ? (
        <div className="flex items-center gap-5">
          <div className="relative size-28 shrink-0 sm:size-36">
            <svg
              viewBox="0 0 140 140"
              className="size-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={12}
              />
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{
                  strokeDashoffset: circumference * (1 - usage / 100),
                }}
                transition={{ duration: 1, ease: dashboardEase }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatedNumber
                value={usage}
                format={(value) => `${Math.round(value)}%`}
                className="text-2xl font-semibold tabular-nums text-zinc-50 sm:text-3xl"
              />
              <span className="text-[11px] text-zinc-500">usado</span>
            </div>
          </div>
          <dl className="min-w-0 flex-1 space-y-3">
            <div>
              <dt className="text-xs text-zinc-500">Disponível</dt>
              <dd className="text-xl font-semibold tabular-nums text-emerald-300">
                {formatValue(selected.available)}
              </dd>
            </div>
            <div className="grid gap-2 min-[400px]:grid-cols-2 min-[400px]:gap-3">
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Usado</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-zinc-100">
                  {formatValue(selected.debtTotal)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-zinc-500">Limite</dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-zinc-100">
                  {formatValue(selected.limitAmount)}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/[0.1] p-4">
          <p className="text-sm text-zinc-300">Limite não informado</p>
          <p className="text-xs leading-5 text-zinc-500">
            Cadastre o limite para acompanhar quanto ainda está livre e receber
            o alerta de uso.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="border-white/[0.1] bg-zinc-950"
          >
            Definir limite
          </Button>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-inset ring-white/[0.05]">
          <dt className="text-xs text-zinc-500">Fechamento</dt>
          <dd className="mt-1 text-base font-semibold text-zinc-100">
            {closingDay ? `Dia ${closingDay}` : "—"}
          </dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-inset ring-white/[0.05]">
          <dt className="text-xs text-zinc-500">Vencimento</dt>
          <dd className="mt-1 text-base font-semibold text-zinc-100">
            {dueDay ? `Dia ${dueDay}` : "—"}
          </dd>
        </div>
      </dl>

      {closingDay ? (
        <div className="mt-3 flex gap-3 rounded-xl bg-emerald-500/[0.06] p-3.5 ring-1 ring-inset ring-emerald-500/15">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <p className="text-xs leading-5 text-zinc-300">
            <span className="font-semibold text-emerald-200">
              Melhor dia de compra: dia {closingDay}.
            </span>{" "}
            Compras a partir do fechamento só entram na fatura seguinte, então
            você ganha o maior prazo para pagar.
          </p>
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}

export function InstallmentsPanel({ selected }: { selected: SelectedCard }) {
  const formatValue = usePrivateCurrency();

  return (
    <AnalyticsPanel
      title="Parcelamentos"
      description={
        selected.installments.length
          ? `${formatValue(selected.installmentsRemaining)} ainda a pagar nas próximas faturas`
          : "Compras parceladas nesta fatura"
      }
    >
      {selected.installments.length ? (
        <ul className="space-y-4">
          {selected.installments.slice(0, 5).map((plan, index) => (
            <li key={plan.transaction.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-zinc-200">
                  <TransactionDescription transaction={plan.transaction} />
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                  {formatValue(plan.transaction.amount)}
                  <span className="text-xs font-normal text-zinc-500">
                    /mês
                  </span>
                </span>
              </div>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: Math.min(plan.total, 24) }, (_, step) => (
                  <motion.span
                    key={step}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      step < plan.current ? "bg-sky-400" : "bg-zinc-800",
                    )}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 + step * 0.015 }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                Parcela {plan.current} de {plan.total}
                {plan.remainingCount > 0
                  ? ` · faltam ${formatValue(plan.remainingAmount)} · termina em ${formatMonth(plan.endsAt)}`
                  : " · última parcela"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Nenhuma compra parcelada nesta fatura.
        </p>
      )}
    </AnalyticsPanel>
  );
}

export function SubscriptionsPanel({ selected }: { selected: SelectedCard }) {
  const formatValue = usePrivateCurrency();

  return (
    <AnalyticsPanel
      title="Assinaturas"
      description={
        selected.subscriptions.length
          ? `${formatValue(selected.subscriptionsTotal)} por mês · ${formatValue(selected.subscriptionsTotal * 12)} por ano`
          : "Cobranças recorrentes neste cartão"
      }
    >
      {selected.subscriptions.length ? (
        <ul className="space-y-1">
          {selected.subscriptions.slice(0, 6).map((subscription) => (
            <li
              key={subscription.id}
              className="flex items-center gap-3 rounded-lg py-1.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <Repeat2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-200">
                  <TransactionDescription transaction={subscription} />
                </span>
                <span className="block text-xs text-zinc-500">
                  Cobra dia {getDateOnlyParts(subscription.date).day}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                {formatValue(subscription.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Nenhuma assinatura cobrada neste cartão.
        </p>
      )}
    </AnalyticsPanel>
  );
}

export function CategoriesPanel({ selected }: { selected: SelectedCard }) {
  const formatValue = usePrivateCurrency();
  const largest = Math.max(
    ...selected.categories.map((category) => category.amount),
    0,
  );

  return (
    <AnalyticsPanel title="Categorias" description="Onde esta fatura foi gasta">
      {selected.categories.length ? (
        <ul className="space-y-4">
          {selected.categories.map((category, index) => (
            <li key={category.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-zinc-300">{category.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-zinc-100">
                  {formatValue(category.amount)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className="h-full rounded-full bg-[#3b82f6]"
                  style={{ opacity: 1 - index * 0.12 }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${largest > 0 ? (category.amount / largest) * 100 : 0}%`,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1 + index * 0.05,
                    ease: dashboardEase,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Nenhum gasto categorizado nesta fatura.
        </p>
      )}
    </AnalyticsPanel>
  );
}
