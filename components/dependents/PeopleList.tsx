"use client";

import { motion } from "framer-motion";
import { PlusCircle, UserRound } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
  usePrivateCurrency,
} from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

import type { DependentOverview, DependentStatus } from "./useDependentsData";

/* Avatar tints, picked by name so a person keeps their colour. */
const avatarTones = [
  "bg-amber-500/15 text-amber-200",
  "bg-sky-500/15 text-sky-200",
  "bg-violet-500/15 text-violet-200",
  "bg-rose-500/15 text-rose-200",
  "bg-teal-500/15 text-teal-200",
];

export const statusPresentation: Record<
  DependentStatus,
  { label: string; className: string; bar: string }
> = {
  open: { label: "A receber", className: "text-amber-300", bar: "bg-amber-400" },
  partial: { label: "Recebendo", className: "text-sky-300", bar: "bg-sky-400" },
  settled: { label: "Quitado", className: "text-emerald-300", bar: "bg-emerald-400" },
  idle: { label: "Sem gastos", className: "text-zinc-500", bar: "bg-zinc-600" },
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");
}

export function DependentAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        avatarTones[hash % avatarTones.length],
        size === "lg" ? "size-14 text-lg" : "size-10 text-xs",
      )}
    >
      {getInitials(name) || <UserRound className="size-4" />}
    </span>
  );
}

export function PeopleList({
  people,
  selectedId,
  onSelect,
  onAdd,
}: {
  people: DependentOverview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const formatValue = usePrivateCurrency();

  return (
    <motion.section
      variants={dashboardReveal}
      aria-label="Pessoas"
      className={cn(dashboardPanelClassName, "flex flex-col overflow-hidden")}
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Pessoas</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {people.length} {people.length === 1 ? "dependente" : "dependentes"}
          </p>
        </div>
      </header>

      <ul className="flex flex-col gap-1 p-2">
        {people.map((person) => {
          const isSelected = person.id === selectedId;
          const status = statusPresentation[person.status];

          return (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => onSelect(person.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.025]",
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="dependent-selected"
                    className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-emerald-400"
                    transition={{ duration: 0.3, ease: dashboardEase }}
                  />
                )}
                <DependentAvatar name={person.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-zinc-100">
                      {person.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                      {formatValue(person.total)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <motion.span
                        className={cn("block h-full rounded-full", status.bar)}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${person.status === "idle" ? 0 : person.status === "settled" ? 100 : person.progress}%`,
                        }}
                        transition={{ duration: 0.7, ease: dashboardEase }}
                      />
                    </span>
                    <span className={cn("shrink-0 text-[11px]", status.className)}>
                      {person.outstanding > 0
                        ? `Falta ${formatValue(person.outstanding)}`
                        : status.label}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        data-tour="dependent-add"
        onClick={onAdd}
        className="mx-2 mb-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
      >
        <PlusCircle className="size-4" />
        Adicionar pessoa
      </button>
    </motion.section>
  );
}
