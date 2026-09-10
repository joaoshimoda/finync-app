"use client";

import { type MouseEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  PlayCircle,
  Search,
} from "lucide-react";

import {
  frequentlyAskedQuestions,
  guideSections,
  quickStartSteps,
} from "@/components/help/guideContent";
import { PRODUCT_TOUR_EVENT } from "@/components/onboarding/tourSteps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function AjudaPage() {
  const [search, setSearch] = useState("");
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
    <>
      <div className="flex min-h-full w-full flex-col gap-7 pb-10">
        <header className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase text-emerald-400">
              Guia do Usuário
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
              Use o Finync sem dúvidas
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Guias completos sobre lançamentos, cartões, faturas, recorrências,
              dependentes, importação e leitura dos seus dados.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => window.dispatchEvent(new Event(PRODUCT_TOUR_EVENT))}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          >
            <PlayCircle className="size-5" />
            Refazer tutorial guiado
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickStartSteps.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="group flex min-h-32 flex-col justify-between rounded-xl border border-white/[0.07] bg-zinc-900/40 p-4 transition-colors hover:border-emerald-500/20 hover:bg-zinc-900/70"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                  {index + 1}
                </span>
                <ArrowRight className="size-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
              </div>
              <div className="mt-5">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {step.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {step.description}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busque por cartão, assinatura, dependente, importação..."
            className="h-12 border-zinc-800 bg-zinc-900/50 pl-10 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="sticky top-8 hidden rounded-xl border border-white/[0.06] bg-zinc-900/30 p-3 lg:block">
            <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium uppercase text-zinc-500">
              <BookOpen className="size-3.5" />
              Neste guia
            </div>
            <nav className="mt-1 space-y-0.5">
              {guideSections.map((section) => {
                const Icon = section.icon;

                return (
                  <a
                    key={section.id}
                    href={"#" + section.id}
                    onClick={(event) => scrollToGuideSection(event, section.id)}
                    className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{section.shortTitle}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            {filteredSections.length ? (
              <div className="space-y-4">
                {filteredSections.map((section, sectionIndex) => {
                  const Icon = section.icon;

                  return (
                    <article
                      key={section.id}
                      id={section.id}
                      tabIndex={-1}
                      className="scroll-mt-24 rounded-xl border border-white/[0.07] bg-zinc-900/35 p-5 outline-none sm:p-6 md:scroll-mt-8"
                    >
                      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 gap-4">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-lg",
                              section.accent,
                            )}
                          >
                            <Icon className="size-5" />
                          </span>
                          <div>
                            <p className="text-[11px] font-medium uppercase text-zinc-600">
                              Guia {sectionIndex + 1}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-100">
                              {section.title}
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          className="shrink-0 border-zinc-800 bg-zinc-950"
                        >
                          <Link href={section.href}>
                            {section.actionLabel}
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-6 grid gap-x-8 gap-y-3 border-t border-white/[0.06] pt-5 xl:grid-cols-2">
                        {section.steps.map((step, index) => (
                          <div
                            key={step}
                            className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5"
                          >
                            <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                            <p className="text-sm leading-5 text-zinc-300">
                              <span className="sr-only">
                                Passo {index + 1}:{" "}
                              </span>
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex gap-2.5 rounded-lg bg-zinc-950/60 px-3 py-2.5">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                        <p className="text-xs leading-5 text-zinc-500">
                          {section.tip}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 text-center">
                <CircleHelp className="size-7 text-zinc-600" />
                <h2 className="mt-4 text-sm font-semibold text-zinc-200">
                  Nenhum guia encontrado
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Tente buscar com outro termo.
                </p>
              </div>
            )}
          </main>
        </div>

        {!normalizedSearch ? (
          <section className="border-t border-white/[0.07] pt-7">
            <div className="flex items-center gap-2">
              <CircleHelp className="size-5 text-emerald-400" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
                Dúvidas frequentes
              </h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {frequentlyAskedQuestions.map((item) => (
                <div
                  key={item.question}
                  className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-4"
                >
                  <h3 className="text-sm font-medium text-zinc-200">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
