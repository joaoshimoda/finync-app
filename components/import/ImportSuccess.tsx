"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, UploadCloud } from "lucide-react";

import {
  dashboardEase,
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import type { ImportResultSummary } from "@/lib/invoiceImport";
import { cn } from "@/lib/utils";

export function ImportSuccess({
  summary,
  onImportAnother,
}: {
  summary: ImportResultSummary;
  onImportAnother: () => void;
}) {
  const stats = [
    { label: "Importados", value: summary.importedCount, tone: "text-emerald-300" },
    { label: "Duplicados ignorados", value: summary.ignoredDuplicateCount, tone: "text-zinc-100" },
    { label: "Estornos", value: summary.creditsCount, tone: "text-sky-300" },
    { label: "Revisados por você", value: summary.reviewedCount, tone: "text-zinc-100" },
  ];

  return (
    <motion.section
      variants={dashboardReveal}
      className={cn(
        dashboardPanelClassName,
        "relative flex flex-col items-center overflow-hidden px-6 py-12 text-center sm:py-16",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-96 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.14),transparent)]"
      />
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: dashboardEase }}
        className="relative flex size-16 items-center justify-center rounded-full bg-emerald-400 text-zinc-950"
      >
        <Check className="size-8" strokeWidth={2.5} />
      </motion.span>
      <h2 className="relative mt-6 text-2xl font-semibold tracking-[-0.02em] text-zinc-50">
        Fatura importada
      </h2>
      <p className="relative mt-1.5 text-sm text-zinc-400">
        {summary.cardName} · {summary.invoiceMonthLabel.toLocaleLowerCase("pt-BR")}
      </p>

      <dl className="relative mt-8 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
          >
            <dd className={cn("text-xl font-semibold tabular-nums", stat.tone)}>
              {stat.value}
            </dd>
            <dt className="mt-0.5 text-[11px] text-zinc-500">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <div className="relative mt-8 flex flex-col gap-2 sm:flex-row">
        <Button
          asChild
          className="h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          <Link href="/dashboard/cards">
            Ver fatura
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onImportAnother}
          className="h-11 gap-2 border-white/[0.08] bg-transparent px-5 text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-50"
        >
          <UploadCloud className="size-4" />
          Importar outra fatura
        </Button>
      </div>
    </motion.section>
  );
}
