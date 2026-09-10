"use client";

import { useEffect } from "react";

import { reportAppError } from "@/lib/errorMonitoring";

export default function GlobalError({
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
      context: { digest: error.digest, boundary: "global" },
    });
  }, [error]);

  return (
    <html lang="pt-BR" className="dark">
      <body
        style={{
          alignItems: "center",
          background: "#09090b",
          color: "#fafafa",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>
            FINYNC
          </p>
          <h1 style={{ fontSize: 24, margin: "16px 0 8px" }}>
            Algo interrompeu o aplicativo
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
            A falha foi registrada com segurança. Tente carregar novamente.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              background: "#059669",
              border: 0,
              borderRadius: 8,
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 24,
              minHeight: 44,
              padding: "0 20px",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
