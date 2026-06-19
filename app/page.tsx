import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  Landmark,
  Layers3,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

const summaryCards = [
  ["Gasto mensal", "R$ 3.842,70", "+12 lançamentos"],
  ["Faturas abertas", "R$ 1.248,35", "2 cartões"],
  ["Limite livre", "R$ 6.180,00", "68% disponível"],
];

const transactions = [
  ["Mercado", "Alimentação", "R$ 284,90"],
  ["Academia", "Saúde", "R$ 129,00"],
  ["Streaming", "Assinatura", "R$ 39,90"],
];

const features = [
  {
    title: "Cartões sem surpresa",
    description: "Veja limites, vencimentos e faturas em aberto antes de gastar de novo.",
    icon: CreditCard,
  },
  {
    title: "Despesas no lugar certo",
    description: "Classifique lançamentos por categoria, origem e status com poucos cliques.",
    icon: ReceiptText,
  },
  {
    title: "Clareza para decidir",
    description: "Entenda o mês em uma tela limpa, pensada para consulta diária.",
    icon: Layers3,
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Components cannot persist refreshed cookies.
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:88px_88px] opacity-50" />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045]">
              <Landmark className="h-5 w-5 text-brand-300" strokeWidth={2} />
            </span>
            <span className="text-base font-semibold tracking-tight">Finync</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-500 md:flex">
            <a className="transition hover:text-zinc-100" href="#produto">
              Produto
            </a>
            <a className="transition hover:text-zinc-100" href="#recursos">
              Recursos
            </a>
            <a className="transition hover:text-zinc-100" href="#seguranca">
              Segurança
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-lg border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Entrar
          </Link>
        </header>

        <section id="produto" className="pt-16 text-center sm:pt-24">
          <p className="mx-auto mb-6 inline-flex rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-100">
            Um painel financeiro para acabar com a bagunça do mês.
          </p>

          <h1 className="mx-auto max-w-5xl bg-gradient-to-b from-white via-zinc-100 to-brand-200 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-7xl lg:text-8xl">
            Organize seu dinheiro sem abrir uma planilha.
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-zinc-300 sm:text-xl">
            O Finync junta cartões, despesas e faturas em uma única visão para você
            parar de descobrir problemas tarde demais e voltar a decidir com clareza.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-brand-400 px-6 text-sm font-bold text-zinc-950 shadow-[0_0_44px_rgba(52,211,153,0.22)] transition hover:bg-brand-300 hover:shadow-[0_0_64px_rgba(52,211,153,0.34)] focus:outline-none focus:ring-4 focus:ring-brand-500/30 sm:w-auto"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-13 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] px-6 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
            >
              Ver painel demo
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-5xl pb-14 sm:mt-20">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-2 shadow-[0_0_80px_rgba(16,185,129,0.10),0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 sm:p-5">
              <div className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                    Visão geral
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Junho sob controle
                  </h2>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                  Atualizado agora
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {summaryCards.map(([label, value, hint]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/[0.05] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <p className="text-sm font-medium text-zinc-400">{label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-white/10 bg-black/20 p-5 text-left">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-5 w-5 text-brand-300" strokeWidth={2} />
                    <span className="text-xs font-medium text-zinc-500">final 4821</span>
                  </div>
                  <p className="mt-10 text-sm text-zinc-400">Fatura atual</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    R$ 1.248,35
                  </p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[62%] rounded-full bg-brand-400" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>62% usado</span>
                    <span>vence dia 12</span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="space-y-2">
                    {transactions.map(([title, category, amount]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-1 text-xs text-zinc-500">{category}</p>
                        </div>
                        <p className="text-sm font-semibold text-zinc-200">{amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="grid gap-3 border-t border-white/10 py-12 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition hover:bg-white/[0.055]"
              >
                <Icon className="h-5 w-5 text-brand-300" strokeWidth={2} />
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>

        <section
          id="seguranca"
          className="grid gap-6 border-t border-white/10 py-12 md:grid-cols-[0.9fr_1.1fr] md:items-center"
        >
          <div>
            <p className="text-sm font-medium text-brand-300">Produto sério, uso leve</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Menos ruído. Mais decisão.
            </h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex gap-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-brand-300" strokeWidth={2} />
              <p className="text-sm leading-7 text-zinc-300">
                O Finync foi desenhado para concentrar o que importa: gastos,
                cartões, faturas e histórico recente. A interface fica no fundo; suas
                decisões ficam na frente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
