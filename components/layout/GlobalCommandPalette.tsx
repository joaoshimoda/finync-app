"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Loader2,
  ReceiptText,
  Repeat2,
  Search,
  Tag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { usePrivateCurrency } from "@/components/dashboard/shared";
import {
  useDashboardActions,
  type FocusTarget,
} from "@/components/layout/DashboardActionsProvider";
import { navigationItems, navigationSections } from "@/components/layout/navigationItems";
import { useHistorySearch, type SearchTransaction } from "@/components/layout/useHistorySearch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateOnlyBR, getLocalTodayDateOnly } from "@/lib/dateUtils";
import {
  compareByRelevantDate,
  matchesAmount,
  normalizeSearchText,
  rankByScore,
  scoreMatch,
} from "@/lib/globalSearch";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

type ResultKind = "action" | "page" | "transaction" | "card" | "dependent" | "category" | "recurring" | "see-all";

interface ResultItem {
  id: string;
  kind: ResultKind;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
  amount?: { value: number; positive: boolean };
  /* Where to go and what the page should open on arrival. */
  href?: string;
  focus?: FocusTarget;
  run?: () => void;
}

interface ResultGroup {
  title: string;
  items: ResultItem[];
  loading?: boolean;
}

/* Only what is needed to replay a pick from "Recentes". */
type RecentItem = Pick<ResultItem, "id" | "kind" | "label" | "detail" | "href" | "focus">;

const RECENT_KEY = "finync:recent-search";
const RECENT_LIMIT = 5;
const TRANSACTION_LIMIT = 6;

const kindIcons: Record<ResultKind, { icon: LucideIcon; tone: string }> = {
  action: { icon: ArrowRight, tone: "bg-emerald-500/10 text-emerald-300" },
  page: { icon: ArrowRight, tone: "bg-white/[0.04] text-zinc-400" },
  transaction: { icon: ReceiptText, tone: "bg-white/[0.04] text-zinc-400" },
  card: { icon: CreditCard, tone: "bg-violet-500/10 text-violet-300" },
  dependent: { icon: UserRound, tone: "bg-amber-500/10 text-amber-300" },
  category: { icon: Tag, tone: "bg-sky-500/10 text-sky-300" },
  recurring: { icon: Repeat2, tone: "bg-teal-500/10 text-teal-300" },
  "see-all": { icon: Search, tone: "bg-white/[0.04] text-zinc-400" },
};

function readRecent(): RecentItem[] {
  try {
    const stored = window.localStorage.getItem(RECENT_KEY);
    return stored ? (JSON.parse(stored) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: ResultItem) {
  if (!item.href || item.kind === "see-all") return;
  try {
    const entry: RecentItem = {
      id: item.id,
      kind: item.kind,
      label: item.label,
      detail: item.detail,
      href: item.href,
      focus: item.focus,
    };
    const next = [entry, ...readRecent().filter((recent) => recent.id !== item.id)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* Recents are a convenience; without storage they just do not show. */
  }
}

/* Bolds the first stretch of the label that matches the query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const term = normalizeSearchText(query).split(" ")[0];
  const normalized = normalizeSearchText(text);
  const index = term ? normalized.indexOf(term) : -1;
  if (index < 0 || normalized.length !== text.length) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-emerald-400/15 text-emerald-200">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}

export function GlobalCommandPalette({
  searchHistory = true,
  onNavigate,
}: {
  /* Off in the public demo, which has no account to query. */
  searchHistory?: boolean;
  /* Lets the demo map app routes to its own views. */
  onNavigate?: (href: string) => void;
} = {}) {
  const router = useRouter();
  const formatValue = usePrivateCurrency();
  const { commandPaletteOpen, openQuickAction, setCommandPaletteOpen, requestFocus } =
    useDashboardActions();
  const storeTransactions = useFinanceStore((state) => state.transactions);
  const cards = useFinanceStore((state) => state.cards);
  const dependents = useFinanceStore((state) => state.dependents);
  const categories = useFinanceStore((state) => state.categories);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const history = useHistorySearch(query, commandPaletteOpen && searchHistory);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recents live in browser storage, read when the palette opens
    if (commandPaletteOpen) setRecent(readRecent());
  }, [commandPaletteOpen]);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.ctrlKey && !event.metaKey)) return;
      event.preventDefault();
      setCommandPaletteOpen(!commandPaletteOpen);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const cardNames = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const dependentNames = useMemo(
    () => new Map(dependents.map((dependent) => [dependent.id, dependent.name])),
    [dependents],
  );

  const actions = useMemo<ResultItem[]>(
    () => [
      { id: "new-expense", kind: "action", label: "Nova despesa", detail: "Pix, débito ou cartão", icon: ArrowDownLeft, tone: kindIcons.action.tone, run: () => openQuickAction("expense") },
      { id: "new-income", kind: "action", label: "Nova receita", detail: "Salário ou outra entrada", icon: ArrowUpRight, tone: kindIcons.action.tone, run: () => openQuickAction("income") },
      { id: "new-card", kind: "action", label: "Novo cartão", detail: "Limite e ciclo da fatura", icon: CreditCard, tone: kindIcons.action.tone, run: () => openQuickAction("card") },
    ],
    [openQuickAction],
  );

  const pages = useMemo<ResultItem[]>(
    () =>
      navigationItems.map((item) => ({
        id: `page:${item.href}`,
        kind: "page" as const,
        label: item.label,
        detail:
          navigationSections.find((section) => section.key === item.section)?.label ?? "Finync",
        icon: item.icon,
        tone: kindIcons.page.tone,
        href: item.href,
      })),
    [],
  );

  const groups = useMemo<ResultGroup[]>(() => {
    const term = query.trim();

    if (!term) {
      return [
        { title: "Ações rápidas", items: actions },
        {
          title: "Recentes",
          items: recent.map((item) => ({
            ...item,
            icon: Clock3,
            tone: "bg-white/[0.04] text-zinc-500",
          })),
        },
        { title: "Ir para", items: pages },
      ].filter((group) => group.items.length);
    }

    const today = getLocalTodayDateOnly();
    const toTransactionItem = (transaction: SearchTransaction): ResultItem => {
      const isIncome = transaction.type === "income";
      const owner = transaction.dependentId ? dependentNames.get(transaction.dependentId) : null;
      const card = transaction.cardId ? cardNames.get(transaction.cardId) : null;
      return {
        id: `tx:${transaction.id}`,
        kind: "transaction",
        label: transaction.description,
        detail: [
          formatDateOnlyBR(transaction.date),
          transaction.category || null,
          card ?? (transaction.type === "fixed" ? "Débito/Pix" : null),
          owner,
        ]
          .filter(Boolean)
          .join(" · "),
        icon: isIncome ? ArrowUpRight : transaction.type === "card" ? CreditCard : ReceiptText,
        tone: isIncome ? "bg-emerald-500/10 text-emerald-300" : kindIcons.transaction.tone,
        amount: { value: transaction.amount, positive: isIncome },
        href: "/dashboard/transactions",
        focus: {
          kind: "transaction",
          id: transaction.id,
          query: transaction.description,
          monthStart: transaction.monthStart,
        },
      };
    };

    /* Loaded months first, then the history lookup, without repeats. */
    const local: SearchTransaction[] = storeTransactions.map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      cardId: transaction.cardId ?? null,
      dependentId: transaction.dependentId ?? null,
      monthStart: transaction.billingMonthStart ?? transaction.date,
      isRecurring: Boolean(transaction.is_recurring),
      groupId: transaction.groupId ?? null,
      notes: transaction.notes ?? null,
    }));
    const seen = new Set<string>();
    const pool = [...local, ...history.results].filter((transaction) => {
      if (seen.has(transaction.id)) return false;
      seen.add(transaction.id);
      return true;
    });
    const transactionScore = (transaction: SearchTransaction) =>
      matchesAmount(term, transaction.amount)
        ? 70
        : scoreMatch(
            term,
            transaction.description,
            `${transaction.category} ${transaction.cardId ? (cardNames.get(transaction.cardId) ?? "") : ""} ${transaction.dependentId ? (dependentNames.get(transaction.dependentId) ?? "") : ""}`,
          );
    const matchedTransactions = pool
      .map((transaction) => ({ transaction, score: transactionScore(transaction) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          compareByRelevantDate(left.transaction.date, right.transaction.date, today),
      );

    const transactionItems = matchedTransactions
      .slice(0, TRANSACTION_LIMIT)
      .map((entry) => toTransactionItem(entry.transaction));
    if (matchedTransactions.length > TRANSACTION_LIMIT) {
      transactionItems.push({
        id: "see-all",
        kind: "see-all",
        label: `Ver os ${matchedTransactions.length}${history.results.length >= 30 ? "+" : ""} resultados em Transações`,
        detail: `Busca por “${term}”`,
        icon: Search,
        tone: kindIcons["see-all"].tone,
        href: "/dashboard/transactions",
        focus: { kind: "search", query: term },
      });
    }

    /* One entry per recurring series (fixed bill or subscription). */
    const series = new Map<string, SearchTransaction>();
    local
      .filter((transaction) => transaction.isRecurring && transaction.type !== "income")
      .forEach((transaction) => {
        const key = transaction.groupId ?? transaction.id;
        if (!series.has(key)) series.set(key, transaction);
      });

    const resultGroups: ResultGroup[] = [
      {
        title: "Lançamentos",
        items: transactionItems,
        loading: history.isLoading,
      },
      {
        title: "Cartões",
        items: rankByScore(cards, (card) => scoreMatch(term, card.name, "cartão fatura"), 4).map(
          (card) => ({
            id: `card:${card.id}`,
            kind: "card" as const,
            label: card.name,
            detail: card.closingDay ? `Fecha dia ${card.closingDay} · vence dia ${card.dueDay ?? "—"}` : "Cartão",
            ...kindIcons.card,
            href: "/dashboard/cards",
            focus: { kind: "card" as const, id: card.id },
          }),
        ),
      },
      {
        title: "Pessoas",
        items: rankByScore(dependents, (dependent) => scoreMatch(term, dependent.name, "dependente"), 4).map(
          (dependent) => ({
            id: `dependent:${dependent.id}`,
            kind: "dependent" as const,
            label: dependent.name,
            detail: "Dependente",
            ...kindIcons.dependent,
            href: "/dashboard/dependentes",
            focus: { kind: "dependent" as const, id: dependent.id },
          }),
        ),
      },
      {
        title: "Categorias",
        items: rankByScore(
          categories.filter((category) => category.kind === "expense"),
          (category) => scoreMatch(term, category.label, "categoria"),
          4,
        ).map((category) => ({
          id: `category:${category.label}`,
          kind: "category" as const,
          label: category.label,
          detail: "Ver lançamentos desta categoria",
          ...kindIcons.category,
          href: "/dashboard/transactions",
          focus: { kind: "category" as const, label: category.label },
        })),
      },
      {
        title: "Contas fixas e assinaturas",
        items: rankByScore(
          Array.from(series.values()),
          (transaction) => scoreMatch(term, transaction.description, transaction.category),
          4,
        ).map((transaction) => ({
          id: `recurring:${transaction.groupId ?? transaction.id}`,
          kind: "recurring" as const,
          label: transaction.description,
          detail: `${transaction.type === "card" ? "Assinatura" : "Conta fixa"} · todo dia ${transaction.date.slice(8, 10)}`,
          ...kindIcons.recurring,
          amount: { value: transaction.amount, positive: false },
          href: "/dashboard/fixed",
        })),
      },
      {
        title: "Páginas",
        items: rankByScore(pages, (page) => scoreMatch(term, page.label, page.detail), 4),
      },
      {
        title: "Ações",
        items: rankByScore(actions, (action) => scoreMatch(term, action.label, `${action.detail} criar adicionar lancar`), 3),
      },
    ];

    /* The group holding the closest match goes first: "nubank" shows the
       card before purchases that only mention it. Ties keep this order. */
    const groupScore = (group: ResultGroup) =>
      group.title === "Lançamentos"
        ? (matchedTransactions[0]?.score ?? 0)
        : Math.max(0, ...group.items.map((item) => scoreMatch(term, item.label)));

    return resultGroups
      .filter((group) => group.items.length || group.loading)
      .map((group, order) => ({ group, order, score: groupScore(group) }))
      .sort((left, right) => right.score - left.score || left.order - right.order)
      .map((entry) => entry.group);
  }, [actions, cardNames, cards, categories, dependentNames, dependents, history.isLoading, history.results, pages, query, recent, storeTransactions]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const safeIndex = Math.min(activeIndex, Math.max(flatItems.length - 1, 0));

  function close() {
    setCommandPaletteOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function select(item: ResultItem) {
    if (item.run) {
      item.run();
      return;
    }
    saveRecent(item);
    if (item.focus) requestFocus(item.focus);
    close();
    if (item.href) {
      if (onNavigate) onNavigate(item.href);
      else router.push(item.href);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!flatItems.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((safeIndex + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((safeIndex - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[safeIndex];
      if (item) select(item);
    }
  }

  useEffect(() => {
    document
      .getElementById(`search-result-${safeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={(open) => (open ? setCommandPaletteOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="top-4 flex max-h-[min(40rem,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] translate-y-0 flex-col gap-0 overflow-hidden border border-white/[0.1] bg-zinc-950 p-0 shadow-2xl shadow-black/60 sm:top-[10vh] sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Buscar no Finync</DialogTitle>
        <DialogDescription className="sr-only">
          Encontre lançamentos, cartões, pessoas, categorias, páginas e ações.
        </DialogDescription>

        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] px-4">
          {history.isLoading ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-zinc-500" />
          ) : (
            <Search className="size-5 shrink-0 text-zinc-500" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar lançamentos, valores, cartões, pessoas..."
            aria-label="Buscar no Finync"
            role="combobox"
            aria-expanded
            aria-controls="global-search-results"
            aria-activedescendant={flatItems.length ? `search-result-${safeIndex}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <kbd className="hidden shrink-0 rounded border border-white/[0.1] px-1.5 py-0.5 text-[10px] text-zinc-500 sm:block">
            Esc
          </kbd>
        </div>

        <div
          id="global-search-results"
          role="listbox"
          aria-label="Resultados"
          className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]"
        >
          {groups.length ? (
            groups.map((group) => (
              <section key={group.title} className="py-1">
                <p className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
                  {group.title}
                  {group.loading && (
                    <span className="flex items-center gap-1 normal-case tracking-normal text-zinc-600">
                      <Loader2 className="size-3 animate-spin" />
                      procurando no histórico
                    </span>
                  )}
                </p>
                {group.items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const isActive = index === safeIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`search-result-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => index !== safeIndex && setActiveIndex(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        isActive ? "bg-white/[0.06] text-zinc-50" : "text-zinc-300",
                      )}
                    >
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", item.tone)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          <Highlight text={item.label} query={query} />
                        </span>
                        <span className="block truncate text-xs text-zinc-500">{item.detail}</span>
                      </span>
                      {item.amount && (
                        <span
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            item.amount.positive ? "text-emerald-300" : "text-zinc-200",
                          )}
                        >
                          {item.amount.positive ? "+" : ""}
                          {formatValue(item.amount.value)}
                        </span>
                      )}
                      {isActive && !item.amount && (
                        <ArrowRight className="size-4 shrink-0 text-zinc-500" />
                      )}
                    </button>
                  );
                })}
              </section>
            ))
          ) : (
            <EmptyState query={query} />
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-4 border-t border-white/[0.06] px-4 py-2 text-[11px] text-zinc-600 sm:flex">
          <span><Key>↑</Key> <Key>↓</Key> navegar</span>
          <span><Key>Enter</Key> abrir</span>
          <span className="ml-auto">Dica: digite um valor, como “45,90”</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/[0.1] px-1 py-0.5 text-[10px] text-zinc-500">{children}</kbd>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
      <Search className="size-6 text-zinc-700" />
      <p className="mt-3 text-sm font-medium text-zinc-300">Nada encontrado para “{query.trim()}”</p>
      <p className="mt-1 text-xs text-zinc-600">
        Tente o nome do estabelecimento, uma categoria, um cartão ou um valor.
      </p>
    </div>
  );
}
