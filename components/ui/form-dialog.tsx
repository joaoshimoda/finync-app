import type { ComponentType, ReactNode } from "react";

import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

interface FormDialogHeaderProps {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  description: string;
  accent?: "emerald" | "violet";
}

function FormDialogHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent = "emerald",
}: FormDialogHeaderProps) {
  return (
    <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-5 py-4 pr-16 sm:px-6 sm:py-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            accent === "violet"
              ? "border-violet-400/30 bg-violet-400/15 text-violet-200"
              : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400">{eyebrow}</p>
          <DialogTitle className="mt-0.5 text-xl font-semibold leading-tight text-zinc-50 sm:text-2xl">
            {title}
          </DialogTitle>
        </div>
      </div>
      <DialogDescription className="mt-2 max-w-xl text-sm leading-5 text-zinc-400">
        {description}
      </DialogDescription>
    </header>
  );
}

function FormDialogBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:#52525b_transparent] [scrollbar-width:thin] sm:px-6 sm:py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FormDialogFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <footer
      className={cn(
        "flex shrink-0 gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-3.5 sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </footer>
  );
}

function FormSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description ? (
          <p className="mt-1 hidden text-xs leading-5 text-zinc-400 sm:block">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const formDialogContentClassName =
  "inset-x-0 bottom-0 left-0 top-auto flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none rounded-t-xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-50 shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(92dvh,760px)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border-b";

export {
  FormDialogBody,
  FormDialogFooter,
  FormDialogHeader,
  FormSection,
  formDialogContentClassName,
};
