import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Landmark,
  Layers3,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    title: "Cartoes sob controle",
    description: "Limites, faturas e vencimentos reunidos em uma visao unica.",
    icon: CreditCard,
  },
  {
    title: "Despesas organizadas",
    description: "Lancamentos por categoria, origem e status sem depender de planilhas.",
    icon: ReceiptText,
  },
  {
    title: "Rotina mais clara",
    description: "Um painel direto para entender o mes antes que ele saia do eixo.",
    icon: Layers3,
  },
];

const transactions = [
  ["Mercado", "Alimentacao", "R$ 284,90"],
  ["Academia", "Saude", "R$ 129,00"],
  ["Streaming", "Assinatura", "R$ 39,90"],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40" />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-500/20 bg-brand-500/10">
              <Landmark className="h-5 w-5 text-brand-300" strokeWidth={2} />
            </span>
            <span className="text-base font-semibold tracking-tight">Finync</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a className="transition hover:text-white" href="#produto">
              Produto
            </a>
            <a className="transition hover:text-white" href="#recursos">
              Recursos
            </a>
            <a className="transition hover:text-white" href="#seguranca">
              Seguranca
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-lg border border-white/[0.08] bg-white/[0.045] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white"
          >
            Entrar
          </Link>
        </header>

        <section
          id="produto"
          className="relative flex min-h-[78svh] flex-col justify-center overflow-hidden py-14 sm:py-18"
        >
          <div className="relative z-10 max-w-3xl">
            <p className="mb-5 inline-flex rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-100">
              Financas pessoais com a calma de um bom sistema.
            </p>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Finync
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-medium leading-8 text-zinc-200 sm:text-2xl">
              Controle cartoes, despesas e faturas em um painel que parece feito para
              ser usado todos os dias.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.16)] transition hover:bg-brand-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.26)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
              >
                Comecar gratis
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-semibold text-zinc-200 transition hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white"
              >
                Ver painel demo
              </Link>
            </div>
          </div>

          <div className="pointer-events-none relative z-0 mt-12 lg:absolute lg:bottom-6 lg:right-0 lg:mt-0 lg:w-[58%]">
            <div className="rounded-lg border border-white/[0.08] bg-zinc-950/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.045] p-4">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-300">
                      Visao geral
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      R$ 3.842,70
                    </p>
                  </div>
                  <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100">
                    4 cartoes ativos
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <CreditCard className="h-5 w-5 text-brand-300" strokeWidth={2} />
                      <span className="text-xs text-zinc-500">final 4821</span>
                    </div>
                    <p className="mt-8 text-sm text-zinc-400">Fatura atual</p>
                    <p className="mt-1 text-2xl font-semibold">R$ 1.248,35</p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[62%] rounded-full bg-brand-500" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {transactions.map(([title, category, amount]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-black/20 px-4 py-3"
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

        <section id="recursos" className="grid gap-4 py-10 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl"
              >
                <Icon className="h-5 w-5 text-brand-300" strokeWidth={2} />
                <h2 className="mt-5 text-lg font-semibold tracking-tight text-white">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>

        <section
          id="seguranca"
          className="grid gap-6 border-t border-white/[0.08] py-12 md:grid-cols-[0.9fr_1.1fr] md:items-center"
        >
          <div>
            <p className="text-sm font-medium text-brand-300">Produto serio, uso leve</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Menos ruido. Mais decisao.
            </h2>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex gap-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-brand-300" strokeWidth={2} />
              <p className="text-sm leading-7 text-zinc-300">
                O Finync foi desenhado para concentrar o que importa: gastos,
                cartoes, faturas e historico recente. A interface fica no fundo; suas
                decisoes ficam na frente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
