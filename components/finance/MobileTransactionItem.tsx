import { cn } from "@/lib/utils";
import {
  Car,
  ChevronRight,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  ReceiptText,
  ShoppingBag,
  Tag,
  Utensils,
} from "lucide-react";
import type { ReactNode } from "react";

function CategoryIcon({ category }: { category: string }) {
  const normalized = category.toLowerCase();

  if (normalized.includes("aliment")) return <Utensils className="size-5" />;
  if (normalized.includes("transport")) return <Car className="size-5" />;
  if (normalized.includes("moradia")) return <House className="size-5" />;
  if (normalized.includes("saúde") || normalized.includes("saude")) {
    return <HeartPulse className="size-5" />;
  }
  if (normalized.includes("educa")) return <GraduationCap className="size-5" />;
  if (normalized.includes("lazer")) return <Gamepad2 className="size-5" />;
  if (normalized.includes("compra")) return <ShoppingBag className="size-5" />;
  if (normalized.includes("fix")) return <ReceiptText className="size-5" />;

  return <Tag className="size-5" />;
}

export function MobileTransactionItem({
  title,
  category,
  date,
  amount,
  positive = false,
  leading,
  trailing,
  className,
}: {
  title: ReactNode;
  category: string;
  date: string;
  amount: string;
  positive?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "surface-panel flex min-h-20 items-center gap-3 rounded-2xl p-3.5",
        className,
      )}
    >
      {leading ?? (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
          <CategoryIcon category={category} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">{title}</div>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {category} · {date}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <strong
          className={cn(
            "text-right text-sm font-semibold",
            positive ? "text-emerald-400" : "text-zinc-100",
          )}
        >
          {amount}
        </strong>
        {trailing ?? <ChevronRight className="size-4 text-zinc-600" />}
      </div>
    </article>
  );
}
