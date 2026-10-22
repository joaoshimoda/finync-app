"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowRight,
  CircleHelp,
  Command,
  Lightbulb,
  PlayCircle,
  Search,
  X,
} from "lucide-react";

import { GuidePreview } from "@/components/help/GuidePreviews";
import {
  frequentlyAskedQuestions,
  guideGroups,
  guideSections,
  quickStartSteps,
} from "@/components/help/guideContent";
import { PRODUCT_TOUR_EVENT } from "@/components/onboarding/tourSteps";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const searchSuggestions = ["fatura", "parcela", "assinatura", "dependente", "backup"];

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.4, ease: "easeOut" },
} as const;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function startTour() {
  window.dispatchEvent(new Event(PRODUCT_TOUR_EVENT));
}

export default function AjudaPage() {
  const [search, setSearch] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(guideSections[0].id);
  const normalizedSearch = normalizeSearch(search);

  const filteredSections = useMemo(() => {
    if (!normalizedSearch) return guideSections;

    return guideSections.filter((section) =>
      normalizeSearch(
        [
          section.title,
          section.shortTitle,
          section.description,
          section.tip,
          ...section.steps,
        ].join(" "),
      ).includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const filteredQuestions = useMemo(() => {
    if (!normalizedSearch) return frequentlyAskedQuestions;

    return frequentlyAskedQuestions.filter((item) =>
      normalizeSearch(
        [item.question, item.answer, item.topic].join(" "),
      ).includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const resultCount = filteredSections.length + filteredQuestions.length;

  useEffect(() => {
    const root = document.getElementById("dashboard-scroll-container");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSectionId(visible.target.id);
      },
      { root, rootMargin: "-15% 0px -75% 0px" },
    );

    [...filteredSections.map((section) => section.id), "duvidas"].forEach(
      (id) => {
        const element = document.getElementById(id);
        if (element) observer.observe(element);
      },
    );

    return () => observer.disconnect();
  }, [filteredSections]);

  function scrollToGuideSection(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();

    const section = document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-full w-full flex-col gap-10 pb-12">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900/40 px-5 py-8 sm:px-8 sm:py-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                Central de ajuda
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-50 lg:text-4xl">
                Guia do Usuário
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Tudo o que você precisa saber para usar o Finync: cada aba, cada
                função e as respostas para as dúvidas mais comuns.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={startTour}
              className="h-11 w-full gap-2 rounded-lg bg-emerald-400 px-5 font-semibold text-zinc-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-300 sm:w-auto"
            >
              <PlayCircle className="size-5" />
              Refazer tutorial
            </Button>
          </div>

          <div className="relative mt-7 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="O que você quer saber?"
              aria-label="Buscar no guia"
              className="h-12 rounded-xl border-white/[0.08] bg-zinc-950/70 pl-11 pr-11 text-zinc-100 placeholder:text-zinc-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {normalizedSearch ? (
              <span>
                {resultCount} {resultCount === 1 ? "resultado" : "resultados"}{" "}
                para “{search.trim()}”
              </span>
            ) : (
              <>
                <span>Populares:</span>
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSearch(suggestion)}
                    className="rounded-full border border-white/[0.07] px-2.5 py-1 text-zinc-400 transition-colors hover:border-emerald-500/25 hover:text-emerald-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.header>

        {!normalizedSearch && (
          <section aria-labelledby="quick-start-title">
            <h2
              id="quick-start-title"
              className="text-lg font-semibold tracking-tight text-zinc-100"
            >
              Comece por aqui
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Quatro passos para deixar seu controle financeiro funcionando.
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickStartSteps.map((step, index) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + index * 0.06 }}
                >
                  <Link
                    href={step.href}
                    className="group flex h-full items-start gap-3 rounded-xl border border-white/[0.07] bg-zinc-900/30 p-4 transition-colors hover:border-emerald-500/20 hover:bg-zinc-900/60 sm:flex-col sm:gap-4"
                  >
                    <div className="flex shrink-0 items-center justify-between sm:w-full">
                      <span className="flex size-7 items-center justify-center rounded-full border border-emerald-500/25 text-xs font-semibold tabular-nums text-emerald-300">
                        {index + 1}
                      </span>
                      <ArrowRight className="hidden size-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400 sm:block" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {step.description}
                      </p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ol>
          </section>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="sticky top-8 hidden lg:block">
            <nav aria-label="Tópicos do guia" className="space-y-5">
              {guideGroups.map((group) => {
                const groupSections = filteredSections.filter(
                  (section) => section.group === group.key,
                );
                if (!groupSections.length) return null;

                return (
                  <div key={group.key}>
                    <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                      {group.label}
                    </p>
                    <div className="mt-1.5 space-y-0.5 border-l border-white/[0.06]">
                      {groupSections.map((section) => {
                        const isActive = section.id === activeSectionId;

                        return (
                          <a
                            key={section.id}
                            href={"#" + section.id}
                            onClick={(event) =>
                              scrollToGuideSection(event, section.id)
                            }
                            className={cn(
                              "-ml-px flex min-h-8 items-center border-l px-3 text-[13px] transition-colors",
                              isActive
                                ? "border-emerald-400 text-emerald-100"
                                : "border-transparent text-zinc-500 hover:text-zinc-200",
                            )}
                          >
                            {section.shortTitle}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <a
                href="#duvidas"
                onClick={(event) => scrollToGuideSection(event, "duvidas")}
                className={cn(
                  "flex items-center gap-2 px-3 text-[13px] transition-colors",
                  activeSectionId === "duvidas"
                    ? "text-emerald-100"
                    : "text-zinc-500 hover:text-zinc-200",
                )}
              >
                <CircleHelp className="size-3.5" />
                Dúvidas frequentes
              </a>
            </nav>
          </aside>

          <div className="min-w-0 space-y-10">
            <nav
              aria-label="Tópicos do guia"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 lg:hidden"
            >
              {filteredSections.map((section) => (
                <a
                  key={section.id}
                  href={"#" + section.id}
                  onClick={(event) => scrollToGuideSection(event, section.id)}
                  className="shrink-0 rounded-full border border-white/[0.08] bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {section.shortTitle}
                </a>
              ))}
              <a
                href="#duvidas"
                onClick={(event) => scrollToGuideSection(event, "duvidas")}
                className="shrink-0 rounded-full border border-white/[0.08] bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
              >
                Dúvidas
              </a>
            </nav>
            {filteredSections.length ? (
              guideGroups.map((group) => {
                const groupSections = filteredSections.filter(
                  (section) => section.group === group.key,
                );
                if (!groupSections.length) return null;

                return (
                  <section key={group.key} aria-label={group.label}>
                    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {group.label}
                    </p>
                    <div className="space-y-4">
                      {groupSections.map((section) => {
                        const Icon = section.icon;

                        return (
                          <motion.article
                            key={section.id}
                            id={section.id}
                            tabIndex={-1}
                            {...fadeUp}
                            className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-zinc-900/30 p-5 outline-none sm:p-6 md:scroll-mt-8"
                          >
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                              <div className="min-w-0">
                                <div className="flex items-start gap-3.5">
                                  <span
                                    className={cn(
                                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                      section.accent,
                                    )}
                                  >
                                    <Icon className="size-5" />
                                  </span>
                                  <div className="min-w-0">
                                    <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                                      {section.title}
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                                      {section.description}
                                    </p>
                                  </div>
                                </div>

                                <ol className="mt-5 space-y-3">
                                  {section.steps.map((step, index) => (
                                    <li
                                      key={step}
                                      className="grid grid-cols-[24px_minmax(0,1fr)] gap-3"
                                    >
                                      <span className="flex size-6 items-center justify-center rounded-full bg-zinc-800/80 text-[11px] font-semibold tabular-nums text-zinc-300">
                                        {index + 1}
                                      </span>
                                      <p className="pt-0.5 text-sm leading-6 text-zinc-300">
                                        {step}
                                      </p>
                                    </li>
                                  ))}
                                </ol>

                                <div className="mt-5 flex gap-2.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2.5">
                                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                                  <p className="text-xs leading-5 text-zinc-400">
                                    {section.tip}
                                  </p>
                                </div>

                                <Link
                                  href={section.href}
                                  className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
                                >
                                  {section.actionLabel}
                                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                              </div>

                              <GuidePreview sectionId={section.id} />
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 text-center">
                <Search className="size-6 text-zinc-600" />
                <h2 className="mt-3 text-sm font-semibold text-zinc-200">
                  Nenhum guia encontrado
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Tente outro termo ou confira as dúvidas frequentes abaixo.
                </p>
              </div>
            )}

            <section
              id="duvidas"
              tabIndex={-1}
              className="scroll-mt-24 border-t border-white/[0.07] pt-10 outline-none md:scroll-mt-8"
            >
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                Dúvidas frequentes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Respostas rápidas para as perguntas mais comuns.
              </p>

              {filteredQuestions.length ? (
                <Accordion
                  type="single"
                  collapsible
                  className="mt-5 rounded-2xl border border-white/[0.07] bg-zinc-900/30 px-5"
                >
                  {filteredQuestions.map((item) => (
                    <AccordionItem
                      key={item.question}
                      value={item.question}
                      className="border-white/[0.06]"
                    >
                      <AccordionTrigger className="py-4 text-zinc-200 hover:no-underline hover:text-white">
                        <span className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                          <span className="w-fit shrink-0 rounded-full bg-zinc-800/80 px-2 py-0.5 text-center text-[10px] font-medium text-zinc-400 sm:w-24">
                            {item.topic}
                          </span>
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="max-w-3xl text-sm leading-6 text-zinc-400">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">
                  Nenhuma dúvida corresponde à sua busca.
                </p>
              )}
            </section>

            <motion.section
              {...fadeUp}
              className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5 sm:flex-row sm:items-center sm:p-6"
            >
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Ainda com dúvida?
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Refaça o tutorial guiado ou use a busca rápida com{" "}
                  <kbd className="inline-flex items-center gap-0.5 rounded border border-white/10 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-300">
                    <Command className="size-3" />K
                  </kbd>{" "}
                  ou Ctrl + K para encontrar qualquer tela.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={startTour}
                className="h-10 shrink-0 border-zinc-700 bg-zinc-950"
              >
                <PlayCircle className="size-4" />
                Ver tutorial
              </Button>
            </motion.section>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
