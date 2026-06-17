"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={[
      "inline-flex h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.045] p-1 text-zinc-400 backdrop-blur-xl",
      className,
    ].join(" ")}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={[
      "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-brand-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-[0_0_22px_rgba(16,185,129,0.16)]",
      "data-[state=inactive]:hover:bg-white/[0.055] data-[state=inactive]:hover:text-white",
      className,
    ].join(" ")}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className = "", ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={[
      "mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.045] p-6 text-zinc-300 shadow-xl shadow-black/10 outline-none backdrop-blur-xl",
      "focus-visible:ring-2 focus-visible:ring-brand-500/40",
      className,
    ].join(" ")}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
