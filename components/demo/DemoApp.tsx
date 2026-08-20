"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type DemoView =
  "overview" | "transactions" | "fixed" | "cards" | "analytics" | "settings";

const navItems = [
  {
    id: "overview" as const,
    label: "Visão Geral",
    short: "Geral",
    icon: LayoutDashboard,
  },
  {
    id: "transactions" as const,
    label: "Transações",
    short: "Trans.",
    icon: Receipt,
  },
  {
    id: "fixed" as const,
    label: "Contas Fixas",
    short: "Fixas",
    icon: CalendarDays,
  },
  {
    id: "cards" as const,
    label: "Cartões",
    short: "Cartões",
    icon: CreditCard,
  },
  {
    id: "analytics" as const,
    label: "Analytics",
    short: "Dados",
    icon: BarChart3,
  },
  {
    id: "settings" as const,
    label: "Configurações",
    short: "Config.",
    icon: Settings,
  },
];

const months = [
  { name: "Maio 2026", income: 9200, expenses: 5227.2, invoice: 1764.2 },
  { name: "Junho 2026", income: 9850, expenses: 5523.7, invoice: 1842.7 },
  { name: "Julho 2026", income: 10150, expenses: 5438.6, invoice: 1691.3 },
];

const transactions = [
  {
    date: "18",
    description: "Salário",
    category: "Receita",
    origin: "Conta principal",
    amount: 8500,
    income: true,
  },
  {
    date: "18",
    description: "Supermercado Zona Sul",
    category: "Alimentação",
    origin: "Nubank • 4821",
    amount: 286.45,
  },
  {
    date: "17",
    description: "Internet residencial",
    category: "Moradia",
    origin: "Gasto fixo",
    amount: 119.9,
    fixed: true,
  },
  {
    date: "16",
    description: "Notebook (4/10)",
    category: "Eletrônicos",
    origin: "Inter • 0914",
    amount: 389.9,
  },
  {
    date: "15",
    description: "Uber",
    category: "Transporte",
    origin: "Pix",
    amount: 42.6,
  },
  {
    date: "13",
    description: "Academia",
    category: "Saúde",
    origin: "Nubank • 4821",
    amount: 129.9,
    fixed: true,
  },
];

const fixedExpenses = [
  { name: "Aluguel", category: "Moradia", due: 5, amount: 1850, paid: true },
  {
    name: "Internet residencial",
    category: "Moradia",
    due: 10,
    amount: 119.9,
    paid: true,
  },
  { name: "Academia", category: "Saúde", due: 12, amount: 129.9, paid: false },
  { name: "Energia", category: "Moradia", due: 18, amount: 238.7, paid: false },
];

const cards = [
  {
    name: "Nubank Ultravioleta",
    final: "4821",
    invoice: 1426.8,
    projected: 1892.4,
    limit: 12000,
    closing: 25,
    due: 5,
    accent: "border-l-violet-500",
    tone: "text-violet-300",
  },
  {
    name: "Inter Platinum",
    final: "0914",
    invoice: 415.9,
    projected: 526.5,
    limit: 8500,
    closing: 18,
    due: 28,
    accent: "border-l-orange-500",
    tone: "text-orange-300",
  },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <Badge
        variant="outline"
        className="mb-3 border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
      >
        Modo demonstração
      </Badge>
      <h1 className="text-2xl font-bold text-zinc-50 md:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </header>
  );
}

function DemoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/55 shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs text-zinc-500">
          {label}
        </CardDescription>
        <CardTitle className="text-xl text-zinc-50">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 text-xs text-zinc-600">
        {detail}
      </CardContent>
    </Card>
  );
}

export function DemoApp() {
  const [view, setView] = useState<DemoView>("overview");
  const [monthIndex, setMonthIndex] = useState(1);
  const [hideValues, setHideValues] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState(0);
  const month = months[monthIndex];
  const money = (value: number) =>
    hideValues ? "••••••" : currency.format(value);
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) =>
        `${item.description} ${item.category} ${item.origin}`
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")),
      ),
    [query],
  );

  function selectView(nextView: DemoView) {
    setView(nextView);
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-800 bg-zinc-950 p-4 md:flex md:flex-col">
          <div className="flex h-14 items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
              <Landmark className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Finync</p>
              <p className="text-xs text-zinc-500">Painel demonstrativo</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectView(item.id)}
                  className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${view === item.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-300">
              <ShieldCheck className="size-4" />
              Dados fictícios
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Explore livremente. Nada aqui é salvo ou enviado ao Supabase.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-800 p-3">
            <CircleUserRound className="size-8 text-zinc-500" />
            <div>
              <p className="text-sm">Usuário Demo</p>
              <p className="text-xs text-zinc-600">demo@finync.com</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 md:ml-64">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <Landmark className="size-5 text-emerald-400" />
              <span className="font-semibold">Finync Demo</span>
            </div>
            <div className="hidden items-center gap-2 text-xs text-zinc-500 md:flex">
              <ShieldCheck className="size-4 text-emerald-400" />
              Ambiente público · dados simulados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHideValues((value) => !value)}
              >
                {hideValues ? (
                  <Eye className="size-4" />
                ) : (
                  <EyeOff className="size-4" />
                )}
                <span className="hidden sm:inline">
                  {hideValues ? "Mostrar" : "Ocultar"}
                </span>
              </Button>
              <Button variant="ghost" className="hidden sm:inline-flex" asChild>
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  Início
                </Link>
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                asChild
              >
                <Link href="/signup">Criar conta</Link>
              </Button>
            </div>
          </header>

          <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-6 pb-28 md:px-8 md:pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle
                title={
                  navItems.find((item) => item.id === view)?.label ?? "Demo"
                }
                description={
                  view === "overview"
                    ? "Uma visão completa da sua vida financeira, sem planilhas."
                    : "Explore esta área com dados simulados e interações locais."
                }
              />
              <div className="flex items-center gap-3">
                {view !== "overview" ? (
                  <span className="hidden rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-500 sm:inline-flex">
                    Período: {month.name}
                  </span>
                ) : null}
                <Button
                  onClick={() =>
                    toast.info(
                      "Na conta real, este botão abre o cadastro de uma movimentação.",
                    )
                  }
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <PlusCircle className="size-4" />
                  Nova movimentação
                </Button>
              </div>
            </div>

            {view === "overview" ? (
              <div className="flex items-center justify-center gap-3 border-y border-zinc-800 py-4">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={monthIndex === 0}
                  onClick={() => setMonthIndex((value) => value - 1)}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <span className="min-w-36 text-center font-semibold text-emerald-300">
                  {month.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={monthIndex === months.length - 1}
                  onClick={() => setMonthIndex((value) => value + 1)}
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            ) : null}

            {view === "overview" ? (
              <Overview month={month} money={money} onView={selectView} />
            ) : null}
            {view === "transactions" ? (
              <TransactionsView
                money={money}
                query={query}
                setQuery={setQuery}
                rows={filteredTransactions}
              />
            ) : null}
            {view === "fixed" ? <FixedView money={money} /> : null}
            {view === "cards" ? (
              <CardsView
                money={money}
                selected={selectedCard}
                setSelected={setSelectedCard}
              />
            ) : null}
            {view === "analytics" ? (
              <AnalyticsView money={money} month={month} />
            ) : null}
            {view === "settings" ? (
              <SettingsView
                hideValues={hideValues}
                setHideValues={setHideValues}
              />
            ) : null}

            <section className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 text-center sm:flex-row sm:text-left">
              <div>
                <p className="font-semibold">
                  Leve seus próprios dados para o Finync
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Crie sua conta e substitua a simulação pela sua vida
                  financeira real.
                </p>
              </div>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                asChild
              >
                <Link href="/signup">
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
            </section>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-black/90 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectView(item.id)}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] ${view === item.id ? "bg-emerald-500/10 text-emerald-300" : "text-zinc-500"}`}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{item.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function Overview({
  month,
  money,
  onView,
}: {
  month: (typeof months)[number];
  money: (value: number) => string;
  onView: (view: DemoView) => void;
}) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DemoCard
          label="Receitas"
          value={money(month.income)}
          detail="Entradas no período"
        />
        <DemoCard
          label="Saldo disponível"
          value={money(month.income - month.expenses)}
          detail="Após compromissos"
        />
        <DemoCard
          label="Fatura atual"
          value={money(month.invoice)}
          detail="Lançado até hoje"
        />
        <DemoCard
          label="Gastos totais"
          value={money(month.expenses)}
          detail="Cartões, fixos e Pix"
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Minha carteira",
            detail: "2 cartões ativos",
            value: money(month.invoice),
            view: "cards" as const,
          },
          {
            title: "Contas fixas",
            detail: "2 de 4 pagas",
            value: money(2338.5),
            view: "fixed" as const,
          },
          {
            title: "Movimentações",
            detail: "28 neste mês",
            value: "Ver extrato",
            view: "transactions" as const,
          },
        ].map((item) => (
          <button
            key={item.title}
            onClick={() => onView(item.view)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
            <div className="mt-8 flex items-center justify-between text-lg font-semibold">
              <span>{item.value}</span>
              <ChevronRight className="size-4 text-zinc-600" />
            </div>
          </button>
        ))}
      </section>
      <AnalyticsView money={money} month={month} compact />
    </>
  );
}

function TransactionsView({
  money,
  query,
  setQuery,
  rows,
}: {
  money: (value: number) => string;
  query: string;
  setQuery: (value: string) => void;
  rows: typeof transactions;
}) {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900/45 shadow-none">
      <CardHeader className="border-b border-zinc-800 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription className="mt-1">
              Busque por descrição, categoria ou origem.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar movimentação"
              className="border-zinc-700 bg-zinc-950 pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-zinc-800 p-0">
        {rows.map((item) => (
          <div
            key={item.description}
            className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 md:grid-cols-[80px_1fr_150px_170px_auto]"
          >
            <span className="hidden text-sm text-zinc-600 md:block">
              {item.date}/06
            </span>
            <div>
              <p className="text-sm font-medium">{item.description}</p>
              <p className="mt-1 text-xs text-zinc-600 md:hidden">
                {item.category} · {item.origin}
              </p>
            </div>
            <span className="hidden text-sm text-zinc-500 md:block">
              {item.category}
            </span>
            <span className="hidden text-sm text-zinc-500 md:block">
              {item.origin}
            </span>
            <strong
              className={item.income ? "text-emerald-400" : "text-zinc-200"}
            >
              {item.income ? "+ " : "− "}
              {money(item.amount)}
            </strong>
          </div>
        ))}
        {!rows.length ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            Nenhuma movimentação encontrada.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FixedView({ money }: { money: (value: number) => string }) {
  const paid = fixedExpenses
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const total = fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <DemoCard
          label="Total mensal"
          value={money(total)}
          detail="4 contas recorrentes"
        />
        <DemoCard
          label="Pago"
          value={money(paid)}
          detail="2 contas liquidadas"
        />
        <DemoCard
          label="Em aberto"
          value={money(total - paid)}
          detail="2 vencimentos próximos"
        />
      </section>
      <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
        <CardHeader>
          <CardTitle>Contas do mês</CardTitle>
          <CardDescription>
            Estado demonstrativo dos pagamentos recorrentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-800">
          {fixedExpenses.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.category} · vence dia {item.due}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(item.amount)}</p>
                <Badge
                  className={`mt-1 ${item.paid ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
                >
                  {item.paid ? "Pago" : "Pendente"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function CardsView({
  money,
  selected,
  setSelected,
}: {
  money: (value: number) => string;
  selected: number;
  setSelected: (value: number) => void;
}) {
  const card = cards[selected];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((item, index) => (
          <button
            key={item.name}
            onClick={() => setSelected(index)}
            className={`rounded-2xl border border-l-4 bg-zinc-900/45 p-5 text-left transition ${item.accent} ${selected === index ? "border-zinc-600" : "border-zinc-800"}`}
          >
            <CreditCard className={`size-5 ${item.tone}`} />
            <p className="mt-5 font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-zinc-500">Final {item.final}</p>
            <p className="mt-8 text-2xl font-bold">{money(item.invoice)}</p>
            <p className="mt-1 text-xs text-zinc-500">Fatura atual</p>
          </button>
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <DemoCard
          label="Fatura atual"
          value={money(card.invoice)}
          detail={`Fecha dia ${card.closing}`}
        />
        <DemoCard
          label="Projeção"
          value={money(card.projected)}
          detail={`Vence dia ${card.due}`}
        />
        <DemoCard
          label="Limite disponível"
          value={money(card.limit - card.projected)}
          detail={`Limite total ${money(card.limit)}`}
        />
      </section>
      <TransactionsView
        money={money}
        query=""
        setQuery={() => undefined}
        rows={transactions.filter((item) =>
          item.origin.includes(card.name.split(" ")[0]),
        )}
      />
    </>
  );
}

function AnalyticsView({
  money,
  month,
  compact = false,
}: {
  money: (value: number) => string;
  month: (typeof months)[number];
  compact?: boolean;
}) {
  const categories = [
    ["Moradia", 42],
    ["Alimentação", 24],
    ["Transporte", 18],
    ["Outros", 16],
  ] as const;
  return (
    <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
      <CardHeader>
        <CardTitle>
          {compact ? "Para onde foi seu dinheiro" : "Análise do período"}
        </CardTitle>
        <CardDescription>
          {month.name} · distribuição das despesas pessoais
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-xs text-zinc-500">Economia no mês</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {money(month.income - month.expenses)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {Math.round(((month.income - month.expenses) / month.income) * 100)}
            % da renda preservada
          </p>
        </div>
        <div className="space-y-5">
          {categories.map(([label, value]) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <span>{value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsView({
  hideValues,
  setHideValues,
}: {
  hideValues: boolean;
  setHideValues: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>
            Estas escolhas valem apenas durante a demonstração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ocultar valores</p>
              <p className="mt-1 text-xs text-zinc-500">
                Protege os números durante a navegação.
              </p>
            </div>
            <Switch checked={hideValues} onCheckedChange={setHideValues} />
          </div>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-zinc-900/45 shadow-none">
        <CardHeader>
          <CardTitle>Ambiente seguro</CardTitle>
          <CardDescription>Nenhum dado pessoal é utilizado.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 text-sm leading-6 text-zinc-400">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-400" />A
          demo funciona inteiramente no navegador com informações fictícias e
          não acessa sua conta.
        </CardContent>
      </Card>
    </div>
  );
}
