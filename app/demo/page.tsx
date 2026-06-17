import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Wallet,
} from "lucide-react";

const summary = [
  ["Gasto total", "R$ 3.842,70", "28 lançamentos no mês"],
  ["Faturas abertas", "R$ 1.248,35", "2 cartões com saldo"],
  ["Cartões ativos", "4", "Limite livre de R$ 6.180,00"],
];

const cards = [
  {
    name: "Cartão Black",
    final: "4821",
    invoice: "R$ 1.248,35",
    limit: "R$ 4.000,00",
    usage: "62%",
    color: "#34d399",
  },
  {
    name: "Platinum Viagem",
    final: "0914",
    invoice: "R$ 684,20",
    limit: "R$ 8.500,00",
    usage: "18%",
    color: "#60a5fa",
  },
];

const transactions = [
  ["Mercado Central", "Alimentação", "Hoje", "R$ 284,90"],
  ["Uber", "Transporte", "Ontem", "R$ 42,60"],
  ["Academia", "Saúde", "12 jun", "R$ 129,00"],
  ["Streaming", "Assinatura", "10 jun", "R$ 39,90"],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:80px_80px] opacity-40" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045]">
              <Landmark className="h-5 w-5 text-brand-300" strokeWidth={2} />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Finync Demonstração
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              Voltar
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-lg bg-brand-400 px-4 text-sm font-bold text-zinc-950 shadow-[0_0_34px_rgba(52,211,153,0.18)] transition hover:bg-brand-300"
            >
              Começar grátis
            </Link>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[17rem_1fr]">
          <aside className="hidden rounded-lg border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl lg:block">
            <nav className="space-y-2">
              {[
                { label: "Visão Geral", icon: LayoutDashboard },
                { label: "Transações", icon: ReceiptText },
                { label: "Cartões", icon: CreditCard },
                { label: "Configurações", icon: Settings },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={[
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                      index === 0
                        ? "border border-brand-500/20 bg-brand-500/10 text-brand-100"
                        : "text-zinc-500",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    {item.label}
                  </div>
                );
              })}
            </nav>

            <div className="mt-8 rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Modo demo
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Dados fictícios. Nenhuma conexão com contas reais.
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-[0_0_70px_rgba(16,185,129,0.08),0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-300">Visão geral</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Painel financeiro de demonstração
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    Explore como cartões, faturas e despesas aparecem no Finync sem
                    acessar uma conta real.
                  </p>
                </div>
                <span className="w-fit rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-zinc-300">
                  Junho 2026
                </span>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {summary.map(([label, value, hint]) => (
                  <article
                    key={label}
                    className="rounded-lg border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-sm font-medium text-zinc-400">{label}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">{hint}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-300">Carteira</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      Cartões
                    </h2>
                  </div>
                  <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-zinc-300">
                    {cards.length} exemplos
                  </span>
                </div>

                <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                  {cards.map((card) => (
                    <article
                      key={card.name}
                      className="relative min-h-64 w-[19rem] shrink-0 snap-start overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:w-[22rem]"
                    >
                      <div
                        className="absolute -right-14 -top-14 h-40 w-40 rounded-full opacity-20 blur-2xl"
                        style={{ backgroundColor: card.color }}
                      />
                      <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <CreditCard className="h-5 w-5 text-brand-300" strokeWidth={2} />
                          <span className="text-xs text-zinc-500">final {card.final}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{card.name}</h3>
                          <p className="mt-6 text-xs text-zinc-400">Fatura atual</p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {card.invoice}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">Limite {card.limit}</p>
                          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{ width: card.usage, backgroundColor: card.color }}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-300">Movimentações</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      Recentes
                    </h2>
                  </div>
                  <Wallet className="h-5 w-5 text-zinc-500" strokeWidth={2} />
                </div>

                <div className="space-y-3">
                  {transactions.map(([title, category, date, amount]) => (
                    <article
                      key={title}
                      className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {category} {"\u00b7"} {date}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-200">{amount}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
