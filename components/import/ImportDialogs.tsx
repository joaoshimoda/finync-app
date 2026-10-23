"use client";

import { useState } from "react";

import { usePrivateCurrency } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseCurrencyInput, type SplitMode } from "@/lib/invoiceImport";
import { cn } from "@/lib/utils";

import type { InvoiceImport } from "./useInvoiceImport";

const splitModes: Array<{ id: SplitMode; title: string; description: string }> = [
  { id: "mine", title: "Meu gasto", description: "Tudo fica com você" },
  { id: "dependent", title: "De um dependente", description: "Tudo vai para outra pessoa" },
  { id: "split", title: "Dividir", description: "Parte sua, parte de alguém" },
];

const fieldClassName = "h-10 border-white/[0.08] bg-zinc-900 text-zinc-100";

/* Assign a line to the user or a dependent, or split it between both. The
   invoice total never changes. */
export function SplitDialog({
  flow,
  index,
  onClose,
}: {
  flow: InvoiceImport;
  index: number | null;
  onClose: () => void;
}) {
  const transaction = index === null ? null : flow.rows[index]?.transaction;

  return (
    <Dialog
      open={Boolean(transaction)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {transaction && index !== null ? (
        <SplitForm key={index} flow={flow} index={index} onClose={onClose} />
      ) : null}
    </Dialog>
  );
}

function SplitForm({
  flow,
  index,
  onClose,
}: {
  flow: InvoiceImport;
  index: number;
  onClose: () => void;
}) {
  const formatValue = usePrivateCurrency();
  const transaction = flow.rows[index].transaction;
  const [mode, setMode] = useState<SplitMode>(
    transaction.owner === "dependent" ? "dependent" : "mine",
  );
  const [dependentId, setDependentId] = useState(
    transaction.dependentId ?? flow.dependents[0]?.id ?? "",
  );
  const [userAmount, setUserAmount] = useState(
    (transaction.amount / 2).toFixed(2).replace(".", ","),
  );
  const dependentName =
    flow.dependents.find((dependent) => dependent.id === dependentId)?.name ??
    "dependente";
  const userValue = parseCurrencyInput(userAmount);

  function apply() {
    if (mode !== "mine" && !dependentId) return;

    if (mode === "mine") flow.setOwner([index], null);
    else if (mode === "dependent") flow.setOwner([index], dependentId);
    else if (!flow.splitRow(index, userValue, dependentId)) return;

    onClose();
  }

  return (
    <DialogContent className="border border-white/[0.08] bg-zinc-950 text-zinc-50 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>De quem é esse gasto?</DialogTitle>
        <DialogDescription>
          O total da fatura continua o mesmo. Só muda quem deve cada parte.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-zinc-100">
            {transaction.description}
          </p>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-50">
            {formatValue(transaction.amount)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {splitModes.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={option.id !== "mine" && !flow.dependents.length}
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors disabled:opacity-40",
                mode === option.id
                  ? "border-emerald-400/50 bg-emerald-400/[0.08]"
                  : "border-white/[0.07] hover:border-white/[0.14]",
              )}
            >
              <span className="block text-sm font-medium text-zinc-100">
                {option.title}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-zinc-500">
                {option.description}
              </span>
            </button>
          ))}
        </div>

        {mode !== "mine" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">Dependente</p>
            <Select value={dependentId} onValueChange={setDependentId}>
              <SelectTrigger className={cn(fieldClassName, "w-full")}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {flow.dependents.map((dependent) => (
                  <SelectItem key={dependent.id} value={dependent.id}>
                    {dependent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "split" && (
          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400">Sua parte</p>
                <Input
                  inputMode="decimal"
                  value={userAmount}
                  onChange={(event) => setUserAmount(event.target.value)}
                  className={fieldClassName}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <p className="truncate text-xs font-medium text-zinc-400">
                  Parte de {dependentName}
                </p>
                <p className="flex h-10 items-center rounded-lg border border-white/[0.06] px-3 text-sm tabular-nums text-zinc-300">
                  {formatValue(Math.max(transaction.amount - userValue, 0))}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[0.5, 1 / 3, 2 / 3].map((share) => (
                <button
                  key={share}
                  type="button"
                  onClick={() =>
                    setUserAmount(
                      (transaction.amount * share).toFixed(2).replace(".", ","),
                    )
                  }
                  className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  Você paga {Math.round(share * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="border-white/[0.06] bg-zinc-900/50">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={apply}
          disabled={mode !== "mine" && !dependentId}
          className="bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          Aplicar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* Walks through the PDF lines that could not be read automatically. */
export function PdfReviewDialog({
  flow,
  lineId,
  onChangeLine,
}: {
  flow: InvoiceImport;
  lineId: string | null;
  onChangeLine: (id: string | null) => void;
}) {
  const lines = flow.pdfAudit?.rejectedLines ?? [];
  const position = lines.findIndex((line) => line.id === lineId);
  const line = position >= 0 ? lines[position] : null;

  function moveOn() {
    const next = lines[position + 1] ?? lines[position - 1];
    onChangeLine(next && next.id !== lineId ? next.id : null);
  }

  return (
    <Dialog
      open={Boolean(line)}
      onOpenChange={(open) => {
        if (!open) onChangeLine(null);
      }}
    >
      <DialogContent className="border border-white/[0.08] bg-zinc-950 text-zinc-50 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Linha que não conseguimos ler</DialogTitle>
          <DialogDescription>
            {line
              ? `${position + 1} de ${lines.length} · corrija e adicione, ou ignore.`
              : "Confira os dados antes de adicionar."}
          </DialogDescription>
        </DialogHeader>

        {line && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Texto no PDF
              </p>
              <p className="mt-2 break-words font-mono text-xs leading-5 text-zinc-300">
                {line.raw}
              </p>
              <p className="mt-2 text-xs text-amber-300">{line.reason}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium text-zinc-400">Data</span>
                <Input
                  type="date"
                  value={line.date}
                  onChange={(event) =>
                    flow.updateRejectedPdfLine(line.id, "date", event.target.value)
                  }
                  className={fieldClassName}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-zinc-400">Valor</span>
                <Input
                  inputMode="decimal"
                  value={line.amount}
                  onChange={(event) =>
                    flow.updateRejectedPdfLine(line.id, "amount", event.target.value)
                  }
                  placeholder="0,00"
                  className={fieldClassName}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-medium text-zinc-400">Descrição</span>
              <Input
                value={line.description}
                onChange={(event) =>
                  flow.updateRejectedPdfLine(line.id, "description", event.target.value)
                }
                placeholder="Descrição da compra"
                className={fieldClassName}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: false, label: "Despesa" },
                { value: true, label: "Crédito / estorno" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    flow.updateRejectedPdfLine(line.id, "isCredit", option.value)
                  }
                  aria-pressed={line.isCredit === option.value}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    line.isCredit === option.value
                      ? "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-200"
                      : "border-white/[0.07] text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="border-white/[0.06] bg-zinc-900/50 sm:justify-between">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              disabled={position <= 0}
              onClick={() => onChangeLine(lines[position - 1]?.id ?? null)}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={position >= lines.length - 1}
              onClick={() => onChangeLine(lines[position + 1]?.id ?? null)}
            >
              Próxima
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!line}
              onClick={() => {
                if (!line) return;
                moveOn();
                flow.discardRejectedPdfLine(line.id);
              }}
            >
              Ignorar
            </Button>
            <Button
              type="button"
              disabled={!line}
              className="bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
              onClick={() => {
                if (line && flow.addCorrectedPdfLine(line)) moveOn();
              }}
            >
              Adicionar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
