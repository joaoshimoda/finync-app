"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

import { getCardGradientClassName } from "@/components/dashboard/CardsSection";
import { dashboardEase } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export type CardFlightRequest = {
  id: number;
  card: { id: string; name: string; color?: string };
  from: DOMRect;
};

type Box = { left: number; top: number; width: number; height: number };

function toBox(rect: DOMRect): Box {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function isOnScreen(box: Box) {
  return box.top >= 0 && box.top + box.height <= window.innerHeight;
}

/* A copy of the selected wallet card flies to the card thumbnail in the
   invoice panel (`[data-card-flight-target]`), then hands over to it. It is
   skipped when the target is off screen or reduced motion is on. */
export function CardFlight({
  flight,
  onLand,
}: {
  flight: CardFlightRequest;
  onLand: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [target, setTarget] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-card-flight-target="${flight.card.id}"]`,
      );
      const box = element ? toBox(element.getBoundingClientRect()) : null;

      if (reduceMotion || !box || !isOnScreen(box) || !isOnScreen(toBox(flight.from))) {
        onLand();
        return;
      }

      setTarget(box);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flight, onLand, reduceMotion]);

  if (!target) return null;

  const from = toBox(flight.from);

  return createPortal(
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none fixed left-0 top-0 z-50 overflow-hidden shadow-2xl shadow-black/40",
        getCardGradientClassName(flight.card.name, flight.card.color),
      )}
      initial={{
        x: from.left,
        y: from.top,
        width: from.width,
        height: from.height,
        borderRadius: 16,
        opacity: 1,
      }}
      animate={{
        x: target.left,
        y: target.top,
        width: target.width,
        height: target.height,
        borderRadius: 6,
        opacity: [1, 1, 0.9],
      }}
      transition={{ duration: 0.55, ease: dashboardEase }}
      onAnimationComplete={onLand}
    >
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,transparent_42%)]" />
    </motion.div>,
    document.body,
  );
}
