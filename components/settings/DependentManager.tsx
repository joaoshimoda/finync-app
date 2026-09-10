"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, PlusCircle, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

interface DependentManagerProps {
  selectedDependentId?: string | null;
  onSelectDependent?: (dependentId: string) => void;
}

export function DependentManager({
  selectedDependentId,
  onSelectDependent,
}: DependentManagerProps) {
  const dependents = useFinanceStore((state) => state.dependents);
  const fetchDependents = useFinanceStore((state) => state.fetchDependents);
  const addDependent = useFinanceStore((state) => state.addDependent);
  const deleteDependent = useFinanceStore((state) => state.deleteDependent);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchDependents();
  }, [fetchDependents]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    if (!normalizedName || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await addDependent({ name: normalizedName });
      setName("");
      toast.success("Dependente adicionado.");
    } catch (error) {
      console.error("Erro ao adicionar dependente:", error);
      toast.error("Não foi possível adicionar o dependente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(dependentId: string) {
    try {
      await deleteDependent(dependentId);
      toast.success("Dependente removido.");
    } catch (error) {
      console.error("Erro ao remover dependente:", error);
      toast.error("Não foi possível remover o dependente.");
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950 shadow-none">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle>Cadastro</CardTitle>
        <CardDescription>
          Cadastre pessoas para identificar gastos e valores a receber.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <form
          onSubmit={handleSubmit}
          data-tour="dependent-add"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="dependent-name">Nome</Label>
            <Input
              id="dependent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Ana"
              className="h-10 border-zinc-700 bg-zinc-900"
              maxLength={80}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-4 w-full">
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlusCircle className="size-4" />
            )}
            Adicionar
          </Button>
        </form>

        <div className="space-y-2">
          {dependents.length ? (
            dependents.map((dependent) => (
              <div
                key={dependent.id}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-2xl border p-3 transition-colors",
                  selectedDependentId === dependent.id
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDependent?.(dependent.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      selectedDependentId === dependent.id
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-950 text-zinc-400",
                    )}
                  >
                    <UserRound className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {dependent.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Ver lançamentos vinculados
                    </span>
                  </span>
                </button>

                <ConfirmDialog
                  title="Remover dependente?"
                  description="Os lançamentos existentes serão preservados, mas deixarão de estar vinculados a esta pessoa."
                  confirmLabel="Remover"
                  onConfirm={() => handleDelete(dependent.id)}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${dependent.name}`}
                    className="shrink-0 text-zinc-500 hover:bg-red-950 hover:text-red-300"
                  >
                    <Trash2 />
                  </Button>
                </ConfirmDialog>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm leading-6 text-zinc-500">
              Nenhum dependente cadastrado. Adicione um nome para começar a
              separar gastos de terceiros.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
