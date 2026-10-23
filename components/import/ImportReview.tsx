"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  FileWarning,
  Loader2,
  RotateCcw,
  Search,
  Split,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AnalyticsPanel } from "@/components/analytics/AnalyticsPrimitives";
import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { AnimatedNumber } from "@/components/finance/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_CREDIT_ADJUSTMENT_CATEGORY } from "@/lib/cardCredits";
import {
  formatInvoiceMonthLabel,
  formatPreviewDate,
  normalizeImportedExpenseCategory,
} from "@/lib/invoiceImport";
import type { PdfInvoiceBank } from "@/lib/invoicePdf";
import { cn } from "@/lib/utils";

import type { InvoiceImport, RowState } from "./useInvoiceImport";

type RowFilter =
  | "all"
  | "review"
  | "uncategorized"
  | "installments"
  | "credits"
  | "dependents"
  | "skipped";

const NO_CATEGORY = "__no_category__";
const ME = "__me__";

const pdfBankLabels: Record<PdfInvoiceBank, string> = {
  bradesco: "Bradesco",
  generic: "Formato genérico",
  inter: "Banco Inter",
  nubank: "Nubank",
};

function matchesFilter(row: RowState, filter: RowFilter) {
  const { transaction } = row;
  switch (filter) {
    case "review":
      return row.isReviewPending;
    case "uncategorized":
      return (
        !row.isLocked &&
        transaction.type !== "credit" &&
        normalizeImportedExpenseCategory(transaction.category ?? null) === "Outros"
      );
    case "installments":
      return transaction.type !== "credit" && transaction.installmentsTotal > 1;
    case "credits":
      return transaction.type === "credit";
    case "dependents":
      return transaction.owner === "dependent";
    case "skipped":
      return row.isLocked;
    default:
      return true;
  }
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", tone)}>
      {children}
    </span>
  );
}

function ReviewRow({
  row,
  flow,
  selected,
  onToggle,
  onSplit,
}: {
  row: RowState;
  flow: InvoiceImport;
  selected: boolean;
  onToggle: () => void;
  onSplit: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { transaction, index } = row;
  const isCredit = transaction.type === "credit";
  const ownerName =
    transaction.owner === "dependent" && transaction.dependentId
      ? (flow.dependents.find((item) => item.id === transaction.dependentId)?.name ??
        "Dependente")
      : "Você";
  const futureCount = transaction.installmentsTotal - transaction.installmentNumber;

  function changeCategory(value: string) {
    const category = value === NO_CATEGORY ? null : value;
    flow.setCategory([index], category);

    const similar = flow.getSimilarIndexes(index);
    if (category && similar.length) {
      toast(`Aplicar “${category}” a ${similar.length} ${similar.length === 1 ? "compra igual" : "compras iguais"}?`, {
        description: transaction.description,
        action: {
          label: "Aplicar",
          onClick: () => flow.setCategory(similar, category),
        },
      });
    }
  }

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: dashboardEase }}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 transition-colors sm:px-4 lg:grid-cols-[auto_3rem_minmax(0,1fr)_10rem_8.5rem_6.5rem_auto] lg:items-center",
        row.isLocked && "opacity-50",
        row.isReviewPending && "bg-amber-400/[0.035]",
        selected && "bg-emerald-400/[0.05]",
      )}
    >
      <Checkbox
        aria-label={`Selecionar ${transaction.description}`}
        checked={selected}
        disabled={row.isLocked}
        onCheckedChange={onToggle}
        className="mt-0.5 border-zinc-600 lg:mt-0"
      />

      <span className="hidden text-xs tabular-nums text-zinc-500 lg:block">
        {formatPreviewDate(transaction.date)}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className="truncate text-sm font-medium text-zinc-100"
            title={transaction.description}
          >
            {transaction.description}
          </p>
          {transaction.installmentsTotal > 1 && !isCredit && (
            <Badge tone="bg-violet-500/10 text-violet-300">
              {transaction.installmentNumber}/{transaction.installmentsTotal}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          <span className="tabular-nums lg:hidden">{formatPreviewDate(transaction.date)}</span>
          {row.isDuplicate && <Badge tone="bg-zinc-800 text-zinc-300">Já importada</Badge>}
          {row.isPartialDuplicate && (
            <Badge tone="bg-zinc-800 text-zinc-300">Parte já importada</Badge>
          )}
          {row.isPossibleDuplicate && !row.isApproved && (
            <Badge tone="bg-orange-500/10 text-orange-300">Parecida com uma existente</Badge>
          )}
          {transaction.requiresReview && !row.isApproved && !row.isIgnored && (
            <Badge tone="bg-amber-500/10 text-amber-300">Pagamento? Confira</Badge>
          )}
          {row.isApproved && <Badge tone="bg-emerald-500/10 text-emerald-300">Aprovada</Badge>}
          {row.isIgnored && <Badge tone="bg-zinc-800 text-zinc-400">Ignorada</Badge>}
          {isCredit && <Badge tone="bg-sky-500/10 text-sky-300">Estorno</Badge>}
          {futureCount > 0 && !isCredit && (
            <label className="flex items-center gap-1.5">
              <Checkbox
                className="size-3.5 border-zinc-600"
                disabled={row.isLocked}
                checked={transaction.projectFutureInstallments}
                onCheckedChange={(checked) =>
                  flow.setProjectInstallments(index, checked === true)
                }
              />
              Lançar +{futureCount} {futureCount === 1 ? "parcela futura" : "parcelas futuras"}
            </label>
          )}
          {transaction.referenceMonthOffset > 0 && (
            <span>Fatura {formatInvoiceMonthLabel(transaction.invoiceMonthStart)}</span>
          )}
        </div>
      </div>

      <p
        className={cn(
          "text-right text-sm font-semibold tabular-nums lg:hidden",
          isCredit ? "text-sky-300" : "text-zinc-50",
        )}
      >
        {isCredit ? "−" : ""}
        {formatValue(transaction.amount)}
      </p>

      <div className="col-span-2 col-start-2 flex flex-wrap items-center gap-2 lg:contents">
        {isCredit ? (
          <span className="truncate text-xs text-zinc-500 lg:px-1">
            {CARD_CREDIT_ADJUSTMENT_CATEGORY}
          </span>
        ) : (
          <Select
            disabled={row.isLocked}
            value={transaction.category || NO_CATEGORY}
            onValueChange={changeCategory}
          >
            <SelectTrigger
              aria-label="Categoria"
              className={cn(
                "h-8 w-40 border-white/[0.08] bg-zinc-900/60 px-2.5 text-xs text-zinc-100",
                normalizeImportedExpenseCategory(transaction.category ?? null) === "Outros" &&
                  "text-zinc-400",
              )}
            >
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
              {flow.categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isCredit ? (
          <span className="hidden lg:block" />
        ) : (
          <button
            type="button"
            onClick={onSplit}
            disabled={row.isLocked}
            className={cn(
              "flex h-8 max-w-[8.5rem] items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors disabled:pointer-events-none",
              transaction.owner === "dependent"
                ? "border-amber-400/30 bg-amber-400/[0.06] text-amber-200"
                : "border-white/[0.08] text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Split className="size-3.5 shrink-0" />
            <span className="truncate">{ownerName}</span>
          </button>
        )}

        <p
          className={cn(
            "hidden text-right text-sm font-semibold tabular-nums lg:block",
            isCredit ? "text-sky-300" : "text-zinc-50",
          )}
        >
          {isCredit ? "−" : ""}
          {formatValue(transaction.amount)}
        </p>

        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:justify-end">
          {row.isReviewPending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => flow.setReviewStatus([index], "approved")}
              className="h-8 gap-1 rounded-lg px-2 text-xs text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
            >
              <Check className="size-3.5" />
              Manter
            </Button>
          )}
          {row.isIgnored ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => flow.setReviewStatus([index], undefined)}
              className="h-8 gap-1 rounded-lg px-2 text-xs text-zinc-400 hover:text-zinc-100"
            >
              <RotateCcw className="size-3.5" />
              Restaurar
            </Button>
          ) : !row.isDuplicate ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => flow.setReviewStatus([index], "ignored")}
              aria-label={`Ignorar ${transaction.description}`}
              className="size-8 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function ImportReview({
  flow,
  onSplit,
  onReviewPdf,
}: {
  flow: InvoiceImport;
  onSplit: (index: number) => void;
  onReviewPdf: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const { rows, summary, pdfAudit } = flow;
  const [filter, setFilter] = useState<RowFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const filters: Array<{ id: RowFilter; label: string; count: number }> = [
    { id: "all", label: "Todas", count: rows.length },
    { id: "review", label: "Para revisar", count: summary.pendingReviewCount },
    { id: "uncategorized", label: "Sem categoria", count: summary.uncategorizedCount },
    { id: "installments", label: "Parceladas", count: rows.filter((row) => matchesFilter(row, "installments")).length },
    { id: "credits", label: "Estornos", count: rows.filter((row) => matchesFilter(row, "credits")).length },
    { id: "dependents", label: "Dependentes", count: rows.filter((row) => matchesFilter(row, "dependents")).length },
    { id: "skipped", label: "Fora da importação", count: rows.filter((row) => row.isLocked).length },
  ];

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter(
      (row) =>
        matchesFilter(row, filter) &&
        (!normalizedQuery ||
          row.transaction.description.toLocaleLowerCase("pt-BR").includes(normalizedQuery)),
    );
  }, [filter, query, rows]);

  /* Selection is index based; drop anything that is no longer editable. */
  const editable = new Set(rows.filter((row) => !row.isLocked).map((row) => row.index));
  const effectiveSelected = selected.filter((index) => editable.has(index));
  const visibleEditable = visibleRows.filter((row) => !row.isLocked).map((row) => row.index);
  const allVisibleSelected =
    visibleEditable.length > 0 && visibleEditable.every((index) => effectiveSelected.includes(index));
  const selectedTotal = rows
    .filter((row) => effectiveSelected.includes(row.index))
    .reduce(
      (sum, row) =>
        sum + (row.transaction.type === "credit" ? -row.transaction.amount : row.transaction.amount),
      0,
    );

  const blockers = [
    summary.pendingReviewCount > 0 &&
      `${summary.pendingReviewCount} ${summary.pendingReviewCount === 1 ? "linha precisa" : "linhas precisam"} de revisão`,
    flow.isCheckingDuplicates && "Verificando o que já foi importado",
    summary.newCount === 0 && !flow.isCheckingDuplicates && "Nada novo para importar",
  ].filter(Boolean) as string[];

  const largestCategory = summary.byCategory[0]?.amount ?? 0;

  return (
    <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {(summary.pendingReviewCount > 0 ||
          (pdfAudit?.rejectedLines.length ?? 0) > 0 ||
          summary.possibleDuplicateCount > 0) && (
          <motion.section
            variants={dashboardReveal}
            className="flex flex-col gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <AlertTriangle className="size-4" />
              Antes de importar
            </p>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              {summary.pendingReviewCount > 0 && (
                <li className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {summary.pendingReviewCount}{" "}
                    {summary.pendingReviewCount === 1 ? "linha parece" : "linhas parecem"} pagamento
                    de fatura ou algo já lançado. Mantenha ou ignore cada uma.
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilter("review")}
                    className="text-xs font-medium text-amber-200 underline-offset-2 hover:underline"
                  >
                    Mostrar
                  </button>
                </li>
              )}
              {(pdfAudit?.rejectedLines.length ?? 0) > 0 && (
                <li className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {pdfAudit!.rejectedLines.length}{" "}
                    {pdfAudit!.rejectedLines.length === 1 ? "linha do PDF não foi lida" : "linhas do PDF não foram lidas"}{" "}
                    automaticamente.
                  </span>
                  <button
                    type="button"
                    onClick={onReviewPdf}
                    className="flex items-center gap-1 text-xs font-medium text-amber-200 underline-offset-2 hover:underline"
                  >
                    <FileWarning className="size-3.5" />
                    Revisar
                  </button>
                </li>
              )}
            </ul>
          </motion.section>
        )}

        <motion.section
          variants={dashboardReveal}
          className={cn(dashboardPanelClassName, "overflow-hidden")}
        >
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3 sm:p-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar linhas">
              {filters
                .filter((item) => item.id === "all" || item.count > 0)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    aria-pressed={filter === item.id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      filter === item.id
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : item.id === "review"
                          ? "border-amber-400/30 text-amber-200 hover:bg-amber-400/10"
                          : "border-white/[0.08] text-zinc-400 hover:text-zinc-100",
                    )}
                  >
                    {item.label}
                    <span className="ml-1.5 tabular-nums text-zinc-500">{item.count}</span>
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                aria-label="Selecionar todas as linhas visíveis"
                checked={allVisibleSelected}
                disabled={!visibleEditable.length}
                onCheckedChange={() =>
                  setSelected(
                    allVisibleSelected
                      ? effectiveSelected.filter((index) => !visibleEditable.includes(index))
                      : Array.from(new Set([...effectiveSelected, ...visibleEditable])),
                  )
                }
                className="border-zinc-600"
              />
              <label className="relative flex flex-1 items-center">
                <Search className="pointer-events-none absolute left-3 size-4 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar compra"
                  aria-label="Buscar compra"
                  className="h-9 w-full rounded-lg border border-white/[0.07] bg-zinc-900/50 pr-3 pl-9 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-400/40 [&::-webkit-search-cancel-button]:hidden"
                />
              </label>
              <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">
                {visibleRows.length} de {rows.length}
              </span>
            </div>
          </div>

          {visibleRows.length ? (
            <ul className="divide-y divide-white/[0.04]">
              <AnimatePresence initial={false}>
                {visibleRows.map((row) => (
                  <ReviewRow
                    key={`${row.index}-${row.transaction.description}`}
                    row={row}
                    flow={flow}
                    selected={effectiveSelected.includes(row.index)}
                    onToggle={() =>
                      setSelected((current) =>
                        current.includes(row.index)
                          ? current.filter((index) => index !== row.index)
                          : [...current, row.index],
                      )
                    }
                    onSplit={() => {
                      setSelected([]);
                      onSplit(row.index);
                    }}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-zinc-500">
              Nenhuma linha com esse filtro.
            </p>
          )}
        </motion.section>
      </div>

      <aside className="order-first flex flex-col gap-4 xl:sticky xl:top-0 xl:order-none">
        <motion.section
          variants={dashboardReveal}
          className={cn(dashboardPanelClassName, "p-5")}
        >
          <p className="text-xs text-zinc-500">Total a importar</p>
          <AnimatedNumber
            value={summary.totalAmount}
            format={formatValue}
            className="mt-1 block text-3xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-50"
          />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Compras</dt>
              <dd className="font-medium tabular-nums text-zinc-100">
                {formatValue(summary.expensesAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Estornos</dt>
              <dd className="font-medium tabular-nums text-sky-300">
                {summary.creditsAmount > 0 ? "−" : ""}
                {formatValue(summary.creditsAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Lançamentos novos</dt>
              <dd className="font-medium tabular-nums text-zinc-100">
                {summary.newCount}
                {summary.newCount > summary.newSourceCount && (
                  <span className="block text-xs font-normal text-zinc-500">
                    {summary.newSourceCount} da fatura +{" "}
                    {summary.newCount - summary.newSourceCount} parcelas futuras
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Fora da importação</dt>
              <dd className="font-medium tabular-nums text-zinc-400">
                {summary.duplicateCount + summary.ignoredCount}
              </dd>
            </div>
          </dl>
          {pdfAudit && (
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs leading-5 text-zinc-500">
              {pdfBankLabels[pdfAudit.bank]} · {pdfAudit.totalPages}{" "}
              {pdfAudit.totalPages === 1 ? "página" : "páginas"}
              {pdfAudit.usedOcr &&
                ` · lido por OCR${pdfAudit.ocrConfidence !== null ? ` (${Math.round(pdfAudit.ocrConfidence)}% de confiança)` : ""}`}
            </p>
          )}
        </motion.section>

        {summary.byCategory.length > 0 && (
          <AnalyticsPanel
            title="Por categoria"
            description="Compras que vão entrar"
            className="hidden md:flex"
          >
            <ul className="space-y-3">
              {summary.byCategory.slice(0, 6).map((category) => (
                <li key={category.name}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate text-zinc-300">{category.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                      {formatValue(category.amount)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        category.name === "Outros" ? "bg-zinc-500" : "bg-emerald-400",
                      )}
                      initial={false}
                      animate={{
                        width: `${largestCategory > 0 ? (category.amount / largestCategory) * 100 : 0}%`,
                      }}
                      transition={{ duration: 0.5, ease: dashboardEase }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {summary.byOwner.length > 1 && (
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-medium text-zinc-400">Por responsável</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {summary.byOwner.map((owner) => (
                    <li key={owner.name} className="flex justify-between gap-3">
                      <span className="truncate text-zinc-300">{owner.name}</span>
                      <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                        {formatValue(owner.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AnalyticsPanel>
        )}
      </aside>

      {/* Bottom bar: bulk edit while rows are selected, import otherwise. */}
      <div className="sticky bottom-24 z-40 xl:col-span-2 lg:bottom-4">
        <AnimatePresence mode="wait" initial={false}>
          {effectiveSelected.length > 0 ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: dashboardEase }}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.1] bg-zinc-900/95 p-2 pl-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div className="mr-auto min-w-0">
                <p className="text-sm font-medium text-zinc-100">
                  {effectiveSelected.length}{" "}
                  {effectiveSelected.length === 1 ? "selecionada" : "selecionadas"}
                </p>
                <p className="text-xs tabular-nums text-zinc-500">{formatValue(selectedTotal)}</p>
              </div>
              <Select
                value=""
                onValueChange={(value) => {
                  flow.setCategory(effectiveSelected, value === NO_CATEGORY ? null : value);
                  toast.success("Categoria aplicada.");
                }}
              >
                <SelectTrigger className="h-9 w-40 border-white/[0.08] bg-zinc-950 text-xs">
                  <SelectValue placeholder="Definir categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                  {flow.categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value=""
                onValueChange={(value) => {
                  flow.setOwner(effectiveSelected, value === ME ? null : value);
                  toast.success("Responsável atualizado.");
                }}
              >
                <SelectTrigger className="h-9 w-36 border-white/[0.08] bg-zinc-950 text-xs">
                  <SelectValue placeholder="De quem é" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ME}>Meu gasto</SelectItem>
                  {flow.dependents.map((dependent) => (
                    <SelectItem key={dependent.id} value={dependent.id}>
                      {dependent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  flow.setReviewStatus(effectiveSelected, "ignored");
                  setSelected([]);
                }}
                className="h-9 gap-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <X className="size-4" />
                Ignorar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Limpar seleção"
                onClick={() => setSelected([])}
                className="size-9 text-zinc-500 hover:text-zinc-100"
              >
                <RotateCcw className="size-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: dashboardEase }}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.1] bg-zinc-900/95 p-3 pl-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">
                  {summary.newCount} {summary.newCount === 1 ? "lançamento" : "lançamentos"} ·{" "}
                  <span className="tabular-nums">{formatValue(summary.totalAmount)}</span>
                </p>
                <p className={cn("truncate text-xs", blockers.length ? "text-amber-300" : "text-zinc-500")}>
                  {blockers[0] ??
                    `${flow.selectedCard?.name ?? "Cartão"} · fatura de ${formatInvoiceMonthLabel(flow.referenceMonth).toLocaleLowerCase("pt-BR")}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.resetImport()}
                  disabled={flow.isSubmitting}
                  className="h-10 flex-1 text-zinc-400 hover:text-zinc-100 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void flow.handleImport()}
                  disabled={
                    flow.isSubmitting ||
                    flow.isCheckingDuplicates ||
                    !flow.selectedCardId ||
                    summary.pendingReviewCount > 0 ||
                    summary.newCount === 0
                  }
                  className="h-10 flex-1 gap-2 bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300 sm:flex-none"
                >
                  {flow.isSubmitting || flow.isCheckingDuplicates ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {flow.isSubmitting ? "Importando..." : "Importar"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
