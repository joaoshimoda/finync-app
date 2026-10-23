"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Download,
  Eye,
  Loader2,
  PieChart,
  ReceiptText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { FilterChip } from "@/components/dashboard/controls";
import {
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildTransactionsCsv, getBackupFilename } from "@/lib/backupExport";
import {
  buildCategorySummaryCsv,
  buildDependentsCsv,
  buildInvoicesCsv,
  defaultExportFilters,
  filterTransactions,
  formatCompetence,
  summarizeTransactions,
  type ExportFilters,
  type TransactionKind,
} from "@/lib/exportReports";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

import { downloadFile, type ExportData } from "./useExportData";

type ReportId = "transactions" | "categories" | "invoices" | "dependents";
type PeriodId = "month" | "quarter" | "year" | "lastYear" | "all" | "custom";

const reports: Array<{
  id: ReportId;
  title: string;
  description: string;
  icon: LucideIcon;
  filename: string;
  uses: { kinds: boolean; card: boolean; owner: boolean };
}> = [
  {
    id: "transactions",
    title: "Extrato de lançamentos",
    description: "Uma linha por lançamento, com categoria, cartão e parcela.",
    icon: ReceiptText,
    filename: "extrato",
    uses: { kinds: true, card: true, owner: true },
  },
  {
    id: "categories",
    title: "Resumo por categoria",
    description: "Quanto saiu e entrou em cada categoria, mês a mês.",
    icon: PieChart,
    filename: "categorias",
    uses: { kinds: true, card: true, owner: true },
  },
  {
    id: "invoices",
    title: "Faturas de cartão",
    description: "Ciclo, vencimento, total, quanto foi pago e o que resta.",
    icon: CreditCard,
    filename: "faturas",
    uses: { kinds: false, card: true, owner: false },
  },
  {
    id: "dependents",
    title: "Acertos de dependentes",
    description: "Gasto de cada pessoa por mês, recebido e o que falta.",
    icon: UsersRound,
    filename: "dependentes",
    uses: { kinds: false, card: false, owner: true },
  },
];

const kindOptions: Array<{ id: TransactionKind; label: string }> = [
  { id: "card", label: "Cartão" },
  { id: "fixed", label: "Débito/Pix" },
  { id: "income", label: "Receitas" },
];

const periodOptions: Array<{ id: PeriodId; label: string }> = [
  { id: "month", label: "Este mês" },
  { id: "quarter", label: "Últimos 3 meses" },
  { id: "year", label: "Este ano" },
  { id: "lastYear", label: "Ano passado" },
  { id: "all", label: "Tudo" },
  { id: "custom", label: "Escolher" },
];

const ALL = "__all__";

function monthStart(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getPeriodRange(period: PeriodId, custom: { from: string; to: string }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  switch (period) {
    case "month":
      return { fromMonth: monthStart(year, month), toMonth: monthStart(year, month) };
    case "quarter":
      return { fromMonth: monthStart(year, month - 2), toMonth: monthStart(year, month) };
    case "year":
      return { fromMonth: monthStart(year, 1), toMonth: monthStart(year, 12) };
    case "lastYear":
      return { fromMonth: monthStart(year - 1, 1), toMonth: monthStart(year - 1, 12) };
    case "custom":
      return {
        fromMonth: custom.from ? `${custom.from}-01` : null,
        toMonth: custom.to ? `${custom.to}-01` : null,
      };
    default:
      return { fromMonth: null, toMonth: null };
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-medium text-zinc-400">{children}</p>;
}

export function ReportBuilder({ data }: { data: ExportData }) {
  const formatValue = usePrivateCurrency();
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const [reportId, setReportId] = useState<ReportId>("transactions");
  const [period, setPeriod] = useState<PeriodId>("year");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [kinds, setKinds] = useState<TransactionKind[]>(defaultExportFilters.kinds);
  const [cardId, setCardId] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const report = reports.find((item) => item.id === reportId)!;
  const filters: ExportFilters = {
    ...getPeriodRange(period, custom),
    kinds: report.uses.kinds ? kinds : defaultExportFilters.kinds,
    cardId: report.uses.card && cardId !== ALL ? cardId : null,
    owner: report.uses.owner ? owner : "all",
  };

  /* Recomputed on every render: a filter pass over the cached snapshot. */
  const preview = (() => {
    if (!data.backup) return null;
    if (reportId === "invoices") {
      const invoices = data.backup.data.card_invoices.filter(
        (invoice) =>
          (!filters.fromMonth || invoice.billing_month.slice(0, 7) >= filters.fromMonth.slice(0, 7)) &&
          (!filters.toMonth || invoice.billing_month.slice(0, 7) <= filters.toMonth.slice(0, 7)) &&
          (!filters.cardId || invoice.card_id === filters.cardId),
      );
      return {
        lines: [
          `${invoices.length} ${invoices.length === 1 ? "fatura" : "faturas"}`,
          `Total ${formatValue(invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0))}`,
          `Pago ${formatValue(invoices.reduce((sum, invoice) => sum + invoice.paid_amount, 0))}`,
        ],
        empty: invoices.length === 0,
      };
    }

    const summary = summarizeTransactions(filterTransactions(data.backup, filters));
    const range =
      summary.firstMonth && summary.lastMonth
        ? summary.firstMonth === summary.lastMonth
          ? formatCompetence(summary.firstMonth)
          : `${formatCompetence(summary.firstMonth)} a ${formatCompetence(summary.lastMonth)}`
        : null;

    return {
      lines: [
        `${summary.count.toLocaleString("pt-BR")} ${summary.count === 1 ? "lançamento" : "lançamentos"}`,
        ...(range ? [range] : []),
        `Saídas ${formatValue(summary.expenses)}`,
        ...(summary.income > 0 ? [`Entradas ${formatValue(summary.income)}`] : []),
      ],
      empty: summary.count === 0,
    };
  })();

  async function handleExport() {
    setIsExporting(true);
    try {
      const backup = await data.loadBackup();
      const transactions = filterTransactions(backup, filters);
      const content =
        reportId === "transactions"
          ? buildTransactionsCsv(backup, transactions)
          : reportId === "categories"
            ? buildCategorySummaryCsv(transactions)
            : reportId === "invoices"
              ? buildInvoicesCsv(backup, filters)
              : buildDependentsCsv(backup, filters);

      downloadFile(
        content,
        getBackupFilename("csv", new Date(), report.filename),
        "text/csv;charset=utf-8",
      );
      toast.success(`${report.title} baixado.`);
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby="reports-title"
      className={cn(dashboardPanelClassName, "overflow-hidden")}
    >
      <header className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h2 id="reports-title" className="text-base font-semibold text-zinc-100">
          Relatórios para planilha
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          CSV pronto para Excel e Google Planilhas, com valores em reais e separador “;”.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div
          role="radiogroup"
          aria-label="Tipo de relatório"
          className="flex flex-col gap-1 border-b border-white/[0.06] p-2 lg:border-r lg:border-b-0"
        >
          {reports.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === reportId;

            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setReportId(item.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.025]",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-zinc-500",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", isActive ? "text-zinc-50" : "text-zinc-300")}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <FieldLabel>Período</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {periodOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  active={period === option.id}
                  onClick={() => setPeriod(option.id)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
            {period === "custom" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <input
                  type="month"
                  aria-label="Mês inicial"
                  value={custom.from}
                  onChange={(event) => setCustom((current) => ({ ...current, from: event.target.value }))}
                  className="h-9 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 text-sm text-zinc-100"
                />
                até
                <input
                  type="month"
                  aria-label="Mês final"
                  value={custom.to}
                  onChange={(event) => setCustom((current) => ({ ...current, to: event.target.value }))}
                  className="h-9 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </div>
            )}
          </div>

          {report.uses.kinds && (
            <div>
              <FieldLabel>Incluir</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {kindOptions.map((option) => {
                  const isActive = kinds.includes(option.id);
                  return (
                    <FilterChip
                      key={option.id}
                      active={isActive}
                      onClick={() =>
                        setKinds((current) =>
                          isActive
                            ? current.length > 1
                              ? current.filter((kind) => kind !== option.id)
                              : current
                            : [...current, option.id],
                        )
                      }
                    >
                      {option.label}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          )}

          {(report.uses.card || report.uses.owner) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {report.uses.card && (
                <div>
                  <FieldLabel>Cartão</FieldLabel>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="h-10 w-full border-white/[0.08] bg-zinc-900 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos os cartões</SelectItem>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {report.uses.owner && (
                <div>
                  <FieldLabel>De quem</FieldLabel>
                  <Select value={owner} onValueChange={setOwner}>
                    <SelectTrigger className="h-10 w-full border-white/[0.08] bg-zinc-900 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {reportId === "dependents" ? "Todos os dependentes" : "Todos"}
                      </SelectItem>
                      {reportId !== "dependents" && <SelectItem value="mine">Só meus gastos</SelectItem>}
                      {dependents.map((dependent) => (
                        <SelectItem key={dependent.id} value={dependent.id}>
                          {dependent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              {preview ? (
                <p className={cn("text-sm", preview.empty ? "text-amber-300" : "text-zinc-200")}>
                  {preview.empty ? "Nada encontrado com esses filtros." : preview.lines.join(" · ")}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void data.loadBackup().catch(() => toast.error("Não foi possível carregar a prévia."))}
                  disabled={data.isLoading}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {data.isLoading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  Ver prévia antes de baixar
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || data.isLoading || Boolean(preview?.empty)}
              className="h-10 gap-2 bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar CSV
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
