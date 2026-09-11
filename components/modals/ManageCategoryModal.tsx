"use client";

import { FormEvent, useState } from "react";
import { Check, Layers3, Tag, X } from "lucide-react";
import { toast } from "sonner";

import {
  CategoryGlyph,
  categoryIconOptions,
} from "@/components/finance/categoryIcons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CategoryKind } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  useFinanceStore,
  type Category,
} from "@/store/useFinanceStore";

type ManageCategoryModalProps = {
  category: Category | null;
  defaultKind: CategoryKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageCategoryModal({
  category,
  defaultKind,
  open,
  onOpenChange,
}: ManageCategoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CategoryForm
          key={category?.id ?? `new:${defaultKind}`}
          category={category}
          defaultKind={defaultKind}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function CategoryForm({
  category,
  defaultKind,
  onClose,
}: {
  category: Category | null;
  defaultKind: CategoryKind;
  onClose: () => void;
}) {
  const categories = useFinanceStore((state) => state.categories);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const editCategory = useFinanceStore((state) => state.editCategory);
  const [label, setLabel] = useState(category?.label ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? defaultKind);
  const [icon, setIcon] = useState(category?.icon ?? "Tag");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isExpense = kind === "expense";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedLabel = label.trim();
    if (!normalizedLabel) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const alreadyExists = categories.some(
      (item) =>
        item.id !== category?.id &&
        item.kind === kind &&
        item.label.toLocaleLowerCase("pt-BR") ===
          normalizedLabel.toLocaleLowerCase("pt-BR"),
    );
    if (alreadyExists) {
      toast.error("Essa categoria já existe.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (category) {
        await editCategory(category.id, {
          label: normalizedLabel,
          kind,
          icon,
        });
        toast.success("Categoria atualizada!");
      } else {
        await addCategory({ label: normalizedLabel, kind, icon });
        toast.success("Categoria adicionada!");
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a categoria.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent
      data-tour="category-manager-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("managed-category-name")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[540px] md:max-h-[90dvh] md:max-w-[880px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[42%_58%]"
        onSubmit={handleSubmit}
      >
        <aside
          className={cn(
            "relative flex min-h-[190px] flex-col overflow-hidden p-5 text-white transition-colors md:min-h-0 md:p-8",
            isExpense ? "bg-rose-800" : "bg-emerald-800",
          )}
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 border-l border-white/10 bg-black/10 [transform:skewX(-10deg)_translateX(45%)]" />
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 flex size-10 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-black/10 hover:text-white md:right-7 md:top-7"
          >
            <X className="size-5" />
          </button>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase text-white/65">
              {category ? "Editar categoria" : "Nova categoria"}
            </p>
            <DialogTitle className="mt-2 max-w-[250px] truncate text-2xl font-semibold leading-tight text-white md:mt-4 md:text-4xl">
              {label.trim() || "Sem nome."}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[250px] text-xs leading-5 text-white/75 max-md:hidden">
              Personalize a organização dos seus lançamentos.
            </DialogDescription>
          </div>

          <div className="relative z-10 mt-auto flex items-center gap-4 md:pb-6">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <CategoryGlyph name={icon} className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {label.trim() || "Prévia da categoria"}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {isExpense ? "Categoria de despesa" : "Categoria de receita"}
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] md:px-7 md:py-7">
            <fieldset disabled={isSubmitting} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="managed-category-name"
                  className="text-[10px] font-bold uppercase text-zinc-500"
                >
                  Nome da categoria
                </Label>
                <Input
                  id="managed-category-name"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Ex: Pets"
                  maxLength={60}
                  className="h-11 rounded-none border-0 border-b border-zinc-700 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:border-zinc-500 focus-visible:ring-0 dark:bg-transparent"
                  required
                />
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                  <Layers3 className="size-3.5" />
                  Tipo
                </Label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([
                    ["expense", "Despesa"],
                    ["income", "Receita"],
                  ] as const).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={Boolean(category)}
                      onClick={() => setKind(value)}
                      className={cn(
                        "h-10 rounded-full border text-sm font-medium transition-colors disabled:cursor-not-allowed",
                        kind === value
                          ? value === "expense"
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                            : "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                      )}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                    <Tag className="size-3.5" />
                    Ícone
                  </Label>
                  <span className="text-[10px] text-zinc-600">
                    {categoryIconOptions.length} opções
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                  {categoryIconOptions.map((option) => (
                      <button
                        key={option.name}
                        type="button"
                        title={option.label}
                        aria-label={`Usar ícone ${option.label}`}
                        aria-pressed={icon === option.name}
                        onClick={() => setIcon(option.name)}
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg border transition-colors",
                          icon === option.name
                            ? isExpense
                              ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                              : "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200",
                        )}
                      >
                        <CategoryGlyph name={option.name} className="size-4" />
                      </button>
                    ))}
                </div>
              </div>
            </fieldset>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3 md:border-0 md:px-7 md:pb-6 md:pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 flex-1 text-zinc-400 hover:text-white md:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "h-10 flex-[1.35] rounded-full px-6 font-semibold text-white md:flex-none",
                isExpense
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              <Check className="size-4" />
              {isSubmitting
                ? "Salvando..."
                : category
                  ? "Salvar mudanças"
                  : "Adicionar categoria"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
