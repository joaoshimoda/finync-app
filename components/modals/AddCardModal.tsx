"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CreditCard,
  Landmark,
  Palette,
  WalletCards,
  Wifi,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useFinanceStore, type Card } from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard?: Card | null;
}

interface CardTheme {
  name: string;
  color: string;
  background: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    name: "Grafite",
    color: "#18181b",
    background: "linear-gradient(135deg, #3f3f46 0%, #18181b 48%, #09090b 100%)",
  },
  {
    name: "Violeta",
    color: "#6d28d9",
    background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 48%, #3b0764 100%)",
  },
  {
    name: "Azul",
    color: "#1d4ed8",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #172554 100%)",
  },
  {
    name: "Laranja",
    color: "#ea580c",
    background: "linear-gradient(135deg, #fb923c 0%, #ea580c 50%, #7c2d12 100%)",
  },
  {
    name: "Esmeralda",
    color: "#047857",
    background: "linear-gradient(135deg, #10b981 0%, #047857 52%, #064e3b 100%)",
  },
  {
    name: "Rose",
    color: "#be123c",
    background: "linear-gradient(135deg, #f43f5e 0%, #be123c 52%, #4c0519 100%)",
  },
];

function parseOptionalDay(value: string) {
  const day = Number(value);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return undefined;
  }

  return day;
}

function inferCardTheme(bankName: string) {
  const normalizedBankName = bankName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizedBankName.includes("nubank")) return CARD_THEMES[1];
  if (
    normalizedBankName.includes("itau") ||
    normalizedBankName.includes("inter")
  ) {
    return CARD_THEMES[3];
  }
  if (
    normalizedBankName.includes("santander") ||
    normalizedBankName.includes("bradesco")
  ) {
    return CARD_THEMES[5];
  }
  if (
    normalizedBankName.includes("c6") ||
    normalizedBankName.includes("black")
  ) {
    return CARD_THEMES[0];
  }
  if (
    normalizedBankName.includes("caixa") ||
    normalizedBankName.includes("mercado pago") ||
    normalizedBankName.includes("banco do brasil")
  ) {
    return CARD_THEMES[2];
  }

  return CARD_THEMES[2];
}

function getCardTheme(color: string | undefined, bankName: string) {
  return (
    CARD_THEMES.find((theme) => theme.color === color) ??
    inferCardTheme(bankName)
  );
}

export function AddCardModal({
  isOpen,
  onClose,
  editingCard = null,
}: AddCardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <CardModalContent
          key={editingCard?.id ?? "new-card"}
          editingCard={editingCard}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function CardModalContent({
  editingCard,
  onClose,
}: {
  editingCard: Card | null;
  onClose: () => void;
}) {
  const { formatCurrency, currencySymbol } = useCurrencyFormatter();
  const addCard = useFinanceStore((state) => state.addCard);
  const editCard = useFinanceStore((state) => state.editCard);

  const [name, setName] = useState(editingCard?.name ?? "");
  const [limit, setLimit] = useState(
    editingCard?.limitAmount
      ? String(editingCard.limitAmount).replace(".", ",")
      : "",
  );
  const [closingDay, setClosingDay] = useState(
    editingCard?.closingDay ? String(editingCard.closingDay) : "",
  );
  const [dueDay, setDueDay] = useState(
    editingCard?.dueDay ? String(editingCard.dueDay) : "",
  );
  const [selectedColor, setSelectedColor] = useState(
    editingCard?.color ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  const previewName = name.trim() || "Seu cartão";
  const previewLimit = Number(limit.replace(",", ".")) || 0;
  const previewTheme = useMemo(
    () => getCardTheme(selectedColor || undefined, previewName),
    [previewName, selectedColor],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches &&
      mobileStep === 1
    ) {
      setMobileStep(2);
      return;
    }

    const cardPayload = {
      name: name.trim(),
      color: previewTheme.color,
      limitAmount: previewLimit,
      closingDay: parseOptionalDay(closingDay),
      dueDay: parseOptionalDay(dueDay),
    };

    setIsSubmitting(true);

    try {
      if (editingCard) {
        await editCard(editingCard.id, cardPayload);
        toast.success("Cartão atualizado!");
      } else {
        await addCard(cardPayload);
        toast.success("Cartão adicionado!");
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar cartão",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const lineInputClassName =
    "h-9 rounded-none border-0 border-b border-zinc-700 bg-transparent px-0 text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:border-violet-500 focus-visible:ring-0 dark:bg-transparent";
  const pillFieldClassName =
    "h-10 rounded-full border-zinc-700 bg-transparent px-4 text-zinc-100 shadow-none focus-visible:border-violet-500 focus-visible:ring-1 focus-visible:ring-violet-500/30 dark:bg-transparent [@media_(max-height:_700px)_and_(max-width:_767px)]:h-9";

  return (
    <DialogContent
      data-tour="card-modal"
      data-tour-preview-modal
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById("card-name")?.focus();
        });
      }}
      className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl md:left-1/2 md:top-1/2 md:h-[560px] md:max-h-[90dvh] md:max-w-[920px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border-b"
    >
      <form
        className="grid min-h-0 w-full md:grid-cols-[44%_56%]"
        onSubmit={handleSubmit}
      >
        <aside className="relative flex min-h-[240px] flex-col overflow-hidden bg-violet-700 p-5 text-white md:min-h-0 md:p-8 [@media_(max-height:_700px)_and_(max-width:_767px)]:min-h-[216px] [@media_(max-height:_700px)_and_(max-width:_767px)]:p-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 border-l border-white/10 bg-black/5 [transform:skewX(-10deg)_translateX(45%)]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-white/10" />

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
              Carteira
            </p>
            <DialogTitle className="mt-2 text-2xl font-semibold leading-tight text-white md:mt-4 md:text-4xl [@media_(max-height:_700px)_and_(max-width:_767px)]:text-xl">
              {editingCard ? "Editar cartão." : "Novo cartão."}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[270px] text-xs leading-5 text-white/75 [@media_(max-height:_700px)_and_(max-width:_767px)]:hidden">
              Configure o limite e o ciclo sem perder de vista como ele ficará
              na sua carteira.
            </DialogDescription>
          </div>

          <div className="relative z-10 mx-auto mt-4 w-full max-w-[270px] md:my-auto md:max-w-[340px] [@media_(max-height:_700px)_and_(max-width:_767px)]:mt-2 [@media_(max-height:_700px)_and_(max-width:_767px)]:max-w-[208px]">
            <div
              className="relative aspect-[1.586/1] overflow-hidden rounded-[18px] border border-white/20 p-4 text-white shadow-[0_22px_44px_rgba(0,0,0,0.28)] md:p-5"
              style={{ background: previewTheme.background }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(118deg, transparent 0, transparent 12px, white 13px, transparent 14px)",
                }}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 border-l border-white/10 bg-black/10 [transform:skewX(-14deg)_translateX(35%)]" />

              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative h-7 w-10 overflow-hidden rounded-md border border-amber-100/45 bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 shadow-inner">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-amber-900/25" />
                    <span className="absolute inset-x-0 top-1/2 h-px bg-amber-900/25" />
                  </div>
                  <Wifi className="size-4 rotate-90 text-white/65" />
                </div>
                <span className="text-[10px] font-bold uppercase text-white/75">
                  Finync
                </span>
              </div>

              <div className="relative mt-5 md:mt-7 [@media_(max-height:_700px)_and_(max-width:_767px)]:mt-3">
                <p className="font-mono text-sm font-medium tracking-[0.16em] text-white/90 md:text-base">
                  ••••&nbsp; ••••&nbsp; ••••&nbsp; 2408
                </p>
              </div>

              <div className="relative mt-4 flex items-end justify-between gap-3 [@media_(max-height:_700px)_and_(max-width:_767px)]:mt-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-medium uppercase text-white/50">
                    Nome do cartão
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold uppercase text-white md:text-sm">
                    {previewName}
                  </p>
                </div>
                <span className="shrink-0 text-[9px] font-semibold uppercase text-white/65">
                  Crédito
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-medium text-white/70 md:text-xs">
              <span>Limite {formatCurrency(previewLimit)}</span>
              <span>
                Fecha {closingDay || "--"} · Vence {dueDay || "--"}
              </span>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-zinc-950">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin] md:px-7 md:py-6 [@media_(max-height:_700px)_and_(max-width:_767px)]:py-3">
            <fieldset disabled={isSubmitting} className="h-full">
              <div
                className={cn(
                  "space-y-4 md:block",
                  mobileStep !== 1 && "hidden",
                )}
              >
                <div className="flex items-center justify-between md:hidden">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">
                    Identidade
                  </p>
                  <span className="text-xs text-zinc-600">1 / 2</span>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="card-name"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                  >
                    <Landmark className="size-3.5" />
                    Nome do cartão
                  </Label>
                  <Input
                    id="card-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Nubank, Itaú, Inter..."
                    className={lineInputClassName}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="card-limit"
                    className="text-[10px] font-bold uppercase text-zinc-500"
                  >
                    Limite total
                  </Label>
                  <div className="flex items-center border-b border-zinc-700">
                    <span className="shrink-0 text-xs font-semibold text-violet-400">
                      {currencySymbol}
                    </span>
                    <Input
                      id="card-limit"
                      value={limit}
                      onChange={(event) => setLimit(event.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-10 rounded-none border-0 bg-transparent px-2 text-base font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
                    <Palette className="size-3.5" />
                    Aparência
                  </Label>
                  <div className="flex items-center gap-2.5">
                    {CARD_THEMES.map((theme) => {
                      const isSelected = previewTheme.color === theme.color;

                      return (
                        <button
                          key={theme.color}
                          type="button"
                          title={theme.name}
                          aria-label={`Usar cor ${theme.name}`}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedColor(theme.color)}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border transition-transform hover:scale-105",
                            isSelected
                              ? "border-white ring-2 ring-violet-500/40 ring-offset-2 ring-offset-zinc-950"
                              : "border-white/10",
                          )}
                          style={{ background: theme.background }}
                        >
                          {isSelected ? (
                            <Check className="size-4 text-white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "space-y-5 md:mt-6 md:block md:border-t md:border-zinc-800 md:pt-5",
                  mobileStep !== 2 && "hidden md:block",
                )}
              >
                <div className="flex items-center justify-between md:hidden">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">
                    Ciclo da fatura
                  </p>
                  <span className="text-xs text-zinc-600">2 / 2</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="card-closing-day"
                      className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                    >
                      <CalendarDays className="size-3.5" />
                      Fechamento
                    </Label>
                    <Input
                      id="card-closing-day"
                      value={closingDay}
                      onChange={(event) => setClosingDay(event.target.value)}
                      type="number"
                      min={1}
                      max={31}
                      placeholder="04"
                      className={pillFieldClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="card-due-day"
                      className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"
                    >
                      <CalendarDays className="size-3.5" />
                      Vencimento
                    </Label>
                    <Input
                      id="card-due-day"
                      value={dueDay}
                      onChange={(event) => setDueDay(event.target.value)}
                      type="number"
                      min={1}
                      max={31}
                      placeholder="10"
                      className={pillFieldClassName}
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-zinc-800 pt-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-300">
                    <WalletCards className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Como o ciclo será usado
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                      Compras no dia do fechamento ou depois entram na próxima
                      fatura. O vencimento define a competência exibida no app.
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3 md:border-0 md:px-7 md:pb-6 md:pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={mobileStep === 2 ? () => setMobileStep(1) : onClose}
              className="h-10 flex-1 text-zinc-400 hover:text-white md:flex-none"
            >
              <span className="md:hidden">
                {mobileStep === 2 ? "Voltar" : "Cancelar"}
              </span>
              <span className="hidden md:inline">Cancelar</span>
            </Button>

            {mobileStep === 1 ? (
              <Button
                type="button"
                onClick={() => setMobileStep(2)}
                className="h-10 flex-[1.35] rounded-full bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 md:hidden"
              >
                Continuar
              </Button>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "h-10 flex-[1.35] rounded-full bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 md:flex-none",
                mobileStep === 1 && "hidden md:inline-flex",
              )}
            >
              <CreditCard className="size-4" />
              {isSubmitting
                ? "Salvando..."
                : editingCard
                  ? "Salvar cartão"
                  : "Adicionar cartão"}
            </Button>
          </footer>
        </section>
      </form>
    </DialogContent>
  );
}
