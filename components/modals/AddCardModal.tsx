"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CreditCard,
  Info,
  Sparkles,
  Trash2,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import {
  AmountInput,
  Field,
  ModalBody,
  ModalFooter,
  ModalNote,
  ModalShell,
  ModalStage,
  MobileSteps,
  PrimaryButton,
  SecondaryButton,
  fieldClassName,
  getStageBackground,
} from "@/components/modals/ModalKit";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFinanceStore, type Card } from "@/store/useFinanceStore";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard?: Card | null;
  /** Shown only while editing; the parent owns the confirmation dialog. */
  onDelete?: (card: Card) => void;
}

interface CardTheme {
  name: string;
  color: string;
  /* "r, g, b" of the main tone, used for the stage glow. */
  rgb: string;
  background: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    name: "Grafite",
    color: "#18181b",
    rgb: "161, 161, 170",
    background: "linear-gradient(135deg, #52525b 0%, #27272a 45%, #09090b 100%)",
  },
  {
    name: "Violeta",
    color: "#6d28d9",
    rgb: "139, 92, 246",
    background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 42%, #3b0764 100%)",
  },
  {
    name: "Azul",
    color: "#1d4ed8",
    rgb: "59, 130, 246",
    background: "linear-gradient(135deg, #60a5fa 0%, #1d4ed8 48%, #172554 100%)",
  },
  {
    name: "Laranja",
    color: "#ea580c",
    rgb: "249, 115, 22",
    background: "linear-gradient(135deg, #fdba74 0%, #ea580c 46%, #7c2d12 100%)",
  },
  {
    name: "Esmeralda",
    color: "#047857",
    rgb: "16, 185, 129",
    background: "linear-gradient(135deg, #34d399 0%, #047857 50%, #022c22 100%)",
  },
  {
    name: "Rose",
    color: "#be123c",
    rgb: "244, 63, 94",
    background: "linear-gradient(135deg, #fb7185 0%, #be123c 50%, #4c0519 100%)",
  },
];

const [GRAPHITE, VIOLET, BLUE, ORANGE, EMERALD, ROSE] = CARD_THEMES;

/* Bank name fragments mapped to the closest of the six wallet colours. */
const BANK_THEMES: [string[], CardTheme][] = [
  [["nubank", "nu "], VIOLET],
  [["itau", "inter", "laranjinha"], ORANGE],
  [["santander", "bradesco", "ourocard vermelho"], ROSE],
  [["c6", "black", "xp", "btg", "infinite", "safra", "rico"], GRAPHITE],
  [["picpay", "pagbank", "pagseguro", "next", "sicredi", "sicoob", "original", "stone"], EMERALD],
  [["caixa", "mercado pago", "banco do brasil", "bb", "ourocard", "neon", "porto", "will", "digio", "pan"], BLUE],
];

function parseOptionalDay(value: string) {
  const day = Number(value);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return undefined;
  }

  return day;
}

function inferCardTheme(bankName: string) {
  const normalizedBankName = ` ${bankName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")} `;

  for (const [fragments, theme] of BANK_THEMES) {
    if (
      fragments.some((fragment) =>
        fragment.length <= 3
          ? normalizedBankName.includes(` ${fragment.trim()} `)
          : normalizedBankName.includes(fragment),
      )
    ) {
      return theme;
    }
  }

  return BLUE;
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
  onDelete,
}: AddCardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen ? (
        <CardModalContent
          key={editingCard?.id ?? "new-card"}
          editingCard={editingCard}
          onClose={onClose}
          onDelete={onDelete}
        />
      ) : null}
    </Dialog>
  );
}

function CardModalContent({
  editingCard,
  onClose,
  onDelete,
}: {
  editingCard: Card | null;
  onClose: () => void;
  onDelete?: (card: Card) => void;
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
  const suggestedTheme = useMemo(() => inferCardTheme(previewName), [previewName]);
  const isAutoColor = !selectedColor;

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

  const inputClassName = fieldClassName("violet");

  return (
    <ModalShell
      tour="card-modal"
      focusId="card-name"
      onSubmit={handleSubmit}
      stage={
        <ModalStage
          accent="violet"
          background={getStageBackground("violet", previewTheme.rgb)}
          context="Cartão de crédito"
          title={editingCard ? "Editar cartão" : "Novo cartão"}
          description="A cor acompanha o banco que você digitar. Você pode trocar quando quiser."
          onClose={onClose}
          heroOnMobile
          footer={
            <p className="hidden items-center justify-between text-[13px] text-white/60 md:flex">
              <span>Limite {formatCurrency(previewLimit)}</span>
              <span>
                Fecha dia {closingDay || "–"}, vence dia {dueDay || "–"}
              </span>
            </p>
          }
        >
          <CardPreview
            theme={previewTheme}
            name={previewName}
            limit={formatCurrency(previewLimit)}
          />
        </ModalStage>
      }
    >
      <ModalBody>
        <fieldset disabled={isSubmitting} className="min-w-0">
          <MobileSteps
            step={mobileStep}
            labels={["Identidade", "Ciclo da fatura"]}
            accent="violet"
          />

          <div className={cn("space-y-6 md:block", mobileStep !== 1 && "hidden")}>
            <Field label="Nome do cartão" htmlFor="card-name">
              <Input
                id="card-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Nubank, Itaú, Inter"
                autoComplete="off"
                className={inputClassName}
                required
              />
            </Field>

            <AmountInput
              id="card-limit"
              label="Limite total"
              accent="violet"
              currencySymbol={currencySymbol}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />

            <Field
              label="Cor do cartão"
              aside={isAutoColor ? `Sugerida: ${suggestedTheme.name}` : previewTheme.name}
            >
              <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
                <button
                  type="button"
                  aria-label="Cor automática pelo nome do banco"
                  aria-pressed={isAutoColor}
                  title="Automática"
                  onClick={() => setSelectedColor("")}
                  className={cn(
                    "relative flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] md:h-9 md:px-3 font-medium ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    isAutoColor
                      ? "bg-white/10 text-zinc-50 ring-white/30"
                      : "text-zinc-400 ring-white/10 hover:text-zinc-200",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Automática
                </button>
                {CARD_THEMES.map((theme) => {
                  const isSelected = !isAutoColor && previewTheme.color === theme.color;

                  return (
                    <button
                      key={theme.color}
                      type="button"
                      title={theme.name}
                      aria-label={`Usar cor ${theme.name}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedColor(theme.color)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full ring-offset-2 md:size-9 ring-offset-zinc-950 transition-[transform,box-shadow] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                        isSelected
                          ? "ring-2 ring-white"
                          : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                      )}
                      style={{ background: theme.background }}
                    >
                      {isSelected ? <Check className="size-4 text-white" /> : null}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div
            className={cn(
              "space-y-5 md:mt-7 md:block md:border-t md:border-white/[0.06] md:pt-6",
              mobileStep !== 2 && "hidden",
            )}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha no dia" htmlFor="card-closing-day" icon={CalendarDays}>
                <Input
                  id="card-closing-day"
                  value={closingDay}
                  onChange={(event) => setClosingDay(event.target.value)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="4"
                  className={inputClassName}
                />
              </Field>
              <Field label="Vence no dia" htmlFor="card-due-day" icon={CalendarClock}>
                <Input
                  id="card-due-day"
                  value={dueDay}
                  onChange={(event) => setDueDay(event.target.value)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="10"
                  className={inputClassName}
                />
              </Field>
            </div>

            <ModalNote icon={Info}>
              Compras feitas no dia do fechamento ou depois entram na fatura
              seguinte. O mês da fatura é definido pelo vencimento.
            </ModalNote>
          </div>
        </fieldset>
      </ModalBody>

      <ModalFooter
        start={
          editingCard && onDelete ? (
            <SecondaryButton
              disabled={isSubmitting}
              onClick={() => onDelete(editingCard)}
              aria-label="Excluir cartão"
              className="flex-none px-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="size-4" />
              <span className="hidden md:inline">Excluir cartão</span>
            </SecondaryButton>
          ) : null
        }
      >
        <SecondaryButton
          disabled={isSubmitting}
          onClick={mobileStep === 2 ? () => setMobileStep(1) : onClose}
        >
          <span className="md:hidden">
            {mobileStep === 2 ? "Voltar" : "Cancelar"}
          </span>
          <span className="hidden md:inline">Cancelar</span>
        </SecondaryButton>

        {mobileStep === 1 ? (
          <PrimaryButton
            type="button"
            accent="violet"
            onClick={() => setMobileStep(2)}
            className="md:hidden"
          >
            Continuar
          </PrimaryButton>
        ) : null}

        <PrimaryButton
          type="submit"
          accent="violet"
          icon={CreditCard}
          loading={isSubmitting}
          loadingLabel="Salvando..."
          disabled={isSubmitting}
          className={cn(mobileStep === 1 && "hidden md:inline-flex")}
        >
          {editingCard ? "Salvar cartão" : "Adicionar cartão"}
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}

function CardPreview({
  theme,
  name,
  limit,
}: {
  theme: CardTheme;
  name: string;
  limit: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[250px] [perspective:1200px] md:max-w-[330px]">
      <div className="relative aspect-[1.586/1] overflow-hidden rounded-[18px] text-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-500 md:[transform:rotateX(6deg)_rotateY(-6deg)]">
        {/* One layer per theme so a colour change cross-fades. */}
        {CARD_THEMES.map((item) => (
          <span
            key={item.color}
            aria-hidden
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              background: item.background,
              opacity: item.color === theme.color ? 1 : 0,
            }}
          />
        ))}
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.22),transparent_55%)]"
        />
        <span
          aria-hidden
          className="absolute -bottom-1/2 -left-1/4 size-[120%] rounded-full border border-white/10"
        />

        <div className="relative flex h-full flex-col justify-between p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-[15px] font-semibold tracking-tight md:text-lg">
              {name}
            </p>
            <Wifi className="size-4 shrink-0 rotate-90 text-white/70" />
          </div>

          <div className="relative h-7 w-9 overflow-hidden rounded-[6px] bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.25)] md:h-8 md:w-11">
            <span className="absolute inset-y-0 left-1/3 w-px bg-amber-900/30" />
            <span className="absolute inset-y-0 right-1/3 w-px bg-amber-900/30" />
            <span className="absolute inset-x-0 top-1/2 h-px bg-amber-900/30" />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-white/60">Limite</p>
              <p className="truncate text-sm font-semibold tabular-nums md:text-base">
                {limit}
              </p>
            </div>
            <p className="font-mono text-xs tracking-[0.18em] text-white/80 md:text-[13px]">
              •••• 2408
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
