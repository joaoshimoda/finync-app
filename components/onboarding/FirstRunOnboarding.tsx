"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  PRODUCT_TOUR_EVENT,
  productTourSteps,
} from "@/components/onboarding/tourSteps";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type TargetSnapshot = {
  step: number;
  rect: TargetRect;
};

const focusPadding = 7;
const coachmarkWidth = 360;
const coachmarkEstimatedHeight = 230;

function findVisibleTarget(target: string) {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-tour="' + target + '"]'),
  );

  return elements.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

function toTargetRect(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function closeOpenPreviewModal() {
  const modal = document.querySelector<HTMLElement>(
    "[data-tour-preview-modal]",
  );

  if (!modal) return;

  const closeButton = modal.querySelector<HTMLElement>(
    '[data-slot="dialog-close"]',
  );
  const cancelButton = Array.from(
    modal.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent?.trim() === "Cancelar");

  if (closeButton) {
    closeButton.click();
    return;
  }

  cancelButton?.click();
}

export function FirstRunOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const authUser = useFinanceStore((state) => state.authUser);
  const updateAuthUser = useFinanceStore((state) => state.updateAuthUser);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [targetSnapshot, setTargetSnapshot] = useState<TargetSnapshot | null>(
    null,
  );
  const automaticOpen = authUser?.user_metadata?.onboarding_completed === false;
  const isOpen = automaticOpen || manualOpen;
  const step = productTourSteps[activeStep];
  const isLastStep = activeStep === productTourSteps.length - 1;
  const currentTargetRect =
    targetSnapshot?.step === activeStep ? targetSnapshot.rect : null;

  useEffect(() => {
    function startTour() {
      setActiveStep(0);
      setManualOpen(true);
    }

    window.addEventListener(PRODUCT_TOUR_EVENT, startTour);

    return () => window.removeEventListener(PRODUCT_TOUR_EVENT, startTour);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const nextRoute = productTourSteps[activeStep + 1]?.route;

    if (nextRoute && nextRoute !== pathname) {
      router.prefetch(nextRoute);
    }
  }, [activeStep, isOpen, pathname, router]);

  useEffect(() => {
    if (!isOpen) return;

    if (step.route && pathname !== step.route) {
      router.push(step.route);
      return;
    }

    if (!step.target) return;

    let attempts = 0;
    let locateFrame = 0;
    let positionFrame = 0;
    let targetElement: HTMLElement | undefined;
    let resizeObserver: ResizeObserver | undefined;

    function updatePosition() {
      if (!targetElement) return;
      setTargetSnapshot({
        step: activeStep,
        rect: toTargetRect(targetElement),
      });
    }

    function schedulePositionUpdate() {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(updatePosition);
    }

    function locateTarget() {
      targetElement = findVisibleTarget(step.target as string);

      if (!targetElement && attempts < 120) {
        attempts += 1;
        locateFrame = window.requestAnimationFrame(locateTarget);
        return;
      }

      if (!targetElement) return;

      targetElement.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "center",
      });
      updatePosition();
      resizeObserver = new ResizeObserver(schedulePositionUpdate);
      resizeObserver.observe(targetElement);
      window.addEventListener("resize", schedulePositionUpdate);
      window.addEventListener("scroll", schedulePositionUpdate, true);
    }

    locateFrame = window.requestAnimationFrame(locateTarget);

    return () => {
      window.cancelAnimationFrame(locateFrame);
      window.cancelAnimationFrame(positionFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [activeStep, isOpen, pathname, router, step.route, step.target]);

  const focusRect = useMemo(() => {
    if (!currentTargetRect || typeof window === "undefined") return null;

    const left = Math.max(currentTargetRect.left - focusPadding, 0);
    const top = Math.max(currentTargetRect.top - focusPadding, 0);
    const right = Math.min(
      currentTargetRect.right + focusPadding,
      window.innerWidth,
    );
    const bottom = Math.min(
      currentTargetRect.bottom + focusPadding,
      window.innerHeight,
    );

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }, [currentTargetRect]);

  const coachmarkStyle = useMemo<CSSProperties>(() => {
    if (!focusRect || typeof window === "undefined") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(400px, calc(100vw - 24px))",
      };
    }

    const width = Math.min(coachmarkWidth, window.innerWidth - 24);

    if (step.previewEvent) {
      const compactWidth = Math.min(320, window.innerWidth - 24);
      const spaceOnRight = window.innerWidth - focusRect.right - 16;
      const spaceOnLeft = focusRect.left - 16;
      const top = Math.min(
        Math.max(focusRect.top, 12),
        window.innerHeight - coachmarkEstimatedHeight - 12,
      );

      if (spaceOnRight >= compactWidth) {
        return { left: focusRect.right + 16, top, width: compactWidth };
      }

      if (spaceOnLeft >= compactWidth) {
        return {
          left: focusRect.left - compactWidth - 16,
          top,
          width: compactWidth,
        };
      }

      return {
        bottom: 12,
        left: 12,
        width: Math.min(400, window.innerWidth - 24),
      };
    }

    const centeredLeft = focusRect.left + focusRect.width / 2 - width / 2;
    const left = Math.min(
      Math.max(centeredLeft, 12),
      window.innerWidth - width - 12,
    );
    const hasSpaceBelow =
      window.innerHeight - focusRect.bottom > coachmarkEstimatedHeight + 16;
    const top = hasSpaceBelow
      ? focusRect.bottom + 14
      : Math.max(12, focusRect.top - coachmarkEstimatedHeight - 14);

    return {
      left,
      top,
      width,
    };
  }, [focusRect, step.previewEvent]);

  const saveCompletion = useCallback(
    async (message: string) => {
      if (!automaticOpen) {
        closeOpenPreviewModal();
        setManualOpen(false);
        setActiveStep(0);
        router.push("/dashboard");
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
        closeOpenPreviewModal();
        setActiveStep(0);
        toast.success(message);
        router.push("/dashboard");
      } catch (error) {
        console.error("Erro ao concluir onboarding:", error);
        toast.error("Não foi possível salvar o progresso do tutorial.");
      } finally {
        setIsSaving(false);
      }
    },
    [authUser, automaticOpen, router, updateAuthUser],
  );

  function goToStep(nextStep: number) {
    const nextStepIndex = Math.min(
      Math.max(nextStep, 0),
      productTourSteps.length - 1,
    );
    const nextTourStep = productTourSteps[nextStepIndex];

    closeOpenPreviewModal();

    if (nextTourStep.previewEvent) {
      window.dispatchEvent(new Event(nextTourStep.previewEvent));
      window.requestAnimationFrame(() => setActiveStep(nextStepIndex));
      return;
    }

    setActiveStep(nextStepIndex);
  }

  function handleNext() {
    if (isLastStep) {
      void saveCompletion("Tutorial concluído. Bem-vindo ao Finync!");
      return;
    }

    goToStep(activeStep + 1);
  }

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial guiado do Finync"
      >
        {focusRect ? (
          <>
            <div
              className="pointer-events-auto fixed inset-x-0 top-0 bg-black/80"
              style={{ height: focusRect.top }}
            />
            <div
              className="pointer-events-auto fixed left-0 bg-black/80"
              style={{
                top: focusRect.top,
                width: focusRect.left,
                height: focusRect.height,
              }}
            />
            <div
              className="pointer-events-auto fixed right-0 bg-black/80"
              style={{
                top: focusRect.top,
                width: window.innerWidth - focusRect.right,
                height: focusRect.height,
              }}
            />
            <div
              className="pointer-events-auto fixed inset-x-0 bottom-0 bg-black/80"
              style={{ top: focusRect.bottom }}
            />
            <motion.div
              key={"focus-" + step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="pointer-events-auto fixed rounded-xl border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.16),0_0_32px_rgba(16,185,129,0.28)]"
              style={{
                left: focusRect.left,
                top: focusRect.top,
                width: focusRect.width,
                height: focusRect.height,
              }}
            />
          </>
        ) : (
          <div className="pointer-events-auto fixed inset-0 bg-black/80" />
        )}

        <AnimatePresence mode="wait">
          {(!step.target || focusRect) && (
            <motion.section
              key={step.id}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
              className="pointer-events-auto fixed overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/60"
              style={coachmarkStyle}
            >
              <div className="h-1 bg-zinc-900">
                <motion.div
                  className="h-full bg-emerald-500"
                  animate={{
                    width:
                      ((activeStep + 1) / productTourSteps.length) * 100 + "%",
                  }}
                  transition={{ duration: 0.12 }}
                />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase text-emerald-400">
                      {step.eyebrow}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
                      {step.title}
                    </h2>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    {isLastStep ? (
                      <Check className="size-4" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {step.description}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600">
                    {activeStep + 1} de {productTourSteps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() =>
                        void saveCompletion(
                          "Tutorial pulado. Você pode refazê-lo no Guia do Usuário.",
                        )
                      }
                      className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-200"
                    >
                      Pular
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={activeStep === 0 || isSaving}
                      onClick={() => goToStep(activeStep - 1)}
                      className="size-9 border-zinc-800 bg-zinc-950"
                      aria-label="Voltar etapa"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      disabled={isSaving}
                      onClick={handleNext}
                      className="h-9 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Salvando
                        </>
                      ) : isLastStep ? (
                        "Concluir"
                      ) : (
                        <>
                          {step.nextLabel ?? "Próximo"}
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
