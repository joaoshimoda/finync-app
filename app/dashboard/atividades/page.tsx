"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CircleCheckBig,
  CirclePlus,
  FileClock,
  PencilLine,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Json, Tables } from "@/lib/database.types";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import {
  canRevertAuditLog,
  isUserFacingAuditLog,
} from "@/lib/auditReversion";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

type AuditLog = Tables<"audit_logs">;
type AuditAction = AuditLog["action"];
type EntityType = AuditLog["entity_type"];
type ActivityOrigin = AuditLog["origin"];

const entityPresentation: Record<
  EntityType,
  { singular: string; plural: string }
> = {
  transactions: { singular: "Transação", plural: "Transações" },
  cards: { singular: "Cartão", plural: "Cartões" },
  dependents: { singular: "Dependente", plural: "Dependentes" },
  categories: { singular: "Categoria", plural: "Categorias" },
  card_invoices: { singular: "Fatura", plural: "Faturas" },
  invoice_payments: {
    singular: "Pagamento de fatura",
    plural: "Pagamentos de fatura",
  },
  dependent_settlements: {
    singular: "Acerto de dependente",
    plural: "Acertos de dependentes",
  },
  category_budgets: { singular: "Orçamento", plural: "Orçamentos" },
  user_preferences: { singular: "Preferência", plural: "Preferências" },
};

const actionPresentation: Record<
  AuditAction,
  {
    label: string;
    icon: typeof CirclePlus;
    tone: string;
    badge: string;
  }
> = {
  CREATE: {
    label: "Criação",
    icon: CirclePlus,
    tone: "bg-emerald-500/10 text-emerald-400",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  UPDATE: {
    label: "Edição",
    icon: PencilLine,
    tone: "bg-amber-500/10 text-amber-300",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  DELETE: {
    label: "Exclusão",
    icon: Trash2,
    tone: "bg-rose-500/10 text-rose-300",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
};

const fieldLabels: Record<string, string> = {
  amount: "Valor",
  name: "Nome",
  label: "Nome",
  description: "Descrição",
  category: "Categoria",
  type: "Tipo",
  status: "Status",
  transaction_date: "Data",
  month_start: "Competência",
  billing_month: "Competência da fatura",
  due_date: "Vencimento",
  cycle_start: "Início do ciclo",
  cycle_end: "Fim do ciclo",
  paid_amount: "Valor pago",
  total_amount: "Valor total",
  posted_amount: "Valor lançado",
  limit_amount: "Limite",
  closing_day: "Dia de fechamento",
  due_day: "Dia de vencimento",
  recurring: "Recorrente",
  dependent_id: "Dependente",
  card_id: "Cartão",
  category_id: "Categoria",
  alert_threshold_percent: "Alerta",
  default_currency: "Moeda padrão",
  date_format: "Formato de data",
  hide_balances_by_default: "Ocultar saldos",
  invoice_reminder: "Lembrete de fatura",
  weekly_summary: "Resumo semanal",
  competence_month: "Competência",
  installment_number: "Parcela atual",
  installments_total: "Total de parcelas",
};

const fieldValueLabels: Record<string, Record<string, string>> = {
  status: {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    CONFIRMADO: "Confirmado",
    OPEN: "Em aberto",
    CLOSED: "Fechada",
    PARTIALLY_PAID: "Paga parcialmente",
    PAID: "Paga",
    CONFIRMED: "Confirmado",
    VOIDED: "Cancelado",
  },
  type: {
    card: "Cartão de crédito",
    fixed: "Débito ou Pix",
    income: "Receita",
  },
  method: {
    PIX: "Pix",
    DEBIT: "Débito",
    TRANSFER: "Transferência",
    CASH: "Dinheiro",
    OTHER: "Outro",
  },
};

const hiddenChangedFields = new Set([
  "id",
  "user_id",
  "actor_id",
  "created_at",
  "updated_at",
  "import_signature",
  "navigation_preferences",
  "invoice_id",
  "card_id",
  "dependent_id",
  "category_id",
  "group_id",
  "split_group_id",
  "legacy_key",
  "idempotency_key",
  "day",
  "month_label",
  "notes",
  "paid_at",
  "closed_at",
]);

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const activityDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const activityTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

type ActivityPresentation = {
  label: string;
  description: string;
  icon: typeof CirclePlus;
  tone: string;
  badge: string;
  consumedFields: Set<string>;
};

function toRecord(value: Json | null): Record<string, Json | undefined> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value;
}

function getLogName(log: AuditLog) {
  const snapshot = toRecord(log.after_data ?? log.before_data);
  const name = snapshot.description ?? snapshot.name ?? snapshot.label;

  if (typeof name === "string" && name.trim()) return name;

  if (log.entity_type === "card_invoices") {
    const billingMonth = snapshot.billing_month;
    if (typeof billingMonth === "string") {
      return `Fatura de ${dateFormatter.format(new Date(`${billingMonth}T12:00:00Z`))}`;
    }
  }

  return entityPresentation[log.entity_type].singular;
}

function getActivityDateKey(value: string) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getActivityDateLabel(value: string) {
  const formatted = activityDateFormatter.format(new Date(value));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getEffectiveActivityOrigin(log: AuditLog): ActivityOrigin {
  if (log.entity_type === "card_invoices") return "SYSTEM";

  if (log.entity_type === "transactions" && log.action === "UPDATE") {
    const snapshot = toRecord(log.after_data ?? log.before_data);
    const isSubscriptionStatusSync =
      snapshot.type === "card" &&
      snapshot.recurring === true &&
      log.changed_fields.length > 0 &&
      log.changed_fields.every((field) => field === "status");

    if (isSubscriptionStatusSync) return "SYSTEM";
  }

  return log.origin as ActivityOrigin;
}

function getActivityPresentation(
  log: AuditLog,
  formatCurrency: (value: number) => string,
): ActivityPresentation {
  const base = actionPresentation[log.action];
  const entity = entityPresentation[log.entity_type];
  const previousSnapshot = toRecord(log.before_data);
  const currentSnapshot = toRecord(log.after_data);
  const consumedFields = new Set<string>();

  if (log.entity_type === "card_invoices" && log.action === "UPDATE") {
    log.changed_fields.forEach((field) => consumedFields.add(field));
    const status = currentSnapshot.status;

    if (status === "PAID") {
      return {
        label: "Pagamento",
        description: "Pagamento consolidado na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (status === "PARTIALLY_PAID") {
      return {
        label: "Pagamento parcial",
        description: "Pagamento parcial consolidado na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    return {
      label: "Sincronização",
      description: "Total da fatura recalculado automaticamente",
      icon: RefreshCw,
      tone: "bg-zinc-800 text-zinc-400",
      badge: "border-zinc-700 bg-zinc-900 text-zinc-400",
      consumedFields,
    };
  }

  if (log.entity_type === "invoice_payments") {
    const amount = currentSnapshot.amount ?? previousSnapshot.amount;
    const formattedAmount =
      typeof amount === "number" ? ` de ${formatCurrency(amount)}` : "";

    if (log.action === "CREATE") {
      return {
        label: "Pagamento",
        description: `Pagamento${formattedAmount} registrado na fatura`,
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (log.action === "DELETE" || currentSnapshot.status === "VOIDED") {
      consumedFields.add("status");
      return {
        label: "Cancelamento",
        description: `Pagamento${formattedAmount} cancelado`,
        icon: Undo2,
        tone: "bg-amber-500/10 text-amber-300",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        consumedFields,
      };
    }
  }

  if (
    log.entity_type === "transactions" &&
    log.action === "UPDATE" &&
    log.changed_fields.includes("status")
  ) {
    consumedFields.add("status");
    const previousStatus = previousSnapshot.status;
    const currentStatus = currentSnapshot.status;
    const transactionType = currentSnapshot.type ?? previousSnapshot.type;
    const isRecurring = currentSnapshot.recurring ?? previousSnapshot.recurring;

    if (currentStatus === "PAGO") {
      return {
        label: "Pagamento",
        description: "Conta marcada como paga",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (previousStatus === "PAGO" && currentStatus === "PENDENTE") {
      return {
        label: "Reabertura",
        description: "Pagamento desfeito; conta novamente pendente",
        icon: Undo2,
        tone: "bg-amber-500/10 text-amber-300",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        consumedFields,
      };
    }

    if (currentStatus === "CONFIRMADO" && transactionType === "income") {
      return {
        label: "Confirmação",
        description: "Receita confirmada",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    if (
      currentStatus === "CONFIRMADO" &&
      transactionType === "card" &&
      isRecurring === true
    ) {
      return {
        label: "Cobrança",
        description: "Assinatura lançada na fatura",
        icon: CircleCheckBig,
        tone: "bg-emerald-500/10 text-emerald-400",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        consumedFields,
      };
    }

    const statusLabel =
      typeof currentStatus === "string"
        ? (fieldValueLabels.status[currentStatus] ?? currentStatus)
        : "atualizado";

    return {
      label: "Status",
      description: `Status alterado para ${statusLabel.toLowerCase()}`,
      icon: PencilLine,
      tone: base.tone,
      badge: base.badge,
      consumedFields,
    };
  }

  return {
    ...base,
    description: `${entity.singular} · ${base.label.toLowerCase()}`,
    consumedFields,
  };
}

function formatChangedValue(
  field: string,
  value: Json | undefined,
  formatCurrency: (value: number) => string,
) {
  if (value === null || value === undefined || value === "") return "Vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (typeof value === "string" && fieldValueLabels[field]?.[value]) {
    return fieldValueLabels[field][value];
  }

  if (
    typeof value === "number" &&
    ["amount", "paid_amount", "posted_amount", "total_amount", "limit_amount"].includes(
      field,
    )
  ) {
    return formatCurrency(value);
  }

  if (
    typeof value === "string" &&
    (field.endsWith("_date") ||
      field.endsWith("_month") ||
      field === "month_start" ||
      field === "cycle_start" ||
      field === "cycle_end")
  ) {
    const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return dateFormatter.format(parsed);
  }

  if (Array.isArray(value)) return value.map(String).join(", ") || "Vazio";
  if (typeof value === "object") return "Dados estruturados alterados";
  return String(value);
}

function getReversionErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (message.includes("FINYNC_REVERT_STALE")) {
    return "Esse registro recebeu novas alterações e não pode mais ser desfeito por aqui.";
  }
  if (message.includes("FINYNC_REVERT_ALREADY_REVERTED")) {
    return "Essa alteração já foi desfeita.";
  }
  if (message.includes("FINYNC_REVERT_TARGET_MISSING")) {
    return "O registro original não existe mais.";
  }
  if (message.includes("FINYNC_REVERT_TARGET_EXISTS")) {
    return "Já existe um registro ocupando o lugar do item excluído.";
  }
  if (message.includes("FINYNC_REVERT_GROUPED_TRANSACTION")) {
    return "Parcelas, recorrências e gastos divididos precisam ser corrigidos pelo fluxo do grupo.";
  }
  if (message.includes("FINYNC_REVERT_DEPENDENCY_MISSING")) {
    return "Um cartão, dependente ou categoria necessário para restaurar esse registro não existe mais.";
  }
  if (message.includes("FINYNC_REVERT_UNSUPPORTED")) {
    return "Essa operação não pode ser desfeita com segurança.";
  }

  return "Não foi possível desfazer essa alteração.";
}

function AuditFieldChange({
  field,
  previousSnapshot,
  currentSnapshot,
  formatCurrency,
}: {
  field: string;
  previousSnapshot: Record<string, Json | undefined>;
  currentSnapshot: Record<string, Json | undefined>;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <span className="font-medium text-zinc-400">
        {fieldLabels[field] ?? field}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-zinc-500">
          {formatChangedValue(
            field,
            previousSnapshot[field],
            formatCurrency,
          )}
        </span>
        <span aria-hidden="true" className="text-zinc-700">
          →
        </span>
        <span className="min-w-0 break-words font-medium text-zinc-200">
          {formatChangedValue(
            field,
            currentSnapshot[field],
            formatCurrency,
          )}
        </span>
      </div>
    </div>
  );
}

function AuditChangeDetails({
  fields,
  previousSnapshot,
  currentSnapshot,
  formatCurrency,
}: {
  fields: string[];
  previousSnapshot: Record<string, Json | undefined>;
  currentSnapshot: Record<string, Json | undefined>;
  formatCurrency: (value: number) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!fields.length) return null;

  if (fields.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
        <AuditFieldChange
          field={fields[0]}
          previousSnapshot={previousSnapshot}
          currentSnapshot={currentSnapshot}
          formatCurrency={formatCurrency}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-between gap-3 px-3 text-left text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          {fields.length} {fields.length === 1 ? "alteração" : "alterações"}
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500">
          {isOpen ? "Ocultar" : "Ver alterações"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="divide-y divide-zinc-800/80 border-t border-zinc-800/80">
          {fields.map((field) => (
            <AuditFieldChange
              key={field}
              field={field}
              previousSnapshot={previousSnapshot}
              currentSnapshot={currentSnapshot}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AtividadesPage() {
  const { formatCurrency } = useCurrencyFormatter();
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchPreferences = useFinanceStore((state) => state.fetchPreferences);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [entityFilter, setEntityFilter] = useState<EntityType | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [periodFilter, setPeriodFilter] = useState("30");
  const [originFilter, setOriginFilter] = useState<ActivityOrigin>("USER");
  const [logToRevert, setLogToRevert] = useState<AuditLog | null>(null);
  const [revertingLogId, setRevertingLogId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) throw error;
      setLogs(data ?? []);
      setLoadedAt(Date.now());
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Carregar histórico de alterações" },
      });
      toast.error("Não foi possível carregar o histórico de alterações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAuditLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchAuditLogs]);

  const handleRevert = useCallback(async () => {
    if (!logToRevert || revertingLogId) return;

    setRevertingLogId(logToRevert.id);

    try {
      const { error } = await supabase.rpc("finync_revert_audit_log", {
        selected_audit_log_id: logToRevert.id,
      });

      if (error) throw error;

      toast.success(
        logToRevert.action === "DELETE"
          ? "Registro restaurado."
          : "Alteração desfeita.",
      );
      setLogToRevert(null);

      await Promise.all([
        fetchCards(),
        fetchCategories(),
        fetchDependents(),
        fetchPreferences(),
        fetchTransactions(),
        fetchAuditLogs(),
      ]);
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Desfazer alteração do histórico" },
      });
      toast.error(getReversionErrorMessage(error));
      await fetchAuditLogs();
    } finally {
      setRevertingLogId(null);
    }
  }, [
    fetchAuditLogs,
    fetchCards,
    fetchCategories,
    fetchDependents,
    fetchPreferences,
    fetchTransactions,
    logToRevert,
    revertingLogId,
  ]);

  const filteredLogs = useMemo(() => {
    const cutoff =
      periodFilter === "all" || loadedAt === null
        ? null
        : loadedAt - Number(periodFilter) * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      if (!isUserFacingAuditLog(log)) return false;
      if (getEffectiveActivityOrigin(log) !== originFilter) return false;
      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (cutoff && new Date(log.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [
    actionFilter,
    entityFilter,
    loadedAt,
    logs,
    originFilter,
    periodFilter,
  ]);

  const groupedLogs = useMemo(() => {
    const groups: Array<{ key: string; label: string; logs: AuditLog[] }> = [];

    filteredLogs.forEach((log) => {
      const key = getActivityDateKey(log.created_at);
      const currentGroup = groups.at(-1);

      if (currentGroup?.key === key) {
        currentGroup.logs.push(log);
        return;
      }

      groups.push({
        key,
        label: getActivityDateLabel(log.created_at),
        logs: [log],
      });
    });

    return groups;
  }, [filteredLogs]);

  const latestLogByEntity = useMemo(() => {
    const latest = new Map<string, string>();

    logs.forEach((log) => {
      const key = `${log.entity_type}:${log.entity_id}`;
      if (!latest.has(key)) latest.set(key, log.id);
    });

    return latest;
  }, [logs]);

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      data-tour="activity-dashboard"
    >
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Histórico
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Atividades
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Consulte suas alterações e desfaça ações individuais quando for
            seguro.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 border-zinc-700 bg-zinc-950 px-4 text-zinc-100 hover:bg-zinc-900"
          onClick={() => void fetchAuditLogs()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          {isLoading ? "Atualizando..." : "Atualizar"}
        </Button>
      </header>

      <section className="flex flex-col gap-4" aria-label="Filtros do histórico">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex w-full rounded-lg border border-zinc-800 bg-zinc-950 p-1 sm:w-auto">
            <button
              type="button"
              className={cn(
                "h-9 flex-1 rounded-md px-4 text-sm font-medium transition-colors sm:flex-none",
                originFilter === "USER"
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
              onClick={() => setOriginFilter("USER")}
            >
              Minhas ações
            </button>
            <button
              type="button"
              className={cn(
                "h-9 flex-1 rounded-md px-4 text-sm font-medium transition-colors sm:flex-none",
                originFilter === "SYSTEM"
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
              onClick={() => setOriginFilter("SYSTEM")}
            >
              Automáticas
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            {filteredLogs.length} {filteredLogs.length === 1 ? "evento" : "eventos"}
          </p>
        </div>

        {originFilter === "SYSTEM" ? (
          <p className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs leading-5 text-zinc-400">
            Atualizações automáticas mantêm faturas e projeções sincronizadas.
            Elas ficam separadas e não podem ser desfeitas manualmente.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            value={entityFilter}
            onValueChange={(value) =>
              setEntityFilter(value as EntityType | "all")
            }
          >
            <SelectTrigger className="h-10 border-zinc-800 bg-zinc-950">
              <SelectValue placeholder="Todas as áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {Object.entries(entityPresentation).map(([value, presentation]) => (
                <SelectItem key={value} value={value}>
                  {presentation.plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={actionFilter}
            onValueChange={(value) =>
              setActionFilter(value as AuditAction | "all")
            }
          >
            <SelectTrigger className="h-10 border-zinc-800 bg-zinc-950">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="CREATE">Criações</SelectItem>
              <SelectItem value="UPDATE">Edições</SelectItem>
              <SelectItem value="DELETE">Exclusões</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="h-10 border-zinc-800 bg-zinc-950">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o histórico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section aria-labelledby="activity-feed-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="activity-feed-title" className="text-base font-semibold text-zinc-100">
              {originFilter === "USER" ? "Suas alterações" : "Atualizações do sistema"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Registros mais recentes primeiro
            </p>
          </div>
        </div>

        {isLoading && !logs.length ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : groupedLogs.length ? (
          <div className="space-y-7">
            {groupedLogs.map((group) => (
              <section key={group.key} aria-labelledby={`activity-date-${group.key}`}>
                <div className="mb-2 flex items-center gap-3 px-1">
                  <h3
                    id={`activity-date-${group.key}`}
                    className="text-xs font-semibold text-zinc-300"
                  >
                    {group.label}
                  </h3>
                  <span className="h-px flex-1 bg-zinc-800/80" />
                  <span className="text-[11px] text-zinc-600">
                    {group.logs.length}
                  </span>
                </div>

                <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
                  {group.logs.map((log) => {
                    const activity = getActivityPresentation(
                      log,
                      formatCurrency,
                    );
                    const Icon = activity.icon;
                    const previousSnapshot = toRecord(log.before_data);
                    const currentSnapshot = toRecord(log.after_data);
                    const visibleFields = log.changed_fields.filter(
                      (field) =>
                        !hiddenChangedFields.has(field) &&
                        !activity.consumedFields.has(field),
                    );
                    const entityKey = `${log.entity_type}:${log.entity_id}`;
                    const canRevert =
                      latestLogByEntity.get(entityKey) === log.id &&
                      canRevertAuditLog(log);

                    return (
                      <article
                        key={log.id}
                        className="px-4 py-4 transition-colors hover:bg-zinc-900/35 sm:px-5"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              activity.tone,
                            )}
                          >
                            <Icon className="size-4" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate text-sm font-semibold text-zinc-100">
                                    {getLogName(log)}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className={cn("border", activity.badge)}
                                  >
                                    {activity.label}
                                  </Badge>
                                  {log.reverted_at ? (
                                    <Badge
                                      variant="outline"
                                      className="border-zinc-700 bg-zinc-900 text-zinc-400"
                                    >
                                      Desfeito
                                    </Badge>
                                  ) : null}
                                  {log.reverts_log_id ? (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    >
                                      Reversão
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {activity.description} às{" "}
                                  <time dateTime={log.created_at}>
                                    {activityTimeFormatter.format(
                                      new Date(log.created_at),
                                    )}
                                  </time>
                                </p>
                              </div>

                              {canRevert ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 shrink-0 border-zinc-700 bg-zinc-950 px-3 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                                  onClick={() => setLogToRevert(log)}
                                  disabled={revertingLogId !== null}
                                >
                                  <Undo2 className="size-4" />
                                  Desfazer
                                </Button>
                              ) : null}
                            </div>

                            {log.action === "UPDATE" ? (
                              <AuditChangeDetails
                                fields={visibleFields}
                                previousSnapshot={previousSnapshot}
                                currentSnapshot={currentSnapshot}
                                formatCurrency={formatCurrency}
                              />
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center border-y border-zinc-800/80 px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
              <FileClock className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-zinc-100">
              Nenhuma atividade encontrada
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {originFilter === "USER"
                ? "Suas próximas criações, edições e exclusões aparecerão aqui."
                : "Nenhuma atualização automática foi registrada com esses filtros."}
            </p>
          </div>
        )}
      </section>

      <AlertDialog
        open={logToRevert !== null}
        onOpenChange={(open) => {
          if (!open && !revertingLogId) setLogToRevert(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logToRevert?.action === "DELETE"
                ? "Restaurar registro?"
                : "Desfazer alteração?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logToRevert?.action === "DELETE"
                ? `${logToRevert ? getLogName(logToRevert) : "O registro"} será restaurado com os dados anteriores à exclusão.`
                : `${logToRevert ? getLogName(logToRevert) : "O registro"} voltará ao estado anterior a esta edição.`}
              {" "}A ação será registrada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={revertingLogId !== null}
              >
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => void handleRevert()}
                disabled={revertingLogId !== null}
              >
                <Undo2 className={cn("size-4", revertingLogId && "animate-pulse")} />
                {revertingLogId
                  ? "Processando..."
                  : logToRevert?.action === "DELETE"
                    ? "Restaurar"
                    : "Desfazer"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
