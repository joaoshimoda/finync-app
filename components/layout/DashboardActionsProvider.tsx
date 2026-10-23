"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";

export type DashboardQuickAction = "expense" | "income" | "card";

/* What the global search asks the destination page to show. */
export type FocusTarget =
  | { kind: "transaction"; id: string; query: string; monthStart: string }
  | { kind: "search"; query: string }
  | { kind: "category"; label: string }
  | { kind: "card"; id: string }
  | { kind: "dependent"; id: string };

export type FocusRequest = FocusTarget & { nonce: number };

type DashboardActionsContextValue = {
  commandPaletteOpen: boolean;
  quickActionOpen: boolean;
  openQuickAction: (action: DashboardQuickAction) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  focusRequest: FocusRequest | null;
  requestFocus: (target: FocusTarget) => void;
  clearFocus: () => void;
};

const DashboardActionsContext =
  createContext<DashboardActionsContextValue | null>(null);

export function DashboardActionsProvider({ children }: { children: ReactNode }) {
  const [activeQuickAction, setActiveQuickAction] =
    useState<DashboardQuickAction | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const requestFocus = useCallback((target: FocusTarget) => {
    setFocusRequest({ ...target, nonce: Date.now() });
  }, []);
  const clearFocus = useCallback(() => setFocusRequest(null), []);

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
      focusRequest,
      requestFocus,
      clearFocus,
    }),
    [activeQuickAction, clearFocus, commandPaletteOpen, focusRequest, openQuickAction, requestFocus],
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

/* A page reacts to a focus request of its kind and then clears it. Works
   outside the provider too (the public demo), where it does nothing. */
export function useFocusRequest<K extends FocusTarget["kind"]>(
  kind: K,
  onFocus: (target: Extract<FocusRequest, { kind: K }>) => void,
) {
  const context = useContext(DashboardActionsContext);
  const request = context?.focusRequest;
  const clear = context?.clearFocus;

  useEffect(() => {
    if (!request || request.kind !== kind) return;
    onFocus(request as Extract<FocusRequest, { kind: K }>);
    clear?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per request; onFocus is usually an inline closure
  }, [request?.nonce]);
}
