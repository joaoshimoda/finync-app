"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reportAppError } from "@/lib/errorMonitoring";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    void reportAppError(error, {
      source: "REACT",
      severity: "CRITICAL",
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <section className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-zinc-50">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          O erro foi registrado. Tente novamente sem perder sua sessão.
        </p>
        <Button type="button" className="mt-6 h-11 px-5" onClick={retry}>
          <RotateCcw className="size-4" />
          Tentar novamente
        </Button>
      </section>
    </div>
  );
}
