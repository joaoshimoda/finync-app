"use client";

import type { Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabaseClient";

export type AppErrorSource = "CLIENT" | "REACT" | "SUPABASE" | "NETWORK";
export type AppErrorSeverity = "WARNING" | "ERROR" | "CRITICAL";

type ErrorContextValue = string | number | boolean | null | undefined;

interface ReportAppErrorOptions {
  source?: AppErrorSource;
  severity?: AppErrorSeverity;
  route?: string;
  code?: string;
  context?: Record<string, ErrorContextValue>;
}

const recentReports = new Map<string, number>();
const localDeduplicationWindow = 2_000;
const sensitiveKeyPattern = /auth|cookie|email|password|secret|session|token/i;

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[token]")
    .replace(/Bearer\s+\S+/gi, "Bearer [token]")
    .slice(0, maxLength);
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown };

    return {
      message: sanitizeText(error.message || error.name, 1_000),
      code:
        typeof errorWithCode.code === "string"
          ? sanitizeText(errorWithCode.code, 120)
          : undefined,
      stack: error.stack ? sanitizeText(error.stack, 4_000) : undefined,
    };
  }

  if (typeof error === "string") {
    return { message: sanitizeText(error, 1_000) };
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : "Erro inesperado da aplicação";

    return {
      message: sanitizeText(message, 1_000),
      code:
        typeof candidate.code === "string"
          ? sanitizeText(candidate.code, 120)
          : undefined,
    };
  }

  return { message: "Erro inesperado da aplicação" };
}

function sanitizeContext(
  context: ReportAppErrorOptions["context"],
  stack?: string,
): Json {
  const sanitized: Record<string, Json | undefined> = {};

  Object.entries(context ?? {}).forEach(([key, value]) => {
    if (sensitiveKeyPattern.test(key) || value === undefined) return;

    sanitized[key] =
      typeof value === "string" ? sanitizeText(value, 1_000) : value;
  });

  if (stack) sanitized.stack = stack;
  if (typeof navigator !== "undefined") {
    sanitized.browser = sanitizeText(navigator.userAgent, 500);
  }

  return sanitized;
}

function getCurrentRoute(route?: string) {
  if (route) return sanitizeText(route.split("?")[0], 500);
  if (typeof window === "undefined") return undefined;
  return sanitizeText(window.location.pathname, 500);
}

export async function reportAppError(
  error: unknown,
  options: ReportAppErrorOptions = {},
) {
  try {
    const details = getErrorDetails(error);
    const route = getCurrentRoute(options.route);
    const source = options.source ?? "CLIENT";
    const code = options.code ?? details.code;
    const localFingerprint = [source, code, details.message, route].join("|");
    const now = Date.now();

    if (
      now - (recentReports.get(localFingerprint) ?? 0) <
      localDeduplicationWindow
    ) {
      return;
    }

    recentReports.set(localFingerprint, now);

    if (recentReports.size > 100) {
      recentReports.forEach((reportedAt, fingerprint) => {
        if (now - reportedAt > localDeduplicationWindow) {
          recentReports.delete(fingerprint);
        }
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { error: reportError } = await supabase.rpc("finync_report_error", {
      error_message: details.message,
      error_source: source,
      error_severity: options.severity ?? "ERROR",
      error_context: sanitizeContext(options.context, details.stack),
      ...(route ? { error_route: route } : {}),
      ...(code ? { error_code: sanitizeText(code, 120) } : {}),
    });

    if (reportError && process.env.NODE_ENV === "development") {
      console.warn("Falha ao registrar erro no monitoramento:", reportError);
    }
  } catch (monitoringError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Monitoramento indisponível:", monitoringError);
    }
  }
}
