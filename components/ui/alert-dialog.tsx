"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;
const AlertDialogAction = AlertDialogPrimitive.Action;

const AlertDialogOverlay = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className = "", ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={[
      "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      className,
    ].join(" ")}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className = "", ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={[
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
        "overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-white shadow-xl shadow-black/40 outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        className,
      ].join(" ")}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div className={["space-y-2 p-6 text-left", className].join(" ")} {...props} />
);

const AlertDialogFooter = ({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div
    className={[
      "flex flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-900/45 p-4 sm:flex-row sm:justify-end",
      className,
    ].join(" ")}
    {...props}
  />
);

const AlertDialogTitle = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className = "", ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={["text-lg font-semibold tracking-tight text-white", className].join(" ")}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className = "", ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={["text-sm leading-6 text-zinc-400", className].join(" ")}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
