"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleUserRound,
  FileSpreadsheet,
  LockKeyhole,
  MoveDownRight,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { FinyncLogo } from "@/components/branding/FinyncLogo";

const transactions = [
  ["Mercado São Luiz", "Alimentação", "− R$ 284,90"],
  ["Uber", "Transporte", "− R$ 42,60"],
  ["Spotify", "Assinaturas", "− R$ 21,90"],
] as const;
const bars = [36, 54, 43, 72, 58, 81, 66, 92, 74, 61, 48, 57];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 24 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 24 });
  const rotateX = useTransform(
    smoothY,
    [-0.5, 0.5],
    reduceMotion ? [0, 0] : [2.5, -2.5],
  );
  const rotateY = useTransform(
    smoothX,
    [-0.5, 0.5],
    reduceMotion ? [0, 0] : [-3, 3],
  );

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 1600 }}
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative lg:ml-8"
    >
      <div className="absolute -inset-px rounded-[25px] bg-white/[0.08]" />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d0e0e] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
        <div className="flex h-14 items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Visão mensal
            </span>
          </div>
          <span className="text-xs text-zinc-500">Setembro 2026</span>
        </div>
        <div className="border-b border-white/[0.07] px-5 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs text-zinc-500">Saldo livre</p>
              <p className="mt-2 text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl">
                R$ 4.380,20
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-xs text-emerald-300">
              +8,4%
            </span>
          </div>
          <div className="mt-8 flex h-32 items-end gap-2">
            {bars.map((height, index) => (
              <motion.div
                key={index}
                className="group flex h-full flex-1 items-end"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.55, delay: 0.45 + index * 0.035 }}
                style={{ transformOrigin: "bottom" }}
              >
                <div
                  className={`w-full rounded-t-[2px] transition-colors ${index === bars.length - 1 ? "bg-emerald-400" : "bg-zinc-700 group-hover:bg-zinc-600"}`}
                  style={{ height: `${height}%` }}
                />
              </motion.div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-zinc-700">
            <span>Jan</span>
            <span>Jun</span>
            <span>Dez</span>
          </div>
        </div>
        <div className="grid divide-y divide-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["Receitas", "R$ 6.750,00"],
            ["Despesas", "R$ 2.369,80"],
            ["Fatura", "R$ 1.842,30"],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-5">
              <p className="text-[11px] text-zinc-600">{label}</p>
              <p className="mt-1.5 text-sm font-medium text-zinc-200">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-8 -left-4 hidden w-56 rounded-2xl border border-white/10 bg-[#141515] p-4 shadow-2xl md:block lg:-left-12"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">Limite disponível</span>
          <MoveDownRight className="size-3.5 text-emerald-400" />
        </div>
        <p className="mt-3 text-xl font-medium tracking-tight">R$ 7.157,70</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "72%" }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-full bg-emerald-400"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ModernLandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090a0a] text-zinc-50 selection:bg-emerald-300 selection:text-zinc-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#090a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Finync"
          >
            <FinyncLogo eager className="w-24 brightness-125" />
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] text-zinc-500 md:flex">
            <a
              href="#produto"
              className="transition-colors hover:text-zinc-100"
            >
              Produto
            </a>
            <a
              href="#recursos"
              className="transition-colors hover:text-zinc-100"
            >
              Recursos
            </a>
            <a
              href="#seguranca"
              className="transition-colors hover:text-zinc-100"
            >
              Segurança
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center px-4 text-sm text-zinc-400 transition-colors hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Criar conta <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/[0.07] pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_72px]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-68px)] w-full max-w-[1440px] items-center gap-16 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.86fr_1.14fr] lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500"
            >
              <span className="h-px w-8 bg-emerald-400" />
              Clareza para o seu dinheiro
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-8 text-[clamp(3.25rem,6vw,6.6rem)] font-medium leading-[0.92] tracking-[-0.065em]"
            >
              Seu dinheiro,
              <span className="block text-zinc-500">sem pontos cegos.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-8 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8"
            >
              Faturas, despesas, dependentes e receitas em uma leitura única. O
              Finync transforma a rotina financeira em decisões claras.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
              >
                Começar gratuitamente <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/12 px-6 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.03]"
              >
                Explorar demonstração{" "}
                <ChevronRight className="size-4 text-zinc-600" />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-12 flex items-center gap-7 border-t border-white/[0.08] pt-6 text-xs text-zinc-600"
            >
              <span>Sem planilhas</span>
              <span>Sem cartão</span>
              <span>Dados privados</span>
            </motion.div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-white/[0.07]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-white/[0.07] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {[
            ["01", "Uma visão", "Tudo o que entra, sai e fica comprometido."],
            ["02", "Seu contexto", "Dependentes separados do seu saldo real."],
            [
              "03",
              "Menos esforço",
              "CSV reconhecido antes de chegar à fatura.",
            ],
          ].map(([number, title, description]) => (
            <div key={number} className="py-8 sm:px-7 first:pl-0 last:pr-0">
              <span className="text-xs text-emerald-400">{number}</span>
              <p className="mt-5 text-lg font-medium">{title}</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="produto"
        className="border-b border-white/[0.07] py-20 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <Reveal className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                Feito para a vida real
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-medium leading-[1.04] tracking-[-0.045em] sm:text-6xl">
                Controle sem transformar sua vida em contabilidade.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-zinc-500 lg:justify-self-end">
              O produto cuida da complexidade de ciclos, parcelas e
              responsáveis. Você fica com uma visão limpa do que realmente
              importa.
            </p>
          </Reveal>
          <div id="recursos" className="mt-16 grid gap-4 lg:grid-cols-12">
            <Reveal
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0e0e] lg:col-span-7"
              delay={0.05}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-white/10">
                    <FileSpreadsheet className="size-4 text-emerald-400" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    Importação
                  </span>
                </div>
                <h3 className="mt-10 text-2xl font-medium tracking-tight sm:text-3xl">
                  Sua fatura entra organizada.
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">
                  Revise categorias, parcelas, duplicidades e responsáveis antes
                  de salvar.
                </p>
              </div>
              <div className="border-t border-white/[0.07]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-2">
                    <Upload className="size-3.5" /> fatura-setembro.csv
                  </span>
                  <span className="text-emerald-400">18 reconhecidos</span>
                </div>
                {transactions.map(([name, category, amount]) => (
                  <div
                    key={name}
                    className="grid grid-cols-[1fr_auto] items-center border-b border-white/[0.05] px-5 py-4 last:border-0 sm:grid-cols-[1fr_150px_auto]"
                  >
                    <span className="flex items-center gap-3 text-sm text-zinc-200">
                      <Check className="size-3.5 text-emerald-400" />
                      {name}
                    </span>
                    <span className="hidden text-xs text-zinc-600 sm:block">
                      {category}
                    </span>
                    <span className="text-sm text-zinc-400">{amount}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal
              className="rounded-2xl border border-white/[0.08] bg-[#0d0e0e] p-6 sm:p-8 lg:col-span-5"
              delay={0.12}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg border border-white/10">
                  <CircleUserRound className="size-4 text-emerald-400" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Dependentes
                </span>
              </div>
              <h3 className="mt-10 text-2xl font-medium tracking-tight sm:text-3xl">
                A fatura é uma. O saldo é seu.
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Separe compras de terceiros sem perder a visão completa do
                cartão.
              </p>
              <div className="mt-10 border-y border-white/[0.07]">
                {[
                  ["Seu consumo", "R$ 3.286,40"],
                  ["Duda deve", "R$ 177,11"],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-white/[0.07] py-5 last:border-0"
                  >
                    <span className="text-sm text-zinc-500">{label}</span>
                    <span
                      className={index ? "text-emerald-300" : "text-zinc-100"}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="seguranca" className="py-20 sm:py-32">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <Reveal className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-zinc-100 px-6 py-14 text-zinc-950 sm:px-12 sm:py-20 lg:px-20">
            <div className="absolute right-0 top-0 hidden h-full w-1/3 border-l border-black/10 lg:block">
              <div className="flex h-full items-center justify-center">
                <div className="flex size-40 items-center justify-center rounded-full border border-black/10">
                  <div className="flex size-24 items-center justify-center rounded-full border border-black/10">
                    <ShieldCheck className="size-8" strokeWidth={1.4} />
                  </div>
                </div>
              </div>
            </div>
            <div className="relative max-w-3xl lg:max-w-[62%]">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <LockKeyhole className="size-3.5" /> Privacidade por padrão
              </p>
              <h2 className="mt-6 text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                Chega de adivinhar para onde seu dinheiro foi.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">
                Comece gratuitamente. Organize sua próxima fatura e enxergue o
                mês inteiro sem fórmulas ou abas infinitas.
              </p>
              <Link
                href="/signup"
                className="mt-9 inline-flex h-12 items-center gap-2 rounded-lg bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Criar minha conta <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <FinyncLogo className="w-20 brightness-125" />
          </div>
          <p>Controle financeiro pessoal, sem ruído.</p>
          <Link href="/login" className="transition-colors hover:text-white">
            Acessar minha conta
          </Link>
        </div>
      </footer>
    </main>
  );
}
