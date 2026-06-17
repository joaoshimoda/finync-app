import Link from "next/link";
import { Landmark } from "lucide-react";

const features = [
  {
    title: "Gestao de Cartoes",
    description:
      "Acompanhe limites, faturas, vencimentos e gastos por cartao em uma visao clara.",
  },
  {
    title: "Controle de Despesas",
    description:
      "Organize lancamentos, categorias e status para entender exatamente para onde seu dinheiro vai.",
  },
  {
    title: "Interface Moderna",
    description:
      "Um painel rapido, limpo e responsivo para cuidar das financas sem planilhas confusas.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-lg font-bold text-brand-100">
              <Landmark className="h-5 w-5 text-brand-300" strokeWidth={2} />
            </div>
            <span className="text-lg font-semibold tracking-tight">Finync</span>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
          >
            Entrar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-100">
              Controle financeiro simples para a vida real
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Domine seus gastos antes que eles dominem voce.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              O Finync centraliza cartoes, despesas e faturas em um painel moderno para voce
              tomar decisoes melhores todos os meses.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-500 px-6 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.14)] transition hover:bg-brand-400 hover:shadow-[0_0_38px_rgba(16,185,129,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-500/30"
              >
                Começar Grátis
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] px-6 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
              >
                Ver painel demo
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-black/20 p-5">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="h-3 w-28 rounded-full bg-brand-300/30" />
                  <div className="mt-3 h-7 w-44 rounded-xl bg-white/15" />
                </div>
                <div className="h-12 w-12 rounded-2xl bg-brand-500/15" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="mt-6 h-8 w-32 rounded-xl bg-white/15" />
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                  <div className="mt-6 h-8 w-28 rounded-xl bg-white/15" />
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 sm:col-span-2">
                  <div className="mb-4 h-3 w-36 rounded-full bg-white/10" />
                  <div className="space-y-3">
                    <div className="h-12 rounded-2xl bg-white/[0.055]" />
                    <div className="h-12 rounded-2xl bg-white/[0.055]" />
                    <div className="h-12 rounded-2xl bg-white/[0.055]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="mb-8">
            <p className="text-sm font-medium text-brand-300">Recursos</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Tudo para enxergar suas financas com clareza.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-6 shadow-xl shadow-black/10 backdrop-blur-xl"
              >
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-sm font-bold text-brand-100">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
