"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Pin,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { FinyncLogo } from "@/components/branding/FinyncLogo";
import { useDashboardActions } from "@/components/layout/DashboardActionsProvider";
import { SidebarCustomizationSheet } from "@/components/layout/SidebarCustomizationSheet";
import { navigationItems, navigationSections } from "./navigationItems";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { setCommandPaletteOpen } = useDashboardActions();
  const authUser = useFinanceStore((state) => state.authUser);
  const navigationPreferences = useFinanceStore(
    (state) => state.navigationPreferences,
  );
  const updatePreferences = useFinanceStore((state) => state.updatePreferences);
  const clearFinanceState = useFinanceStore((state) => state.clearFinanceState);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const metadataName = authUser?.user_metadata?.name;
  const displayName =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : authUser?.email?.split("@")[0] || "Usuário";
  const email = authUser?.email || "usuario@finync.com";
  const metadataAvatarUrl = authUser?.user_metadata?.avatar_url;
  const avatarUrl =
    typeof metadataAvatarUrl === "string" ? metadataAvatarUrl : undefined;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "US";

  const orderedNavigationItems = useMemo(() => {
    const validHrefs = new Set(navigationItems.map((item) => item.href));
    const order = navigationPreferences.itemOrder.filter((href) =>
      validHrefs.has(href),
    );

    navigationItems.forEach((item) => {
      if (!order.includes(item.href)) order.push(item.href);
    });

    const positions = new Map(order.map((href, index) => [href, index]));
    return [...navigationItems].sort(
      (left, right) =>
        (positions.get(left.href) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(right.href) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [navigationPreferences.itemOrder]);

  const pinnedItems = orderedNavigationItems.filter((item) =>
    navigationPreferences.pinnedHrefs.includes(item.href),
  );

  function renderNavigationItem(item: (typeof navigationItems)[number]) {
    const active = isActiveRoute(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={item.tourId}
        className={[
          "group flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-colors",
          active
            ? "border-emerald-500/15 bg-emerald-500/10 text-emerald-100"
            : "border-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100",
        ].join(" ")}
      >
        <Icon
          className={[
            "size-[18px] shrink-0 transition-colors",
            active
              ? "text-emerald-400"
              : "text-zinc-600 group-hover:text-zinc-300",
          ].join(" ")}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  async function toggleSection(sectionKey: string) {
    const collapsedSections = navigationPreferences.collapsedSections.includes(
      sectionKey,
    )
      ? navigationPreferences.collapsedSections.filter(
          (section) => section !== sectionKey,
        )
      : [...navigationPreferences.collapsedSections, sectionKey];

    try {
      await updatePreferences({
        navigationPreferences: {
          ...navigationPreferences,
          collapsedSections,
        },
      });
    } catch {
      toast.error("Preferência salva localmente, mas ainda não sincronizada.");
    }
  }

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
    <>
      <aside className="hidden h-screen w-72 shrink-0 flex-col justify-between border-r border-white/[0.08] bg-white/[0.045] px-5 py-6 shadow-2xl shadow-black/20 backdrop-blur-2xl md:sticky md:top-0 md:flex">
      <Link
        href="/dashboard"
        className="mb-7 flex min-h-12 items-center gap-3 px-2"
        aria-label="Finync — Controle financeiro"
      >
        <FinyncLogo eager className="w-24 shrink-0 brightness-125" />
        <span className="whitespace-nowrap border-l border-white/[0.08] pl-3 text-xs text-zinc-500">
          Controle financeiro
        </span>
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pinnedItems.length ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 pb-1 text-[10px] font-semibold uppercase text-zinc-600">
              <Pin className="size-3" />
              Fixados
              <span className="h-px flex-1 bg-white/[0.06]" />
            </div>
            {pinnedItems.map(renderNavigationItem)}
          </div>
        ) : null}

        {navigationSections.map((section) => {
          const sectionItems = orderedNavigationItems.filter(
            (item) =>
              item.section === section.key &&
              !navigationPreferences.pinnedHrefs.includes(item.href),
          );
          if (!sectionItems.length) return null;

          const collapsed = navigationPreferences.collapsedSections.includes(
            section.key,
          );

          return (
            <div key={section.key} className="space-y-1">
              <button
                type="button"
                className="flex h-7 w-full items-center gap-2 px-3 text-[10px] font-semibold uppercase text-zinc-600 transition-colors hover:text-zinc-400"
                aria-expanded={!collapsed}
                onClick={() => void toggleSection(section.key)}
              >
                <span>{section.label}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <ChevronDown
                  className={`size-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                />
              </button>
              {!collapsed ? sectionItems.map(renderNavigationItem) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/[0.055] hover:text-zinc-200"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-[18px] shrink-0" />
          <span className="truncate">Buscar</span>
        </button>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-zinc-500 transition-colors hover:bg-white/[0.055] hover:text-zinc-200"
          onClick={() => setCustomizationOpen(true)}
          aria-label="Personalizar navegação"
        >
          <SlidersHorizontal className="size-[18px]" />
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.065]"
          >
            <Avatar>
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-zinc-400">{email}</p>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-zinc-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-64"
        >
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/configuracoes">
              <UserRound className="size-4" />
              Meu Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-400"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </aside>

      {customizationOpen ? (
        <SidebarCustomizationSheet
          onClose={() => setCustomizationOpen(false)}
        />
      ) : null}
    </>
  );
}
