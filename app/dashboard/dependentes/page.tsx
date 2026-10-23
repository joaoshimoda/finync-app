"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { CircleCheck, HandCoins, PlusCircle, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { StatHint, StatTile } from "@/components/dashboard/controls";
import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { DependentDetail } from "@/components/dependents/DependentDetail";
import { PeopleList } from "@/components/dependents/PeopleList";
import { useDependentsData } from "@/components/dependents/useDependentsData";
import { AnimatedMonthSelector } from "@/components/finance/AnimatedMonthSelector";
import { ManageDependentModal } from "@/components/modals/ManageDependentModal";
import { SettleDependentModal } from "@/components/modals/SettleDependentModal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Dependent } from "@/store/useFinanceStore";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

export default function DependentesPage() {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const deleteDependent = useFinanceStore((state) => state.deleteDependent);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settleTargetId, setSettleTargetId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ dependent: Dependent | null } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Dependent | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  /* Below lg the detail sits under the list, so bring it into view. */
  function selectPerson(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  useEffect(() => {
    void fetchDependents();
  }, [fetchDependents]);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const { competenceMonth, people, totals } = useDependentsData();
  const monthLabel = monthFormatter.format(new Date(currentYear, currentMonth - 1, 1));
  const selected =
    people.find((person) => person.id === selectedId) ?? people[0] ?? null;
  const settleTarget = people.find((person) => person.id === settleTargetId) ?? null;
  const settledShare =
    totals.obligation > 0 ? Math.min((totals.settled / totals.obligation) * 100, 100) : 0;

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteDependent(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      toast.success("Dependente removido.");
    } catch (error) {
      console.error("Erro ao remover dependente:", error);
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover o dependente.",
      );
      throw error;
    }
  }

  const tiles = [
    {
      icon: UsersRound,
      label: `Gasto dos dependentes em ${monthLabel}`,
      value: totals.spent,
      hint: `${people.filter((person) => person.total > 0).length} de ${people.length} ${people.length === 1 ? "pessoa usou" : "pessoas usaram"} seus cartões ou conta`,
      tone: "text-zinc-50",
    },
    {
      icon: CircleCheck,
      label: "Recebido",
      value: totals.settled,
      hint:
        totals.obligation > 0
          ? `${Math.round(settledShare)}% do que foi gasto já voltou`
          : "Nada a acertar neste mês",
      tone: "text-emerald-300",
      progress: totals.obligation > 0 ? settledShare : null,
    },
    {
      icon: HandCoins,
      label: "A receber",
      value: totals.outstanding,
      hint: totals.pendingPeople
        ? `${totals.pendingPeople} ${totals.pendingPeople === 1 ? "pessoa ainda deve" : "pessoas ainda devem"}`
        : "Ninguém deve nada",
      tone: totals.outstanding > 0 ? "text-amber-300" : "text-zinc-50",
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header
          variants={dashboardReveal}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              <UsersRound className="size-3.5" />
              Compartilhado
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              Dependentes
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              O que cada pessoa gastou no seu nome e quanto falta ela devolver.
            </p>
          </div>
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
            <div className="min-w-0 sm:shrink-0">
              <AnimatedMonthSelector
                currentMonth={currentMonth}
                currentYear={currentYear}
                onPreviousMonth={prevMonth}
                onNextMonth={nextMonth}
                isLoading={isFetching}
              />
            </div>
            <Button
              type="button"
              onClick={() => setEditing({ dependent: null })}
              aria-label="Adicionar dependente"
              className="h-11 gap-2 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300 sm:px-5"
            >
              <PlusCircle className="size-5" />
              <span className="hidden min-[420px]:inline">Nova pessoa</span>
            </Button>
          </div>
        </motion.header>

        {people.length && selected ? (
          <>
            <motion.section
              variants={dashboardReveal}
              aria-label="Resumo dos dependentes"
              className={cn(
                dashboardPanelClassName,
                "grid divide-y divide-white/[0.06] transition-opacity sm:grid-cols-3 sm:divide-x sm:divide-y-0",
                isFetching && "opacity-70",
              )}
            >
              {tiles.map((tile) => (
                <StatTile
                  key={tile.label}
                  icon={tile.icon}
                  label={tile.label}
                  value={tile.value}
                  valueClassName={tile.tone}
                  progress={"progress" in tile ? tile.progress : undefined}
                >
                  <StatHint>{tile.hint}</StatHint>
                </StatTile>
              ))}
            </motion.section>

            <div
              className={cn(
                "grid items-start gap-5 transition-opacity sm:gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]",
                isFetching && "opacity-70",
              )}
            >
              <div className="lg:sticky lg:top-0">
                <PeopleList
                  people={people}
                  selectedId={selected.id}
                  onSelect={selectPerson}
                  onAdd={() => setEditing({ dependent: null })}
                />
              </div>
              <div ref={detailRef} className="min-w-0 scroll-mt-20">
              <DependentDetail
                key={`${selected.id}-${competenceMonth}`}
                person={selected}
                monthLabel={monthLabel}
                onSettle={() => setSettleTargetId(selected.id)}
                onEdit={() => setEditing({ dependent: selected })}
                onDelete={() => setDeleteTarget(selected)}
              />
              </div>
            </div>
          </>
        ) : (
          <motion.section
            variants={dashboardReveal}
            className={cn(
              dashboardPanelClassName,
              "flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <UsersRound className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-zinc-100">
              Ninguém cadastrado ainda
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-zinc-500">
              Filho, cônjuge ou amigo que usa seu cartão: cadastre a pessoa, marque
              as compras dela e saiba no centavo quanto ela precisa devolver.
            </p>
            <Button
              type="button"
              data-tour="dependent-add"
              onClick={() => setEditing({ dependent: null })}
              className="mt-6 h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              <PlusCircle className="size-5" />
              Adicionar pessoa
            </Button>
          </motion.section>
        )}
      </motion.div>

      <ManageDependentModal
        dependent={editing?.dependent ?? null}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remover dependente?"
        description="Os lançamentos existentes serão preservados, mas deixarão de estar vinculados a esta pessoa."
        confirmLabel="Remover dependente"
        loadingLabel="Removendo..."
        details={deleteTarget?.name}
        onConfirm={handleDelete}
      />

      <SettleDependentModal
        dependent={settleTarget}
        competenceMonth={competenceMonth}
        obligationTotal={settleTarget?.obligationTotal ?? 0}
        settledTotal={settleTarget?.settledTotal ?? 0}
        open={Boolean(settleTarget)}
        onOpenChange={(open) => {
          if (!open) setSettleTargetId(null);
        }}
      />
    </MotionConfig>
  );
}
