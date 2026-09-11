import { ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";

import { formatDateOnlyBR } from "@/lib/dateUtils";

interface TransactionLivePreviewProps {
  type: "expense" | "income";
  amount: string;
  description: string;
  category: string;
  origin: string;
  owner: string;
  date: string;
  recurring: boolean;
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function parsePreviewAmount(value: string) {
  const sanitizedValue = value.trim().replace(/\s/g, "");
  const normalizedValue = sanitizedValue.includes(",")
    ? sanitizedValue.replace(/\./g, "").replace(",", ".")
    : sanitizedValue;
  const parsedAmount = Number(normalizedValue);

  return Number.isFinite(parsedAmount) ? parsedAmount : 0;
}

export function TransactionLivePreview({
  type,
  amount,
  description,
  category,
  origin,
  owner,
  date,
  recurring,
}: TransactionLivePreviewProps) {
  const isExpense = type === "expense";
  const previewAmount = brlFormatter.format(parsePreviewAmount(amount));
  const Icon = isExpense ? ArrowDownLeft : ArrowUpRight;

  return (
    <section className="relative z-10 my-auto hidden py-4 md:block">
      <p className="text-[10px] font-bold uppercase text-white/70">
        Prévia no extrato
      </p>

      <div className="-mx-3 mt-3 border-y border-white/20 bg-black/[0.07] px-3 py-4">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 text-right">
            <p className="text-[9px] font-semibold uppercase text-white/65">
              {isExpense ? "Saída" : "Entrada"}
            </p>
            <strong className="mt-1 block text-xl font-semibold text-white">
              {isExpense ? "−" : "+"} {previewAmount}
            </strong>
          </div>
        </div>

        <p className="mt-4 truncate text-sm font-semibold text-white">
          {description.trim() ||
            (isExpense ? "Nova despesa" : "Nova receita")}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <dt className="text-[9px] font-semibold uppercase text-white/65">
              Categoria
            </dt>
            <dd className="mt-1 truncate text-xs font-medium text-white/85">
              {category || "Outros"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[9px] font-semibold uppercase text-white/65">
              Origem
            </dt>
            <dd className="mt-1 truncate text-xs font-medium text-white/85">
              {origin}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-medium text-white/75">
        <span className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          <span>{formatDateOnlyBR(date)}</span>
        </span>
        <span className="truncate">{owner}</span>
        <span className="shrink-0 rounded-full bg-white/12 px-2 py-1 text-white/80">
          {recurring ? "Recorrente" : "Avulso"}
        </span>
      </div>
    </section>
  );
}
