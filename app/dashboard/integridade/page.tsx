"use client";

import { MotionConfig, motion } from "framer-motion";
import { Check, ShieldCheck } from "lucide-react";

import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { HealthOverview } from "@/components/health/HealthOverview";
import { IssueCard } from "@/components/health/IssueCard";
import { useHealthData } from "@/components/health/useHealthData";
import { healthAreas, healthCheckInfo, type HealthArea } from "@/lib/dataHealth";
import { cn } from "@/lib/utils";

const areaOrder = Object.keys(healthAreas) as HealthArea[];

function getArea(checkKey: string): HealthArea {
  return healthCheckInfo[checkKey]?.area ?? "categories";
}

export default function IntegridadePage() {
  const health = useHealthData();
  const { summary, checks } = health;

  const checksByArea = areaOrder
    .map((area) => ({
      area,
      checks: checks.filter((check) => getArea(check.check_key) === area),
    }))
    .filter((group) => group.checks.length > 0);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        data-tour="integrity-dashboard"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header variants={dashboardReveal} className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
            <ShieldCheck className="size-3.5" />
            Diagnóstico
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
            Integridade dos dados
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Conferimos se faturas, parcelas, categorias e acertos batem entre si.
            Nada muda sem você confirmar.
          </p>
        </motion.header>

        <HealthOverview health={health} />

        {summary.failing.length > 0 && (
          <motion.section variants={dashboardReveal} aria-labelledby="issues-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="issues-title" className="text-base font-semibold text-zinc-100">
                O que revisar
              </h2>
              <p className="text-xs text-zinc-500">Toque em um item para ver os registros</p>
            </div>
            <ul className={cn("flex flex-col gap-3 transition-opacity", health.isLoading && "opacity-70")}>
              {summary.failing.map((check) => (
                <IssueCard key={check.check_key} check={check} health={health} />
              ))}
            </ul>
          </motion.section>
        )}

        {checks.length > 0 && (
          <motion.section
            variants={dashboardReveal}
            aria-labelledby="checks-title"
            className={cn(dashboardPanelClassName, "p-5 sm:p-6")}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="checks-title" className="text-base font-semibold text-zinc-100">
                Tudo o que verificamos
              </h2>
              <p className="text-xs text-zinc-500">
                {summary.passing.length} de {summary.total} sem problemas
              </p>
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {checksByArea.map((group) => (
                <div key={group.area}>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                    {healthAreas[group.area]}
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {group.checks.map((check) => {
                      const ok = check.issue_count === 0;
                      return (
                        <li key={check.check_key} className="flex items-start gap-2.5 text-sm">
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                              ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300",
                            )}
                          >
                            {ok ? (
                              <Check className="size-2.5" strokeWidth={3} />
                            ) : (
                              <span className="text-[9px] font-bold">!</span>
                            )}
                          </span>
                          <span className={ok ? "text-zinc-400" : "text-zinc-200"}>
                            {check.title}
                            {!ok && (
                              <span className="ml-1.5 text-xs tabular-nums text-amber-300">
                                {check.issue_count}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>
    </MotionConfig>
  );
}
