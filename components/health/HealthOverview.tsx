"use client";

import { motion } from "framer-motion";
import { RefreshCw, Wrench } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { HealthData } from "./useHealthData";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HealthOverview({ health }: { health: HealthData }) {
  const { summary, isLoading, lastCheckedAt, runChecks, checks } = health;

  if (isLoading && !checks.length) {
    return <Skeleton className="h-52 rounded-2xl" />;
  }

  const tone =
    summary.critical > 0
      ? { stroke: "#fb7185", text: "text-rose-300", glow: "rgba(251,113,133,0.12)" }
      : summary.failing.length > 0
        ? { stroke: "#fbbf24", text: "text-amber-300", glow: "rgba(251,191,36,0.10)" }
        : { stroke: "#34d399", text: "text-emerald-300", glow: "rgba(52,211,153,0.12)" };

  const headline =
    summary.failing.length === 0
      ? "Tudo em ordem"
      : summary.critical > 0
        ? "Há divergências importantes"
        : "Alguns ajustes recomendados";

  const description =
    summary.failing.length === 0
      ? `As ${summary.total} verificações passaram. Seus totais, faturas e acertos estão consistentes.`
      : `${summary.failing.length} de ${summary.total} verificações encontraram ${summary.affectedRecords} ${summary.affectedRecords === 1 ? "registro" : "registros"} para revisar.`;

  const chips = [
    { count: summary.critical, label: "crítico", plural: "críticos", className: "bg-rose-500/10 text-rose-300" },
    { count: summary.errors, label: "erro", plural: "erros", className: "bg-orange-500/10 text-orange-300" },
    { count: summary.warnings, label: "atenção", plural: "atenções", className: "bg-amber-500/10 text-amber-300" },
  ].filter((chip) => chip.count > 0);

  return (
    <motion.section
      variants={dashboardReveal}
      aria-label="Resumo da integridade"
      className={cn(dashboardPanelClassName, "relative overflow-hidden transition-opacity", isLoading && "opacity-70")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-80 rounded-full blur-2xl"
        style={{ background: `radial-gradient(closest-side, ${tone.glow}, transparent)` }}
      />
      <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative size-32 shrink-0 self-center sm:self-auto">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgb(39 39 42)" strokeWidth="10" />
            <motion.circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={tone.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - summary.score / 100) }}
              transition={{ duration: 1, ease: dashboardEase }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-[-0.03em] tabular-nums text-zinc-50">
              {summary.score}
            </span>
            <span className="text-[11px] text-zinc-500">de 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={cn("text-xl font-semibold tracking-[-0.02em]", tone.text)}>{headline}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span key={chip.label} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", chip.className)}>
                {chip.count} {chip.count === 1 ? chip.label : chip.plural}
              </span>
            ))}
            {summary.fixable > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <Wrench className="size-3" />
                {summary.fixable} com correção rápida
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => void runChecks()}
            disabled={isLoading}
            className="h-10 gap-2 border-white/[0.08] bg-zinc-900/70 text-zinc-200 hover:bg-white/[0.06]"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            {isLoading ? "Verificando..." : "Verificar de novo"}
          </Button>
          {lastCheckedAt && (
            <p className="text-xs text-zinc-500">
              Última verificação às{" "}
              {lastCheckedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}
