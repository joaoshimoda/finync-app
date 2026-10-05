"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Plus,
  X,
} from "lucide-react";

import { useDashboardActions } from "@/components/layout/DashboardActionsProvider";
import { cn } from "@/lib/utils";

const actions = [
  {
    id: "expense" as const,
    label: "Nova despesa",
    description: "PIX, débito ou crédito",
    icon: ArrowDownLeft,
    iconClassName: "bg-rose-500/10 text-rose-300",
  },
  {
    id: "income" as const,
    label: "Nova receita",
    description: "Salário ou outra entrada",
    icon: ArrowUpRight,
    iconClassName: "bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "card" as const,
    label: "Novo cartão",
    description: "Cadastre limite e ciclo",
    icon: CreditCard,
    iconClassName: "bg-sky-500/10 text-sky-300",
  },
];

export function MobileQuickAction() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { commandPaletteOpen, openQuickAction, quickActionOpen } =
    useDashboardActions();

  function openAction(action: "expense" | "income" | "card") {
    setIsMenuOpen(false);
    openQuickAction(action);
  }

  return (
    <>
      {isMenuOpen && !commandPaletteOpen ? (
        <button
          type="button"
          aria-label="Fechar ações rápidas"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      {!quickActionOpen && !commandPaletteOpen ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-[60] flex flex-col items-end gap-3 md:hidden">
          {isMenuOpen ? (
            <div className="w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/[0.09] bg-zinc-950 p-2 shadow-2xl shadow-black/50">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.id}
                    type="button"
                    className="flex min-h-16 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]"
                    onClick={() => openAction(action.id)}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        action.iconClassName,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm font-medium text-zinc-100">
                        {action.label}
                      </strong>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            data-tour="dashboard-new"
            aria-label={isMenuOpen ? "Fechar ações rápidas" : "Criar novo item"}
            aria-expanded={isMenuOpen}
            className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-lg shadow-black/40 transition-transform active:scale-95"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="size-6" /> : <Plus className="size-6" />}
          </button>
        </div>
      ) : null}

    </>
  );
}
