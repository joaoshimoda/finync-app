"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
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
import { Card, CardContent } from "@/components/ui/card";
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
import { canRevertAuditLog } from "@/lib/auditReversion";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

type AuditLog = Tables<"audit_logs">;
type AuditAction = AuditLog["action"];
type EntityType = AuditLog["entity_type"];

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
    verb: string;
    icon: typeof CirclePlus;
    tone: string;
    badge: string;
  }
> = {
  CREATE: {
    label: "Criação",
    verb: "criado",
    icon: CirclePlus,
    tone: "bg-emerald-500/10 text-emerald-400",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  UPDATE: {
    label: "Edição",
    verb: "atualizado",
    icon: PencilLine,
    tone: "bg-amber-500/10 text-amber-300",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  DELETE: {
    label: "Exclusão",
    verb: "excluído",
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

const hiddenChangedFields = new Set([
  "id",
  "user_id",
  "actor_id",
  "created_at",
  "updated_at",
  "import_signature",
]);

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

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

function formatChangedValue(
  field: string,
  value: Json | undefined,
  formatCurrency: (value: number) => string,
) {
  if (value === null || value === undefined || value === "") return "Vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";

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
      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (cutoff && new Date(log.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [actionFilter, entityFilter, loadedAt, logs, periodFilter]);

  const summary = useMemo(
    () => ({
      total: filteredLogs.length,
      created: filteredLogs.filter((log) => log.action === "CREATE").length,
      updated: filteredLogs.filter((log) => log.action === "UPDATE").length,
      deleted: filteredLogs.filter((log) => log.action === "DELETE").length,
    }),
    [filteredLogs],
  );

  const latestLogByEntity = useMemo(() => {
    const latest = new Map<string, string>();

    logs.forEach((log) => {
      const key = `${log.entity_type}:${log.entity_id}`;
      if (!latest.has(key)) latest.set(key, log.id);
    });

    return latest;
  }, [logs]);

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8" data-tour="activity-dashboard">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Rastreabilidade
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Histórico de Alterações
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Acompanhe mudanças financeiras feitas na sua conta e identifique o
            que foi alterado.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 border-zinc-700 bg-zinc-950 px-5 text-zinc-100"
          onClick={() => void fetchAuditLogs()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          {isLoading ? "Atualizando..." : "Atualizar histórico"}
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Eventos", value: summary.total, icon: Activity, tone: "text-zinc-100" },
          { label: "Criações", value: summary.created, icon: CirclePlus, tone: "text-emerald-300" },
          { label: "Edições", value: summary.updated, icon: PencilLine, tone: "text-amber-300" },
          { label: "Exclusões", value: summary.deleted, icon: Trash2, tone: "text-rose-300" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-xl border-zinc-800/80 bg-zinc-950/70 shadow-none">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                    {item.label}
                  </p>
                  <Icon className="size-4 text-zinc-500" />
                </div>
                <strong className={cn("mt-3 block text-xl", item.tone)}>{item.value}</strong>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:grid-cols-3 sm:p-4">
        <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as EntityType | "all")}>
          <SelectTrigger className="h-11 border-zinc-800 bg-zinc-950">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {Object.entries(entityPresentation).map(([value, presentation]) => (
              <SelectItem key={value} value={value}>{presentation.plural}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as AuditAction | "all")}>
          <SelectTrigger className="h-11 border-zinc-800 bg-zinc-950">
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
          <SelectTrigger className="h-11 border-zinc-800 bg-zinc-950">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o histórico</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <Card className="overflow-hidden rounded-xl border-zinc-800/80 bg-zinc-950 shadow-none">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Linha do tempo</h2>
            <p className="mt-1 text-xs text-zinc-500">Registros mais recentes primeiro</p>
          </div>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            {filteredLogs.length}
          </Badge>
        </div>

        {isLoading && !logs.length ? (
          <CardContent className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-lg" />
            ))}
          </CardContent>
        ) : filteredLogs.length ? (
          <div className="divide-y divide-zinc-800/80">
            {filteredLogs.map((log) => {
              const action = actionPresentation[log.action];
              const entity = entityPresentation[log.entity_type];
              const Icon = action.icon;
              const previousSnapshot = toRecord(log.before_data);
              const currentSnapshot = toRecord(log.after_data);
              const visibleFields = log.changed_fields.filter(
                (field) => !hiddenChangedFields.has(field),
              );
              const entityKey = `${log.entity_type}:${log.entity_id}`;
              const canRevert =
                latestLogByEntity.get(entityKey) === log.id &&
                canRevertAuditLog(log);

              return (
                <article key={log.id} className="px-4 py-5 transition-colors hover:bg-zinc-900/40 sm:px-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", action.tone)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-zinc-100">
                              {getLogName(log)}
                            </h3>
                            <Badge variant="outline" className={cn("border", action.badge)}>
                              {action.label}
                            </Badge>
                            {log.origin === "SYSTEM" ? (
                              <Badge variant="outline" className="border-zinc-700 text-zinc-500">Automático</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {entity.singular} {action.verb}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
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
                          <time className="text-xs text-zinc-500" dateTime={log.created_at}>
                            {dateTimeFormatter.format(new Date(log.created_at))}
                          </time>
                          {canRevert ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 border-zinc-700 bg-zinc-950 px-3 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                              onClick={() => setLogToRevert(log)}
                              disabled={revertingLogId !== null}
                            >
                              <Undo2 className="size-4" />
                              Desfazer
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {log.action === "UPDATE" && visibleFields.length ? (
                        <details className="group mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80">
                          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-medium text-zinc-400 hover:text-zinc-200">
                            <span>{visibleFields.length} campo{visibleFields.length === 1 ? "" : "s"} alterado{visibleFields.length === 1 ? "" : "s"}</span>
                            <span className="text-zinc-600 group-open:hidden">Ver detalhes</span>
                            <span className="hidden text-zinc-600 group-open:inline">Ocultar</span>
                          </summary>
                          <div className="divide-y divide-zinc-800 border-t border-zinc-800">
                            {visibleFields.map((field) => (
                              <div key={field} className="grid gap-1 px-3 py-3 text-xs sm:grid-cols-[150px_1fr_20px_1fr] sm:items-center sm:gap-3">
                                <span className="font-medium text-zinc-400">{fieldLabels[field] ?? field}</span>
                                <span className="min-w-0 break-words text-zinc-500">{formatChangedValue(field, previousSnapshot[field], formatCurrency)}</span>
                                <span className="hidden text-center text-zinc-700 sm:block">→</span>
                                <span className="min-w-0 break-words text-zinc-200">{formatChangedValue(field, currentSnapshot[field], formatCurrency)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
              <FileClock className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-zinc-100">Nenhuma alteração encontrada</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Novas criações, edições e exclusões aparecerão aqui. Ajuste os filtros para consultar outro período.
            </p>
          </CardContent>
        )}
      </Card>

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
