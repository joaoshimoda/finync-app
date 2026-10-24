"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bell, Database, Settings2, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";

import { dashboardReveal, dashboardStagger } from "@/components/dashboard/shared";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PreferenceSettings } from "@/components/settings/PreferenceSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { cn } from "@/lib/utils";

const sections = [
  { id: "conta", label: "Conta", icon: UserRound, Component: AccountSettings },
  { id: "preferencias", label: "Preferências", icon: SlidersHorizontal, Component: PreferenceSettings },
  { id: "notificacoes", label: "Notificações", icon: Bell, Component: NotificationSettings },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck, Component: SecuritySettings },
  { id: "dados", label: "Dados e privacidade", icon: Database, Component: PrivacySettings },
] as const;

type SectionId = (typeof sections)[number]["id"];

function getSectionFromHash(): SectionId {
  if (typeof window === "undefined") return "conta";
  const hash = window.location.hash.slice(1);
  return sections.some((section) => section.id === hash) ? (hash as SectionId) : "conta";
}

export default function ConfiguracoesPage() {
  // The dashboard layout only renders pages once auth resolves on the client,
  // so reading the hash in the first render does not cause a hydration mismatch.
  const [activeId, setActiveId] = useState<SectionId>(getSectionFromHash);
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  useEffect(() => {
    const syncFromHash = () => setActiveId(getSectionFromHash());
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectSection(id: SectionId) {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={dashboardStagger}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col gap-5 pb-4 sm:gap-6"
      >
        <motion.header variants={dashboardReveal} className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
            <Settings2 className="size-3.5" />
            Configurações
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-zinc-50 sm:text-3xl">
            Sua conta, do seu jeito
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Perfil, aparência, lembretes, segurança e o controle dos seus dados.
          </p>
        </motion.header>

        <motion.nav
          variants={dashboardReveal}
          aria-label="Seções das configurações"
          className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <div className="inline-flex min-w-max gap-1 rounded-2xl border border-white/[0.07] bg-zinc-900/50 p-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeId;

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    selectSection(section.id);
                    event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                  }}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                    isActive ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-200",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="settings-section-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-white/[0.08] ring-1 ring-inset ring-white/[0.08]"
                    />
                  ) : null}
                  <Icon className={cn("relative size-4", isActive && "text-emerald-300")} />
                  <span className="relative">{section.label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            variants={dashboardStagger}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <active.Component />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}
