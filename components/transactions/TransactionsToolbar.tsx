"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Layers,
  ListFilter,
  Search,
  X,
} from "lucide-react";

import {
  groupOptions,
  sortOptions,
  type GroupOption,
  type OriginFilter,
  type SortOption,
  type TypeFilter,
} from "@/components/transactions/transactionList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Card } from "@/store/useFinanceStore";

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Receitas" },
  { value: "expense", label: "Despesas" },
  { value: "fixed", label: "Fixas" },
];

const originLabels: Record<Exclude<OriginFilter, "all">, string> = {
  card: "Cartões",
  "debit-pix": "Débito / Pix",
};

interface TransactionsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  originFilter: OriginFilter;
  onOriginChange: (value: OriginFilter) => void;
  cardFilter: string;
  onCardChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  group: GroupOption;
  onGroupChange: (value: GroupOption) => void;
  categories: string[];
  cards: Card[];
  onClearFilters: () => void;
}

const selectTriggerClassName =
  "h-10 w-full border-white/[0.08] bg-zinc-950/60 text-sm";

export function TransactionsToolbar({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  originFilter,
  onOriginChange,
  cardFilter,
  onCardChange,
  sort,
  onSortChange,
  group,
  onGroupChange,
  categories,
  cards,
  onClearFilters,
}: TransactionsToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const cardName = cards.find((card) => card.id === cardFilter)?.name;
  const typeLabel = typeOptions.find(
    (option) => option.value === typeFilter,
  )?.label;
  const activeChips = [
    typeFilter !== "all" && typeLabel
      ? {
          key: "type",
          label: typeLabel,
          onRemove: () => onTypeChange("all"),
        }
      : null,
    categoryFilter !== "all"
      ? {
          key: "category",
          label: categoryFilter,
          onRemove: () => onCategoryChange("all"),
        }
      : null,
    originFilter !== "all"
      ? {
          key: "origin",
          label: originLabels[originFilter],
          onRemove: () => onOriginChange("all"),
        }
      : null,
    originFilter === "card" && cardName
      ? { key: "card", label: cardName, onRemove: () => onCardChange("all") }
      : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);
  const panelFilterCount = activeChips.filter(
    (chip) => chip.key !== "type",
  ).length;
  const hasAnyFilter =
    activeChips.length > 0 || typeFilter !== "all" || searchTerm.trim() !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 lg:flex">
        <div className="relative min-w-0 lg:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar transações"
            aria-label="Buscar transações"
            className="h-11 rounded-xl border-white/[0.08] bg-zinc-900/60 pl-10 pr-10 text-zinc-100 placeholder:text-zinc-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Tipo de transação"
          className="order-last col-span-3 flex min-w-0 rounded-xl bg-zinc-900/60 p-1 ring-1 ring-inset ring-white/[0.08] lg:order-none"
        >
          {typeOptions.map((option) => {
            const isActive = typeFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onTypeChange(option.value)}
                className={cn(
                  "relative h-9 flex-1 rounded-lg px-3 text-xs font-medium transition-colors lg:flex-none",
                  isActive
                    ? "text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="transactions-type-pill"
                    className="absolute inset-0 rounded-lg bg-emerald-400"
                    transition={{
                      type: "spring",
                      bounce: 0.18,
                      duration: 0.4,
                    }}
                  />
                )}
                <span className="relative">{option.label}</span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters((current) => !current)}
          aria-expanded={showFilters}
          aria-label="Filtros"
          className={cn(
            "h-11 shrink-0 gap-2 rounded-xl border-white/[0.08] bg-zinc-900/60 px-3",
            (showFilters || panelFilterCount > 0) &&
              "border-emerald-400/30 text-emerald-200",
          )}
        >
          <ListFilter className="size-4" />
          <span className="hidden sm:inline">Filtros</span>
          {panelFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-semibold text-zinc-950">
              {panelFilterCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Ordenar e agrupar"
              className="h-11 shrink-0 gap-2 rounded-xl border-white/[0.08] bg-zinc-900/60 px-3"
            >
              <ArrowDownUp className="size-4" />
              <span className="hidden sm:inline">
                {sortOptions.find((option) => option.value === sort)?.label}
              </span>
              <ChevronDown className="hidden size-3.5 text-zinc-500 sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-zinc-500">
              <ArrowDownUp className="size-3.5" />
              Ordenar por
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-md"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-zinc-500">
              <Layers className="size-3.5" />
              Agrupar
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={group}
              onValueChange={(value) => onGroupChange(value as GroupOption)}
            >
              {groupOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-md"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 rounded-xl bg-zinc-900/40 p-3 ring-1 ring-inset ring-white/[0.06] sm:grid-cols-3">
              <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger
                  className={selectTriggerClassName}
                  aria-label="Categoria"
                >
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={originFilter}
                onValueChange={(value) => onOriginChange(value as OriginFilter)}
              >
                <SelectTrigger
                  className={selectTriggerClassName}
                  aria-label="Origem"
                >
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="card">Cartões</SelectItem>
                  <SelectItem value="debit-pix">Débito / Pix</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={cardFilter}
                onValueChange={onCardChange}
                disabled={originFilter !== "card"}
              >
                <SelectTrigger
                  className={selectTriggerClassName}
                  aria-label="Cartão"
                >
                  <SelectValue placeholder="Cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="flex h-7 items-center gap-1.5 rounded-full bg-emerald-500/10 pl-3 pr-2 text-xs font-medium text-emerald-200 ring-1 ring-inset ring-emerald-500/20 transition-colors hover:bg-emerald-500/15"
            >
              <Check className="size-3" />
              {chip.label}
              <X className="size-3.5 text-emerald-300/70" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearFilters}
            className="h-7 rounded-full px-2.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  );
}
