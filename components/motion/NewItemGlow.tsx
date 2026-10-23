"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  getRecentlyAddedVersion,
  isRecentlyAdded,
  subscribeToRecentlyAdded,
} from "@/lib/recentlyAdded";
import { cn } from "@/lib/utils";

export function useIsRecentlyAdded(id: string) {
  useSyncExternalStore(
    subscribeToRecentlyAdded,
    getRecentlyAddedVersion,
    () => 0,
  );
  return isRecentlyAdded(id);
}

/* A brief glow over a list row that was just saved. Place it inside a
   `relative` row; with `reveal` the row is also scrolled into view. */
export function NewItemGlow({
  id,
  reveal = false,
  className,
}: {
  id: string;
  reveal?: boolean;
  className?: string;
}) {
  const isNew = useIsRecentlyAdded(id);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isNew || !reveal) return;
    ref.current?.parentElement?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [isNew, reveal]);

  return (
    <AnimatePresence>
      {isNew ? (
        <motion.span
          ref={ref}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.2, times: [0, 0.12, 0.6, 1], ease: "easeOut" }}
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] bg-emerald-400/[0.12] ring-1 ring-inset ring-emerald-400/50",
            className,
          )}
        />
      ) : null}
    </AnimatePresence>
  );
}
