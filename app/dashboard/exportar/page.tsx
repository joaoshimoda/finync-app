"use client";

import { useState } from "react";
import {
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  LockKeyhole,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildTransactionsCsv,
  getBackupCounts,
  getBackupFilename,
  parseFinyncBackup,
} from "@/lib/backupExport";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";

type ExportFormat = "json" | "csv";

type LastExport = {
  format: ExportFormat;
  generatedAt: Date;
  transactions: number;
  records: number;
};

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ExportarPage() {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [lastExport, setLastExport] = useState<LastExport | null>(null);

  async function handleExport(format: ExportFormat) {
    setExportingFormat(format);

    try {
      const { data, error } = await supabase.rpc("finync_export_backup");

      if (error) throw error;

      const backup = data ? parseFinyncBackup(data) : null;
      if (!backup) throw new Error("Formato de backup inválido.");

      const generatedAt = new Date();
      if (format === "json") {
        downloadFile(
          JSON.stringify(backup, null, 2),
          getBackupFilename("json", generatedAt),
          "application/json;charset=utf-8",
        );
      } else {
        downloadFile(
          buildTransactionsCsv(backup),
          getBackupFilename("csv", generatedAt),
          "text/csv;charset=utf-8",
        );
      }

      const counts = getBackupCounts(backup);
      setLastExport({
        format,
        generatedAt,
        transactions: counts.transactions,
        records: Object.values(counts).reduce((total, count) => total + count, 0),
      });
      toast.success(format === "json" ? "Backup completo exportado." : "Extrato CSV exportado.");
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Exportar dados" },
      });
      toast.error("Não foi possível exportar seus dados.");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8" data-tour="export-dashboard">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
          Portabilidade
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
          Exportação e Backup
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Baixe uma cópia dos seus dados financeiros. Os arquivos são gerados sob
          demanda e permanecem somente no seu dispositivo.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-zinc-800 bg-zinc-950 shadow-none">
          <CardHeader className="border-b border-zinc-800/80 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileJson className="size-5" />
              </span>
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                Recomendado
              </Badge>
            </div>
            <CardTitle className="pt-4 text-lg text-zinc-50">Backup completo</CardTitle>
            <p className="text-sm leading-6 text-zinc-400">
              Arquivo JSON estruturado com cadastros, movimentações, faturas,
              pagamentos, orçamentos e histórico de alterações.
            </p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <ul className="mb-6 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" />Preserva vínculos e IDs</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" />Inclui todo o histórico</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" />Formato versionado</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" />Sem senha ou token</li>
            </ul>
            <Button
              type="button"
              className="h-12 w-full bg-emerald-600 px-5 font-medium text-white hover:bg-emerald-700"
              onClick={() => void handleExport("json")}
              disabled={exportingFormat !== null}
            >
              <Download className="size-4" />
              {exportingFormat === "json" ? "Gerando backup..." : "Baixar backup JSON"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-800 bg-zinc-950 shadow-none">
          <CardHeader className="border-b border-zinc-800/80 p-5 sm:p-6">
            <span className="flex size-11 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
              <FileSpreadsheet className="size-5" />
            </span>
            <CardTitle className="pt-4 text-lg text-zinc-50">Extrato de transações</CardTitle>
            <p className="text-sm leading-6 text-zinc-400">
              Planilha CSV com todas as movimentações, competências, categorias,
              cartões, parcelas e dependentes.
            </p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <ul className="mb-6 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <li className="flex items-center gap-2"><Check className="size-4 text-zinc-500" />Compatível com Excel</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-zinc-500" />Valores em PT-BR</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-zinc-500" />Uma linha por lançamento</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-zinc-500" />Proteção contra fórmulas</li>
            </ul>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full border-zinc-700 bg-zinc-950 px-5 font-medium text-zinc-100 hover:bg-zinc-900"
              onClick={() => void handleExport("csv")}
              disabled={exportingFormat !== null}
            >
              <Download className="size-4" />
              {exportingFormat === "csv" ? "Gerando extrato..." : "Baixar extrato CSV"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-xl border-zinc-800/80 bg-zinc-950/70 shadow-none">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
            {[
              { icon: Database, title: "Snapshot único", description: "Todos os dados são lidos no mesmo instante." },
              { icon: LockKeyhole, title: "Isolamento por usuário", description: "A exportação respeita sua sessão e o RLS." },
              { icon: History, title: "Histórico incluído", description: "Alterações registradas também entram no JSON." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 sm:block">
                  <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500 sm:mb-3" />
                  <div>
                    <h2 className="text-sm font-medium text-zinc-200">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-800/80 bg-zinc-950/70 shadow-none">
          <CardContent className="flex h-full items-center gap-4 p-5 sm:p-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
              <WalletCards className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Última exportação</p>
              {lastExport ? (
                <>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {lastExport.format.toUpperCase()} · {lastExport.records} registros
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {lastExport.transactions} transações às {lastExport.generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">Nenhum arquivo gerado nesta sessão.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
