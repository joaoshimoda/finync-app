"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Landmark, LogOut } from "lucide-react";
import { navigationItems } from "./navigationItems";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";
import { toast } from "sonner";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const clearFinanceState = useFinanceStore((state) => state.clearFinanceState);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
      toast.error("Não foi possível sair agora.");
      return;
    }

    clearFinanceState();
    toast.success("Sessão encerrada. Até logo!");
    router.replace("/login");
  }

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col justify-between border-r border-white/[0.08] bg-white/[0.045] px-5 py-6 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-lg font-bold text-brand-100">
          <Landmark className="h-5 w-5 text-brand-300" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-white">Finync</p>
          <p className="text-xs text-zinc-400">Controle financeiro</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {navigationItems.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition",
                active
                  ? "border border-brand-500/20 bg-brand-500/15 text-brand-100 shadow-[0_0_22px_rgba(16,185,129,0.08)]"
                  : "border border-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.055] hover:text-white",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5 shrink-0 transition",
                  active ? "text-brand-300" : "text-zinc-500 group-hover:text-zinc-200",
                ].join(" ")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-300">
            Plano atual
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Grátis</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="group flex h-12 w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-medium text-zinc-400 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-100"
        >
          <LogOut className="h-5 w-5 text-zinc-500 transition group-hover:text-red-200" />
          Sair
        </button>
      </div>
    </aside>
  );
}
