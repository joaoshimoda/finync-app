"use client";

import {
  useId,
  type ComponentProps,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { MotionConfig, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";

import { getCardGradientClassName } from "@/components/dashboard/CardsSection";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* Shared building blocks for the create/edit modals. Every modal is a stage
   (the live preview of what is being saved) beside a quiet form; on phones
   the stage collapses into a compact header of a bottom sheet. */

export type ModalAccent = "rose" | "emerald" | "violet" | "teal" | "amber";

type IconComponent = ComponentType<{ className?: string }>;

const accentStyles: Record<
  ModalAccent,
  {
    glow: string;
    base: string;
    primary: string;
    focus: string;
    text: string;
    soft: string;
    switch: string;
    line: string;
  }
> = {
  rose: {
    glow: "244, 63, 94",
    base: "#1b0a10",
    primary: "bg-rose-400 text-zinc-950 hover:bg-rose-300",
    focus: "focus-visible:ring-rose-400/60",
    text: "text-rose-300",
    soft: "bg-rose-400/12 text-rose-200",
    switch: "data-[state=checked]:bg-rose-400",
    line: "group-focus-within/amount:bg-rose-400",
  },
  emerald: {
    glow: "16, 185, 129",
    base: "#06140f",
    primary: "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
    focus: "focus-visible:ring-emerald-400/60",
    text: "text-emerald-300",
    soft: "bg-emerald-400/12 text-emerald-200",
    switch: "data-[state=checked]:bg-emerald-400",
    line: "group-focus-within/amount:bg-emerald-400",
  },
  violet: {
    glow: "139, 92, 246",
    base: "#110c1d",
    primary: "bg-violet-400 text-zinc-950 hover:bg-violet-300",
    focus: "focus-visible:ring-violet-400/60",
    text: "text-violet-300",
    soft: "bg-violet-400/12 text-violet-200",
    switch: "data-[state=checked]:bg-violet-400",
    line: "group-focus-within/amount:bg-violet-400",
  },
  teal: {
    glow: "20, 184, 166",
    base: "#051412",
    primary: "bg-teal-400 text-zinc-950 hover:bg-teal-300",
    focus: "focus-visible:ring-teal-400/60",
    text: "text-teal-300",
    soft: "bg-teal-400/12 text-teal-200",
    switch: "data-[state=checked]:bg-teal-400",
    line: "group-focus-within/amount:bg-teal-400",
  },
  amber: {
    glow: "245, 158, 11",
    base: "#161007",
    primary: "bg-amber-400 text-zinc-950 hover:bg-amber-300",
    focus: "focus-visible:ring-amber-400/60",
    text: "text-amber-300",
    soft: "bg-amber-400/12 text-amber-200",
    switch: "data-[state=checked]:bg-amber-400",
    line: "group-focus-within/amount:bg-amber-400",
  },
};

export function getAccent(accent: ModalAccent) {
  return accentStyles[accent];
}

/* Lit from the top-left corner with the flow's colour; `rgb` overrides the
   accent so the card modal can glow with the card being designed. */
export function getStageBackground(accent: ModalAccent, rgb?: string) {
  const glow = rgb ?? accentStyles[accent].glow;
  return [
    `radial-gradient(110% 70% at 0% 0%, rgba(${glow}, 0.34), transparent 62%)`,
    `radial-gradient(90% 60% at 100% 100%, rgba(${glow}, 0.12), transparent 70%)`,
    accentStyles[accent].base,
  ].join(", ");
}

/* ---------- Shell ---------- */

const sizeClassNames = {
  lg: {
    content: "md:h-[600px] md:max-w-[960px]",
    grid: "md:grid-cols-[minmax(0,42%)_minmax(0,58%)]",
  },
  md: {
    content: "md:h-[540px] md:max-w-[880px]",
    grid: "md:grid-cols-[minmax(0,42%)_minmax(0,58%)]",
  },
  sm: {
    content: "md:h-[440px] md:max-w-[780px]",
    grid: "md:grid-cols-[minmax(0,44%)_minmax(0,56%)]",
  },
};

export function ModalShell({
  tour,
  focusId,
  size = "lg",
  onSubmit,
  stage,
  children,
}: {
  tour: string;
  focusId?: string;
  size?: keyof typeof sizeClassNames;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  stage: ReactNode;
  children: ReactNode;
}) {
  return (
    <DialogContent
      data-tour={tour}
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        if (!focusId) return;
        event.preventDefault();
        window.requestAnimationFrame(() => {
          document.getElementById(focusId)?.focus();
        });
      }}
      className={cn(
        "inset-x-0 bottom-0 left-0 top-auto flex max-h-[96dvh] w-full max-w-none sm:max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-b-none rounded-t-[22px] border-0 bg-zinc-950 p-0 light:bg-zinc-900 text-zinc-50 shadow-[0_-24px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08] data-open:slide-in-from-bottom-6 md:left-1/2 md:top-1/2 md:max-h-[92dvh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[22px] md:shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:data-open:slide-in-from-bottom-0",
        sizeClassNames[size].content,
      )}
    >
      <MotionConfig reducedMotion="user">
        <form
          onSubmit={onSubmit}
          className={cn(
            "grid min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1",
            sizeClassNames[size].grid,
          )}
        >
          {stage}
          <section className="flex min-h-0 flex-col bg-zinc-950 light:bg-zinc-900">
            {children}
          </section>
        </form>
      </MotionConfig>
    </DialogContent>
  );
}

/* ---------- Stage (preview side) ---------- */

export function ModalStage({
  accent,
  background,
  context,
  title,
  description,
  onClose,
  children,
  footer,
  compact,
  heroOnMobile,
}: {
  accent: ModalAccent;
  /* Full CSS background; defaults to the accent glow. */
  background?: string;
  /* Short line naming where the user is, e.g. "Nubank" or "Março de 2026". */
  context?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  /* The hero preview; hidden on phones unless `compact` is given. */
  children?: ReactNode;
  footer?: ReactNode;
  /* Small preview kept visible on phones, next to the title. */
  compact?: ReactNode;
  /* Keep the hero preview visible on phones too. */
  heroOnMobile?: boolean;
}) {
  return (
    <aside
      className="theme-fixed relative flex flex-col overflow-hidden border-b border-white/[0.06] px-5 pb-4 pt-3 text-white md:border-b-0 md:px-8 md:py-8"
      style={{ background: background ?? getStageBackground(accent) }}
    >
      <span
        aria-hidden
        className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/20 md:hidden"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-white/[0.06] md:block"
      />

      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-3 top-4 z-20 flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:left-5 md:right-auto md:top-5"
      >
        <X className="size-[18px]" />
      </button>

      <div className="relative z-10 flex items-start justify-between gap-4 pr-10 md:block md:pr-0 md:pt-10">
        <div className="min-w-0">
          {context ? (
            <p className="truncate text-[13px] font-medium text-white/60">
              {context}
            </p>
          ) : null}
          <DialogTitle className="mt-0.5 truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white md:mt-1.5 md:text-[30px]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="mt-2 hidden max-w-[300px] text-[13px] leading-5 text-white/60 md:block">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        {compact ? <div className="shrink-0 md:hidden">{compact}</div> : null}
      </div>

      {children ? (
        <div
          className={cn(
            "relative z-10 min-h-0 flex-1 flex-col justify-center md:flex md:py-6",
            heroOnMobile ? "flex py-3" : "hidden",
          )}
        >
          {children}
        </div>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}

      {footer ? <div className="relative z-10 mt-3 md:mt-0">{footer}</div> : null}
    </aside>
  );
}

/* Mono-line amount used as the compact stage preview on phones. */
export function StageAmount({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("text-right", className)}>
      <p className="text-[11px] text-white/55">{label}</p>
      <p className="text-lg font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

/* Progress bar on the stage (paid / received / consumed). */
export function StageMeter({
  value,
  tone = "bg-white",
}: {
  value: number;
  tone?: string;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={cn("h-full rounded-full", tone)}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function StageFacts({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl
      className="grid gap-3 border-t border-white/10 pt-4"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-white/50">{item.label}</dt>
          <dd className="mt-1 truncate text-sm font-medium tabular-nums text-white/90">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Form side ---------- */

export function ModalBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin] md:px-8 md:pt-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* Thin two-step progress for the phone flow. */
export function MobileSteps({
  step,
  labels,
  accent,
}: {
  step: 1 | 2;
  labels: [string, string];
  accent: ModalAccent;
}) {
  return (
    <div className="mb-5 md:hidden">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-zinc-200">{labels[step - 1]}</span>
        <span className="text-zinc-500">
          Etapa {step} de 2
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[1, 2].map((item) => (
          <span
            key={item}
            className={cn(
              "h-1 rounded-full transition-colors",
              item <= step
                ? accentStyles[accent].primary.split(" ")[0]
                : "bg-white/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function FieldLabel({
  htmlFor,
  icon: Icon,
  children,
  aside,
}: {
  htmlFor?: string;
  icon?: IconComponent;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-300"
      >
        {Icon ? <Icon className="size-3.5 text-zinc-500" /> : null}
        {children}
      </Label>
      {aside ? (
        <span className="text-xs tabular-nums text-zinc-500">{aside}</span>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  icon,
  aside,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  icon?: IconComponent;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={htmlFor} icon={icon} aside={aside}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

export function fieldClassName(accent: ModalAccent) {
  return cn(
    "h-11 w-full rounded-xl border-0 bg-white/[0.04] px-3.5 text-[15px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-zinc-50 shadow-none ring-1 ring-inset ring-white/[0.08] transition-[background-color,box-shadow] placeholder:text-zinc-600 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:ring-2 dark:bg-white/[0.04] disabled:opacity-60",
    accentStyles[accent].focus,
  );
}

/* Select triggers use :focus rather than :focus-visible. */
export function selectTriggerClassName(accent: ModalAccent) {
  return cn(
    fieldClassName(accent),
    "data-[size]:h-11 focus:border-0 focus:ring-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2",
    accentStyles[accent].focus.replace("focus-visible:", "focus:"),
  );
}

/* The amount is the one thing every money form is about, so it is set large. */
export function AmountInput({
  id,
  label,
  accent,
  currencySymbol,
  aside,
  className,
  ...inputProps
}: {
  id: string;
  label: string;
  accent: ModalAccent;
  currencySymbol: string;
  aside?: ReactNode;
} & Omit<ComponentProps<typeof Input>, "id">) {
  return (
    <div className={cn("group/amount", className)}>
      <FieldLabel htmlFor={id} aside={aside}>
        {label}
      </FieldLabel>
      <div className="relative flex items-baseline gap-2">
        <span className="text-xl font-medium text-zinc-500">
          {currencySymbol}
        </span>
        <Input
          id={id}
          autoComplete="off"
          className="h-14 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 selection:bg-white/20 selection:text-zinc-50 text-[40px] font-semibold tabular-nums tracking-[-0.03em] text-zinc-50 shadow-none placeholder:text-zinc-700 focus-visible:ring-0 dark:bg-transparent md:text-[44px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          {...inputProps}
        />
      </div>
      <div className="relative h-px bg-white/10">
        <span
          className={cn(
            "absolute inset-0 origin-left scale-x-0 bg-transparent transition-transform duration-300 group-focus-within/amount:scale-x-100",
            accentStyles[accent].line,
          )}
        />
      </div>
    </div>
  );
}

/* Small shortcut buttons under an amount ("Quitar saldo total"). */
export function QuickAmounts({
  items,
}: {
  items: { label: string; onSelect: () => void; hidden?: boolean }[];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onSelect}
            className="h-8 rounded-full bg-white/[0.05] px-3 text-[13px] font-medium text-zinc-300 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.09] hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {item.label}
          </button>
        ))}
    </div>
  );
}

/* Radio-style switcher with a sliding thumb. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconComponent; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid h-11 gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.08]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-45",
              isActive ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[9px] bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              {Icon ? <Icon className="size-4" /> : null}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Grouped list of on/off options, settings-style. */
export function OptionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.08]">
      {children}
    </div>
  );
}

export function OptionRow({
  id,
  icon: Icon,
  title,
  description,
  control,
  children,
}: {
  id?: string;
  icon?: IconComponent;
  title: string;
  description?: string;
  /* Usually a <Switch>; give it the same `id` so the row text is its label. */
  control?: ReactNode;
  /* Extra fields revealed under the row. */
  children?: ReactNode;
}) {
  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400">
            <Icon className="size-4" />
          </span>
        ) : null}
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-sm font-medium text-zinc-100">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-4 text-zinc-500">
              {description}
            </span>
          ) : null}
        </label>
        {control}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function accentSwitchClassName(accent: ModalAccent) {
  return cn(
    "data-[state=unchecked]:bg-white/10 dark:data-[state=unchecked]:bg-white/10",
    accentStyles[accent].switch,
  );
}

/* Short explanatory note with an icon, used sparingly. */
export function ModalNote({
  icon: Icon,
  title,
  children,
  tone = "neutral",
}: {
  icon: IconComponent;
  title?: string;
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-3.5 py-3 text-xs leading-5",
        tone === "warning"
          ? "bg-amber-400/[0.07] text-amber-200/90 ring-1 ring-inset ring-amber-400/20"
          : "bg-white/[0.03] text-zinc-400",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 opacity-80" />
      <div>
        {title ? (
          <p className="text-[13px] font-medium text-zinc-200">{title}</p>
        ) : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}

/* Recent payments / settlements list. */
export function HistoryList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: { id: string; label: string; value: string }[];
}) {
  return (
    <div>
      <FieldLabel aside={items.length ? `${items.length}` : undefined}>
        {title}
      </FieldLabel>
      {items.length ? (
        <ul className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.08]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
            >
              <span className="flex min-w-0 items-center gap-2 text-zinc-400">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-zinc-100">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white/[0.02] px-3.5 py-3 text-[13px] text-zinc-500 ring-1 ring-inset ring-white/[0.06]">
          {emptyText}
        </p>
      )}
    </div>
  );
}

/* Card radio list with each card's wallet colour. */
export function CardPicker({
  cards,
  value,
  onChange,
  accent,
  label = "Cartão utilizado",
}: {
  cards: { id: string; name: string; color?: string }[];
  value: string;
  onChange: (cardId: string) => void;
  accent: ModalAccent;
  label?: string;
}) {
  if (!cards.length) {
    return (
      <p className="rounded-xl bg-white/[0.03] px-3.5 py-3 text-[13px] text-zinc-400 ring-1 ring-inset ring-white/[0.08]">
        Cadastre um cartão em Cartões para lançar no crédito.
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {cards.map((card) => {
        const isSelected = card.id === value;

        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(card.id)}
            className={cn(
              "flex h-12 min-w-0 items-center gap-2.5 rounded-xl px-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2",
              accentStyles[accent].focus,
              isSelected
                ? "bg-white/[0.08] ring-white/30"
                : "bg-white/[0.03] ring-white/[0.08] hover:bg-white/[0.06]",
            )}
          >
            <span
              className={cn(
                "h-5 w-7 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]",
                getCardGradientClassName(card.name, card.color),
              )}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-100">
              {card.name}
            </span>
            {isSelected ? (
              <Check className={cn("size-4 shrink-0", accentStyles[accent].text)} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Footer ---------- */

export function ModalFooter({
  children,
  start,
}: {
  children: ReactNode;
  /* Left-aligned slot, e.g. a delete action. */
  start?: ReactNode;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] bg-zinc-950 px-5 light:bg-zinc-900 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:border-0 md:px-8 md:pb-7 md:pt-3">
      {start ? <div className="mr-auto">{start}</div> : null}
      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
        {children}
      </div>
    </footer>
  );
}

export function SecondaryButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-11 flex-1 rounded-xl px-4 text-[14px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-50 md:flex-none",
        className,
      )}
      {...props}
    />
  );
}

export function PrimaryButton({
  accent,
  loading,
  loadingLabel,
  icon: Icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  accent: ModalAccent;
  loading?: boolean;
  loadingLabel?: string;
  icon?: IconComponent;
}) {
  return (
    <Button
      className={cn(
        "h-11 flex-[1.4] rounded-xl px-5 text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-colors focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 md:flex-none",
        accentStyles[accent].primary,
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : Icon ? (
        <Icon className="size-4" />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  );
}

/* Shown in place of the form when editing one item of a recurring or
   installment group: the user picks how far the change reaches. */
export function GroupScopeChooser<T extends string>({
  title,
  description,
  options,
  disabled,
  onSelect,
}: {
  title: string;
  description: string;
  options: { value: T; label: string; description: string; primary?: boolean }[];
  disabled?: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-lg font-semibold tracking-tight text-zinc-50">{title}</p>
      <p className="mt-1 text-sm leading-5 text-zinc-400">{description}</p>
      <div className="mt-5 grid gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50",
              option.primary
                ? "bg-white/[0.07] ring-white/15 hover:bg-white/[0.1]"
                : "bg-white/[0.02] ring-white/[0.08] hover:bg-white/[0.05]",
            )}
          >
            <span>
              <span className="block text-sm font-medium text-zinc-50">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {option.description}
              </span>
            </span>
            {option.primary ? (
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                Sugerido
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
