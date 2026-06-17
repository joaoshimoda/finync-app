"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navigationItems } from "./navigationItems";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";
import { toast } from "sonner";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const clearFinanceState = useFinanceStore((state) => state.clearFinanceState);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
      toast.error("Nao foi possivel sair agora.");
      return;
    }

    clearFinanceState();
    toast.success("Sessao encerrada. Ate logo!");
    router.replace("/login");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#071014]/85 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
        {navigationItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                active
                  ? "bg-brand-500/15 text-brand-100"
                  : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5",
                  active ? "text-brand-300" : "text-zinc-500",
                ].join(" ")}
                strokeWidth={2}
              />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-red-500/10 hover:text-red-100"
        >
          <LogOut className="h-5 w-5 text-zinc-500" strokeWidth={2} />
          <span className="max-w-full truncate">Sair</span>
        </button>
      </div>
    </nav>
  );
}
