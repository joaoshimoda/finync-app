"use client";

import { FormEvent, useState } from "react";
import { Check, UserRound, UsersRound, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceStore,
  type Dependent,
} from "@/store/useFinanceStore";

type ManageDependentModalProps = {
  dependent: Dependent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("");

  return initials || "DP";
}

export function ManageDependentModal({
  dependent,
  open,
  onOpenChange,
}: ManageDependentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DependentForm
          key={dependent?.id ?? "new-dependent"}
          dependent={dependent}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

function DependentForm({
  dependent,
  onClose,
}: {
  dependent: Dependent | null;
  onClose: () => void;
}) {
  const dependents = useFinanceStore((state) => state.dependents);
  const addDependent = useFinanceStore((state) => state.addDependent);
  const editDependent = useFinanceStore((state) => state.editDependent);
  const [name, setName] = useState(dependent?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error("Informe o nome do dependente.");
      return;
    }

    const alreadyExists = dependents.some(
      (item) =>
        item.id !== dependent?.id &&
        item.name.toLocaleLowerCase("pt-BR") ===
          normalizedName.toLocaleLowerCase("pt-BR"),
    );
    if (alreadyExists) {
      toast.error("Esse dependente já está cadastrado.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (dependent) {
        await editDependent(dependent.id, { name: normalizedName });
        toast.success("Dependente atualizado!");
      } else {
        await addDependent({ name: normalizedName });
        toast.success("Dependente adicionado!");
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar dependente:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o dependente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent
      data-tour="dependent-manager-modal"
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("managed-dependent-name")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[440px] md:max-h-[90dvh] md:max-w-[780px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[43%_57%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-[210px] flex-col overflow-hidden bg-teal-800 p-5 text-white md:min-h-0 md:p-8">
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
              {dependent ? "Editar dependente" : "Novo dependente"}
            </p>
            <DialogTitle className="mt-2 max-w-[245px] truncate text-2xl font-semibold leading-tight text-white md:mt-4 md:text-3xl">
              {name.trim() || (dependent ? "Editar perfil." : "Novo perfil.")}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[240px] text-xs leading-5 text-white/75 max-md:hidden">
              Mantenha os gastos dessa pessoa separados do seu fluxo pessoal.
            </DialogDescription>
          </div>

          <div className="relative z-10 mt-auto flex items-center gap-4 md:pb-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {name.trim() || "Nome do dependente"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/65">
                <UserRound className="size-3.5" />
                Perfil vinculado
              </p>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6 md:px-7">
            <div className="space-y-2">
              <Label
                htmlFor="managed-dependent-name"
                className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
              >
                <UsersRound className="size-3.5" />
                Nome de exibição
              </Label>
              <Input
                id="managed-dependent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Ana"
                maxLength={80}
                disabled={isSubmitting}
                className="h-12 rounded-none border-0 border-b border-zinc-700 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:border-teal-500 focus-visible:ring-0 dark:bg-transparent"
                required
              />
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-zinc-800 pt-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                <UserRound className="size-4" />
              </span>
              <div>
                <p className="text-xs font-medium text-zinc-300">
                  Gastos vinculados
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Permanecem no histórico ao renomear.
                </p>
              </div>
            </div>
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
              className="h-10 flex-[1.35] rounded-full bg-teal-600 px-6 font-semibold text-white hover:bg-teal-700 md:flex-none"
            >
              <Check className="size-4" />
              {isSubmitting
                ? "Salvando..."
                : dependent
                  ? "Salvar mudanças"
                  : "Adicionar dependente"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
