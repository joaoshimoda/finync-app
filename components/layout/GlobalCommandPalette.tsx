"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Search,
} from "lucide-react";

import { useDashboardActions } from "@/components/layout/DashboardActionsProvider";
import { navigationItems, navigationSections } from "@/components/layout/navigationItems";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PaletteCommand = {
  id: string;
  label: string;
  description: string;
  group: "Ações" | "Navegação";
  icon: typeof Search;
  keywords: string;
  run: () => void;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function GlobalCommandPalette() {
  const router = useRouter();
  const {
    commandPaletteOpen,
    openQuickAction,
    setCommandPaletteOpen,
  } = useDashboardActions();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo<PaletteCommand[]>(() => {
    const actionCommands: PaletteCommand[] = [
      {
        id: "new-expense",
        label: "Nova despesa",
        description: "PIX, débito ou cartão",
        group: "Ações",
        icon: ArrowDownLeft,
        keywords: "gasto compra lancamento",
        run: () => openQuickAction("expense"),
      },
      {
        id: "new-income",
        label: "Nova receita",
        description: "Salário ou outra entrada",
        group: "Ações",
        icon: ArrowUpRight,
        keywords: "entrada renda salario",
        run: () => openQuickAction("income"),
      },
      {
        id: "new-card",
        label: "Novo cartão",
        description: "Cadastre limite e ciclo",
        group: "Ações",
        icon: CreditCard,
        keywords: "credito banco fatura",
        run: () => openQuickAction("card"),
      },
    ];

    const routeCommands = navigationItems.map((item) => {
      const sectionLabel =
        navigationSections.find((section) => section.key === item.section)
          ?.label ?? "Finync";

      return {
        id: `route:${item.href}`,
        label: item.label,
        description: sectionLabel,
        group: "Navegação" as const,
        icon: item.icon,
        keywords: `${item.shortLabel} ${item.section}`,
        run: () => {
          setCommandPaletteOpen(false);
          router.push(item.href);
        },
      };
    });

    return [...actionCommands, ...routeCommands];
  }, [openQuickAction, router, setCommandPaletteOpen]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return commands;

    return commands.filter((command) =>
      normalizeSearch(
        `${command.label} ${command.description} ${command.keywords}`,
      ).includes(normalizedQuery),
    );
  }, [commands, query]);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.ctrlKey && !event.metaKey)) {
        return;
      }

      event.preventDefault();
      setCommandPaletteOpen(!commandPaletteOpen);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  function handleOpenChange(open: boolean) {
    setCommandPaletteOpen(open);

    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!filteredCommands.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filteredCommands.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + filteredCommands.length) % filteredCommands.length,
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();
      filteredCommands[Math.min(activeIndex, filteredCommands.length - 1)]?.run();
    }
  }

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-4 max-h-[min(38rem,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden border border-white/[0.1] bg-zinc-950 p-0 shadow-2xl shadow-black/60 sm:top-[12vh] sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Buscar no Finync</DialogTitle>
        <DialogDescription className="sr-only">
          Navegue entre páginas ou execute uma ação rápida.
        </DialogDescription>

        <div className="flex h-14 items-center gap-3 border-b border-white/[0.08] px-4">
          <Search className="size-5 shrink-0 text-zinc-500" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas e ações"
            className="h-full border-0 bg-transparent px-0 text-base text-zinc-100 shadow-none ring-0 focus-visible:ring-0"
          />
        </div>

        <div className="min-h-0 overflow-y-auto p-2 [scrollbar-width:thin]">
          {filteredCommands.length ? (
            (["Ações", "Navegação"] as const).map((group) => {
              const groupCommands = filteredCommands.filter(
                (command) => command.group === group,
              );

              if (!groupCommands.length) return null;

              return (
                <section key={group} className="py-1">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase text-zinc-600">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {groupCommands.map((command) => {
                      const commandIndex = filteredCommands.indexOf(command);
                      const Icon = command.icon;
                      const active = commandIndex === activeIndex;

                      return (
                        <button
                          key={command.id}
                          type="button"
                          className={cn(
                            "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors",
                            active
                              ? "bg-emerald-500/10 text-zinc-50"
                              : "text-zinc-300 hover:bg-white/[0.05]",
                          )}
                          onMouseEnter={() => setActiveIndex(commandIndex)}
                          onClick={command.run}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900",
                              active ? "text-emerald-300" : "text-zinc-500",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm font-medium">
                              {command.label}
                            </strong>
                            <span className="block truncate text-xs text-zinc-600">
                              {command.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
              <Search className="size-6 text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-300">
                Nenhum resultado
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Tente buscar por página ou tipo de lançamento.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
