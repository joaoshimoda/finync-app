"use client";

import { useEffect } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Database, HardDriveDownload, History, LockKeyhole } from "lucide-react";

import {
  dashboardPanelClassName,
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { BackupChecker } from "@/components/export/BackupChecker";
import { BackupPanel } from "@/components/export/BackupPanel";
import { ReportBuilder } from "@/components/export/ReportBuilder";
import { useExportData } from "@/components/export/useExportData";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const safeguards = [
  {
    icon: Database,
    title: "Uma leitura só",
    text: "Todos os dados são lidos no mesmo instante, sem nada pela metade.",
  },
  {
    icon: LockKeyhole,
    title: "Só a sua conta",
    text: "A exportação usa a sua sessão e as regras de acesso do banco.",
  },
  {
    icon: HardDriveDownload,
    title: "Fica no seu aparelho",
    text: "Os arquivos são gerados na hora e baixados direto, sem cópia na nuvem.",
  },
  {
    icon: History,
    title: "Histórico junto",
    text: "O backup inclui o registro de alterações para auditoria.",
  },
];

export default function ExportarPage() {
  const data = useExportData();
  const userId = useFinanceStore((state) => state.authUser?.id ?? null);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);

  useEffect(() => {
    void fetchCards();
    void fetchDependents();
  }, [fetchCards, fetchDependents]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        data-tour="export-dashboard"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header variants={dashboardReveal} className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
            <HardDriveDownload className="size-3.5" />
            Seus dados
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
            Exportar e backup
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Guarde uma cópia de tudo ou leve recortes para a planilha. Os arquivos
            ficam só com você.
          </p>
        </motion.header>

        <BackupPanel data={data} />
        <ReportBuilder data={data} />

        <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
          <BackupChecker userId={userId} />
          <motion.section
            variants={dashboardReveal}
            aria-labelledby="safeguards-title"
            className={cn(dashboardPanelClassName, "p-5 sm:p-6")}
          >
            <h2 id="safeguards-title" className="text-base font-semibold text-zinc-100">
              Como seus dados são protegidos
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {safeguards.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-200">{item.title}</span>
                      <span className="block text-xs leading-5 text-zinc-500">{item.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
