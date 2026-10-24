"use client";

import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";

import { dashboardPanelClassName, dashboardReveal } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

export const settingsSecondaryButtonClassName =
  "h-10 rounded-xl bg-white/[0.04] px-4 text-zinc-200 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.08] hover:text-zinc-50";

/* One titled block of the settings page, on the same glass surface as the
   dashboard panels. `tone="danger"` marks irreversible actions. */
export function SettingsPanel({
  id,
  icon: Icon,
  title,
  description,
  action,
  footer,
  tone = "default",
  className,
  children,
}: {
  id: string;
  icon?: IconComponent;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <motion.section
      variants={dashboardReveal}
      aria-labelledby={id}
      className={cn(
        dashboardPanelClassName,
        "min-w-0",
        tone === "danger" && "ring-1 ring-inset ring-rose-500/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tone === "danger"
                  ? "bg-rose-400/10 text-rose-300"
                  : "bg-emerald-400/10 text-emerald-300",
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 id={id} className="text-base font-semibold text-zinc-100">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm leading-5 text-zinc-500">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.06] px-5 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </motion.section>
  );
}
