"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Tag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionBarProps {
  selectedCount: number;
  categories: string[];
  isSubmitting: boolean;
  onAssignCategory: (category: string) => void;
  onDelete: () => Promise<void>;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  categories,
  isSubmitting,
  onAssignCategory,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10rem)] z-50 flex justify-center px-4 md:bottom-6"
        >
          <div
            role="toolbar"
            aria-label="Ações em massa"
            className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-2 pl-4 shadow-2xl shadow-black/50"
          >
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
              {selectedCount}{" "}
              {selectedCount === 1 ? "selecionada" : "selecionadas"}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || !categories.length}
                  className="h-9 gap-1.5 border-white/[0.1] bg-zinc-950"
                >
                  <Tag className="size-3.5" />
                  <span className="hidden sm:inline">Categoria</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="max-h-72 w-56 overflow-y-auto"
              >
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    className="cursor-pointer"
                    onClick={() => onAssignCategory(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
              title="Excluir transações selecionadas?"
              description="Os lançamentos serão removidos permanentemente."
              confirmLabel="Excluir selecionadas"
              loadingLabel="Excluindo..."
              details={`${selectedCount} ${selectedCount === 1 ? "transação selecionada" : "transações selecionadas"}`}
              onConfirm={onDelete}
            >
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                className="h-9 gap-1.5"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            </ConfirmDialog>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClear}
              aria-label="Cancelar seleção"
              className="size-9 text-zinc-400 hover:text-zinc-100"
            >
              <X className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
