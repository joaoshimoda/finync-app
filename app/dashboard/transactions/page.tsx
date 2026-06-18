"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AddIncomeModal } from "@/components/modals/AddIncomeModal";
import { AddTransactionModal } from "@/components/modals/AddTransactionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateOnlyBR } from "@/lib/dateUtils";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

type TransactionFilter = "all" | "debit" | `card:${string}`;

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const typeLabel: Record<string, string> = {
  card: "Cartao",
  fixed: "Fixo",
  income: "Receita",
};

function sortByRecentDate(left: Transaction, right: Transaction) {
  return right.date.localeCompare(left.date);
}

function isDebitTransaction(transaction: Transaction) {
  return (
    transaction.type === "fixed" ||
    (transaction.type !== "income" && !transaction.cardId)
  );
}

export default function TransactionsPage() {
  const [selectedFilter, setSelectedFilter] =
    useState<TransactionFilter>("all");
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const cards = useFinanceStore((state) => state.cards);
  const transactions = useFinanceStore((state) => state.transactions);
  const fetchCards = useFinanceStore((state) => state.fetchCards);
  const fetchTransactions = useFinanceStore((state) => state.fetchTransactions);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      if (selectedFilter === "all") return true;
      if (selectedFilter === "debit") return isDebitTransaction(transaction);

      return transaction.cardId === selectedFilter.replace("card:", "");
    });

    return filtered.sort(sortByRecentDate);
  }, [selectedFilter, transactions]);

  useEffect(() => {
    void fetchCards();
    void fetchTransactions();
  }, [fetchCards, fetchTransactions]);

  function handleCloseIncomeModal() {
    setIsAddIncomeModalOpen(false);
    setEditingTransaction(null);
  }

  function handleCloseTransactionModal() {
    setIsAddTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);

    if (transaction.type === "income") {
      setIsAddIncomeModalOpen(true);
      return;
    }

    setIsAddTransactionModalOpen(true);
  }

  async function handleDeleteTransaction(transactionId: string) {
    try {
      await deleteTransaction(transactionId);
      toast.success("Movimentacao excluida.");
    } catch (error) {
      console.error("Erro ao excluir movimentacao:", error);
      toast.error("Nao foi possivel excluir agora.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Transacoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
            Historico de movimentacoes
          </h1>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setEditingTransaction(null);
            setIsAddTransactionModalOpen(true);
          }}
        >
          <Plus />
          Nova despesa
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={selectedFilter === "all" ? "default" : "outline"}
          onClick={() => setSelectedFilter("all")}
        >
          Todas
        </Button>
        <Button
          type="button"
          variant={selectedFilter === "debit" ? "default" : "outline"}
          onClick={() => setSelectedFilter("debit")}
        >
          <Receipt />
          Pix / Debito
        </Button>
        {cards.map((card) => {
          const filterValue = `card:${card.id}` as const;

          return (
            <Button
              key={card.id}
              type="button"
              variant={selectedFilter === filterValue ? "default" : "outline"}
              onClick={() => setSelectedFilter(filterValue)}
            >
              <CreditCard />
              {card.name}
            </Button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="hidden lg:table-cell">Origem</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-24 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction) => {
                const linkedCard = transaction.cardId
                  ? cards.find((card) => card.id === transaction.cardId)
                  : null;
                const originLabel =
                  transaction.type === "income"
                    ? "Receita"
                    : linkedCard?.name ?? "Pix / Debito";

                return (
                  <TableRow key={transaction.id} className="hover:bg-muted/35">
                    <TableCell className="text-muted-foreground">
                      {formatDateOnlyBR(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {transaction.description}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground md:hidden">
                        {transaction.category || typeLabel[transaction.type]}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="rounded-lg">
                        {transaction.category || typeLabel[transaction.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {originLabel}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        transaction.type === "income"
                          ? "text-emerald-300"
                          : "text-red-300",
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {brlFormatter.format(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Editar movimentacao"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDialog
                          title="Excluir movimentacao"
                          description="Esta acao remove o lancamento e nao pode ser desfeita."
                          confirmLabel="Excluir"
                          onConfirm={() =>
                            handleDeleteTransaction(transaction.id)
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir movimentacao"
                            className="text-muted-foreground hover:text-red-300"
                          >
                            <Trash2 />
                          </Button>
                        </ConfirmDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhuma movimentacao neste filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddIncomeModal
        isOpen={isAddIncomeModalOpen}
        onClose={handleCloseIncomeModal}
        editingTransaction={
          editingTransaction?.type === "income" ? editingTransaction : null
        }
      />
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        editingTransaction={
          editingTransaction && editingTransaction.type !== "income"
            ? editingTransaction
            : null
        }
      />
    </div>
  );
}
