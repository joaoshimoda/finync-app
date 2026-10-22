"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  LogOut,
  Pin,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { FinyncLogo } from "@/components/branding/FinyncLogo";
import { useDashboardActions } from "@/components/layout/DashboardActionsProvider";
import { SidebarCustomizationSheet } from "@/components/layout/SidebarCustomizationSheet";
import {
  navigationItems,
  navigationSections,
  type NavigationItem,
} from "./navigationItems";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const collapsedStorageKey = "finync:sidebar-collapsed";
const expandedWidth = 264;
const collapsedWidth = 76;
const sidebarEase = [0.22, 1, 0.36, 1] as const;

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(collapsedStorageKey) === "true";
  } catch {
    return false;
  }
}

/** Shows a label beside the trigger only while the rail is collapsed. */
function RailTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SectionHeading({
  label,
  collapsed,
  isOpen,
  onToggle,
  icon,
}: {
  label: string;
  collapsed: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  icon?: ReactNode;
}) {
  if (collapsed) {
    return (
      <div className="flex h-7 items-center px-4" aria-hidden="true">
        <span className="h-px w-full bg-white/[0.07]" />
      </div>
    );
  }

  const content = (
    <>
      {icon}
      <span>{label}</span>
      {onToggle && (
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 opacity-0 transition-all group-hover/heading:opacity-100",
            !isOpen && "-rotate-90 opacity-100",
          )}
        />
      )}
    </>
  );
  const className =
    "group/heading flex h-7 w-full items-center gap-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:text-zinc-300";

  return onToggle ? (
    <button
      type="button"
      className={className}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
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
  const [collapsed, setCollapsed] = useState(readCollapsed);
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

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(collapsedStorageKey, String(next));
      } catch {
        // The rail state only lasts for this visit when storage is unavailable.
      }

      return next;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "b" ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;

      event.preventDefault();
      toggleCollapsed();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

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
  const supportItems = orderedNavigationItems.filter(
    (item) =>
      item.section === "support" &&
      !navigationPreferences.pinnedHrefs.includes(item.href),
  );

  function renderNavigationItem(item: NavigationItem) {
    const active = isActiveRoute(pathname, item.href);
    const Icon = item.icon;

    return (
      <RailTooltip key={item.href} label={item.label} enabled={collapsed}>
        <Link
          href={item.href}
          data-tour={item.tourId}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={cn(
            "group/item relative flex h-9 items-center gap-3 rounded-xl px-[17px] text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/50",
            active ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-100",
          )}
        >
          {active ? (
            <motion.span
              layoutId="sidebar-active-item"
              className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]"
              transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
            >
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400" />
            </motion.span>
          ) : (
            <span className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 transition-opacity group-hover/item:opacity-100" />
          )}
          <Icon
            className={cn(
              "relative size-[18px] shrink-0 transition-colors",
              active
                ? "text-emerald-400"
                : "text-zinc-500 group-hover/item:text-zinc-300",
            )}
          />
          <span
            className={cn(
              "relative truncate whitespace-nowrap transition-opacity duration-200",
              collapsed && "pointer-events-none opacity-0",
            )}
          >
            {item.label}
          </span>
        </Link>
      </RailTooltip>
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
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? collapsedWidth : expandedWidth }}
        transition={{ duration: 0.28, ease: sidebarEase }}
        className="relative hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/70 md:sticky md:top-0 md:flex"
        aria-label="Navegação principal"
      >
        <RailTooltip
          label={
            collapsed ? "Expandir menu (Ctrl+B)" : "Recolher menu (Ctrl+B)"
          }
          enabled
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            className="absolute -right-3 top-[34px] z-10 flex size-6 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-900 text-zinc-400 shadow-md shadow-black/40 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
          >
            <ChevronLeft
              className={cn(
                "size-3.5 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </RailTooltip>

        <div className="flex h-[76px] shrink-0 items-center overflow-hidden px-[22px]">
          <Link
            href="/dashboard"
            aria-label="Finync — Visão Geral"
            className="flex items-center"
          >
            <AnimatePresence mode="wait" initial={false}>
              {collapsed ? (
                <motion.span
                  key="mark"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/20"
                >
                  F
                </motion.span>
              ) : (
                <motion.span
                  key="wordmark"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <FinyncLogo eager className="w-24 shrink-0 brightness-125" />
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <div className="shrink-0 px-3 pb-3">
          <RailTooltip label="Buscar (Ctrl+K)" enabled={collapsed}>
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Buscar"
              className="flex h-10 w-full items-center gap-3 overflow-hidden rounded-xl bg-white/[0.04] px-[17px] text-sm text-zinc-500 ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.07] hover:text-zinc-200"
            >
              <Search className="size-[18px] shrink-0" />
              <span
                className={cn(
                  "flex flex-1 items-center justify-between whitespace-nowrap transition-opacity duration-200",
                  collapsed && "opacity-0",
                )}
              >
                Buscar
                <kbd className="rounded-md border border-white/[0.08] bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  Ctrl K
                </kbd>
              </span>
            </button>
          </RailTooltip>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 pb-6 pt-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pinnedItems.length ? (
            <div className="space-y-0.5">
              <SectionHeading
                label="Fixados"
                collapsed={collapsed}
                icon={<Pin className="size-3" />}
              />
              {pinnedItems.map(renderNavigationItem)}
            </div>
          ) : null}

          {navigationSections
            .filter((section) => section.key !== "support")
            .map((section) => {
              const sectionItems = orderedNavigationItems.filter(
                (item) =>
                  item.section === section.key &&
                  !navigationPreferences.pinnedHrefs.includes(item.href),
              );
              if (!sectionItems.length) return null;

              const isSectionOpen =
                collapsed ||
                !navigationPreferences.collapsedSections.includes(section.key);

              return (
                <div key={section.key} className="space-y-0.5">
                  <SectionHeading
                    label={section.label}
                    collapsed={collapsed}
                    isOpen={isSectionOpen}
                    onToggle={() => void toggleSection(section.key)}
                  />
                  <AnimatePresence initial={false}>
                    {isSectionOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: sidebarEase }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {sectionItems.map(renderNavigationItem)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-white/[0.06] px-3 pb-4 pt-3">
          {supportItems.map(renderNavigationItem)}
          <RailTooltip label="Personalizar menu" enabled={collapsed}>
            <button
              type="button"
              onClick={() => setCustomizationOpen(true)}
              aria-label="Personalizar menu"
              className="group/item relative flex h-9 w-full items-center gap-3 rounded-xl px-[17px] text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <span className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 transition-opacity group-hover/item:opacity-100" />
              <SlidersHorizontal className="relative size-[18px] shrink-0 text-zinc-500 group-hover/item:text-zinc-300" />
              <span
                className={cn(
                  "relative whitespace-nowrap transition-opacity duration-200",
                  collapsed && "opacity-0",
                )}
              >
                Personalizar menu
              </span>
            </button>
          </RailTooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu da conta"
                className="mt-2 flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-2 text-left ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.05]"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-emerald-500/15 text-xs font-semibold text-emerald-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 transition-opacity duration-200",
                    collapsed && "opacity-0",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-100">
                      {displayName}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {email}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-zinc-500" />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align={collapsed ? "end" : "start"}
              sideOffset={8}
              className="w-64"
            >
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-semibold text-zinc-100">
                  {displayName}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/configuracoes">
                  <UserRound className="size-4" />
                  Meu perfil
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
        </div>
      </motion.aside>

      {customizationOpen ? (
        <SidebarCustomizationSheet
          onClose={() => setCustomizationOpen(false)}
        />
      ) : null}
    </TooltipProvider>
  );
}
