"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig, motion } from "framer-motion";
import { FileClock, History, RefreshCw, Search, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { ActivityChart } from "@/components/activity/ActivityChart";
import { ActivityRow, BurstRow } from "@/components/activity/ActivityRows";
import {
  entityPresentation,
  getActivityDateLabel,
  getDisplayName,
  getEffectiveActivityOrigin,
  getReversionErrorMessage,
  type ActivityOrigin,
  type AuditAction,
  type AuditLog,
  type EntityType,
} from "@/components/activity/activityPresentation";
import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
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
import { Skeleton } from "@/components/ui/skeleton";
import { countByDay, getDayKey, groupBursts, matchesSearch } from "@/lib/activityFeed";
import { canRevertAuditLog, isUserFacingAuditLog } from "@/lib/auditReversion";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const LOG_LIMIT = 250;
const CHART_DAYS = 30;

const periodOptions = [
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "all", label: "Tudo" },
];

const actionOptions: Array<{ id: AuditAction | "all"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "CREATE", label: "Criações" },
  { id: "UPDATE", label: "Edições" },
  { id: "DELETE", label: "Exclusões" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
          : "border-white/[0.08] text-zinc-400 hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

export default function AtividadesPage() {
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const fetchPreferences = useFinanceStore((state) => state.fetchPreferences);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [origin, setOrigin] = useState<ActivityOrigin>("USER");
  const [entityFilter, setEntityFilter] = useState<EntityType | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [period, setPeriod] = useState("30");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [logToRevert, setLogToRevert] = useState<AuditLog | null>(null);
  const [revertingLogId, setRevertingLogId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(LOG_LIMIT);

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
    const timeoutId = window.setTimeout(() => void fetchAuditLogs(), 0);
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

      toast.success(logToRevert.action === "DELETE" ? "Registro restaurado." : "Alteração desfeita.");
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

  /* Only the newest log of a record may be undone. */
  const latestLogByEntity = useMemo(() => {
    const latest = new Map<string, string>();
    logs.forEach((log) => {
      const key = `${log.entity_type}:${log.entity_id}`;
      if (!latest.has(key)) latest.set(key, log.id);
    });
    return latest;
  }, [logs]);

  const canRevert = useCallback(
    (log: AuditLog) =>
      latestLogByEntity.get(`${log.entity_type}:${log.entity_id}`) === log.id &&
      canRevertAuditLog(log),
    [latestLogByEntity],
  );

  const originLogs = useMemo(
    () =>
      logs.filter(
        (log) => isUserFacingAuditLog(log) && getEffectiveActivityOrigin(log) === origin,
      ),
    [logs, origin],
  );

  /* Period, search and action narrow the list; the area chips count what
     is left so they never promise results that are not there. */
  const baseFiltered = useMemo(() => {
    const cutoff =
      period === "all" || loadedAt === null ? null : loadedAt - Number(period) * 86_400_000;

    return originLogs.filter(
      (log) =>
        (selectedDay
          ? getDayKey(log.created_at) === selectedDay
          : !cutoff || new Date(log.created_at).getTime() >= cutoff) &&
        (actionFilter === "all" || log.action === actionFilter) &&
        matchesSearch(log, query),
    );
  }, [actionFilter, loadedAt, originLogs, period, query, selectedDay]);

  const entityCounts = useMemo(() => {
    const counts = new Map<EntityType, number>();
    baseFiltered.forEach((log) => counts.set(log.entity_type, (counts.get(log.entity_type) ?? 0) + 1));
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [baseFiltered]);

  const filtered = useMemo(
    () =>
      entityFilter === "all"
        ? baseFiltered
        : baseFiltered.filter((log) => log.entity_type === entityFilter),
    [baseFiltered, entityFilter],
  );

  const dayGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; count: number; logs: AuditLog[] }> = [];
    filtered.forEach((log) => {
      const key = getDayKey(log.created_at);
      const current = groups.at(-1);
      if (current?.key === key) {
        current.logs.push(log);
        current.count += 1;
      } else {
        groups.push({ key, label: getActivityDateLabel(log.created_at), count: 1, logs: [log] });
      }
    });
    return groups.map((group) => ({ ...group, items: groupBursts(group.logs) }));
  }, [filtered]);

  const chartDays = useMemo(() => countByDay(originLogs, CHART_DAYS), [originLogs]);

  const weekStats = useMemo(() => {
    const cutoff = (loadedAt ?? 0) - 7 * 86_400_000;
    const week = originLogs.filter((log) => new Date(log.created_at).getTime() >= cutoff);
    return {
      total: week.length,
      create: week.filter((log) => log.action === "CREATE").length,
      update: week.filter((log) => log.action === "UPDATE").length,
      delete: week.filter((log) => log.action === "DELETE").length,
      reverted: week.filter((log) => log.reverts_log_id).length,
    };
  }, [loadedAt, originLogs]);

  const hasFilters =
    Boolean(query) || Boolean(selectedDay) || entityFilter !== "all" || actionFilter !== "all";

  function clearFilters() {
    setQuery("");
    setSelectedDay(null);
    setEntityFilter("all");
    setActionFilter("all");
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        data-tour="activity-dashboard"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header
          variants={dashboardReveal}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              <History className="size-3.5" />
              Histórico
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Atividades
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Tudo o que mudou na sua conta, com a opção de desfazer quando é seguro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.07] bg-zinc-900/50 p-0.5">
              {(["USER", "SYSTEM"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setOrigin(value);
                    setSelectedDay(null);
                  }}
                  aria-pressed={origin === value}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    origin === value ? "bg-white/[0.08] text-zinc-50" : "text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  {value === "USER" ? "Minhas ações" : "Automáticas"}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Atualizar"
              onClick={() => void fetchAuditLogs()}
              disabled={isLoading}
              className="size-9 border-white/[0.08] bg-zinc-900/70 text-zinc-300 hover:bg-white/[0.06]"
            >
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </motion.header>

        <motion.section
          variants={dashboardReveal}
          aria-label="Resumo de atividade"
          className={cn(dashboardPanelClassName, "grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-end")}
        >
          <div>
            <p className="text-xs text-zinc-500">Últimos 7 dias</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-50">
              {weekStats.total}
              <span className="ml-2 text-sm font-normal tracking-normal text-zinc-500">
                {weekStats.total === 1 ? "evento" : "eventos"}
              </span>
            </p>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Criadas", value: weekStats.create, tone: "text-emerald-300" },
                { label: "Editadas", value: weekStats.update, tone: "text-amber-300" },
                { label: "Excluídas", value: weekStats.delete, tone: "text-rose-300" },
                { label: "Desfeitas", value: weekStats.reverted, tone: "text-sky-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-white/[0.03] px-1 py-2">
                  <dd className={cn("text-base font-semibold tabular-nums", stat.tone)}>{stat.value}</dd>
                  <dt className="text-[10px] text-zinc-500">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="mb-3 text-xs text-zinc-500">
              {selectedDay
                ? "Mostrando só o dia selecionado · toque de novo para limpar"
                : `Atividade nos últimos ${CHART_DAYS} dias · toque em um dia para filtrar`}
            </p>
            <ActivityChart days={chartDays} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          </div>
        </motion.section>

        {origin === "SYSTEM" && (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-zinc-400">
            Atualizações automáticas mantêm faturas e assinaturas sincronizadas. Elas
            ficam separadas e não podem ser desfeitas manualmente.
          </p>
        )}

        <motion.section variants={dashboardReveal} aria-label="Filtros" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou categoria"
                aria-label="Buscar no histórico"
                className="h-10 w-full rounded-lg border border-white/[0.07] bg-zinc-900/50 pr-3 pl-9 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-400/40 [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
              {periodOptions.map((option) => (
                <Chip
                  key={option.id}
                  active={!selectedDay && period === option.id}
                  onClick={() => {
                    setPeriod(option.id);
                    setSelectedDay(null);
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {actionOptions.map((option) => (
              <Chip
                key={option.id}
                active={actionFilter === option.id}
                onClick={() => setActionFilter(option.id)}
              >
                {option.label}
              </Chip>
            ))}
            {entityCounts.length > 1 && <span className="mx-1 h-4 w-px bg-white/[0.08]" aria-hidden />}
            {entityCounts.length > 1 &&
              entityCounts.map(([entity, count]) => (
                <Chip
                  key={entity}
                  active={entityFilter === entity}
                  onClick={() => setEntityFilter(entityFilter === entity ? "all" : entity)}
                >
                  {entityPresentation[entity].plural}
                  <span className="ml-1.5 tabular-nums text-zinc-500">{count}</span>
                </Chip>
              ))}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200"
              >
                <X className="size-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        </motion.section>

        <motion.section variants={dashboardReveal} aria-label="Linha do tempo">
          {isLoading && !logs.length ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : dayGroups.length ? (
            <div className={cn("flex flex-col gap-6 transition-opacity", isLoading && "opacity-70")}>
              {dayGroups.map((group) => (
                <section key={group.key} aria-labelledby={`day-${group.key}`}>
                  <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-3 bg-background/85 px-1 py-1.5 backdrop-blur">
                    <h2 id={`day-${group.key}`} className="text-xs font-semibold text-zinc-300">
                      {group.label}
                    </h2>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[11px] tabular-nums text-zinc-600">
                      {group.count} {group.count === 1 ? "evento" : "eventos"}
                    </span>
                  </div>
                  <div className={cn(dashboardPanelClassName, "divide-y divide-white/[0.05] overflow-hidden")}>
                    {group.items.map((item) =>
                      item.kind === "burst" ? (
                        <BurstRow
                          key={item.id}
                          logs={item.logs}
                          canRevert={canRevert}
                          revertingId={revertingLogId}
                          onRevert={setLogToRevert}
                        />
                      ) : (
                        <ActivityRow
                          key={item.log.id}
                          log={item.log}
                          canRevert={canRevert(item.log)}
                          isReverting={revertingLogId !== null}
                          onRevert={() => setLogToRevert(item.log)}
                        />
                      ),
                    )}
                  </div>
                </section>
              ))}
              {logs.length >= LOG_LIMIT && (
                <p className="text-center text-xs text-zinc-600">
                  Mostrando as {LOG_LIMIT} alterações mais recentes.
                </p>
              )}
            </div>
          ) : (
            <div className={cn(dashboardPanelClassName, "flex flex-col items-center px-6 py-14 text-center")}>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-500">
                <FileClock className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-zinc-100">Nada por aqui</h2>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
                {hasFilters
                  ? "Nenhuma atividade com esses filtros."
                  : origin === "USER"
                    ? "Suas próximas criações, edições e exclusões aparecem aqui."
                    : "Nenhuma atualização automática neste período."}
              </p>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  className="mt-4 text-zinc-300 hover:text-zinc-50"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </motion.section>
      </motion.div>

      <AlertDialog
        open={logToRevert !== null}
        onOpenChange={(open) => {
          if (!open && !revertingLogId) setLogToRevert(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logToRevert?.action === "DELETE" ? "Restaurar registro?" : "Desfazer alteração?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logToRevert?.action === "DELETE"
                ? `${logToRevert ? getDisplayName(logToRevert) : "O registro"} será restaurado com os dados anteriores à exclusão.`
                : `${logToRevert ? getDisplayName(logToRevert) : "O registro"} voltará ao estado anterior a esta edição.`}{" "}
              A ação também fica registrada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={revertingLogId !== null}>
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
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
    </MotionConfig>
  );
}
