"use client";

import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Check, FileUp, X } from "lucide-react";

import {
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { PdfReviewDialog, SplitDialog } from "@/components/import/ImportDialogs";
import { ImportReview } from "@/components/import/ImportReview";
import { ImportSetup } from "@/components/import/ImportSetup";
import { ImportSuccess } from "@/components/import/ImportSuccess";
import { useInvoiceImport } from "@/components/import/useInvoiceImport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = ["Arquivo", "Revisão", "Pronto"];

export default function ImportarPage() {
  const flow = useInvoiceImport();
  const [splitIndex, setSplitIndex] = useState<number | null>(null);
  const [pdfLineId, setPdfLineId] = useState<string | null>(null);

  const step = flow.hasPreview ? 1 : flow.lastImportSummary ? 2 : 0;

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
              <FileUp className="size-3.5" />
              Importação
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
              {flow.mode === "account" ? "Importar extrato" : "Importar fatura"}
            </h1>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {flow.hasPreview
                ? `${flow.fileName} · ${flow.importTargetLabel}`
                : flow.mode === "account"
                  ? "Traga o OFX ou CSV da conta, revise e salve de uma vez."
                  : "Traga o PDF, OFX ou CSV do cartão, revise e salve de uma vez."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ol className="flex items-center gap-1.5" aria-label="Etapas">
              {steps.map((label, index) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span
                    aria-current={index === step ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs transition-colors",
                      index === step
                        ? "bg-white/[0.06] text-zinc-100"
                        : index < step
                          ? "text-emerald-300"
                          : "text-zinc-500",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                        index < step
                          ? "bg-emerald-400 text-zinc-950"
                          : index === step
                            ? "bg-zinc-100 text-zinc-950"
                            : "bg-white/[0.06] text-zinc-500",
                      )}
                    >
                      {index < step ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                    </span>
                    {label}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="h-px w-3 bg-white/[0.1]" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
            {flow.hasPreview && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Descartar e importar outro arquivo"
                title="Descartar e importar outro arquivo"
                onClick={() => flow.resetImport()}
                disabled={flow.isSubmitting}
                className="size-9 text-zinc-500 hover:text-zinc-100"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </motion.header>

        {flow.hasPreview ? (
          <ImportReview
            flow={flow}
            onSplit={setSplitIndex}
            onReviewPdf={() => setPdfLineId(flow.pdfAudit?.rejectedLines[0]?.id ?? null)}
          />
        ) : flow.lastImportSummary ? (
          <ImportSuccess
            summary={flow.lastImportSummary}
            onImportAnother={() => flow.resetImport()}
          />
        ) : (
          <ImportSetup flow={flow} />
        )}
      </motion.div>

      <SplitDialog flow={flow} index={splitIndex} onClose={() => setSplitIndex(null)} />
      <PdfReviewDialog flow={flow} lineId={pdfLineId} onChangeLine={setPdfLineId} />
    </MotionConfig>
  );
}
