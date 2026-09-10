"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
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
      const { data, error } = await supabase.rpc("finync_get_data_health");

      if (error) throw error;

      setChecks(data ?? []);
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
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Verificações",
              value: checks.length,
              icon: ShieldCheck,
              tone: "text-zinc-100",
            },
            {
              label: "Avisos",
              value: summary.warnings,
              icon: AlertTriangle,
              tone: "text-amber-300",
            },
            {
              label: "Erros",
              value: summary.errors,
              icon: CircleAlert,
              tone: "text-orange-300",
            },
            {
              label: "Críticos",
              value: summary.critical,
              icon: ShieldAlert,
              tone: "text-rose-300",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.label}
                className="rounded-xl border-zinc-800/80 bg-zinc-950/70 shadow-none"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                      {item.label}
                    </p>
                    <Icon className="size-4 text-zinc-500" />
                  </div>
                  <strong className={cn("mt-3 block text-xl", item.tone)}>
                    {item.value}
                  </strong>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {isHealthy ? (
        <Card className="rounded-xl border-emerald-500/20 bg-emerald-500/[0.05] shadow-none">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:py-16">
            <span className="flex size-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <CircleCheck className="size-7" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-zinc-50">
              Seus dados estão consistentes
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Nenhuma divergência foi encontrada nos vínculos financeiros
              verificados para sua conta.
            </p>
            {lastCheckedAt ? (
              <p className="mt-4 text-xs text-zinc-500">
                Última verificação às{" "}
                {lastCheckedAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : summary.activeChecks.length ? (
        <Card className="rounded-xl border-zinc-800/80 bg-zinc-950 shadow-none">
          <CardHeader className="border-b border-zinc-800/80 px-4 py-5 sm:px-6">
            <CardTitle className="text-base">Pontos que exigem revisão</CardTitle>
            <CardDescription>
              {summary.affectedRecords} registro
              {summary.affectedRecords === 1 ? "" : "s"} afetado
              {summary.affectedRecords === 1 ? "" : "s"}.
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
                        {check.issue_count}
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
                    <Link href={check.action_route}>
                      Revisar
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-xl border-zinc-800/80 bg-zinc-950/60 shadow-none">
        <CardHeader className="border-b border-zinc-800/80 px-4 py-5 sm:px-6">
          <CardTitle className="text-base">Verificações monitoradas</CardTitle>
          <CardDescription>
            Controles executados somente sobre os dados da sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-px bg-zinc-800/70 p-px sm:grid-cols-2 xl:grid-cols-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
