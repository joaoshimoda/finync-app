"use client";

import { MotionConfig, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  History,
  Lock,
  Repeat,
  ScanSearch,
  Sparkles,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";

import { FinyncLogo } from "@/components/branding/FinyncLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { BudgetBars, InstallmentBars, brl, ease } from "./charts";
import { archivo } from "./fonts";
import { HeroDashboard } from "./HeroDashboard";
import { InvoiceSplitDemo } from "./InvoiceSplitDemo";
import { ProductTabs } from "./ProductTabs";

const reveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  className,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <Reveal className={cn("max-w-[42rem]", className)}>
      <p
        className={cn(
          "text-[13px] font-medium tracking-[0.08em] uppercase",
          tone === "light" ? "text-primary" : "text-ledger-mint",
        )}
      >
        {eyebrow}
      </p>
      <h2 className="mt-4 text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.04] font-semibold tracking-[-0.03em] [font-stretch:88%]">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-5 text-[17px] leading-[1.6]",
            tone === "light" ? "text-muted-foreground" : "text-[#b9c7bd]",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

/* A card whose border picks up a soft glow under the pointer. The glow is
   driven by CSS variables so moving the mouse never re-renders React. */
function BentoCard({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <motion.div
      variants={reveal}
      onPointerMove={trackPointer}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-border bg-ledger-sheet p-6 transition-shadow duration-300 hover:shadow-[0_24px_48px_-28px_rgba(18,38,26,0.35)] sm:p-7",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 0%), rgba(47,125,74,0.09), transparent 70%)",
        }}
      />
      <div className="relative">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-2 max-w-[34rem] text-[15px] leading-[1.6] text-muted-foreground">
          {description}
        </p>
      </div>
      {children ? <div className="relative mt-7 flex-1">{children}</div> : null}
    </motion.div>
  );
}

function InstallmentTrack() {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">Notebook · Magazine Luiza</span>
        <span className="text-muted-foreground tabular-nums">4 de 10</span>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => (
          <motion.span
            key={index}
            className={cn(
              "h-2 flex-1 origin-left rounded-full",
              index < 4 ? "bg-primary" : "bg-border",
            )}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.05, duration: 0.4, ease }}
          />
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {brl.format(389.9)} por mês até mar 2027
      </p>
    </div>
  );
}

const historyEntries = [
  { action: "Categoria de Uber alterada", detail: "Lazer → Transporte", time: "9h12" },
  { action: "Compra marcada como do dependente", detail: "Renner, parcela 2 de 4", time: "8h47" },
  { action: "Fatura de outubro importada", detail: "42 compras", time: "ontem" },
];

function HistoryFeed() {
  return (
    <motion.ul
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid gap-2"
    >
      {historyEntries.map((entry, index) => (
        <motion.li
          key={entry.action}
          variants={reveal}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-[12px]",
            index > 0 && "opacity-70",
          )}
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{entry.action}</span>
            <span className="block truncate text-muted-foreground">
              {entry.detail} · {entry.time}
            </span>
          </span>
          {index === 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground">
              <Undo2 className="size-3" />
              Desfazer
            </span>
          ) : null}
        </motion.li>
      ))}
    </motion.ul>
  );
}

function IntegrityScan() {
  const rows = ["Mercado São Luiz", "Uber", "Uber", "Spotify Família"];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background/60">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-primary/15 to-transparent"
        animate={{ top: ["-20%", "100%"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
      />
      <ul className="divide-y divide-border text-[12px]">
        {rows.map((row, index) => {
          const flagged = index === 1 || index === 2;
          return (
            <li
              key={`${row}-${index}`}
              className={cn(
                "flex items-center justify-between px-3.5 py-2",
                flagged && "bg-ledger-amber-soft/40",
              )}
            >
              <span>{row}</span>
              {flagged ? (
                <span className="font-medium text-ledger-amber">Repetida?</span>
              ) : (
                <Check className="size-3.5 text-primary" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const recurring = [
  { name: "Aluguel", day: "05", amount: 1850, kind: "saída" },
  { name: "Salário", day: "05", amount: 6400, kind: "entrada" },
  { name: "Academia", day: "12", amount: 119.9, kind: "saída" },
];

function RecurringList() {
  return (
    <ul className="grid gap-2 text-[12px]">
      {recurring.map((item) => (
        <li
          key={item.name}
          className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3.5 py-2.5"
        >
          <span className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-secondary text-[11px] font-semibold tabular-nums">
              {item.day}
            </span>
            {item.name}
          </span>
          <span
            className={cn(
              "tabular-nums",
              item.kind === "entrada" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {item.kind === "entrada" ? "+" : "−"}
            {brl.format(item.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const dependentPoints = [
  "Marque compras inteiras ou só algumas parcelas",
  "Saldo a receber de cada dependente, mês a mês",
  "Registre o acerto quando o valor for devolvido",
];

const faqs = [
  {
    question: "Quais bancos posso importar?",
    answer:
      "Faturas em PDF do Nubank, Inter e Bradesco são lidas automaticamente. Para os demais, você pode importar um arquivo CSV.",
  },
  {
    question: "Preciso conectar minha conta bancária?",
    answer:
      "Não. Você envia o arquivo da fatura e decide o que entra. O Finync não pede sua senha do banco.",
  },
  {
    question: "O que é um dependente?",
    answer:
      "É qualquer pessoa que usa seu cartão: filho, cônjuge, um amigo. Você marca as compras dela e o Finync calcula quanto ela deve devolver.",
  },
  {
    question: "E se eu mudar algo por engano?",
    answer:
      "Toda alteração fica no histórico. Você vê o que mudou, quando mudou, e pode desfazer com um clique.",
  },
  {
    question: "Quanto custa?",
    answer:
      "Você cria a conta grátis e começa a usar sem informar cartão de crédito.",
  },
];

const banks = ["Nubank", "Inter", "Bradesco", "Arquivo CSV"];

export function ModernLandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={cn(
          archivo.variable,
          "landing min-h-screen overflow-x-hidden bg-background font-landing text-foreground selection:bg-primary selection:text-primary-foreground",
        )}
      >
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
          <Container className="flex h-16 items-center justify-between">
            <Link
              href="/"
              aria-label="Finync, página inicial"
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FinyncLogo eager className="w-[88px]" />
            </Link>
            <nav
              aria-label="Seções"
              className="hidden items-center gap-1 text-[14px] text-muted-foreground md:flex"
            >
              {[
                ["#como-funciona", "Como funciona"],
                ["#recursos", "Recursos"],
                ["#dependentes", "Dependentes"],
                ["#perguntas", "Perguntas"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                className="hidden text-muted-foreground sm:inline-flex"
              >
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <Link href="/signup">Criar conta</Link>
              </Button>
            </div>
          </Container>
        </header>

        <section className="relative pt-16 pb-16 sm:pt-24">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
            <div className="landing-grid absolute inset-0" />
            <motion.div
              className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,125,74,0.22),transparent)] blur-2xl"
              animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-[30%] -right-40 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(183,121,15,0.14),transparent)] blur-2xl"
              animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <Container className="relative">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="mx-auto flex max-w-[52rem] flex-col items-center text-center"
            >
              <motion.div variants={reveal}>
                <Link
                  href="#dependentes"
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-ledger-sheet/80 py-1 pr-3 pl-1 text-[13px] shadow-sm backdrop-blur transition-colors hover:border-primary/40"
                >
                  <Badge className="rounded-full px-2">Novo</Badge>
                  <span className="text-muted-foreground">
                    Acerto de contas com dependentes
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
              <motion.h1
                variants={reveal}
                className="mt-7 text-[clamp(2.75rem,7.5vw,5.75rem)] leading-[0.95] font-semibold tracking-[-0.04em] [font-stretch:88%]"
              >
                Seu dinheiro,{" "}
                <span className="bg-gradient-to-br from-primary via-[#3f8a58] to-[#1d4a2b] bg-clip-text text-transparent">
                  sem pontos cegos.
                </span>
              </motion.h1>
              <motion.p
                variants={reveal}
                className="mt-7 max-w-[38rem] text-[18px] leading-[1.6] text-muted-foreground"
              >
                Importe a fatura do cartão, separe o que é de cada dependente e
                veja quanto do mês é realmente seu. Parcelas, assinaturas e
                receitas na mesma conta.
              </motion.p>
              <motion.div
                variants={reveal}
                className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
              >
                <Button
                  asChild
                  size="lg"
                  className="group rounded-full px-7 text-[15px] shadow-[0_8px_24px_-8px_rgba(44,96,60,0.6)]"
                >
                  <Link href="/signup">
                    Criar conta grátis
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-ledger-sheet/70 px-7 text-[15px] backdrop-blur hover:bg-ledger-sheet"
                >
                  <Link href="/demo">Explorar demonstração</Link>
                </Button>
              </motion.div>
              <motion.p
                variants={reveal}
                className="mt-5 flex items-center gap-2 text-[13px] text-muted-foreground"
              >
                <Lock className="size-3.5" />
                Sem cartão de crédito. Sem senha do banco.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.45, ease }}
              className="mx-auto mt-16 max-w-[1080px] sm:mt-20"
            >
              <HeroDashboard />
            </motion.div>
          </Container>
        </section>

        <section aria-label="Bancos compatíveis" className="pb-20">
          <Container>
            <Reveal className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
              <p className="text-[13px] text-muted-foreground">Importe faturas de</p>
              <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {banks.map((bank) => (
                  <li
                    key={bank}
                    className="text-[19px] font-semibold tracking-[-0.02em] text-foreground/45 [font-stretch:80%]"
                  >
                    {bank}
                  </li>
                ))}
              </ul>
            </Reveal>
          </Container>
        </section>

        <section id="como-funciona" className="scroll-mt-16 border-t border-border py-24 sm:py-32">
          <Container>
            <SectionIntro
              eyebrow="Como funciona"
              title="Da fatura em PDF ao saldo do mês, em três passos."
              className="mb-14"
            />
            <Reveal>
              <ProductTabs />
            </Reveal>
          </Container>
        </section>

        <section id="recursos" className="scroll-mt-16 border-t border-border py-24 sm:py-32">
          <Container>
            <SectionIntro
              eyebrow="Recursos"
              title="Feito para como o cartão funciona no Brasil."
              description="Parcelamento, fatura que fecha no meio do mês e compra feita para outra pessoa. O Finync organiza cada caso sem você precisar de fórmula."
              className="mb-14"
            />
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <BentoCard
                className="md:col-span-2"
                icon={<CalendarClock className="size-4" />}
                title="Parcelas na fatura certa"
                description="Uma compra em 10x aparece em cada uma das dez faturas, com o número da parcela. Você vê quanto das próximas faturas já está comprometido."
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,260px)]">
                  <div className="h-[170px] rounded-xl border border-border bg-background/60 p-4">
                    <InstallmentBars />
                  </div>
                  <InstallmentTrack />
                </div>
              </BentoCard>
              <BentoCard
                icon={<Sparkles className="size-4" />}
                title="Orçamento por categoria"
                description="Defina limites e acompanhe o consumo ao longo do mês."
              >
                <BudgetBars />
              </BentoCard>
              <BentoCard
                icon={<History className="size-4" />}
                title="Histórico com desfazer"
                description="Toda alteração fica registrada. Mudou sem querer? Volte ao que era."
              >
                <HistoryFeed />
              </BentoCard>
              <BentoCard
                icon={<ScanSearch className="size-4" />}
                title="Revisão de integridade"
                description="Possíveis compras duplicadas são sinalizadas para você revisar antes de fechar o mês."
              >
                <IntegrityScan />
              </BentoCard>
              <BentoCard
                icon={<Repeat className="size-4" />}
                title="Fixas e recorrentes"
                description="Aluguel, salário e assinaturas entram sozinhos, todo mês, na data certa."
              >
                <RecurringList />
              </BentoCard>
            </motion.div>
          </Container>
        </section>

        <section id="dependentes" className="scroll-mt-16 px-3 sm:px-4">
          <div className="relative overflow-hidden rounded-[32px] bg-ledger-ink py-24 text-[#eef2ec] sm:py-32">
            <div aria-hidden className="landing-grid-dark pointer-events-none absolute inset-0" />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(159,212,173,0.18),transparent)] blur-2xl"
            />
            <Container className="relative grid items-center gap-14 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-20">
              <div>
                <SectionIntro
                  tone="dark"
                  eyebrow="Dependentes"
                  title="Cada compra com o dono certo."
                  description="Filho, cônjuge ou amigo que usa seu cartão: marque o que é de cada dependente e saiba, no centavo, quanto ele precisa devolver."
                />
                <motion.ul
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="mt-9 grid gap-3"
                >
                  {dependentPoints.map((point) => (
                    <motion.li
                      key={point}
                      variants={reveal}
                      className="flex items-center gap-3 text-[16px] text-[#dbe5dd]"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ledger-mint/15 text-ledger-mint">
                        <Check className="size-3.5" />
                      </span>
                      {point}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
              <Reveal className="text-foreground">
                <InvoiceSplitDemo />
              </Reveal>
            </Container>
          </div>
        </section>

        <section id="perguntas" className="scroll-mt-16 py-24 sm:py-32">
          <Container className="grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
            <SectionIntro
              eyebrow="Perguntas"
              title="Antes de começar."
              description="O essencial sobre importação, privacidade e dependentes."
            />
            <Reveal>
              <Accordion
                type="single"
                collapsible
                defaultValue="item-0"
                className="rounded-[22px] border border-border bg-ledger-sheet px-6"
              >
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`item-${index}`}>
                    <AccordionTrigger className="py-5 text-[16px] hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pr-8 text-[15px] leading-[1.6] text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </Container>
        </section>

        <section className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-ledger-sheet py-20 sm:py-28">
            <div aria-hidden className="landing-grid pointer-events-none absolute inset-0" />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-48 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(47,125,74,0.22),transparent)] blur-2xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <Container className="relative flex flex-col items-center text-center">
              <Reveal className="flex flex-col items-center">
                <h2 className="max-w-[16ch] text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em] [font-stretch:88%]">
                  Comece pela próxima fatura.
                </h2>
                <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.6] text-muted-foreground">
                  Seus dados financeiros ficam privados na sua conta. Importar o
                  primeiro mês leva poucos minutos.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="group rounded-full px-7 text-[15px] shadow-[0_8px_24px_-8px_rgba(44,96,60,0.6)]"
                  >
                    <Link href="/signup">
                      Criar conta grátis
                      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="rounded-full px-7 text-[15px]"
                  >
                    <Link href="/login">Já tenho conta</Link>
                  </Button>
                </div>
              </Reveal>
            </Container>
          </div>
        </section>

        <footer>
          <Container className="flex flex-col gap-4 py-8 text-[14px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <FinyncLogo className="w-[72px]" />
            <p>Controle financeiro pessoal, sem ruído.</p>
            <Link href="/login" className="hover:text-foreground">
              Acessar minha conta
            </Link>
          </Container>
        </footer>
      </main>
    </MotionConfig>
  );
}
