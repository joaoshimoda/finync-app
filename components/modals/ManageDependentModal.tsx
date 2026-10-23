"use client";

import { FormEvent, useState } from "react";
import { Check, History, UsersRound } from "lucide-react";
import { toast } from "sonner";

import {
  Field,
  ModalBody,
  ModalFooter,
  ModalNote,
  ModalShell,
  ModalStage,
  PrimaryButton,
  SecondaryButton,
  fieldClassName,
} from "@/components/modals/ModalKit";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  const initials = getInitials(name);

  return (
    <ModalShell
      tour="dependent-manager-modal"
      focusId="managed-dependent-name"
      size="sm"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="teal"
          context="Pessoas"
          title={dependent ? "Editar dependente" : "Novo dependente"}
          description="Gastos no nome dessa pessoa ficam separados dos seus e entram no acerto do mês."
          onClose={onClose}
          compact={
            <span className="flex size-11 items-center justify-center rounded-full bg-teal-300/15 text-sm font-semibold text-teal-100">
              {initials}
            </span>
          }
        >
          <div className="flex flex-col items-center text-center">
            <span className="flex size-24 items-center justify-center rounded-full bg-teal-300/15 text-3xl font-semibold tracking-tight text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-inset ring-white/10">
              {initials}
            </span>
            <p className="mt-5 max-w-full truncate text-xl font-semibold tracking-tight text-white">
              {name.trim() || "Nome do dependente"}
            </p>
          </div>
        </ModalStage>
      }
    >
      <ModalBody className="flex flex-col justify-center">
        <div className="space-y-6">
          <Field label="Nome" htmlFor="managed-dependent-name" icon={UsersRound}>
            <Input
              id="managed-dependent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana"
              maxLength={80}
              autoComplete="off"
              disabled={isSubmitting}
              className={fieldClassName("teal")}
              required
            />
          </Field>

          <ModalNote icon={History}>
            {dependent
              ? "Renomear não altera os gastos já vinculados a essa pessoa."
              : "Depois de criar, escolha essa pessoa no campo “De quem é o gasto” ao lançar uma despesa."}
          </ModalNote>
        </div>
      </ModalBody>

      <ModalFooter>
        <SecondaryButton onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          accent="teal"
          icon={Check}
          loading={isSubmitting}
          loadingLabel="Salvando..."
          disabled={isSubmitting}
        >
          {dependent ? "Salvar mudanças" : "Adicionar dependente"}
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}
