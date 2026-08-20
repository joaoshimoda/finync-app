"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./navigationItems";

const mobileRoutes = new Set([
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/cards",
  "/dashboard/dependentes",
  "/dashboard/fixed",
  "/dashboard/analytics",
]);

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const mobileItems = navigationItems.filter((item) => mobileRoutes.has(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-black/80 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {mobileItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "text-zinc-500 active:bg-white/[0.06] active:text-zinc-200",
              ].join(" ")}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
