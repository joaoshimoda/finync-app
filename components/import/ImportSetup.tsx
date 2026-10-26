"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
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
import { Input } from "@/components/ui/input";
import type { ImportMode } from "@/lib/invoiceImport";
import { cn } from "@/lib/utils";

import type { InvoiceImport } from "./useInvoiceImport";

const noDuplicatesTip = {
  icon: ShieldCheck,
  title: "Sem duplicar",
  text: "O que já foi importado é detectado e fica de fora.",
};

const tipsByMode: Record<ImportMode, Array<typeof noDuplicatesTip>> = {
  card: [
    {
      icon: FileText,
      title: "PDF da fatura",
      text: "Funciona com a maioria dos bancos, inclusive PDF com senha.",
    },
    {
      icon: ScanText,
      title: "PDF escaneado",
      text: "Lido no seu aparelho por reconhecimento de texto, sem enviar para fora.",
    },
    {
      icon: FileSpreadsheet,
      title: "OFX ou CSV do banco",
      text: "O OFX é lido direto, sem ajuste. No CSV, valores negativos viram estorno.",
    },
    noDuplicatesTip,
  ],
  account: [
    {
      icon: FileSpreadsheet,
      title: "OFX ou CSV do banco",
      text: "Exporte o extrato no app ou site do banco. O OFX é lido direto, sem ajuste.",
    },
    {
      icon: CreditCard,
      title: "Fatura fica de fora",
      text: "O pagamento da fatura é ignorado: as compras já entram pelo cartão.",
    },
    {
      icon: ArrowLeftRight,
      title: "Transferências e investimentos",
      text: "Entre suas contas ou aplicações, ficam para você decidir.",
    },
    noDuplicatesTip,
  ],
};

const modeOptions: Array<{
  value: ImportMode;
  icon: typeof CreditCard;
  title: string;
  text: string;
}> = [
  {
    value: "card",
    icon: CreditCard,
    title: "Fatura do cartão",
    text: "Compras entram na fatura",
  },
  {
    value: "account",
    icon: Landmark,
    title: "Extrato da conta",
    text: "Pix, débito e receitas",
  },
];

/* Locked invoices: many banks use digits of the CPF as the password. It
   is only used to open the file here and is never saved. */
function PdfPasswordForm({
  fileName,
  incorrect,
  isBusy,
  onSubmit,
  onCancel,
}: {
  fileName: string;
  incorrect: boolean;
  isBusy: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(password);
      }}
      className={cn(dashboardPanelClassName, "flex flex-col gap-3 p-4 sm:p-5")}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
          <LockKeyhole className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">Este PDF tem senha</p>
          <p className="truncate text-xs text-zinc-500">{fileName}</p>
        </div>
      </div>
      <p className="text-xs leading-5 text-zinc-400">
        Muitos bancos usam os primeiros dígitos do seu CPF. A senha só abre o
        arquivo aqui no aparelho e não é salva.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          autoFocus
          type="password"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha do PDF"
          aria-invalid={incorrect}
          className="h-10 border-white/[0.08] bg-zinc-900 text-zinc-100"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isBusy}
            className="h-10 flex-1 text-zinc-400 hover:text-zinc-100 sm:flex-none"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!password || isBusy}
            className="h-10 flex-1 gap-2 bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300 sm:flex-none"
          >
            {isBusy && <Loader2 className="size-4 animate-spin" />}
            Abrir
          </Button>
        </div>
      </div>
      {incorrect && (
        <p role="alert" className="text-xs text-rose-300">
          Senha incorreta. Confira e tente de novo.
        </p>
      )}
    </motion.form>
  );
}

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
    mode,
    setMode,
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
        "application/x-ofx": [".ofx", ".qfx"],
      },
      disabled: (mode === "card" && !selectedCardId) || isParsingFile,
      maxFiles: 1,
      multiple: false,
      onDrop: (files) => {
        if (files[0]) void readFile(files[0]);
      },
    });

  const isCardMode = mode === "card";
  const tips = tipsByMode[mode];
  const monthPicker = (
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
  );

  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <motion.section
        variants={dashboardReveal}
        className={cn(dashboardPanelClassName, "flex flex-col gap-6 p-5 sm:p-6")}
      >
        <div>
          <StepLabel number={1} title="O que você vai importar?" />
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de importação">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === mode;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                    isSelected
                      ? "border-emerald-400/50 bg-emerald-400/[0.06]"
                      : "border-white/[0.07] hover:border-white/[0.14]",
                  )}
                >
                  <Icon
                    className={cn("size-4", isSelected ? "text-emerald-300" : "text-zinc-500")}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-100">
                      {option.title}
                    </span>
                    <span className="block text-xs text-zinc-500">{option.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!isCardMode ? (
          <div>
            <StepLabel number={2} title="Em qual mês lançar o extrato?" />
            {monthPicker}
            <div className="mt-3 flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <p className="min-w-0 text-xs leading-5 text-zinc-400">
                Todos os lançamentos do arquivo entram nesse mês, mesmo os de
                datas próximas da virada. Se não escolher, usamos o mês da
                maioria das datas do extrato, e dá para trocar na revisão.
              </p>
            </div>
          </div>
        ) : !cards.length ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-zinc-100">Cadastre um cartão primeiro</p>
            <p className="text-xs leading-5 text-zinc-500">
              A fatura importada entra em um cartão. Cadastre o seu com os dias
              de fechamento e vencimento.
            </p>
            <Button
              asChild
              size="sm"
              className="bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              <Link href="/dashboard/cards">Ir para Cartões</Link>
            </Button>
          </div>
        ) : (
          <>
            <div>
              <StepLabel number={2} title="Qual cartão?" />
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
              <StepLabel number={3} title="De qual mês é a fatura?" />
              {monthPicker}
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Já sugerimos o mês pelo dia de fechamento do cartão. Mude se a fatura
                for de outro mês.
              </p>
            </div>
          </>
        )}
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
          <StepLabel number={isCardMode ? 4 : 2} title="Envie o arquivo" />

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
                : isCardMode
                  ? "Arraste a fatura aqui"
                  : "Arraste o extrato aqui"}
          </h2>
          <p className="relative mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
            {isParsingFile
              ? fileName
              : `${isCardMode ? "PDF, OFX ou CSV" : "OFX ou CSV"}, um arquivo por vez. Nada é salvo antes de você revisar.`}
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

        {flow.pdfPasswordRequest && (
          <PdfPasswordForm
            key={`${flow.pdfPasswordRequest.file.name}-${flow.pdfPasswordRequest.incorrect}`}
            fileName={flow.pdfPasswordRequest.file.name}
            incorrect={flow.pdfPasswordRequest.incorrect}
            isBusy={isParsingFile}
            onSubmit={flow.submitPdfPassword}
            onCancel={flow.cancelPdfPassword}
          />
        )}

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
