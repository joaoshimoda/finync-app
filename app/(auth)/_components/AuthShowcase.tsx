"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileText, Lock, ShieldCheck, Undo2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { brl, CountUp, ease } from "@/components/landing/charts";
import { cn } from "@/lib/utils";

const trustPoints = [
  { icon: Lock, label: "Sem senha do banco" },
  { icon: ShieldCheck, label: "Dados privados na sua conta" },
  { icon: Undo2, label: "Desfaça qualquer alteração" },
];

function Floating({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease }}
      className={cn("absolute z-20 [@media(max-height:760px)]:hidden", className)}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
        className="rounded-2xl border border-border bg-ledger-sheet p-3.5 text-foreground shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

type Owner = "voce" | "dependente";

const purchases = [
  { id: "ifood", merchant: "iFood", detail: "20 out", amount: 63.4 },
  { id: "magalu", merchant: "Magazine Luiza", detail: "parcela 4 de 10", amount: 389.9 },
  { id: "renner", merchant: "Renner", detail: "parcela 2 de 4", amount: 113.71 },
];

const invoiceTotal = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

// Each step marks one more purchase as the dependent's, then the loop resets.
const splitSteps: Record<string, Owner>[] = [
  {},
  { ifood: "dependente" },
  { ifood: "dependente", renner: "dependente" },
  { ifood: "dependente", renner: "dependente" },
];

const STEP_MS = 2200;

/* The invoice from the landing's dependents section, playing by itself:
   purchases flip to "Dependente" one at a time and the totals follow. */
function InvoiceSplitLoop() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % splitSteps.length);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const owners = splitSteps[reduceMotion ? 2 : step];
  const dependentTotal = purchases
    .filter((purchase) => owners[purchase.id] === "dependente")
    .reduce((sum, purchase) => sum + purchase.amount, 0);

  return (
    <div className="overflow-hidden rounded-[17px] bg-ledger-sheet text-foreground">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-[14px] font-semibold">Fatura de outubro</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Cartão final 4471</p>
        </div>
        <p className="text-[12px] text-muted-foreground">Vence em 10 nov</p>
      </div>

      <ul className="mt-4 border-t border-border">
        {purchases.map((purchase) => {
          const isDependent = owners[purchase.id] === "dependente";
          return (
            <li
              key={purchase.id}
              className={cn(
                "flex items-center justify-between gap-4 border-b border-border px-5 py-2 transition-colors duration-500",
                isDependent && "bg-ledger-amber-soft/50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px]">{purchase.merchant}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {purchase.detail}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="relative grid h-6 w-[86px] place-items-center">
                  <motion.span
                    key={isDependent ? "dep" : "you"}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className={cn(
                      "absolute inset-y-0 right-0 inline-flex items-center rounded-full px-2.5 text-[11px] font-medium",
                      isDependent
                        ? "bg-ledger-amber text-ledger-sheet"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {isDependent ? "Dependente" : "Você"}
                  </motion.span>
                </span>
                <span className="w-[76px] text-right text-[14px] tabular-nums">
                  {brl.format(purchase.amount)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-1.5 bg-background/60 px-5 py-4 text-[13px]">
        <div className="flex justify-between [@media(max-height:800px)]:hidden">
          <span className="text-muted-foreground">Total da fatura</span>
          <span className="tabular-nums">{brl.format(invoiceTotal)}</span>
        </div>
        <div className="flex justify-between text-ledger-amber">
          <span>Dependente devolve</span>
          <CountUp value={dependentTotal} />
        </div>
        <div className="mt-2 flex items-end justify-between border-t border-border pt-3">
          <span className="text-[14px] font-semibold">Sua parte</span>
          <CountUp
            value={invoiceTotal - dependentTotal}
            className="text-[30px] leading-none font-semibold tracking-[-0.02em] [font-stretch:80%]"
          />
        </div>
      </div>
    </div>
  );
}

/* Right-hand panel of the auth screens: the same product story the landing
   tells, condensed into one live-looking snapshot. Purely decorative. */
export function AuthShowcase() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden rounded-[28px] bg-ledger-ink text-[#eef2ec] lg:sticky lg:top-3 lg:flex lg:h-[calc(100svh-1.5rem)] lg:flex-col lg:self-start"
    >
      <div className="landing-grid-dark pointer-events-none absolute inset-0" />
      <motion.div
        className="pointer-events-none absolute -top-40 -right-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(159,212,173,0.2),transparent)] blur-2xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(183,121,15,0.16),transparent)] blur-2xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative px-10 pt-12 xl:px-14 xl:pt-14 [@media(max-height:760px)]:pt-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-[13px] font-medium tracking-[0.08em] text-ledger-mint uppercase"
        >
          Finync
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease }}
          className="mt-4 max-w-[15ch] text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.035em] [font-stretch:88%]"
        >
          Quanto do mês é realmente seu?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mt-4 max-w-[34rem] text-[16px] leading-[1.6] text-[#b9c7bd] [@media(max-height:800px)]:hidden"
        >
          Importe a fatura, separe o que é de cada dependente e acompanhe saldo,
          parcelas e orçamentos num só lugar.
        </motion.p>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-10 py-4 xl:px-14">
        {/* Top padding reserves room for the floating card, so it only overlaps
            the invoice's padding and never any text. */}
        <div className="relative w-full max-w-[460px] pt-14 [@media(max-height:800px)]:pt-11 [@media(max-height:760px)]:pt-0">
          <Floating className="top-0 -left-6 w-[220px] xl:-left-12" delay={1}>
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">Fatura importada</p>
                <p className="text-[11px] text-muted-foreground">42 compras organizadas</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full origin-left rounded-full bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.4, delay: 1.3, ease }}
                  />
                </div>
              </div>
            </div>
          </Floating>

          <motion.div
            initial={{ opacity: 0, y: 28, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
            style={{ transformPerspective: 1400 }}
            className="relative rounded-[22px] border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur"
          >
            <InvoiceSplitLoop />
          </motion.div>
        </div>
      </div>

      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="relative flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 px-10 py-6 text-[13px] text-[#b9c7bd] xl:px-14"
      >
        {trustPoints.map((point) => (
          <li key={point.label} className="flex items-center gap-2">
            <point.icon className="size-4 text-ledger-mint" strokeWidth={1.8} />
            {point.label}
          </li>
        ))}
      </motion.ul>
    </aside>
  );
}
