"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  /* Seconds; match it to a bar or ring animating alongside. */
  duration?: number;
}

/**
 * Tweens between values by writing straight to the DOM, so the parent page
 * does not re-render on every animation frame.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 0.7,
}: AnimatedNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const formatRef = useRef(format);
  const displayedValueRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    formatRef.current = format;
    if (nodeRef.current) {
      nodeRef.current.textContent = format(displayedValueRef.current);
    }
  }, [format]);

  useEffect(() => {
    const node = nodeRef.current;
    const safeValue = Number.isFinite(value) ? value : 0;
    if (!node) return;

    if (reduceMotion || displayedValueRef.current === safeValue) {
      displayedValueRef.current = safeValue;
      node.textContent = formatRef.current(safeValue);
      return;
    }

    const controls = animate(displayedValueRef.current, safeValue, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        displayedValueRef.current = latest;
        node.textContent = formatRef.current(latest);
      },
    });

    return () => controls.stop();
  }, [duration, reduceMotion, value]);

  return <span ref={nodeRef} className={className} />;
}
