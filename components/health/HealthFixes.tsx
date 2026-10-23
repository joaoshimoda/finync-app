"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupByCategoryLabel, type AffectedRecord } from "@/lib/dataHealth";
import { useFinanceStore } from "@/store/useFinanceStore";

import type { HealthData } from "./useHealthData";

/* Only categories that really exist in the account, so a fix never creates
   a new "unknown category" problem. */
function getExpenseCategoryLabels(health: HealthData) {
  return (health.backup?.data.categories ?? [])
    .filter((category) => category.kind === "expense")
    .map((category) => category.label)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
}

/* Applies one category to many transactions, one request at a time so a
   failure stops cleanly and the count of what changed stays exact. */
function useCategoryWriter(health: HealthData) {
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function apply(records: AffectedRecord[], category: string) {
    let done = 0;
    setProgress({ done, total: records.length });
    try {
      for (const record of records) {
        await updateTransaction(record.id, { category });
        done += 1;
        setProgress({ done, total: records.length });
      }
      toast.success(
        `${done} ${done === 1 ? "lançamento movido" : "lançamentos movidos"} para ${category}.`,
      );
    } catch (error) {
      toast.error(
        done
          ? `Parou após ${done} de ${records.length}. Verifique de novo e repita.`
          : "Não foi possível alterar os lançamentos.",
      );
      throw error;
    } finally {
      setProgress(null);
      await health.refresh();
    }
  }

  return { apply, progress };
}

const triggerClassName = "h-9 w-44 border-white/[0.08] bg-zinc-950 text-xs text-zinc-100";

function FixFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
        <Wrench className="size-3.5" />
        Correção rápida
      </p>
      {children}
    </div>
  );
}

export function SetCategoryFix({
  records,
  health,
}: {
  records: AffectedRecord[];
  health: HealthData;
}) {
  const labels = getExpenseCategoryLabels(health);
  const [category, setCategory] = useState(labels.includes("Outros") ? "Outros" : "");
  const [confirming, setConfirming] = useState(false);
  const { apply, progress } = useCategoryWriter(health);

  if (!labels.length) {
    return (
      <FixFrame>
        <p className="text-xs text-zinc-400">
          Cadastre uma categoria de despesa em Configurações para poder aplicar aqui.
        </p>
      </FixFrame>
    );
  }

  return (
    <FixFrame>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">Colocar todos em</span>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={triggerClassName} aria-label="Categoria">
            <SelectValue placeholder="Escolha a categoria" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={!category || Boolean(progress)}
          onClick={() => setConfirming(true)}
          className="h-9 gap-1.5 bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          {progress ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {progress ? `${progress.done} de ${progress.total}` : "Aplicar"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Definir categoria?"
        description={`${records.length} ${records.length === 1 ? "lançamento sem categoria vai" : "lançamentos sem categoria vão"} para “${category}”. Você pode mudar cada um depois.`}
        confirmLabel={`Aplicar a ${records.length}`}
        loadingLabel="Aplicando..."
        onConfirm={() => apply(records, category)}
      />
    </FixFrame>
  );
}

export function RestoreCategoryFix({
  records,
  health,
}: {
  records: AffectedRecord[];
  health: HealthData;
}) {
  const addCategory = useFinanceStore((state) => state.addCategory);
  const labels = getExpenseCategoryLabels(health);
  const groups = groupByCategoryLabel(records);
  const [target, setTarget] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<
    { type: "restore"; label: string } | { type: "move"; label: string; to: string } | null
  >(null);
  const { apply, progress } = useCategoryWriter(health);

  async function confirm() {
    if (!pending) return;
    const group = groups.find((item) => item.label === pending.label);
    if (!group) return;

    if (pending.type === "restore") {
      try {
        await addCategory({ label: pending.label, kind: "expense", icon: "Tag" });
        toast.success(`Categoria “${pending.label}” recadastrada.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível recadastrar a categoria.",
        );
        throw error;
      } finally {
        await health.refresh();
      }
      return;
    }

    await apply(group.items, pending.to);
  }

  const pendingCount = pending ? (groups.find((item) => item.label === pending.label)?.items.length ?? 0) : 0;

  return (
    <FixFrame>
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 text-sm text-zinc-200">
              “{group.label}”
              <span className="ml-1.5 text-xs text-zinc-500">
                {group.items.length} {group.items.length === 1 ? "lançamento" : "lançamentos"}
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={Boolean(progress)}
              onClick={() => setPending({ type: "restore", label: group.label })}
              className="h-9 gap-1 border border-white/[0.08] text-xs text-zinc-200 hover:bg-white/[0.06]"
            >
              <Plus className="size-3.5" />
              Recadastrar
            </Button>
            {labels.length > 0 && (
              <Select
                value={target[group.label] ?? ""}
                onValueChange={(value) => {
                  setTarget((current) => ({ ...current, [group.label]: value }));
                  setPending({ type: "move", label: group.label, to: value });
                }}
              >
                <SelectTrigger className={triggerClassName} aria-label={`Mover ${group.label} para`}>
                  <SelectValue placeholder="Mover para..." />
                </SelectTrigger>
                <SelectContent>
                  {labels.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </li>
        ))}
      </ul>
      {progress && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
          <Loader2 className="size-3.5 animate-spin" />
          Alterando {progress.done} de {progress.total}...
        </p>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setTarget({});
          }
        }}
        title={pending?.type === "restore" ? "Recadastrar categoria?" : "Mover lançamentos?"}
        description={
          pending?.type === "restore"
            ? `A categoria “${pending.label}” volta para o cadastro de despesas e os ${pendingCount} lançamentos dela deixam de ficar soltos. Nada nos lançamentos muda.`
            : pending
              ? `${pendingCount} ${pendingCount === 1 ? "lançamento sai" : "lançamentos saem"} de “${pending.label}” e ${pendingCount === 1 ? "vai" : "vão"} para “${pending.to}”.`
              : ""
        }
        confirmLabel={pending?.type === "restore" ? "Recadastrar" : `Mover ${pendingCount}`}
        loadingLabel="Salvando..."
        onConfirm={confirm}
      />
    </FixFrame>
  );
}
