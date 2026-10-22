"use client";

import { MotionConfig, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BalanceOverview } from "@/components/dashboard/BalanceOverview";
import { CardsSection } from "@/components/dashboard/CardsSection";
import { CategorySpending } from "@/components/dashboard/CategorySpending";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DependentsSummary } from "@/components/dashboard/DependentsSummary";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
  dashboardReveal,
  dashboardStagger,
} from "@/components/dashboard/shared";
import { UpcomingDues } from "@/components/dashboard/UpcomingDues";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { VariableIncomeConfirmation } from "@/components/dashboard/VariableIncomeConfirmation";
import { AddCardModal } from "@/components/modals/AddCardModal";
import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { PayInvoiceModal } from "@/components/modals/PayInvoiceModal";
import {
  useFinanceStore,
  type CardInvoice,
  type Transaction,
} from "@/store/useFinanceStore";

const compactBreakpoint = 640;
const setupDismissedStorageKey = "finync:dashboard-setup-dismissed";

function getRecentTransactionLimit() {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < compactBreakpoint) return 3;
  if (window.innerWidth >= 1920 || window.innerHeight >= 1000) return 7;
  if (window.innerWidth >= 1440 || window.innerHeight >= 850) return 6;

  return 4;
}

function readSetupDismissed(userId: string | undefined) {
  if (!userId) return false;

  try {
    return window.localStorage.getItem(setupDismissedStorageKey) === userId;
  } catch {
    return false;
  }
}

export default function DashboardPage() {
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalMode, setTransactionModalMode] = useState<
    "expense" | "fixed"
  >("expense");
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: CardInvoice;
    cardName: string;
  } | null>(null);
  const [variableIncomeValues, setVariableIncomeValues] = useState<
    Record<string, string>
  >({});
  const [recentTransactionLimit, setRecentTransactionLimit] = useState(3);
  const [isCompact, setIsCompact] = useState(false);
  const authUser = useFinanceStore((state) => state.authUser);
  const authUserId = authUser?.id;
  const [isSetupDismissed, setIsSetupDismissed] = useState(() =>
    typeof window === "undefined" ? false : readSetupDismissed(authUserId),
  );

  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);

  const data = useDashboardData({ recentTransactionLimit });
  const { setupProgress } = data;
  const isSetupComplete =
    setupProgress.hasCard &&
    setupProgress.hasIncome &&
    setupProgress.hasRecurringBill;
  const showSetup =
    setupProgress.isEmptyAccount || (!isSetupComplete && !isSetupDismissed);

  const metadataName = authUser?.user_metadata?.name;
  const firstName =
    (typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().split(/\s+/)[0]
      : authUser?.email?.split("@")[0]) || "Usuário";
  const periodLabel =
    data.daysLeftInMonth === null
      ? `Resumo de ${data.selectedMonthName} de ${data.displayYear}.`
      : data.daysLeftInMonth === 0
        ? "Hoje é o último dia do mês."
        : `Faltam ${data.daysLeftInMonth} ${data.daysLeftInMonth === 1 ? "dia" : "dias"} para o mês acabar.`;

  useEffect(() => {
    let resizeFrame: number | null = null;

    const updateResponsiveDensity = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        setRecentTransactionLimit(getRecentTransactionLimit());
        setIsCompact(window.innerWidth < compactBreakpoint);
      });
    };

    updateResponsiveDensity();
    window.addEventListener("resize", updateResponsiveDensity);

    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", updateResponsiveDensity);
    };
  }, []);

  useEffect(() => {
    void fetchTransactions();
  }, [currentMonth, currentYear, fetchTransactions]);

  const openTransactionModal = useCallback((mode: "expense" | "fixed") => {
    setTransactionModalMode(mode);
    setIsTransactionModalOpen(true);
  }, []);

  const dismissSetup = useCallback(() => {
    setIsSetupDismissed(true);

    try {
      if (authUserId) {
        window.localStorage.setItem(setupDismissedStorageKey, authUserId);
      }
    } catch {
      // Dismissal only lasts for this visit when storage is unavailable.
    }
  }, [authUserId]);

  const handlePayInvoice = useCallback(
    (invoice: CardInvoice, cardName: string) => {
      setPaymentTarget({ invoice, cardName });
    },
    [],
  );

  const handleConfirmVariableIncome = useCallback(
    async (transaction: Transaction) => {
      const nextAmount = Number(
        (variableIncomeValues[transaction.id] || "")
          .replace(/\./g, "")
          .replace(",", "."),
      );

      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        toast.error("Informe um valor válido para confirmar a renda.");
        return;
      }

      try {
        await updateTransaction(transaction.id, {
          amount: nextAmount,
          status: "confirmed",
        });
        setVariableIncomeValues((currentValues) => {
          const nextValues = { ...currentValues };
          delete nextValues[transaction.id];
          return nextValues;
        });
        await fetchTransactions();
        toast.success("Renda variável confirmada!");
      } catch (error) {
        console.error("Erro ao confirmar renda variável:", error);
        toast.error("Não foi possível confirmar essa renda agora.");
      }
    },
    [fetchTransactions, updateTransaction, variableIncomeValues],
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-2 sm:gap-6 lg:gap-8"
      >
        <DashboardHeader
          firstName={firstName}
          periodLabel={periodLabel}
          onNewExpense={() => openTransactionModal("expense")}
          onNewIncome={() => setIsAddIncomeModalOpen(true)}
          onNewCard={() => setIsAddCardModalOpen(true)}
        />

        {showSetup && (
          <OnboardingChecklist
            hasCard={setupProgress.hasCard}
            hasIncome={setupProgress.hasIncome}
            hasRecurringBill={setupProgress.hasRecurringBill}
            onAddCard={() => setIsAddCardModalOpen(true)}
            onAddIncome={() => setIsAddIncomeModalOpen(true)}
            onAddRecurringBill={() => openTransactionModal("fixed")}
            onDismiss={setupProgress.isEmptyAccount ? undefined : dismissSetup}
          />
        )}

        {!setupProgress.isEmptyAccount && (
          <>
            <BalanceOverview
              balanceTimeline={data.balanceTimeline}
              dailyAllowance={data.dailyAllowance}
              displayMonth={data.displayMonth}
              incomeAllocation={data.incomeAllocation}
              isFetching={data.isFetching}
              monthlyBalances={data.monthlyBalances}
              personalExpenseTotal={data.personalExpenseTotal}
              savingsRate={data.savingsRate}
              selectedMonthName={data.selectedMonthName}
            />

            {data.pendingVariableIncomes.length > 0 && (
              <VariableIncomeConfirmation
                incomes={data.pendingVariableIncomes}
                values={variableIncomeValues}
                onValueChange={(incomeId, value) =>
                  setVariableIncomeValues((currentValues) => ({
                    ...currentValues,
                    [incomeId]: value,
                  }))
                }
                onConfirm={(income) => void handleConfirmVariableIncome(income)}
              />
            )}

            <CardsSection
              cardSummaries={data.cardSpendingSummaries}
              onAddCard={() => setIsAddCardModalOpen(true)}
              onPayInvoice={handlePayInvoice}
            />

            <motion.div
              variants={dashboardReveal}
              className="grid items-start gap-5 sm:gap-6 lg:grid-cols-12"
            >
              <div className="grid min-w-0 gap-5 sm:gap-6 lg:col-span-7">
                <RecentActivity
                  groups={data.recentActivityGroups}
                  cardNamesById={data.cardNamesById}
                  isFetching={data.isFetching}
                />
                {data.dependentSpendingSummaries.length > 0 && (
                  <DependentsSummary
                    dependents={data.dependentSpendingSummaries}
                  />
                )}
              </div>

              <div className="grid min-w-0 gap-5 sm:gap-6 lg:col-span-5">
                <UpcomingDues
                  dues={data.upcomingDues}
                  limit={isCompact ? 3 : 4}
                  onPayInvoice={handlePayInvoice}
                />
                <CategorySpending
                  categories={data.categorySpending}
                  budgetHealth={data.budgetHealth}
                  limit={isCompact ? 4 : 5}
                />
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
      />
      <AddIncomeModal
        isOpen={isAddIncomeModalOpen}
        onClose={() => setIsAddIncomeModalOpen(false)}
        onSelectExpense={() => {
          setIsAddIncomeModalOpen(false);
          openTransactionModal("expense");
        }}
        editingTransaction={null}
      />
      <AddTransactionModal
        key={transactionModalMode}
        isOpen={isTransactionModalOpen}
        mode={transactionModalMode}
        onClose={() => setIsTransactionModalOpen(false)}
        onSelectIncome={() => {
          setIsTransactionModalOpen(false);
          setIsAddIncomeModalOpen(true);
        }}
        editingTransaction={null}
      />
      <PayInvoiceModal
        open={Boolean(paymentTarget)}
        invoice={paymentTarget?.invoice ?? null}
        cardName={paymentTarget?.cardName}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
      />
    </MotionConfig>
  );
}
