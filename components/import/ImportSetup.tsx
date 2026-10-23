"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Check,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  ScanText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { getCardGradientClassName } from "@/components/dashboard/CardsSection";
import {
  dashboardPanelClassName,
  dashboardReveal,
} from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { InvoiceImport } from "./useInvoiceImport";

const tips = [
  {
    icon: FileText,
    title: "PDF da fatura",
    text: "Nubank, Inter e Bradesco são reconhecidos automaticamente.",
  },
  {
    icon: ScanText,
    title: "PDF escaneado",
    text: "Lido no seu aparelho por reconhecimento de texto, sem enviar para fora.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV do banco",
    text: "Colunas de data, descrição e valor. Valores negativos viram estorno.",
  },
  {
    icon: ShieldCheck,
    title: "Sem duplicar",
    text: "O que já foi importado é detectado e fica de fora.",
  },
];

function StepLabel({ number, title }: { number: number; title: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
      <span className="flex size-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] tabular-nums text-zinc-400">
        {number}
      </span>
      {title}
    </p>
  );
}

export function ImportSetup({ flow }: { flow: InvoiceImport }) {
  const {
    cards,
    selectedCardId,
    setSelectedCardId,
    referenceMonth,
    setReferenceMonth,
    referenceMonthOptions,
    isParsingFile,
    ocrProgress,
    ocrProgressPercent,
    ocrProgressLabel,
    parseError,
    fileName,
    readFile,
    cancelParsing,
  } = flow;

  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "application/pdf": [".pdf"],
        "text/csv": [".csv"],
        "application/vnd.ms-excel": [".csv"],
      },
      disabled: !selectedCardId || isParsingFile,
      maxFiles: 1,
      multiple: false,
      onDrop: (files) => {
        if (files[0]) void readFile(files[0]);
      },
    });

  if (!cards.length) {
    return (
      <motion.section
        variants={dashboardReveal}
        className={cn(
          dashboardPanelClassName,
          "flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
          <CreditCard className="size-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-zinc-100">
          Cadastre um cartão primeiro
        </h2>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
          A fatura importada entra em um cartão. Cadastre o seu com os dias de
          fechamento e vencimento.
        </p>
        <Button
          asChild
          className="mt-6 h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          <Link href="/dashboard/cards">Ir para Cartões</Link>
        </Button>
      </motion.section>
    );
  }

  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <motion.section
        variants={dashboardReveal}
        className={cn(dashboardPanelClassName, "flex flex-col gap-6 p-5 sm:p-6")}
      >
        <div>
          <StepLabel number={1} title="Qual cartão?" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {cards.map((card) => {
              const isSelected = card.id === selectedCardId;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCardId(card.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    isSelected
                      ? "border-emerald-400/50 bg-emerald-400/[0.06]"
                      : "border-white/[0.07] hover:border-white/[0.14]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-8 w-12 shrink-0 rounded-md shadow-inner ring-1 ring-white/10",
                      getCardGradientClassName(card.name, card.color),
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {card.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {card.closingDay ? `Fecha dia ${card.closingDay}` : "Sem fechamento"}
                    </span>
                  </span>
                  {isSelected && <Check className="size-4 shrink-0 text-emerald-300" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <StepLabel number={2} title="De qual mês é a fatura?" />
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {referenceMonthOptions.map((option) => {
              const isSelected = option.value === referenceMonth;
              const [month, year] = option.label.split(" / ");

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReferenceMonth(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center transition-colors",
                    isSelected
                      ? "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-200"
                      : "border-white/[0.07] text-zinc-400 hover:border-white/[0.14] hover:text-zinc-100",
                  )}
                >
                  <span className="block text-sm font-medium">{month.slice(0, 3)}</span>
                  <span className="block text-[11px] text-zinc-500">{year}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Já sugerimos o mês pelo dia de fechamento do cartão. Mude se a fatura
            for de outro mês.
          </p>
        </div>
      </motion.section>

      <motion.section variants={dashboardReveal} className="flex flex-col gap-4">
        <div
          {...getRootProps()}
          className={cn(
            dashboardPanelClassName,
            "relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden border-dashed px-6 py-12 text-center transition-colors",
            isParsingFile ? "cursor-wait" : "cursor-pointer hover:border-emerald-400/40",
            isDragActive && "border-emerald-400 bg-emerald-400/[0.04]",
            isDragReject && "border-rose-400 bg-rose-400/[0.04]",
          )}
        >
          <input {...getInputProps()} />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.10),transparent)]"
          />
          <StepLabel number={3} title="Envie o arquivo" />

          <span
            className={cn(
              "relative mt-6 flex size-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-950 text-emerald-300",
              isDragActive && "scale-110 transition-transform",
            )}
          >
            {isParsingFile ? (
              <Loader2 className="size-7 animate-spin" />
            ) : (
              <UploadCloud className="size-7" />
            )}
          </span>

          <h2 className="relative mt-5 text-lg font-semibold text-zinc-50">
            {isParsingFile
              ? ocrProgressLabel
              : isDragActive
                ? "Pode soltar"
                : "Arraste a fatura aqui"}
          </h2>
          <p className="relative mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
            {isParsingFile
              ? fileName
              : "PDF ou CSV, um arquivo por vez. Nada é salvo antes de você revisar."}
          </p>

          {isParsingFile ? (
            <div className="relative mt-6 w-full max-w-xs space-y-3">
              {ocrProgress && (
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                    style={{ width: `${Math.max(ocrProgressPercent, 2)}%` }}
                  />
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  cancelParsing();
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                Cancelar leitura
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              data-tour="import-upload"
              className="relative mt-6 h-11 gap-2 bg-emerald-400 px-6 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              Escolher arquivo
            </Button>
          )}

          {parseError && (
            <p
              role="alert"
              className="relative mt-5 max-w-md rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {parseError}
            </p>
          )}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {tips.map((tip) => {
            const Icon = tip.icon;

            return (
              <li key={tip.title} className="flex gap-3 rounded-xl p-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-300">
                    {tip.title}
                  </span>
                  <span className="block text-xs leading-5 text-zinc-500">{tip.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </motion.section>
    </div>
  );
}
