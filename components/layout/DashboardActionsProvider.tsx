"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";

export type DashboardQuickAction = "expense" | "income" | "card";

type DashboardActionsContextValue = {
  commandPaletteOpen: boolean;
  quickActionOpen: boolean;
  openQuickAction: (action: DashboardQuickAction) => void;
  setCommandPaletteOpen: (open: boolean) => void;
};

const DashboardActionsContext =
  createContext<DashboardActionsContextValue | null>(null);

export function DashboardActionsProvider({ children }: { children: ReactNode }) {
  const [activeQuickAction, setActiveQuickAction] =
    useState<DashboardQuickAction | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const openQuickAction = useCallback((action: DashboardQuickAction) => {
    setCommandPaletteOpen(false);
    setActiveQuickAction(action);
  }, []);

  const contextValue = useMemo(
    () => ({
      commandPaletteOpen,
      quickActionOpen: activeQuickAction !== null,
      openQuickAction,
      setCommandPaletteOpen,
    }),
    [activeQuickAction, commandPaletteOpen, openQuickAction],
  );

  return (
    <DashboardActionsContext.Provider value={contextValue}>
      {children}

      <AddCardModal
        isOpen={activeQuickAction === "card"}
        onClose={() => setActiveQuickAction(null)}
      />
      <AddIncomeModal
        isOpen={activeQuickAction === "income"}
        onClose={() => setActiveQuickAction(null)}
        onSelectExpense={() => setActiveQuickAction("expense")}
      />
      <AddTransactionModal
        isOpen={activeQuickAction === "expense"}
        onClose={() => setActiveQuickAction(null)}
        onSelectIncome={() => setActiveQuickAction("income")}
      />
    </DashboardActionsContext.Provider>
  );
}

export function useDashboardActions() {
  const context = useContext(DashboardActionsContext);

  if (!context) {
    throw new Error(
      "useDashboardActions must be used inside DashboardActionsProvider",
    );
  }

  return context;
}
