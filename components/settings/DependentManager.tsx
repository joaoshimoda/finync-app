"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Pencil,
  PlusCircle,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { ManageDependentModal } from "@/components/modals/ManageDependentModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Dependent,
} from "@/store/useFinanceStore";

interface DependentManagerProps {
  selectedDependentId?: string | null;
  onSelectDependent?: (dependentId: string) => void;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");
}

export function DependentManager({
  selectedDependentId,
  onSelectDependent,
}: DependentManagerProps) {
  const dependents = useFinanceStore((state) => state.dependents);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const deleteDependent = useFinanceStore((state) => state.deleteDependent);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    void fetchDependents();
  }, [fetchDependents]);

  function openCreateModal() {
    setEditingDependent(null);
    setIsModalOpen(true);
  }

  function openEditModal(dependent: Dependent) {
    setEditingDependent(dependent);
    setIsModalOpen(true);
  }

  async function handleDelete(dependentId: string) {
    try {
      await deleteDependent(dependentId);
      toast.success("Dependente removido.");
    } catch (error) {
      console.error("Erro ao remover dependente:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o dependente.",
      );
      throw error;
    }
  }

  return (
    <>
      <Card className="border-zinc-800 bg-zinc-950 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-zinc-800 px-5 py-5">
          <div className="min-w-0">
            <CardTitle>Pessoas</CardTitle>
            <CardDescription className="mt-1">
              {dependents.length
                ? `${dependents.length} dependente${dependents.length === 1 ? "" : "s"}`
                : "Nenhum dependente"}
            </CardDescription>
          </div>
          <Button
            type="button"
            data-tour="dependent-add"
            onClick={openCreateModal}
            className="size-11 shrink-0 bg-emerald-600 p-0 text-white hover:bg-emerald-700"
            aria-label="Adicionar dependente"
            title="Adicionar dependente"
          >
            <PlusCircle className="size-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {dependents.length ? (
            <div className="divide-y divide-zinc-800">
              {dependents.map((dependent) => {
                const isSelected = selectedDependentId === dependent.id;

                return (
                  <div
                    key={dependent.id}
                    className={cn(
                      "flex min-h-16 items-center gap-2 px-4 py-3 transition-colors",
                      isSelected
                        ? "bg-emerald-500/[0.07]"
                        : "hover:bg-zinc-900/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDependent?.(dependent.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-900 text-zinc-400",
                        )}
                      >
                        {getInitials(dependent.name) || (
                          <UserRound className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-zinc-100">
                          {dependent.name}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex items-center gap-1.5 text-xs",
                            isSelected ? "text-emerald-400" : "text-zinc-500",
                          )}
                        >
                          {isSelected ? (
                            <>
                              <Check className="size-3" /> Selecionado
                            </>
                          ) : (
                            "Ver movimentações"
                          )}
                        </span>
                      </span>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 shrink-0 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                      onClick={() => openEditModal(dependent)}
                      aria-label={`Editar ${dependent.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <ConfirmDialog
                      title="Remover dependente?"
                      description="Os lançamentos existentes serão preservados, mas deixarão de estar vinculados a esta pessoa."
                      confirmLabel="Remover dependente"
                      loadingLabel="Removendo..."
                      details={dependent.name}
                      onConfirm={() => handleDelete(dependent.id)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${dependent.name}`}
                        className="size-10 shrink-0 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                <UserRound className="size-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-zinc-300">
                Nenhuma pessoa cadastrada
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={openCreateModal}
                className="mt-4 h-10 border-zinc-700 bg-transparent"
              >
                <PlusCircle className="size-4" />
                Adicionar dependente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ManageDependentModal
        dependent={editingDependent}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingDependent(null);
        }}
      />
    </>
  );
}
