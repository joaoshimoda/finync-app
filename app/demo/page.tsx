import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Landmark,
  LayoutDashboard,
  QrCode,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { label: "Visão Geral", icon: LayoutDashboard, active: true },
  { label: "Transações", icon: ReceiptText },
  { label: "Contas Fixas", icon: CalendarDays },
  { label: "Cartões", icon: CreditCard },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configurações", icon: Settings },
];

const summary = [
  {
    label: "Receitas",
    value: "R$ 9.850,00",
    hint: "Entradas no período",
    icon: TrendingUp,
    color: "text-emerald-400",
  },
  {
    label: "Saldo Disponível Total",
    value: "R$ 4.326,30",
    hint: "Após todos os compromissos",
    icon: Landmark,
    color: "text-zinc-50",
  },
  {
    label: "Fatura Atual",
    value: "R$ 1.842,70",
    hint: "Lançado até hoje",
    icon: CreditCard,
    color: "text-violet-300",
  },
  {
    label: "Fatura Total",
    value: "R$ 2.418,90",
    hint: "Projeção de fechamento",
    icon: WalletCards,
    color: "text-blue-300",
  },
  {
    label: "Gastos Pendentes",
    value: "R$ 3.681,20",
    hint: "Contas e faturas em aberto",
    icon: ReceiptText,
    color: "text-orange-300",
  },
];

const cards = [
  {
    name: "Nubank Ultravioleta",
    final: "4821",
    invoice: "R$ 1.426,80",
    projected: "R$ 1.892,40",
    limit: "R$ 12.000,00",
    closing: "25",
    due: "05",
    accent: "border-l-violet-500",
    icon: "bg-violet-500/10 text-violet-300",
  },
  {
    name: "Inter Platinum",
    final: "0914",
    invoice: "R$ 415,90",
    projected: "R$ 526,50",
    limit: "R$ 8.500,00",
    closing: "18",
    due: "28",
    accent: "border-l-orange-500",
    icon: "bg-orange-500/10 text-orange-300",
  },
];

const dependents = [
  { name: "Mariana", amount: "R$ 486,90" },
  { name: "Lucas", amount: "R$ 219,50" },
];

const transactions = [
  {
    date: "18/06/2026",
    description: "Salário",
    category: "Receita",
    origin: "Conta principal",
    amount: "+ R$ 8.500,00",
    income: true,
  },
  {
    date: "18/06/2026",
    description: "Supermercado Zona Sul",
    category: "Alimentação",
    origin: "Nubank • 4821",
    amount: "- R$ 286,45",
  },
  {
    date: "17/06/2026",
    description: "Internet residencial",
    category: "Moradia",
    origin: "Gasto Fixo",
    amount: "- R$ 119,90",
    fixed: true,
  },
  {
    date: "16/06/2026",
    description: "Notebook (4/10)",
    category: "Eletrônicos",
    origin: "Inter • 0914",
    amount: "- R$ 389,90",
  },
  {
    date: "15/06/2026",
    description: "Uber",
    category: "Transporte",
    origin: "Pix",
    amount: "- R$ 42,60",
  },
];

function StaticSidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-3 px-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
          <Landmark className="size-5" />
        </span>
        <div>
          <p className="text-base font-semibold text-zinc-50">Finync</p>
          <p className="text-xs text-zinc-500">Painel demonstrativo</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                item.active
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="size-4" />
          <p className="text-xs font-semibold uppercase">Ambiente seguro</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Esta demonstração usa somente dados fictícios e não acessa o Supabase.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-800 p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <CircleUserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-200">Usuário Demo</p>
          <p className="truncate text-xs text-zinc-500">demo@finync.com</p>
        </div>
      </div>
    </aside>
  );
}

export default function DemoPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="flex min-h-screen">
        <StaticSidebar />

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
                <Landmark className="size-5" />
              </span>
              <span className="font-semibold">Finync Demo</span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-zinc-500 lg:flex">
              <ShieldCheck className="size-4 text-emerald-400" />
              Visualização pública com dados simulados
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="hidden text-zinc-300 sm:inline-flex" asChild>
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Voltar ao início
                </Link>
              </Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" asChild>
                <Link href="/signup">Criar minha conta</Link>
              </Button>
            </div>
          </header>

          <div className="h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <Badge
                    variant="outline"
                    className="mb-3 border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
                  >
                    Modo demonstração
                  </Badge>
                  <h1 className="text-3xl font-bold text-zinc-50">Visão Geral</h1>
                  <p className="mt-2 text-sm text-zinc-400">
                    Uma visão completa da sua vida financeira, sem planilhas.
                  </p>
                </div>
                <Button disabled className="h-11 bg-emerald-600 px-5 text-white opacity-70">
                  Nova movimentação
                </Button>
              </section>

              <section className="flex justify-center border-y border-zinc-800 py-5">
                <div className="flex w-full max-w-md items-center justify-between rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                  <ChevronLeft className="size-5 text-zinc-600" />
                  <span className="text-sm text-zinc-600">Maio</span>
                  <strong className="text-xl text-emerald-300">Junho 2026</strong>
                  <span className="text-sm text-zinc-600">Julho</span>
                  <ChevronRight className="size-5 text-zinc-600" />
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-zinc-500">Resumo do mês</p>
                    <h2 className="mt-1 text-xl font-semibold">Seu dinheiro em um olhar</h2>
                  </div>
                  <span className="text-xs text-zinc-600">Atualizado hoje, 09:42</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {summary.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Card key={item.label} className="border-zinc-800 bg-zinc-900/55 shadow-none">
                        <CardHeader className="gap-3 p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <CardDescription className="text-xs text-zinc-400">
                              {item.label}
                            </CardDescription>
                            <Icon className={`size-4 ${item.color}`} />
                          </div>
                          <CardTitle className={`text-xl font-semibold ${item.color}`}>
                            {item.value}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 text-xs text-zinc-500">
                          {item.hint}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                <Card className="overflow-hidden border-zinc-800 bg-zinc-900/45 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 p-5">
                    <div>
                      <CardTitle className="text-lg text-zinc-50">Minha Carteira</CardTitle>
                      <CardDescription className="mt-1 text-zinc-500">
                        Faturas e compromissos do período.
                      </CardDescription>
                    </div>
                    <CreditCard className="size-5 text-zinc-500" />
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-5">
                    <div className="flex min-w-max gap-4">
                      {cards.map((card) => (
                        <article
                          key={card.name}
                          className={`h-[190px] w-[310px] shrink-0 rounded-xl border border-l-4 border-zinc-800 ${card.accent} bg-zinc-950 p-5`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`flex size-9 items-center justify-center rounded-lg ${card.icon}`}>
                                <CreditCard className="size-4" />
                              </span>
                              <p className="mt-3 text-sm font-semibold">{card.name}</p>
                              <p className="mt-1 text-xs text-zinc-500">Final {card.final}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-medium uppercase text-zinc-500">Fatura atual</p>
                              <p className="mt-1 text-xl font-bold">{card.invoice}</p>
                              <p className="mt-1 text-xs text-zinc-500">Projetado: {card.projected}</p>
                            </div>
                          </div>
                          <div className="mt-5 flex items-end justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                            <span>Limite {card.limit}</span>
                            <span>Fecha dia {card.closing} · vence dia {card.due}</span>
                          </div>
                        </article>
                      ))}

                      <article className="h-[190px] w-[270px] shrink-0 rounded-xl border border-l-4 border-zinc-800 border-l-blue-500 bg-zinc-950 p-5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                          <CalendarDays className="size-4" />
                        </span>
                        <p className="mt-3 text-sm font-semibold">Gastos Fixos</p>
                        <div className="mt-7 text-right">
                          <p className="text-[10px] uppercase text-zinc-500">Total do mês</p>
                          <p className="mt-1 text-2xl font-bold">R$ 1.262,30</p>
                        </div>
                      </article>

                      <article className="h-[190px] w-[270px] shrink-0 rounded-xl border border-l-4 border-zinc-800 border-l-emerald-500 bg-zinc-950 p-5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                          <QrCode className="size-4" />
                        </span>
                        <p className="mt-3 text-sm font-semibold">Débito / Pix</p>
                        <div className="mt-7 text-right">
                          <p className="text-[10px] uppercase text-zinc-500">Total do mês</p>
                          <p className="mt-1 text-2xl font-bold">R$ 1.842,50</p>
                        </div>
                      </article>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
                  <CardHeader className="border-b border-zinc-800 p-5">
                    <CardDescription className="text-zinc-500">Valores a receber</CardDescription>
                    <CardTitle className="text-lg text-zinc-50">Gastos por Dependente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    {dependents.map((dependent) => (
                      <div
                        key={dependent.name}
                        className="flex items-center justify-between border-b border-zinc-800 p-3 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                            <UserRound className="size-4" />
                          </span>
                          <span className="text-sm font-medium">{dependent.name}</span>
                        </div>
                        <strong className="text-sm">{dependent.amount}</strong>
                      </div>
                    ))}
                    <div className="mt-3 rounded-lg bg-zinc-950 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Total a receber</span>
                        <strong className="text-emerald-300">R$ 706,40</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card className="overflow-hidden border-zinc-800 bg-zinc-900/45 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 p-5">
                    <div>
                      <CardTitle className="text-lg text-zinc-50">Movimentações recentes</CardTitle>
                      <CardDescription className="mt-1 text-zinc-500">
                        Últimos lançamentos do período selecionado.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                      28 no mês
                    </Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
                      <TableHeader className="bg-zinc-950/70">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-zinc-500">Data</TableHead>
                          <TableHead className="text-zinc-500">Descrição</TableHead>
                          <TableHead className="text-zinc-500">Categoria</TableHead>
                          <TableHead className="text-zinc-500">Origem</TableHead>
                          <TableHead className="text-right text-zinc-500">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={`${transaction.date}-${transaction.description}`} className="border-zinc-800">
                            <TableCell className="text-zinc-500">{transaction.date}</TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {transaction.description}
                                {transaction.fixed ? (
                                  <Badge className="bg-blue-500/10 text-blue-300 hover:bg-blue-500/10">Fixo</Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-400">{transaction.category}</TableCell>
                            <TableCell className="text-zinc-400">{transaction.origin}</TableCell>
                            <TableCell className={`text-right font-semibold ${transaction.income ? "text-emerald-400" : "text-zinc-200"}`}>
                              {transaction.amount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
                  <CardHeader className="p-5 pb-2">
                    <CardDescription className="text-zinc-500">Distribuição pessoal</CardDescription>
                    <CardTitle className="text-lg text-zinc-50">Para onde foi seu dinheiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    {[
                      ["Moradia", "42%", "bg-emerald-500"],
                      ["Alimentação", "24%", "bg-blue-500"],
                      ["Transporte", "18%", "bg-violet-500"],
                      ["Outros", "16%", "bg-zinc-600"],
                    ].map(([label, value, color]) => (
                      <div key={label}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-zinc-400">{label}</span>
                          <span className="font-medium text-zinc-200">{value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div className={`h-full rounded-full ${color}`} style={{ width: value }} />
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                      <div>
                        <ArrowDownRight className="size-4 text-red-300" />
                        <p className="mt-2 text-xs text-zinc-500">Saídas</p>
                        <strong className="text-sm">R$ 5.523,70</strong>
                      </div>
                      <div>
                        <ArrowUpRight className="size-4 text-emerald-300" />
                        <p className="mt-2 text-xs text-zinc-500">Economia</p>
                        <strong className="text-sm text-emerald-300">43,9%</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="flex flex-col items-center justify-between gap-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-center sm:flex-row sm:text-left">
                <div>
                  <p className="text-lg font-semibold">Gostou do que viu?</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Crie sua conta e comece a organizar suas finanças com seus próprios dados.
                  </p>
                </div>
                <Button className="h-11 shrink-0 bg-emerald-600 px-6 text-white hover:bg-emerald-700" asChild>
                  <Link href="/signup">Começar grátis</Link>
                </Button>
              </section>

              <footer className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 py-5 text-xs text-zinc-600 sm:flex-row">
                <span>Finync · Demonstração com dados fictícios</span>
                <Link href="/" className="text-zinc-400 hover:text-zinc-200">
                  Voltar para a página inicial
                </Link>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
