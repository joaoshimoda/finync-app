"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { Tabs } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { BudgetBars, Sparkline, brl, ease } from "./charts";

const AUTO_ADVANCE_MS = 6500;

const steps = [
  {
    value: "importar",
    icon: FileUp,
    title: "Importe",
    description:
      "Envie o PDF da fatura do Nubank, Inter ou Bradesco, ou um arquivo CSV.",
  },
  {
    value: "revisar",
    icon: ListChecks,
    title: "Revise",
    description:
      "Confira categorias, parcelas e possíveis duplicidades. Marque o que é de um dependente.",
  },
  {
    value: "acompanhar",
    icon: TrendingUp,
    title: "Acompanhe",
    description:
      "Veja saldo, orçamentos e próximas faturas do mês sem montar planilha.",
  },
] as const;

type StepValue = (typeof steps)[number]["value"];

const parsedRows = [
  { merchant: "Mercado São Luiz", category: "Mercado", amount: 284.9 },
  { merchant: "Posto Shell", category: "Transporte", amount: 210 },
  { merchant: "Magazine Luiza 4/10", category: "Casa", amount: 389.9 },
  { merchant: "Netflix", category: "Assinaturas", amount: 44.9 },
];

function ImportPanel() {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-ledger-sheet text-primary ring-1 ring-border">
            <FileUp className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">fatura-nubank-outubro.pdf</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.6, ease }}
              />
            </div>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: "spring", stiffness: 300, damping: 18 }}
          >
            <CheckCircle2 className="size-5 text-primary" />
          </motion.span>
        </div>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-ledger-sheet">
        {parsedRows.map((row, index) => (
          <motion.li
            key={row.merchant}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.7 + index * 0.1, duration: 0.4, ease }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
          >
            <span className="truncate">{row.merchant}</span>
            <span className="flex items-center gap-3">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {row.category}
              </Badge>
              <span className="tabular-nums">{brl.format(row.amount)}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ReviewPanel() {
  return (
    <div className="grid gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex items-start gap-3 rounded-xl border border-ledger-amber/30 bg-ledger-amber-soft/50 p-4"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ledger-amber" />
        <div className="text-[13px]">
          <p className="font-medium">Possível duplicidade</p>
          <p className="mt-0.5 text-muted-foreground">
            Uber de R$ 42,60 aparece duas vezes em 27 set. Manter as duas?
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-md bg-ledger-sheet px-2.5 py-1 text-[12px] font-medium ring-1 ring-border">
              Remover uma
            </span>
            <span className="rounded-md px-2.5 py-1 text-[12px] text-muted-foreground">
              Manter
            </span>
          </div>
        </div>
      </motion.div>
      {[
        { merchant: "iFood", from: "Outros", to: "Alimentação", owner: "Dependente" },
        { merchant: "Renner 2/4", from: "Outros", to: "Vestuário", owner: "Dependente" },
        { merchant: "Spotify Família", from: "Outros", to: "Assinaturas", owner: "Você" },
      ].map((row, index) => (
        <motion.div
          key={row.merchant}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + index * 0.1, duration: 0.4, ease }}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-ledger-sheet px-4 py-3 text-[13px]"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.merchant}</span>
            <span className="block text-[12px] text-muted-foreground">
              <span className="line-through opacity-60">{row.from}</span> → {row.to}
            </span>
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px] font-medium",
              row.owner === "Você"
                ? "bg-secondary text-muted-foreground"
                : "bg-ledger-amber text-ledger-sheet",
            )}
          >
            {row.owner}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function TrackPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="rounded-xl border border-border bg-ledger-sheet p-4"
      >
        <p className="text-[12px] text-muted-foreground">Sobra prevista no fim do mês</p>
        <p className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums [font-stretch:85%]">
          {brl.format(1318.4)}
        </p>
        <Sparkline
          values={[620, 540, 810, 760, 980, 1040, 1180, 1318]}
          className="mt-4 text-primary"
        />
        <p className="mt-2 text-[12px] text-muted-foreground">Últimos 8 meses</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease }}
        className="rounded-xl border border-border bg-ledger-sheet p-4"
      >
        <p className="mb-4 text-[12px] text-muted-foreground">Orçamentos de outubro</p>
        <BudgetBars />
      </motion.div>
    </div>
  );
}

const panels: Record<StepValue, ReactNode> = {
  importar: <ImportPanel />,
  revisar: <ReviewPanel />,
  acompanhar: <TrackPanel />,
};

export function ProductTabs() {
  const [value, setValue] = useState<StepValue>("importar");
  const [autoplay, setAutoplay] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  // Only cycle while the section is on screen, so visitors always land on step one.
  const inView = useInView(rootRef, { amount: 0.4 });
  const cycling = autoplay && inView;

  useEffect(() => {
    if (!cycling) return;
    const timer = window.setTimeout(() => {
      const index = steps.findIndex((step) => step.value === value);
      setValue(steps[(index + 1) % steps.length].value);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [cycling, value]);

  return (
    <Tabs.Root
      ref={rootRef}
      value={value}
      onValueChange={(next) => {
        setValue(next as StepValue);
        setAutoplay(false);
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-14"
    >
      <Tabs.List aria-label="Etapas" className="grid gap-2 self-start">
        {steps.map((step, index) => {
          const active = step.value === value;
          return (
            <Tabs.Trigger
              key={step.value}
              value={step.value}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-2xl border p-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-border bg-ledger-sheet shadow-[0_12px_32px_-20px_rgba(18,38,26,0.35)]"
                  : "border-transparent hover:bg-ledger-sheet/60",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <step.icon className="size-4" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-[17px] font-semibold">
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      0{index + 1}
                    </span>
                    {step.title}
                  </span>
                  <span className="mt-1 block text-[14px] leading-[1.55] text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </div>
              {active ? (
                <motion.span
                  key={`${step.value}-${cycling}`}
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                  initial={{ scaleX: cycling ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: cycling ? AUTO_ADVANCE_MS / 1000 : 0,
                    ease: "linear",
                  }}
                />
              ) : null}
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      <div className="relative min-h-[380px] rounded-[24px] border border-border bg-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_80%_0%,rgba(47,125,74,0.10),transparent_55%)]"
        />
        <AnimatePresence mode="wait">
          <Tabs.Content key={value} value={value} forceMount asChild>
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease }}
              className="relative outline-none"
            >
              {panels[value]}
            </motion.div>
          </Tabs.Content>
        </AnimatePresence>
      </div>
    </Tabs.Root>
  );
}
