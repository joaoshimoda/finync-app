"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

/* One-tap switch between light and dark. It fixes the choice; "Automático"
   stays available in Configurações. Shows the theme it switches to. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolvedTheme, setPreference } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = nextTheme === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setPreference(nextTheme)}
      aria-label={nextTheme === "light" ? "Usar tema claro" : "Usar tema escuro"}
      title={nextTheme === "light" ? "Tema claro" : "Tema escuro"}
      className={cn(
        "relative flex size-11 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-900/70 text-zinc-300 transition-colors hover:border-white/[0.16] hover:text-zinc-100",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={nextTheme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex"
        >
          <Icon className="size-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
