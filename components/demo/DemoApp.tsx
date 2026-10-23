"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  Gauge,
  LayoutDashboard,
  Receipt,
  RotateCcw,
  Search,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import AnalyticsPage from "@/app/dashboard/analytics/page";
import CardsPage from "@/app/dashboard/cards/page";
import DependentesPage from "@/app/dashboard/dependentes/page";
import FixedExpensesPage from "@/app/dashboard/fixed/page";
import OrcamentosPage from "@/app/dashboard/orcamentos/page";
import DashboardPage from "@/app/dashboard/page";
import TransactionsPage from "@/app/dashboard/transactions/page";
import { AnalyticsRowsContext } from "@/components/analytics/useAnalyticsData";
import { FinyncLogo } from "@/components/branding/FinyncLogo";
import {
  DashboardActionsProvider,
  useDashboardActions,
} from "@/components/layout/DashboardActionsProvider";
import { GlobalCommandPalette } from "@/components/layout/GlobalCommandPalette";
import { Button } from "@/components/ui/button";
import { buildDemoData, toAnalyticsRows } from "@/lib/demoData";
import { cn } from "@/lib/utils";

import { installDemoStore } from "./demoStore";

type DemoView =
  | "overview"
  | "transactions"
  | "cards"
  | "fixed"
  | "budgets"
  | "dependents"
  | "analytics";

const views: Array<{
  id: DemoView;
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
  page: () => React.JSX.Element;
}> = [
  { id: "overview", label: "Visão geral", short: "Início", href: "/dashboard", icon: LayoutDashboard, page: DashboardPage },
  { id: "transactions", label: "Transações", short: "Extrato", href: "/dashboard/transactions", icon: Receipt, page: TransactionsPage },
  { id: "cards", label: "Cartões", short: "Cartões", href: "/dashboard/cards", icon: CreditCard, page: CardsPage },
  { id: "fixed", label: "Contas fixas", short: "Fixas", href: "/dashboard/fixed", icon: CalendarDays, page: FixedExpensesPage },
  { id: "budgets", label: "Orçamentos", short: "Limites", href: "/dashboard/orcamentos", icon: Gauge, page: OrcamentosPage },
  { id: "dependents", label: "Dependentes", short: "Pessoas", href: "/dashboard/dependentes", icon: UsersRound, page: DependentesPage },
  { id: "analytics", label: "Análises", short: "Análises", href: "/dashboard/analytics", icon: BarChart3, page: AnalyticsPage },
];

function viewFromHash(): DemoView {
  const hash = window.location.hash.replace("#", "");
  return views.some((view) => view.id === hash) ? (hash as DemoView) : "overview";
}

function SignUpButton({ className }: { className?: string }) {
  return (
    <Button
      asChild
      className={cn(
        "h-9 gap-1.5 rounded-lg bg-emerald-400 px-4 font-semibold text-zinc-950 hover:bg-emerald-300",
        className,
      )}
    >
      <Link href="/signup">
        Criar conta grátis
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function DemoSearchButton() {
  const { setCommandPaletteOpen } = useDashboardActions();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Buscar na demonstração"
      onClick={() => setCommandPaletteOpen(true)}
      className="h-9 gap-2 border border-white/[0.08] text-zinc-400 hover:text-zinc-100"
    >
      <Search className="size-4" />
      <span className="hidden md:inline">Buscar</span>
      <kbd className="hidden rounded border border-white/[0.1] px-1 text-[10px] text-zinc-500 md:inline">
        Ctrl K
      </kbd>
    </Button>
  );
}

/* Public demo: the real app pages running on a fictional household kept
   in memory. Links inside the pages are routed to the matching demo view. */
export function DemoApp() {
  const router = useRouter();
  const [view, setView] = useState<DemoView>("overview");
  const [session, setSession] = useState(0);
  const [analyticsRows, setAnalyticsRows] = useState<ReturnType<typeof toAnalyticsRows> | null>(null);

  useLayoutEffect(() => {
    const data = buildDemoData();
    const restore = installDemoStore(data);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pages may only mount once the demo data is in the store
    setAnalyticsRows(toAnalyticsRows(data.transactions));
    return () => {
      restore();
      setAnalyticsRows(null);
    };
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable in the browser
    setView(viewFromHash());
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const goTo = useCallback((next: DemoView) => {
    setView(next);
    window.history.replaceState(null, "", `#${next}`);
    document.getElementById("demo-scroll")?.scrollTo({ top: 0 });
  }, []);

  /* Pages link to /dashboard/...; keep the visitor inside the demo. */
  function handleLinkCapture(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (!href?.startsWith("/dashboard")) return;

    event.preventDefault();
    openHref(href);
  }

  function openHref(href: string) {
    const path = href.split(/[?#]/)[0].replace(/\/$/, "");
    const target = views.find((item) => item.href === path);
    if (target) {
      goTo(target.id);
    } else {
      toast("Disponível na sua conta", {
        description: "Importação, exportação e histórico funcionam com seus dados reais.",
        action: { label: "Criar conta", onClick: () => router.push("/signup") },
      });
    }
  }

  const current = views.find((item) => item.id === view) ?? views[0];
  const Page = current.page;

  return (
    <DashboardActionsProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-white">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/60 p-4 light:border-black/[0.12] light:bg-zinc-900 lg:flex">
          <Link href="/" className="flex items-center gap-2 px-2 py-1">
            <FinyncLogo className="h-7 w-auto" eager />
          </Link>
          <span className="mt-3 ml-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
            <Sparkles className="size-3" />
            Demonstração
          </span>

          <nav aria-label="Telas da demonstração" className="mt-6 flex flex-col gap-0.5">
            {views.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === view;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-white/[0.07] text-zinc-50"
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100",
                  )}
                >
                  <Icon className={cn("size-4", isActive && "text-emerald-300")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
            <p className="text-sm font-semibold text-zinc-100">Gostou?</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Crie sua conta e importe a primeira fatura em poucos minutos.
            </p>
            <SignUpButton className="mt-3 w-full justify-center" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-zinc-950/80 px-4 py-2.5 backdrop-blur sm:px-5 lg:px-8">
            <Link href="/" className="lg:hidden" aria-label="Finync">
              <FinyncLogo className="h-6 w-auto" eager />
            </Link>
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200 sm:hidden">
              Demo
            </span>
            <p className="hidden min-w-0 flex-1 truncate text-xs text-zinc-400 sm:block lg:text-sm">
              <span className="font-medium text-amber-200">Modo demonstração.</span> Dados
              fictícios da Marina. Pode clicar, pagar e editar à vontade: nada é salvo.
            </p>
            <div className="ml-auto flex items-center gap-2">
              <DemoSearchButton />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Reiniciar demonstração"
                onClick={() => {
                  setSession((value) => value + 1);
                  toast.success("Demonstração reiniciada.");
                }}
                className="h-9 gap-1.5 text-zinc-400 hover:text-zinc-100"
              >
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">Reiniciar</span>
              </Button>
              <SignUpButton className="lg:hidden" />
            </div>
          </header>

          <main
            id="demo-scroll"
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6 pb-28 [scrollbar-gutter:stable] sm:px-5 md:px-6 lg:px-8 lg:pt-8 lg:pb-10"
            onClickCapture={handleLinkCapture}
          >
            <div className="mx-auto w-full max-w-lg md:max-w-none">
              {analyticsRows ? (
                <AnalyticsRowsContext.Provider value={analyticsRows}>
                  <Suspense fallback={null}>
                    <Page key={`${view}-${session}`} />
                  </Suspense>
                </AnalyticsRowsContext.Provider>
              ) : null}
            </div>
          </main>

          <nav
            aria-label="Telas da demonstração"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.06] bg-zinc-950/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
          >
            {views.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === view;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors",
                    isActive ? "text-emerald-300" : "text-zinc-500",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="w-full truncate text-center">{item.short}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      {analyticsRows && (
        <GlobalCommandPalette searchHistory={false} onNavigate={openHref} />
      )}
    </DashboardActionsProvider>
  );
}
