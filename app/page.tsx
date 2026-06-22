import { createServerClient } from "@supabase/ssr";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleUserRound,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const importRows = [
  ["Mercado São Luiz", "Alimentação", "R$ 284,90"],
  ["Uber", "Transporte", "R$ 42,60"],
  ["Spotify", "Assinatura", "R$ 21,90"],
];

const steps = [
  {
    number: "01",
    title: "Baixe o CSV",
    description:
      "Exporte a fatura diretamente do aplicativo do seu banco ou cartão.",
  },
  {
    number: "02",
    title: "Importe no Finync",
    description:
      "Revise categorias, parcelas e responsáveis antes de confirmar.",
  },
  {
    number: "03",
    title: "Tenha clareza imediata",
    description:
      "Visualize o mês, a fatura e seus indicadores sem montar fórmulas.",
  },
];

async function getAuthenticatedUser() {
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

  return user;
}

export default async function Home() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50">
      <header className="relative z-50 border-b border-white/[0.08] bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Finync">
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950">
              <Landmark className="size-5" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-semibold">Finync</span>
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

      <section className="relative isolate min-h-[calc(100svh-80px)] border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-emerald-400/60" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-12 pt-12 text-center sm:px-8 sm:pt-20 lg:px-10 lg:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-zinc-300">
            <ScanLine className="size-3.5 text-emerald-400" />
            Sua vida financeira, finalmente legível
          </div>

          <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-[1.06] sm:mt-7 sm:text-7xl sm:leading-[1.02] lg:text-[88px]">
            Assuma o controle financeiro sem planilhas.
          </h1>

          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-zinc-400 sm:mt-7 sm:text-lg sm:leading-8">
            Importe sua fatura, organize responsáveis e entenda o seu dinheiro
            em um painel direto, preciso e construído para o dia a dia.
          </p>

          <div className="mt-8 flex w-full max-w-xs flex-col justify-center gap-3 sm:mt-9 sm:max-w-none sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 sm:w-auto"
            >
              Começar grátis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06] sm:w-auto"
            >
              Ver painel demo
              <ChevronRight className="size-4 text-zinc-500" />
            </Link>
          </div>

          <div className="mt-12 w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 text-left shadow-2xl shadow-black/40 sm:mt-16">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-4 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-zinc-400">Junho de 2026</span>
              </div>
              <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
                <ShieldCheck className="size-3.5" />
                Dados sincronizados
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/[0.08] sm:grid-cols-3">
              <div className="col-span-2 bg-zinc-900 p-5 sm:col-span-1 sm:p-6">
                <p className="text-xs text-zinc-500">Saldo disponível</p>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  R$ 4.380,20
                </p>
                <p className="mt-3 text-xs text-emerald-400">+8,4% neste mês</p>
              </div>
              <div className="bg-zinc-900 p-4 sm:p-6">
                <p className="text-xs text-zinc-500">Fatura projetada</p>
                <p className="mt-2 text-lg font-semibold text-white sm:text-3xl">
                  R$ 2.146,80
                </p>
                <p className="mt-3 text-xs text-zinc-500">Fecha em 8 dias</p>
              </div>
              <div className="bg-zinc-900 p-4 sm:p-6">
                <p className="text-xs text-zinc-500">Contas pendentes</p>
                <p className="mt-2 text-lg font-semibold text-white sm:text-3xl">
                  R$ 684,00
                </p>
                <p className="mt-3 text-xs text-zinc-500">3 lançamentos</p>
              </div>
            </div>

            <div className="grid gap-px bg-white/[0.08] lg:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-zinc-950 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Evolução do mês</p>
                    <p className="mt-1 text-xs text-zinc-500">Receitas e despesas</p>
                  </div>
                  <BarChart3 className="size-5 text-emerald-400" />
                </div>
                <div className="mt-8 flex h-32 items-end gap-3 sm:gap-5">
                  {[42, 58, 46, 72, 63, 84, 69, 91].map((height, index) => (
                    <div key={index} className="flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-sm bg-zinc-700"
                        style={{ height: `${height}%` }}
                      >
                        <div className="h-1.5 w-full rounded-t-sm bg-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden bg-zinc-950 p-5 sm:block sm:p-6">
                <p className="text-sm font-medium text-white">Últimos lançamentos</p>
                <div className="mt-5 space-y-4">
                  {importRows.map(([name, category, amount]) => (
                    <div key={name} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">{name}</p>
                        <p className="mt-1 text-xs text-zinc-600">{category}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-zinc-300">
                        {amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-b border-white/[0.08] py-16 sm:py-32">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-emerald-400">O que muda na prática</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              Menos trabalho operacional. Mais contexto para decidir.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              Três recursos construídos para eliminar as partes mais cansativas
              do controle financeiro pessoal.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:mt-12 lg:grid-cols-12">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:col-span-7 lg:p-8">
              <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950">
                <FileSpreadsheet className="size-5" />
              </div>
              <h3 className="mt-7 text-2xl font-semibold">Importação mágica de CSV</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                O Finync reconhece descrições, parcelas e categorias anteriores
                para reduzir a revisão manual da sua fatura.
              </p>

              <div className="mt-8 overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-950">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Upload className="size-3.5" />
                    fatura-junho.csv
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
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:col-span-5 lg:p-8">
              <div className="flex size-11 items-center justify-center rounded-lg bg-white/[0.08] text-emerald-400">
                <CircleUserRound className="size-5" />
              </div>
              <h3 className="mt-7 text-2xl font-semibold">Isolamento de dependentes</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Separe gastos de terceiros sem retirá-los da fatura. Seu balanço
                pessoal continua limpo e o valor devido permanece visível.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Seu fluxo pessoal</p>
                      <p className="mt-2 text-xl font-semibold">R$ 3.286,40</p>
                    </div>
                    <ShieldCheck className="size-5 text-emerald-400" />
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400">
                        <CircleUserRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">Marina</p>
                        <p className="mt-1 text-xs text-zinc-500">Total a receber</p>
                      </div>
                    </div>
                    <span className="text-base font-semibold text-zinc-200">R$ 492,80</span>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:col-span-12 lg:p-8">
              <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
                <div>
                  <div className="flex size-11 items-center justify-center rounded-lg bg-white/[0.08] text-emerald-400">
                    <BarChart3 className="size-5" />
                  </div>
                  <h3 className="mt-7 text-2xl font-semibold">Analytics cirúrgico</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">
                    Indicadores pessoais sem ruído de dependentes, com evolução,
                    categorias e comprometimento de renda em uma única leitura.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-zinc-950 p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-xs text-zinc-500">Despesa total</p>
                      <p className="mt-2 text-2xl font-semibold">R$ 3.286,40</p>
                    </div>
                    <p className="text-xs text-emerald-400">12% abaixo de maio</p>
                  </div>
                  <div className="mt-8 flex h-36 items-end gap-2 sm:gap-4">
                    {[54, 69, 61, 82, 74, 64, 48, 57, 43, 38].map((height, index) => (
                      <div key={index} className="flex h-full flex-1 items-end">
                        <div
                          className={index === 9 ? "w-full rounded-t-sm bg-emerald-400" : "w-full rounded-t-sm bg-zinc-700"}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between text-xs text-zinc-600">
                    <span>Jan</span>
                    <span>Jun</span>
                    <span>Out</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-b border-white/[0.08] py-16 sm:py-32">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald-400">Como funciona</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              Da fatura ao resumo em três passos.
            </h2>
          </div>

          <div className="mt-10 grid gap-0 border-y border-white/10 sm:mt-14 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.number}
                className={`py-8 md:px-8 ${index > 0 ? "border-t border-white/10 md:border-l md:border-t-0" : ""}`}
              >
                <span className="text-sm font-semibold text-emerald-400">{step.number}</span>
                <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="py-16 sm:py-32">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="grid gap-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <LockKeyhole className="size-4" />
                Privacidade por padrão
              </div>
              <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
                Seu dinheiro merece uma visão melhor.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                Comece gratuitamente e transforme sua próxima fatura em decisões
                claras, sem fórmulas, abas infinitas ou trabalho repetitivo.
              </p>
            </div>

            <Link
              href="/signup"
              className="inline-flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-emerald-400 px-7 text-base font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 lg:w-auto"
            >
              Criar minha conta
              <ArrowRight className="size-5" />
            </Link>
          </div>
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
