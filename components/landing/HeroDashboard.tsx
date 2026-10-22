"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutDashboard,
  PieChart,
  Repeat,
  Search,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  BalanceAreaChart,
  CategoryDonut,
  CountUp,
  InstallmentBars,
  ease,
} from "./charts";

const navItems = [
  { icon: LayoutDashboard, label: "Visão geral", active: true },
  { icon: CreditCard, label: "Cartões" },
  { icon: UsersRound, label: "Dependentes" },
  { icon: PieChart, label: "Orçamentos" },
  { icon: Repeat, label: "Fixas" },
];

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-ledger-sheet p-4 shadow-[0_1px_2px_rgba(18,38,26,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: number;
  trend: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <Panel className="p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[19px] leading-none font-semibold tracking-[-0.02em] [font-stretch:85%] sm:text-[22px]">
        <CountUp value={value} />
      </p>
      <p
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-[11px]",
          tone === "up" && "text-primary",
          tone === "down" && "text-ledger-amber",
          tone === "neutral" && "text-muted-foreground",
        )}
      >
        {tone === "up" ? <ArrowUpRight className="size-3" /> : null}
        {tone === "down" ? <ArrowDownRight className="size-3" /> : null}
        {trend}
      </p>
    </Panel>
  );
}

function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease }}
      className={cn("absolute z-20 hidden xl:block", className)}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
        className="rounded-2xl border border-border bg-ledger-sheet/95 p-3.5 shadow-[0_24px_48px_-20px_rgba(18,38,26,0.35)] backdrop-blur"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function HeroDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 0.25"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const rotateX = useTransform(progress, [0, 1], [16, 0]);
  const scale = useTransform(progress, [0, 1], [0.94, 1]);

  return (
    <div ref={ref} className="relative [perspective:1600px]">
      <FloatingCard className="bottom-[7%] -left-16 w-[230px]" delay={1.1}>
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold">Fatura importada</p>
            <p className="text-[11px] text-muted-foreground">
              fatura-outubro.pdf · 42 compras
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.4, delay: 1.4, ease }}
              />
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard className="-top-7 -right-14 w-[220px]" delay={1.35}>
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ledger-amber-soft text-[11px] font-semibold text-ledger-amber">
            D
          </span>
          <div>
            <p className="text-[11px] text-muted-foreground">
              Dependente devolve
            </p>
            <p className="text-[15px] font-semibold tabular-nums">
              <CountUp value={177.11} />
            </p>
          </div>
          <CheckCircle2 className="ml-auto size-4 text-primary" />
        </div>
      </FloatingCard>

      <motion.div
        style={{ rotateX, scale, transformOrigin: "50% 0%" }}
        className="relative overflow-hidden rounded-[22px] border border-border bg-background/80 p-1.5 shadow-[0_1px_0_#cfd8cf,0_40px_80px_-32px_rgba(18,38,26,0.45)] backdrop-blur"
      >
        <div className="overflow-hidden rounded-[17px] border border-border bg-background">
          <div className="flex items-center gap-3 border-b border-border bg-ledger-sheet/70 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
            </div>
            <div className="mx-auto flex h-6 w-full max-w-[260px] items-center justify-center gap-1.5 rounded-md bg-secondary text-[11px] text-muted-foreground">
              <Search className="size-3" />
              finync.app/dashboard
            </div>
            <span className="w-[42px]" aria-hidden />
          </div>

          <div className="grid md:grid-cols-[176px_1fr]">
            <aside className="hidden border-r border-border p-3 md:block">
              <p className="px-2 pt-1 pb-3 text-[11px] font-medium text-muted-foreground">
                Outubro 2026
              </p>
              <ul className="grid gap-0.5 text-[12px]">
                {navItems.map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5",
                      item.active
                        ? "bg-ledger-sheet font-medium shadow-[0_1px_2px_rgba(18,38,26,0.06)] ring-1 ring-border"
                        : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" />
                    {item.label}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-dashed border-border p-2.5 text-[11px] text-muted-foreground">
                <Wallet className="mb-1.5 size-3.5 text-primary" />
                3 cartões e 1 conta acompanhados
              </div>
            </aside>

            <div className="grid gap-3 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kpi label="Saldo do mês" value={3482.1} trend="+12% vs set" tone="up" />
                <Kpi label="Gastos" value={2643.8} trend="8% menos que set" tone="up" />
                <div className="col-span-2 sm:col-span-1">
                  <Kpi label="A receber" value={177.11} trend="1 dependente" tone="down" />
                </div>
              </div>

              <Panel>
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold">Saldo em outubro</p>
                  <p className="text-[11px] text-muted-foreground">
                    Passe o cursor no gráfico
                  </p>
                </div>
                <BalanceAreaChart className="h-[150px] sm:h-[170px]" />
              </Panel>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <Panel>
                  <p className="mb-3 text-[13px] font-semibold">Gastos por categoria</p>
                  <CategoryDonut />
                </Panel>
                <Panel className="flex flex-col">
                  <div className="mb-3 flex items-baseline justify-between">
                    <p className="text-[13px] font-semibold">Próximas faturas</p>
                    <p className="text-[11px] text-muted-foreground">parcelas</p>
                  </div>
                  <InstallmentBars className="min-h-[112px] flex-1" />
                </Panel>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
