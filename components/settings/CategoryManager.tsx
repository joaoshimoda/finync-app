"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LockKeyhole,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryGlyph } from "@/components/finance/categoryIcons";
import { ManageCategoryModal } from "@/components/modals/ManageCategoryModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  isEssentialCategory,
  type CategoryKind,
} from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Category,
} from "@/store/useFinanceStore";

export function CategoryManager() {
  const categories = useFinanceStore((state) => state.categories);
  const fetchCategories = useFinanceStore((state) => state.fetchCategories);
  const deleteCategory = useFinanceStore((state) => state.deleteCategory);
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const categoryCounts = useMemo(
    () => ({
      expense: categories.filter((category) => category.kind === "expense")
        .length,
      income: categories.filter((category) => category.kind === "income")
        .length,
    }),
    [categories],
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );

  function openCreateModal() {
    setEditingCategory(null);
    setIsModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setIsModalOpen(true);
  }

  async function handleDeleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);

    try {
      await deleteCategory(categoryId);
      toast.success("Categoria removida.");
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      const databaseError = error as { code?: string; message?: string };
      const normalizedMessage = databaseError.message?.toLocaleLowerCase(
        "pt-BR",
      );
      const isCategoryInUse =
        databaseError.code === "23503" ||
        normalizedMessage?.includes("foreign key") ||
        normalizedMessage?.includes("referenced");

      toast.error(
        isCategoryInUse
          ? "Não é possível excluir uma categoria que possui transações."
          : databaseError.message || "Não foi possível remover a categoria.",
      );
      throw error;
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <>
      <Card className="surface-panel lg:col-span-12">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <CardTitle>Categorias</CardTitle>
            <CardDescription className="mt-1">
              {categories.length} opções disponíveis para seus lançamentos.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            className="h-11 shrink-0 bg-emerald-600 px-4 font-semibold text-on-color hover:bg-emerald-700"
          >
            <PlusCircle className="size-4" />
            <span className="max-sm:hidden">Nova categoria</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-3 sm:px-6">
            <div className="inline-flex rounded-lg bg-zinc-950 p-1">
              {([
                ["expense", "Despesas"],
                ["income", "Receitas"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={cn(
                    "h-9 rounded-md px-3 text-xs font-medium transition-colors",
                    kind === value
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {label}
                  <span className="ml-2 text-[10px] text-zinc-500">
                    {categoryCounts[value]}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-600">
              {visibleCategories.length} nesta lista
            </span>
          </div>

          {visibleCategories.length ? (
            <div className="divide-y divide-zinc-800/80">
              {visibleCategories.map((category) => {
                const isEssential = isEssentialCategory(category.label);

                return (
                  <div
                    key={category.id}
                    className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-950/45 sm:px-6"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        kind === "expense"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-emerald-500/10 text-emerald-300",
                      )}
                    >
                      <CategoryGlyph name={category.icon} className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {category.label}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                        {isEssential ? (
                          <>
                            <LockKeyhole className="size-3" /> Essencial
                          </>
                        ) : (
                          "Personalizada"
                        )}
                      </p>
                    </div>

                    {!isEssential ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                          onClick={() => openEditModal(category)}
                          aria-label={`Editar categoria ${category.label}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDialog
                          title="Excluir categoria?"
                          description={`A categoria ${category.label} será removida. Categorias em uso são protegidas pelo banco.`}
                          confirmLabel="Excluir categoria"
                          loadingLabel="Excluindo..."
                          details={category.label}
                          errorMessage="A categoria pode estar vinculada a transações. Remova os vínculos antes de tentar novamente."
                          onConfirm={() => handleDeleteCategory(category.id)}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-10 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                            disabled={deletingCategoryId === category.id}
                            aria-label={`Excluir categoria ${category.label}`}
                          >
                            {deletingCategoryId === category.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </ConfirmDialog>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-zinc-300">
                Nenhuma categoria nesta lista
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Adicione uma categoria para começar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ManageCategoryModal
        category={editingCategory}
        defaultKind={kind}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingCategory(null);
        }}
      />
    </>
  );
}
