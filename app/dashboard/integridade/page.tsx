"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type DataHealthCheck =
  Database["public"]["Functions"]["finync_get_data_health"]["Returns"][number];

const reviewRoutes: Partial<Record<string, string>> = {
  transactions_without_category:
    "/dashboard/transactions?review=missing-category",
  transactions_with_unknown_category:
    "/dashboard/transactions?review=unknown-category",
};

const severityPresentation = {
  warning: {
    label: "Atenção",
    icon: AlertTriangle,
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    iconBox: "bg-amber-500/10 text-amber-300",
  },
  error: {
    label: "Erro",
    icon: CircleAlert,
    badge: "border-orange-500/25 bg-orange-500/10 text-orange-300",
    iconBox: "bg-orange-500/10 text-orange-300",
  },
  critical: {
    label: "Crítico",
    icon: ShieldAlert,
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    iconBox: "bg-rose-500/10 text-rose-300",
  },
} as const;

function getSeverityPresentation(severity: string) {
  return (
    severityPresentation[severity as keyof typeof severityPresentation] ??
    severityPresentation.warning
  );
}

export default function IntegridadePage() {
  const [checks, setChecks] = useState<DataHealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const fetchHealthChecks = useCallback(async () => {
    setIsLoading(true);

    try {
      const healthResult = await supabase.rpc("finync_get_data_health");

      if (healthResult.error) throw healthResult.error;

      setChecks(healthResult.data ?? []);
      setLastCheckedAt(new Date());
    } catch (error) {
      console.error("Erro ao verificar integridade dos dados:", error);
      toast.error("Não foi possível verificar a integridade dos dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchHealthChecks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHealthChecks]);

  const summary = useMemo(() => {
    const activeChecks = checks.filter((check) => check.issue_count > 0);

    return {
      activeChecks,
      affectedRecords: activeChecks.reduce(
        (total, check) => total + check.issue_count,
        0,
      ),
      critical: activeChecks
        .filter((check) => check.severity === "critical")
        .reduce((total, check) => total + check.issue_count, 0),
      errors: activeChecks
        .filter((check) => check.severity === "error")
        .reduce((total, check) => total + check.issue_count, 0),
      warnings: activeChecks
        .filter((check) => check.severity === "warning")
        .reduce((total, check) => total + check.issue_count, 0),
    };
  }, [checks]);

  const isHealthy = !isLoading && summary.affectedRecords === 0;

  return (
    <div
      className="flex w-full flex-col gap-6 md:gap-8"
      data-tour="integrity-dashboard"
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Diagnóstico financeiro
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Integridade dos Dados
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Verifique vínculos, parcelas, faturas, pagamentos e cadastros sem
            alterar seus lançamentos.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 border-zinc-700 bg-zinc-950 px-5 text-zinc-100"
          onClick={() => void fetchHealthChecks()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          {isLoading ? "Verificando..." : "Verificar novamente"}
        </Button>
      </header>

      {isLoading && !checks.length ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : (
        <Card
          className={cn(
            "rounded-xl shadow-none",
            isHealthy
              ? "border-emerald-500/20 bg-emerald-500/[0.045]"
              : "border-amber-500/20 bg-amber-500/[0.04]",
          )}
        >
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg",
                  isHealthy
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-amber-500/10 text-amber-300",
                )}
              >
                {isHealthy ? (
                  <CircleCheck className="size-5" />
                ) : (
                  <ShieldAlert className="size-5" />
                )}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-50 sm:text-lg">
                  {isHealthy
                    ? "Tudo em ordem"
                    : `${summary.activeChecks.length} ${summary.activeChecks.length === 1 ? "ponto precisa" : "pontos precisam"} de revisão`}
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  {isHealthy
                    ? `${checks.length} verificações concluídas sem divergências.`
                    : `${summary.affectedRecords} ${summary.affectedRecords === 1 ? "registro foi encontrado" : "registros foram encontrados"}. Abra cada item para revisar somente os dados afetados.`}
                </p>
                {lastCheckedAt ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Verificado às{" "}
                    {lastCheckedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            {!isHealthy ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                {summary.warnings > 0 ? (
                  <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                    {summary.warnings} atenção
                  </Badge>
                ) : null}
                {summary.errors + summary.critical > 0 ? (
                  <Badge className="border border-rose-500/20 bg-rose-500/10 text-rose-300">
                    {summary.errors + summary.critical} erro
                    {summary.errors + summary.critical === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {summary.activeChecks.length ? (
        <Card className="rounded-xl border-zinc-800/80 bg-zinc-950 shadow-none">
          <CardHeader className="border-b border-zinc-800/80 px-4 py-5 sm:px-6">
            <CardTitle className="text-base">O que revisar</CardTitle>
            <CardDescription>
              Cada botão abre a tela já filtrada no problema correspondente.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-800/80 p-0">
            {summary.activeChecks.map((check) => {
              const presentation = getSeverityPresentation(check.severity);
              const Icon = presentation.icon;

              return (
                <article
                  key={check.check_key}
                  className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg",
                      presentation.iconBox,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-100">
                        {check.title}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn("border", presentation.badge)}
                      >
                        {presentation.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-zinc-400"
                      >
                        {check.issue_count} registro
                        {check.issue_count === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      {check.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 shrink-0 border-zinc-700 bg-zinc-950"
                  >
                    <Link href={reviewRoutes[check.check_key] ?? check.action_route}>
                      Ver itens
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <details className="group overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-400">
              <ShieldCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200">
                O que o Finync verificou
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {checks.length} controles financeiros executados na sua conta
              </p>
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-px border-t border-zinc-800/80 bg-zinc-800/70 p-px sm:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check.check_key}
              className="flex min-h-14 items-center gap-3 bg-zinc-950 px-4 py-3"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  check.issue_count > 0
                    ? "bg-amber-500/10 text-amber-300"
                    : "bg-emerald-500/10 text-emerald-400",
                )}
              >
                {check.issue_count > 0 ? (
                  <CircleAlert className="size-3.5" />
                ) : (
                  <Check className="size-3.5" />
                )}
              </span>
              <span className="min-w-0 truncate text-xs text-zinc-400">
                {check.title}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
