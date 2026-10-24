"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { SettingsPanel } from "./SettingsPanel";

const options: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "system",
    label: "Automático",
    description: "Segue o tema do seu aparelho",
    icon: Monitor,
  },
  { value: "light", label: "Claro", description: "Fundo claro sempre", icon: Sun },
  { value: "dark", label: "Escuro", description: "Fundo escuro sempre", icon: Moon },
];

/* Miniature of the dashboard in each theme. The colours are literal so the
   preview does not follow the theme that is currently active. */
const thumbnailColors = {
  light: { page: "#f4f4f5", panel: "#ffffff", line: "#e4e4e7", text: "#18181b" },
  dark: { page: "#09090b", panel: "#18181b", line: "#27272a", text: "#f4f4f5" },
};

function ThumbnailHalf({ colors }: { colors: (typeof thumbnailColors)["light"] }) {
  return (
    <div className="flex h-full flex-1 gap-1.5 p-2" style={{ background: colors.page }}>
      <div className="w-3 rounded-sm" style={{ background: colors.panel }} />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-1.5 w-1/2 rounded-full" style={{ background: colors.text }} />
        <div className="flex-1 rounded-sm p-1.5" style={{ background: colors.panel }}>
          <div className="h-1 w-2/3 rounded-full" style={{ background: colors.line }} />
          <div className="mt-1 h-1 w-1/3 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}

function ThemeThumbnail({ variant }: { variant: "light" | "dark" | "split" }) {
  return (
    <div className="flex h-20 overflow-hidden rounded-lg ring-1 ring-inset ring-black/10">
      {variant !== "dark" ? <ThumbnailHalf colors={thumbnailColors.light} /> : null}
      {variant !== "light" ? <ThumbnailHalf colors={thumbnailColors.dark} /> : null}
    </div>
  );
}

export function AppearanceCard({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <SettingsPanel
      id="settings-appearance"
      icon={Palette}
      title="Aparência"
      description="Escolha o tema do Finync. A escolha vale para este aparelho."
      className={className}
    >
        <div role="radiogroup" aria-label="Tema" className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const isSelected = preference === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setPreference(option.value)}
                className={cn(
                  "rounded-xl p-2 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                  isSelected
                    ? "bg-emerald-400/[0.06] ring-emerald-400/60"
                    : "ring-zinc-800 hover:bg-white/[0.03] hover:ring-zinc-700",
                )}
              >
                <ThemeThumbnail
                  variant={
                    option.value === "system"
                      ? "split"
                      : option.value === "light"
                        ? "light"
                        : "dark"
                  }
                />
                <span className="mt-3 flex items-center justify-between gap-2 px-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <Icon className="size-4 text-zinc-400" />
                    {option.label}
                  </span>
                  {isSelected ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : null}
                </span>
                <span className="mt-0.5 block px-1 pb-1 text-xs text-zinc-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
    </SettingsPanel>
  );
}
