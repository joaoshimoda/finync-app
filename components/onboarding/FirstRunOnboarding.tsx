"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  PRODUCT_TOUR_EVENT,
  productTourSteps,
} from "@/components/onboarding/tourSteps";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

const slideOffset = 24;

export function FirstRunOnboarding() {
  const router = useRouter();
  const authUser = useFinanceStore((state) => state.authUser);
  const updateAuthUser = useFinanceStore((state) => state.updateAuthUser);
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const automaticOpen =
    !dismissed && authUser?.user_metadata?.onboarding_completed === false;
  const isOpen = automaticOpen || manualOpen;
  const step = productTourSteps[activeStep];
  const StepIcon = step.icon;
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === productTourSteps.length - 1;
  const progress = ((activeStep + 1) / productTourSteps.length) * 100;

  useEffect(() => {
    function startTour() {
      setDirection(1);
      setActiveStep(0);
      setManualOpen(true);
    }

    window.addEventListener(PRODUCT_TOUR_EVENT, startTour);

    return () => window.removeEventListener(PRODUCT_TOUR_EVENT, startTour);
  }, []);

  const goToStep = useCallback(
    (nextStep: number) => {
      const nextStepIndex = Math.min(
        Math.max(nextStep, 0),
        productTourSteps.length - 1,
      );

      setDirection(nextStepIndex >= activeStep ? 1 : -1);
      setActiveStep(nextStepIndex);
    },
    [activeStep],
  );

  const finishTour = useCallback(
    async (message: string, destination?: string) => {
      const wasAutomatic = automaticOpen;

      setManualOpen(false);
      setDismissed(true);
      if (destination) router.push(destination);

      if (!wasAutomatic) {
        setActiveStep(0);
        return;
      }

      if (!authUser) {
        toast.error("Não foi possível confirmar o usuário.");
        return;
      }

      setIsSaving(true);

      try {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            ...authUser.user_metadata,
            onboarding_completed: true,
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error("Usuário não retornado pelo Supabase.");

        updateAuthUser(data.user);
        setActiveStep(0);
        toast.success(message);
      } catch (error) {
        console.error("Erro ao concluir onboarding:", error);
        toast.error(
          "Não foi possível salvar o progresso. O tutorial aparecerá no próximo acesso.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [authUser, automaticOpen, router, updateAuthUser],
  );

  const skipTour = useCallback(() => {
    void finishTour("Tutorial pulado. Você pode refazê-lo no Guia do Usuário.");
  }, [finishTour]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      void finishTour("Tutorial concluído. Bem-vindo ao Finync!", "/dashboard");
      return;
    }

    goToStep(activeStep + 1);
  }, [activeStep, finishTour, goToStep, isLastStep]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" && !isLastStep) goToStep(activeStep + 1);
      if (event.key === "ArrowLeft") goToStep(activeStep - 1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep, goToStep, isLastStep, isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSaving) skipTour();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-black/75" />
        <DialogPrimitive.Content
          aria-describedby="product-tour-summary"
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[100] flex h-[min(660px,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-[920px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/60 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-zinc-900/40 p-4 md:flex">
            <p className="px-2 pb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Tutorial do Finync
            </p>
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {productTourSteps.map((item, index) => {
                const ItemIcon = item.icon;
                const isActive = index === activeStep;
                const isDone = index < activeStep;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-100"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center",
                        isActive && "text-emerald-400",
                        isDone && "text-emerald-500/70",
                      )}
                    >
                      {isDone ? (
                        <Check className="size-3.5" />
                      ) : (
                        <ItemIcon className="size-4" />
                      )}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800/80">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={false}
                  animate={{ width: progress + "%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {activeStep + 1}/{productTourSteps.length}
              </span>
              <button
                type="button"
                onClick={skipTour}
                disabled={isSaving}
                aria-label="Fechar tutorial"
                className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-8 sm:py-8">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * slideOffset }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -slideOffset }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                      <StepIcon className="size-5" />
                    </span>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">
                      {step.section}
                    </p>
                  </div>

                  <DialogTitle className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                    {step.title}
                  </DialogTitle>
                  <DialogDescription
                    id="product-tour-summary"
                    className="mt-2 max-w-xl text-sm leading-6 text-zinc-400"
                  >
                    {step.summary}
                  </DialogDescription>

                  <ul className="mt-6 grid gap-2.5">
                    {step.features.map((feature) => {
                      const FeatureIcon = feature.icon;
                      const content = (
                        <>
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-300">
                            <FeatureIcon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-zinc-100">
                              {feature.title}
                            </span>
                            <span className="mt-0.5 block text-[13px] leading-5 text-zinc-500">
                              {feature.description}
                            </span>
                          </span>
                          {feature.href && (
                            <ArrowRight className="mt-2 size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                          )}
                        </>
                      );

                      return (
                        <li key={feature.title}>
                          {feature.href ? (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                void finishTour(
                                  "Tutorial concluído. Bem-vindo ao Finync!",
                                  feature.href,
                                )
                              }
                              className="group flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3.5 text-left transition-colors hover:border-emerald-500/20 hover:bg-zinc-900/80"
                            >
                              {content}
                            </button>
                          ) : (
                            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3.5">
                              {content}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {step.tip && (
                    <p className="mt-5 border-l-2 border-emerald-500/40 pl-3 text-[13px] leading-5 text-zinc-400">
                      {step.tip}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4 sm:px-8">
              {isLastStep ? (
                <span />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={skipTour}
                  className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-200"
                >
                  Pular tutorial
                </Button>
              )}
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => goToStep(activeStep - 1)}
                    className="h-10 border-zinc-800 bg-zinc-950 px-3"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleNext}
                  className="h-10 bg-emerald-600 px-4 text-on-color hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Salvando
                    </>
                  ) : isLastStep ? (
                    <>
                      Começar a usar
                      <Check className="size-4" />
                    </>
                  ) : (
                    <>
                      {isFirstStep ? "Começar tour" : "Próximo"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
