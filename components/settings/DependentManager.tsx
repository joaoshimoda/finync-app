"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
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
import { useFinanceStore } from "@/store/useFinanceStore";

export function DependentManager() {
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
        <CardTitle>Dependentes</CardTitle>
        <CardDescription>
          Cadastre pessoas para identificar gastos e valores a receber.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-7 py-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar
          </Button>
        </form>

        <div className="divide-y divide-zinc-800 border-y border-zinc-800">
          {dependents.length ? (
            dependents.map((dependent) => (
              <div
                key={dependent.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
                    <UserRound className="size-4" />
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {dependent.name}
                  </span>
                </div>

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
                    className="text-zinc-500 hover:bg-red-950 hover:text-red-300"
                  >
                    <Trash2 />
                  </Button>
                </ConfirmDialog>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-zinc-500">
              Nenhum dependente cadastrado.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
