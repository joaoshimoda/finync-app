import { reportAppError } from "@/lib/errorMonitoring";

try {
  window.addEventListener("error", (event) => {
    void reportAppError(event.error ?? event.message, {
      source: "CLIENT",
      context: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportAppError(event.reason, {
      source: "CLIENT",
      context: { event: "unhandledrejection" },
    });
  });
} catch {
  // Monitoring must never prevent the application from starting.
}
