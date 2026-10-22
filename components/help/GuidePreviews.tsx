"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Film,
  Home,
  KeyRound,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  Undo2,
  Utensils,
  Wifi,
} from "lucide-react";

import { cn } from "@/lib/utils";

const viewport = { once: true, margin: "-60px" } as const;

function list(index: number) {
  return {
    initial: { opacity: 0, y: 6 },
    whileInView: { opacity: 1, y: 0 },
    viewport,
    transition: { duration: 0.3, delay: 0.08 * index, ease: "easeOut" },
  } as const;
}

function Bar({
  value,
  className,
  delay = 0,
}: {
  value: number;
  className: string;
  delay?: number;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
      <motion.div
        className={cn("h-full rounded-full", className)}
        initial={{ width: 0 }}
        whileInView={{ width: Math.min(value, 100) + "%" }}
        viewport={viewport}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
      />
    </div>
  );
}

function Pill({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "emerald" | "amber" | "rose" | "violet" | "sky";
}) {
  const tones = {
    zinc: "bg-zinc-800/80 text-zinc-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
    violet: "bg-violet-500/10 text-violet-300",
    sky: "bg-sky-500/10 text-sky-400",
  };

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function Row({
  index,
  icon,
  title,
  meta,
  right,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  meta?: string;
  right?: ReactNode;
}) {
  return (
    <motion.div
      {...list(index)}
      className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-zinc-900/60 px-2.5 py-2"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-400 [&>svg]:size-3.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-zinc-200">
          {title}
        </span>
        {meta && (
          <span className="block truncate text-[10px] text-zinc-500">
            {meta}
          </span>
        )}
      </span>
      {right}
    </motion.div>
  );
}

function Value({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "emerald" | "rose";
}) {
  return (
    <span
      className={cn(
        "shrink-0 text-xs font-semibold tabular-nums",
        tone === "emerald" && "text-emerald-400",
        tone === "rose" && "text-rose-400",
        tone === "zinc" && "text-zinc-200",
      )}
    >
      {children}
    </span>
  );
}

function MonthPreview() {
  return (
    <div className="space-y-3">
      <motion.div
        {...list(0)}
        className="mx-auto flex w-fit items-center gap-3 rounded-lg border border-white/[0.08] bg-zinc-900/80 px-2 py-1.5"
      >
        <ChevronLeft className="size-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-100">Outubro 2026</span>
        <ChevronRight className="size-3.5 text-zinc-500" />
      </motion.div>
      <motion.div {...list(1)} className="flex justify-center gap-1.5">
        <Pill tone="violet">Fecha dia 5</Pill>
        <Pill tone="violet">Vence dia 12</Pill>
      </motion.div>
      <Row
        index={2}
        icon={<ShoppingCart />}
        title="Compra em 3 out"
        meta="Antes do fechamento"
        right={<Pill tone="emerald">Fatura de out</Pill>}
      />
      <Row
        index={3}
        icon={<ShoppingCart />}
        title="Compra em 8 out"
        meta="Depois do fechamento"
        right={<Pill tone="amber">Fatura de nov</Pill>}
      />
    </div>
  );
}

function DashboardPreview() {
  const tiles = [
    { label: "Receitas", value: "R$ 6.500", tone: "text-emerald-400" },
    { label: "Saldo disponível", value: "R$ 2.140", tone: "text-zinc-100" },
    { label: "Faturas em aberto", value: "R$ 1.870", tone: "text-violet-300" },
    { label: "Pendentes", value: "R$ 980", tone: "text-amber-400" },
  ];

  return (
    <div className="space-y-2.5">
      <motion.div {...list(0)} className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">Visão Geral</span>
        <span className="flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-md border border-white/[0.08] text-zinc-400">
            <Eye className="size-3" />
          </span>
          <span className="flex h-6 items-center gap-1 rounded-md bg-emerald-400 px-2 text-[10px] font-semibold text-zinc-950">
            <Plus className="size-3" />
            Novo
          </span>
        </span>
      </motion.div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.label}
            {...list(index + 1)}
            className="rounded-lg border border-white/[0.05] bg-zinc-900/60 p-2.5"
          >
            <p className="text-[10px] text-zinc-500">{tile.label}</p>
            <p className={cn("mt-1 text-sm font-semibold tabular-nums", tile.tone)}>
              {tile.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IncomePreview() {
  return (
    <motion.div
      {...list(0)}
      className="space-y-3 rounded-lg border border-white/[0.06] bg-zinc-900/60 p-3"
    >
      <p className="text-xs font-semibold text-zinc-100">Nova receita</p>
      <div>
        <p className="text-[10px] text-zinc-500">Valor</p>
        <p className="text-xl font-semibold tabular-nums text-emerald-400">
          R$ 6.500,00
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-white/[0.06] px-2 py-1.5">
          <p className="text-[9px] text-zinc-500">Descrição</p>
          <p className="text-[11px] text-zinc-200">Salário</p>
        </div>
        <div className="rounded-md border border-white/[0.06] px-2 py-1.5">
          <p className="text-[9px] text-zinc-500">Data</p>
          <p className="text-[11px] text-zinc-200">05/10/2026</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Pill tone="emerald">
          <Briefcase className="size-2.5" />
          Salário
        </Pill>
        <span className="rounded-md bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white">
          Salvar receita
        </span>
      </div>
    </motion.div>
  );
}

function TransactionsPreview() {
  return (
    <div className="space-y-2">
      <motion.div
        {...list(0)}
        className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.06] bg-zinc-900/60 px-2.5 text-[11px] text-zinc-500"
      >
        <Search className="size-3.5" />
        Buscar transações
      </motion.div>
      <motion.div {...list(1)} className="flex gap-1.5">
        <Pill tone="emerald">Todas</Pill>
        <Pill>Cartão</Pill>
        <Pill>PIX</Pill>
        <Pill>Alimentação</Pill>
      </motion.div>
      <Row
        index={2}
        icon={<Utensils />}
        title="Mercado"
        meta="Débito · Alimentação"
        right={<Value tone="rose">-R$ 342</Value>}
      />
      <Row
        index={3}
        icon={<ShoppingCart />}
        title="Notebook"
        meta="Cartão · parcela 3/10"
        right={<Value tone="rose">-R$ 450</Value>}
      />
      <Row
        index={4}
        icon={<Briefcase />}
        title="Freelance"
        meta="PIX · Receita"
        right={<Value tone="emerald">+R$ 1.200</Value>}
      />
    </div>
  );
}

function CardsPreview() {
  return (
    <div className="space-y-2.5">
      <motion.div
        {...list(0)}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 p-3.5 text-white shadow-lg shadow-violet-950/40"
      >
        <div className="absolute -right-6 -top-8 size-24 rounded-full bg-white/10" />
        <p className="text-[10px] uppercase tracking-wide text-white/60">
          Fatura de outubro
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">R$ 1.870,40</p>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-xs font-medium">Cartão Principal</span>
          <span className="text-[10px] text-white/70">Fecha 5 · Vence 12</span>
        </div>
      </motion.div>
      <motion.div {...list(1)} className="space-y-1">
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>Limite usado</span>
          <span className="tabular-nums">37% de R$ 5.000</span>
        </div>
        <Bar value={37} className="bg-violet-500" delay={0.2} />
      </motion.div>
      <motion.div {...list(2)} className="flex gap-2">
        <span className="flex-1 rounded-md border border-white/[0.06] px-2 py-1.5 text-[10px] text-zinc-400">
          Você <b className="float-right font-semibold text-zinc-200">R$ 1.420</b>
        </span>
        <span className="flex-1 rounded-md border border-white/[0.06] px-2 py-1.5 text-[10px] text-zinc-400">
          Dependentes <b className="float-right font-semibold text-zinc-200">R$ 450</b>
        </span>
      </motion.div>
    </div>
  );
}

function RecurringPreview() {
  return (
    <div className="space-y-2">
      <Row
        index={0}
        icon={<Home />}
        title="Aluguel"
        meta="PIX · vence dia 10"
        right={
          <span className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Dar baixa
          </span>
        }
      />
      <Row
        index={1}
        icon={<Wifi />}
        title="Internet"
        meta="Débito · vence dia 15"
        right={
          <Pill tone="emerald">
            <Check className="size-2.5" />
            Pago
          </Pill>
        }
      />
      <Row
        index={2}
        icon={<Film />}
        title="Streaming"
        meta="Cartão · cobra dia 20"
        right={<Pill tone="violet">Assinatura</Pill>}
      />
      <motion.p {...list(3)} className="pt-1 text-center text-[10px] text-zinc-500">
        Projetado automaticamente pelos próximos 12 meses
      </motion.p>
    </div>
  );
}

function BudgetsPreview() {
  const budgets = [
    { label: "Alimentação", value: 62, amount: "R$ 496 de R$ 800", bar: "bg-emerald-500" },
    { label: "Transporte", value: 85, amount: "R$ 255 de R$ 300", bar: "bg-amber-400" },
    { label: "Lazer", value: 104, amount: "R$ 312 de R$ 300", bar: "bg-rose-500" },
  ];

  return (
    <div className="space-y-3.5">
      {budgets.map((budget, index) => (
        <motion.div key={budget.label} {...list(index)} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200">
              {budget.label}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] tabular-nums text-zinc-500">
              {budget.amount}
              {budget.value >= 80 && (
                <TriangleAlert
                  className={cn(
                    "size-3",
                    budget.value > 100 ? "text-rose-400" : "text-amber-400",
                  )}
                />
              )}
            </span>
          </div>
          <Bar value={budget.value} className={budget.bar} delay={0.15 * index} />
        </motion.div>
      ))}
    </div>
  );
}

function DependentsPreview() {
  const people = [
    { name: "Ana", initials: "AN", owed: "R$ 320,00", paid: 40 },
    { name: "Pedro", initials: "PE", owed: "R$ 130,00", paid: 100 },
  ];

  return (
    <div className="space-y-2">
      {people.map((person, index) => (
        <motion.div
          key={person.name}
          {...list(index)}
          className="space-y-2 rounded-lg border border-white/[0.05] bg-zinc-900/60 p-2.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-cyan-500/10 text-[10px] font-semibold text-cyan-300">
              {person.initials}
            </span>
            <span className="flex-1 text-xs font-medium text-zinc-200">
              {person.name}
            </span>
            {person.paid === 100 ? (
              <Pill tone="emerald">Quitado</Pill>
            ) : (
              <Value>{person.owed}</Value>
            )}
          </div>
          <Bar value={person.paid} className="bg-cyan-400" delay={0.2 * index} />
        </motion.div>
      ))}
      <motion.div
        {...list(2)}
        className="rounded-md border border-white/[0.08] py-1.5 text-center text-[10px] font-medium text-zinc-300"
      >
        Registrar acerto
      </motion.div>
    </div>
  );
}

function CategoriesPreview() {
  const categories = [
    { icon: Utensils, label: "Alimentação", tone: "rose" as const },
    { icon: Car, label: "Transporte", tone: "amber" as const },
    { icon: Home, label: "Moradia", tone: "sky" as const },
    { icon: Film, label: "Lazer", tone: "violet" as const },
    { icon: Briefcase, label: "Salário", tone: "emerald" as const },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((category, index) => {
          const Icon = category.icon;

          return (
            <motion.span key={category.label} {...list(index)}>
              <Pill tone={category.tone}>
                <Icon className="size-2.5" />
                {category.label}
              </Pill>
            </motion.span>
          );
        })}
      </div>
      <motion.div
        {...list(5)}
        className="space-y-2 rounded-lg border border-dashed border-white/[0.1] p-2.5"
      >
        <p className="text-[10px] text-zinc-500">Nova categoria</p>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-fuchsia-500/10 text-fuchsia-300">
            <Plus className="size-3.5" />
          </span>
          <span className="flex-1 text-xs text-zinc-200">Pets</span>
          <Pill>Despesa</Pill>
        </div>
      </motion.div>
    </div>
  );
}

function ImportPreview() {
  return (
    <div className="space-y-2">
      <motion.div
        {...list(0)}
        className="flex items-center gap-2.5 rounded-lg border border-dashed border-blue-500/30 bg-blue-500/[0.04] px-3 py-2.5"
      >
        <FileText className="size-4 text-blue-400" />
        <span className="flex-1 text-xs text-zinc-200">fatura-outubro.pdf</span>
        <Check className="size-3.5 text-emerald-400" />
      </motion.div>
      <Row
        index={1}
        icon={<Utensils />}
        title="Restaurante"
        meta="Alimentação (sugerida)"
        right={<Pill tone="emerald">Novo</Pill>}
      />
      <Row
        index={2}
        icon={<Film />}
        title="Streaming"
        meta="Já lançado neste mês"
        right={<Pill tone="amber">Duplicado</Pill>}
      />
      <Row
        index={3}
        icon={<ShoppingCart />}
        title="Loja online 2/6"
        meta="Parcela identificada"
        right={<Pill tone="sky">Revisar</Pill>}
      />
    </div>
  );
}

function AnalyticsPreview() {
  const months = [
    { label: "Mai", income: 70, expense: 58 },
    { label: "Jun", income: 72, expense: 66 },
    { label: "Jul", income: 70, expense: 52 },
    { label: "Ago", income: 85, expense: 61 },
    { label: "Set", income: 74, expense: 70 },
    { label: "Out", income: 80, expense: 49 },
  ];

  return (
    <div className="space-y-3">
      <motion.div {...list(0)} className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[0.05] bg-zinc-900/60 p-2.5">
          <p className="text-[10px] text-zinc-500">Balanço líquido</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-400">
            +R$ 1.980
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.05] bg-zinc-900/60 p-2.5">
          <p className="text-[10px] text-zinc-500">Taxa de poupança</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
            30%
          </p>
        </div>
      </motion.div>
      <div className="flex h-24 items-end justify-between gap-2 px-1">
        {months.map((month, index) => (
          <div key={month.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end justify-center gap-0.5">
              <motion.span
                className="w-1/2 max-w-2.5 rounded-t-sm bg-emerald-500/80"
                initial={{ height: 0 }}
                whileInView={{ height: month.income + "%" }}
                viewport={viewport}
                transition={{ duration: 0.6, delay: 0.06 * index, ease: "easeOut" }}
              />
              <motion.span
                className="w-1/2 max-w-2.5 rounded-t-sm bg-rose-400/70"
                initial={{ height: 0 }}
                whileInView={{ height: month.expense + "%" }}
                viewport={viewport}
                transition={{ duration: 0.6, delay: 0.06 * index + 0.1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[9px] text-zinc-500">{month.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrityPreview() {
  return (
    <div className="space-y-2">
      <Row
        index={0}
        icon={<Check className="text-emerald-400" />}
        title="Faturas e pagamentos"
        right={<Pill tone="emerald">OK</Pill>}
      />
      <Row
        index={1}
        icon={<Check className="text-emerald-400" />}
        title="Vínculos de cartões"
        right={<Pill tone="emerald">OK</Pill>}
      />
      <Row
        index={2}
        icon={<TriangleAlert className="text-amber-400" />}
        title="2 parcelas isoladas"
        meta="Grupo de parcelas incompleto"
        right={
          <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-300">
            Revisar
            <ArrowRight className="size-3" />
          </span>
        }
      />
    </div>
  );
}

function ActivityPreview() {
  const events = [
    { icon: Plus, title: "Criou “Mercado”", meta: "Hoje, 14:20", tone: "text-emerald-400" },
    { icon: Pencil, title: "Editou valor: R$ 120 → R$ 150", meta: "Hoje, 11:05", tone: "text-sky-400", undo: true },
    { icon: Trash2, title: "Excluiu “Farmácia”", meta: "Ontem, 19:42", tone: "text-rose-400" },
  ];

  return (
    <div className="relative space-y-3 pl-1">
      <div className="absolute bottom-3 left-[17px] top-3 w-px bg-zinc-800" />
      {events.map((event, index) => {
        const Icon = event.icon;

        return (
          <motion.div
            key={event.title}
            {...list(index)}
            className="relative flex items-center gap-2.5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-zinc-950">
              <Icon className={cn("size-3", event.tone)} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-zinc-200">
                {event.title}
              </span>
              <span className="block text-[10px] text-zinc-500">{event.meta}</span>
            </span>
            {event.undo && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Undo2 className="size-3" />
                Desfazer
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function BackupPreview() {
  const files = [
    { icon: FileJson, title: "Backup completo", meta: "finync-backup.json", tone: "text-cyan-400" },
    { icon: FileSpreadsheet, title: "Extrato para planilha", meta: "transacoes.csv", tone: "text-emerald-400" },
  ];

  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const Icon = file.icon;

        return (
          <Row
            key={file.title}
            index={index}
            icon={<Icon className={file.tone} />}
            title={file.title}
            meta={file.meta}
            right={
              <span className="flex size-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-300">
                <Download className="size-3.5" />
              </span>
            }
          />
        );
      })}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors",
        on ? "justify-end bg-emerald-500" : "justify-start bg-zinc-700",
      )}
    >
      <motion.span layout className="size-3 rounded-full bg-white" />
    </span>
  );
}

function SettingsPreview() {
  return (
    <div className="space-y-2">
      <Row
        index={0}
        icon={<Eye />}
        title="Iniciar com saldos ocultos"
        right={<Toggle on />}
      />
      <Row
        index={1}
        icon={<Bell />}
        title="Notificações do navegador"
        right={<Toggle on={false} />}
      />
      <Row
        index={2}
        icon={<span className="text-[10px] font-semibold">R$</span>}
        title="Moeda"
        right={<Pill>BRL</Pill>}
      />
    </div>
  );
}

function SecurityPreview() {
  return (
    <div className="space-y-3">
      <motion.div {...list(0)} className="flex justify-center py-1">
        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/20">
          <ShieldCheck className="size-6" />
        </span>
      </motion.div>
      <Row index={1} icon={<LockKeyhole />} title="Sessão protegida em todas as rotas" />
      <Row index={2} icon={<KeyRound />} title="Dados isolados por conta" />
      <Row index={3} icon={<LogOut />} title="Sair limpa os dados locais" />
    </div>
  );
}

const previews: Record<string, () => ReactNode> = {
  competencia: MonthPreview,
  dashboard: DashboardPreview,
  receitas: IncomePreview,
  transacoes: TransactionsPreview,
  cartoes: CardsPreview,
  recorrencias: RecurringPreview,
  orcamentos: BudgetsPreview,
  dependentes: DependentsPreview,
  categorias: CategoriesPreview,
  importacao: ImportPreview,
  analytics: AnalyticsPreview,
  integridade: IntegrityPreview,
  atividades: ActivityPreview,
  backup: BackupPreview,
  privacidade: SettingsPreview,
  seguranca: SecurityPreview,
};

export function GuidePreview({ sectionId }: { sectionId: string }) {
  const Preview = previews[sectionId];

  if (!Preview) return null;

  return (
    <div
      aria-hidden="true"
      className="relative self-start overflow-hidden rounded-xl border border-white/[0.07] bg-zinc-950 p-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <Preview />
    </div>
  );
}
