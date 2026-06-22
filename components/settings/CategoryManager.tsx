"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PlusCircle, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  isEssentialCategory,
  type CategoryKind,
} from "@/lib/categories";

export function CategoryManager() {
  const categories = useFinanceStore((state) => state.categories);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const deleteCategory = useFinanceStore((state) => state.deleteCategory);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );

  async function handleAddCategory() {
    const normalizedLabel = label.trim();

    if (!normalizedLabel) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    if (
      categories.some(
        (category) =>
          category.kind === kind &&
          category.label.toLocaleLowerCase("pt-BR") ===
            normalizedLabel.toLocaleLowerCase("pt-BR"),
      )
    ) {
      toast.error("Essa categoria já existe.");
      return;
    }

    setIsSaving(true);

    try {
      await addCategory({ label: normalizedLabel, kind, icon: "Tag" });
      setLabel("");
      toast.success("Categoria adicionada!");
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error("Não foi possível adicionar a categoria.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);

    try {
      await deleteCategory(categoryId);
      toast.success("Categoria removida.");
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      const databaseError = error as { code?: string; message?: string };
      const isCategoryInUse =
        databaseError.code === "23503" ||
        databaseError.message?.toLocaleLowerCase("pt-BR").includes("foreign key") ||
        databaseError.message?.toLocaleLowerCase("pt-BR").includes("referenced");

      toast.error(
        isCategoryInUse
          ? "Não é possível excluir uma categoria que possui transações."
          : databaseError.message || "Não foi possível remover a categoria.",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-12">
      <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
        <CardTitle>Categorias personalizadas</CardTitle>
        <CardDescription>
          Organize lançamentos com categorias que fazem sentido para você.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex: Pets"
              maxLength={60}
              className="h-11 border-zinc-700 bg-zinc-950"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value as CategoryKind)}
            >
              <SelectTrigger className="h-11 border-zinc-700 bg-zinc-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void handleAddCategory()}
            disabled={isSaving}
          >
            <PlusCircle className="size-4" />
            {isSaving ? "Adicionando..." : "Adicionar categoria"}
          </Button>
        </div>

        <div className="grid content-start gap-2 sm:grid-cols-2">
          {visibleCategories.map((category) => (
            <div
              key={category.id}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  <Tag className="size-4" />
                </span>
                <span className="truncate text-sm text-zinc-200">
                  {category.label}
                </span>
              </div>
              {!isEssentialCategory(category.label) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 text-zinc-500 hover:text-red-300"
                  onClick={() => void handleDeleteCategory(category.id)}
                  disabled={deletingCategoryId === category.id}
                  aria-label={`Remover categoria ${category.label}`}
                >
                  {deletingCategoryId === category.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
