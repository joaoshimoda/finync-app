"use client";

import { FormEvent, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { toast } from "sonner";

import {
  CategoryGlyph,
  categoryIconOptions,
} from "@/components/finance/categoryIcons";
import {
  Field,
  ModalBody,
  ModalFooter,
  ModalShell,
  ModalStage,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  fieldClassName,
} from "@/components/modals/ModalKit";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const accent = isExpense ? "rose" : "emerald";
  const previewLabel = label.trim() || "Nova categoria";

  return (
    <ModalShell
      tour="category-manager-modal"
      focusId="managed-category-name"
      size="md"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent={accent}
          context={isExpense ? "Categoria de despesa" : "Categoria de receita"}
          title={category ? "Editar categoria" : "Nova categoria"}
          description="Categorias organizam seus lançamentos e alimentam as análises e os orçamentos."
          onClose={onClose}
          compact={
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-xl",
                isExpense
                  ? "bg-rose-400/15 text-rose-200"
                  : "bg-emerald-400/15 text-emerald-200",
              )}
            >
              <CategoryGlyph name={icon} className="size-5" />
            </span>
          }
        >
          <div className="flex flex-col items-center text-center">
            <span
              className={cn(
                "flex size-24 items-center justify-center rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-inset ring-white/10 transition-colors",
                isExpense
                  ? "bg-rose-400/15 text-rose-100"
                  : "bg-emerald-400/15 text-emerald-100",
              )}
            >
              <CategoryGlyph name={icon} className="size-10" />
            </span>
            <p className="mt-5 max-w-full truncate text-xl font-semibold tracking-tight text-white">
              {previewLabel}
            </p>
            <p className="mt-1 text-[13px] text-white/55">
              {isExpense ? "Aparece nas suas despesas" : "Aparece nas suas receitas"}
            </p>
          </div>
        </ModalStage>
      }
    >
      <ModalBody>
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
          <Field label="Nome" htmlFor="managed-category-name">
            <Input
              id="managed-category-name"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex.: Pets"
              maxLength={60}
              autoComplete="off"
              className={fieldClassName(accent)}
              required
            />
          </Field>

          <Field
            label="Tipo"
            aside={category ? "Não muda depois de criada" : undefined}
          >
            <Segmented
              label="Tipo da categoria"
              value={kind}
              onChange={setKind}
              disabled={Boolean(category)}
              options={[
                { value: "expense", label: "Despesa", icon: ArrowDownLeft },
                { value: "income", label: "Receita", icon: ArrowUpRight },
              ]}
            />
          </Field>

          <Field label="Ícone" aside={`${categoryIconOptions.length} opções`}>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
              {categoryIconOptions.map((option) => {
                const isSelected = icon === option.name;

                return (
                  <button
                    key={option.name}
                    type="button"
                    title={option.label}
                    aria-label={`Usar ícone ${option.label}`}
                    aria-pressed={isSelected}
                    onClick={() => setIcon(option.name)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                      isSelected
                        ? isExpense
                          ? "bg-rose-400/15 text-rose-200 ring-rose-400/50"
                          : "bg-emerald-400/15 text-emerald-200 ring-emerald-400/50"
                        : "bg-white/[0.02] text-zinc-400 ring-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-100",
                    )}
                  >
                    <CategoryGlyph name={option.name} className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          </Field>
        </fieldset>
      </ModalBody>

      <ModalFooter>
        <SecondaryButton onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          accent={accent}
          icon={Check}
          loading={isSubmitting}
          loadingLabel="Salvando..."
          disabled={isSubmitting}
        >
          {category ? "Salvar mudanças" : "Adicionar categoria"}
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}
