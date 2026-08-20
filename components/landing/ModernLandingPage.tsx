"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleUserRound,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

const importRows = [
  ["Mercado São Luiz", "Alimentação", "R$ 284,90"],
  ["Uber", "Transporte", "R$ 42,60"],
  ["Spotify", "Assinatura", "R$ 21,90"],
];

const steps = [
  {
    number: "01",
    title: "Baixe o CSV",
    description: "Exporte a fatura diretamente do aplicativo do seu banco.",
  },
  {
    number: "02",
    title: "Importe no Finync",
    description: "Revise categorias, parcelas e responsáveis antes de confirmar.",
  },
  {
    number: "03",
    title: "Decida com clareza",
    description: "Veja saldo, faturas, dependentes e gráficos sem planilhas.",
  },
];

const floatingCards = [
  { label: "Fatura aberta", value: "R$ 1.842,30", className: "left-[7%] top-[17%]" },
  { label: "CSV importado", value: "41 itens", className: "right-[8%] top-[26%]" },
  { label: "Dependentes", value: "R$ 177,11", className: "bottom-[22%] left-[10%]" },
];

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <motion.div
        className="absolute -left-32 top-12 size-96 rounded-full bg-emerald-500/18 blur-3xl"
        animate={{ x: [0, 80, 20, 0], y: [0, 40, -20, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-36 size-[28rem] rounded-full bg-cyan-500/10 blur-3xl"
        animate={{ x: [0, -70, 10, 0], y: [0, -30, 40, 0], scale: [1, 0.94, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-52 w-[34rem] rounded-full bg-white/8 blur-3xl"
        animate={{ opacity: [0.25, 0.45, 0.25], x: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function DashboardMock() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 90, damping: 18 });
  const smoothY = useSpring(mouseY, { stiffness: 90, damping: 18 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-14 w-full max-w-6xl"
    >
      {floatingCards.map((card, index) => (
        <motion.div
          key={card.label}
          className={`absolute z-20 hidden rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl lg:block ${card.className}`}
          animate={{ y: [0, index % 2 ? 12 : -12, 0] }}
          transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-xs text-zinc-500">{card.label}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{card.value}</p>
        </motion.div>
      ))}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 text-left shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-zinc-400">Setembro de 2026</span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <ShieldCheck className="size-3.5" />
            Dados sincronizados
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/[0.08] sm:grid-cols-4">
          {[
            ["Saldo disponível", "R$ 4.380,20", "text-white"],
            ["Receitas", "R$ 6.750,00", "text-emerald-300"],
            ["Faturas abertas", "R$ 1.842,30", "text-zinc-100"],
            ["Pendentes", "R$ 684,00", "text-amber-300"],
          ].map(([label, value, tone]) => (
            <div key={label} className="bg-zinc-900 p-4 sm:p-6">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-2 text-xl font-semibold sm:text-2xl ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-px bg-white/[0.08] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-zinc-950 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Fluxo do mês</p>
                <p className="mt-1 text-xs text-zinc-500">Receitas e despesas pessoais</p>
              </div>
              <BarChart3 className="size-5 text-emerald-400" />
            </div>
            <div className="mt-8 flex h-32 items-end gap-3 sm:gap-5">
              {[42, 58, 46, 72, 63, 84, 69, 91].map((height, index) => (
                <motion.div
                  key={index}
                  className="flex h-full flex-1 items-end"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.05 }}
                  style={{ transformOrigin: "bottom" }}
                >
                  <div className="w-full rounded-t-sm bg-zinc-700" style={{ height: `${height}%` }}>
                    <div className="h-1.5 w-full rounded-t-sm bg-emerald-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-950 p-5 sm:p-6">
            <p className="text-sm font-medium text-white">Últimos lançamentos</p>
            <div className="mt-5 space-y-4">
              {importRows.map(([name, category, amount]) => (
                <div key={name} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{name}</p>
                    <p className="mt-1 text-xs text-zinc-600">{category}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-zinc-300">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ModernLandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-zinc-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Finync">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950">
              <Landmark className="size-5" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Finync</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#recursos" className="transition-colors hover:text-white">
              Recursos
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-white">
              Como funciona
            </a>
            <a href="#seguranca" className="transition-colors hover:text-white">
              Segurança
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate min-h-screen border-b border-white/[0.08] pt-16">
        <AnimatedBackground />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-14 pt-14 text-center sm:px-8 sm:pt-24 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur"
          >
            <Sparkles className="size-3.5 text-emerald-400" />
            Controle financeiro sem ruído operacional
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="mt-6 max-w-5xl text-4xl font-semibold leading-[1.04] tracking-tight sm:mt-7 sm:text-7xl lg:text-[88px]"
          >
            Assuma o controle financeiro sem planilhas.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="mt-5 max-w-2xl text-[15px] leading-7 text-zinc-400 sm:mt-7 sm:text-lg sm:leading-8"
          >
            Importe faturas, separe dependentes, acompanhe ciclos de cartão e
            entenda quanto sobra de verdade no mês, sem fórmulas manuais.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
            className="mt-8 flex w-full max-w-xs flex-col justify-center gap-3 sm:max-w-none sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 sm:w-auto"
            >
              Começar grátis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-zinc-950/80 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06] sm:w-auto"
            >
              Ver painel demo
              <ChevronRight className="size-4 text-zinc-500" />
            </Link>
          </motion.div>

          <DashboardMock />
        </div>
      </section>

      <section id="recursos" className="border-b border-white/[0.08] py-16 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-sm font-semibold text-emerald-400">O que muda na prática</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Menos trabalho operacional. Mais contexto para decidir.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Recursos pensados para limpar a bagunça real: CSV, parcelas,
              dependentes, faturas e análise pessoal.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 lg:grid-cols-12">
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-7 lg:p-8"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950">
                <FileSpreadsheet className="size-5" />
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-tight">Importação inteligente de CSV</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                Reconheça descrições, parcelas, duplicidades e responsáveis
                antes de gravar os dados no mês correto.
              </p>

              <div className="mt-8 overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-950">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Upload className="size-3.5" />
                    fatura-setembro.csv
                  </div>
                  <span className="text-xs text-emerald-400">18 itens reconhecidos</span>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {importRows.map(([name, category, amount]) => (
                    <div
                      key={name}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_160px_auto]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Check className="size-4 shrink-0 text-emerald-400" />
                        <span className="truncate text-sm text-zinc-200">{name}</span>
                      </div>
                      <span className="hidden rounded-md bg-white/[0.06] px-2 py-1 text-xs text-zinc-400 sm:block">
                        {category}
                      </span>
                      <span className="text-sm font-medium text-zinc-300">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-5 lg:p-8"
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-white/[0.08] text-emerald-400">
                <CircleUserRound className="size-5" />
              </div>
              <h3 className="mt-7 text-2xl font-semibold tracking-tight">Dependentes sem contaminar seu saldo</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Gastos de terceiros continuam na fatura, mas saem da análise do
                seu fluxo pessoal.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  ["Seu fluxo pessoal", "R$ 3.286,40", "text-zinc-100"],
                  ["Duda deve", "R$ 177,11", "text-emerald-300"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-lg border border-white/[0.08] bg-zinc-950 p-4">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p>
                  </div>
                ))}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-12 lg:p-8"
            >
              <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
                <div>
                  <div className="flex size-11 items-center justify-center rounded-lg bg-white/[0.08] text-emerald-400">
                    <BarChart3 className="size-5" />
                  </div>
                  <h3 className="mt-7 text-2xl font-semibold tracking-tight">Analytics cirúrgico</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">
                    KPIs e gráficos isolam dependentes para mostrar sua saúde
                    financeira real.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-5">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-xs text-zinc-500">Despesa pessoal</p>
                      <p className="mt-2 text-2xl font-semibold">R$ 3.286,40</p>
                    </div>
                    <p className="text-xs text-emerald-400">12% abaixo de maio</p>
                  </div>
                  <div className="mt-8 flex h-36 items-end gap-2 sm:gap-4">
                    {[54, 69, 61, 82, 74, 64, 48, 57, 43, 38].map((height, index) => (
                      <motion.div
                        key={index}
                        className={index === 9 ? "w-full rounded-t-sm bg-emerald-400" : "w-full rounded-t-sm bg-zinc-700"}
                        style={{ height: `${height}%` }}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.035 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-b border-white/[0.08] py-16 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald-400">Como funciona</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Da fatura ao resumo em três passos.
            </h2>
          </div>

          <div className="mt-10 grid border-y border-white/10 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`py-8 md:px-8 ${index > 0 ? "border-t border-white/10 md:border-l md:border-t-0" : ""}`}
              >
                <span className="text-sm font-semibold text-emerald-400">{step.number}</span>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="py-16 sm:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.6 }}
            className="grid gap-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14"
          >
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <LockKeyhole className="size-4" />
                Privacidade por padrão
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Seu dinheiro merece uma visão melhor.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                Comece gratuitamente e transforme sua próxima fatura em decisões
                claras, sem fórmulas ou abas infinitas.
              </p>
            </div>

            <Link
              href="/signup"
              className="inline-flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-emerald-400 px-7 text-base font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 lg:w-auto"
            >
              Criar minha conta
              <ArrowRight className="size-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <Landmark className="size-4 text-emerald-400" />
            <span className="font-semibold">Finync</span>
          </div>
          <p>Controle financeiro pessoal, sem planilhas.</p>
          <Link href="/login" className="transition-colors hover:text-white">
            Acessar minha conta
          </Link>
        </div>
      </footer>
    </main>
  );
}
