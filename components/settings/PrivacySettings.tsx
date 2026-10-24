"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, HardDriveDownload, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { SettingsPanel } from "./SettingsPanel";

const documents = [
  {
    href: "/privacidade",
    icon: ShieldCheck,
    title: "Política de privacidade",
    text: "Quais dados guardamos, para quê e seus direitos pela LGPD.",
  },
  {
    href: "/termos",
    icon: FileText,
    title: "Termos de uso",
    text: "As regras de uso do Finync e as responsabilidades de cada lado.",
  },
];

export function PrivacySettings() {
  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
      <SettingsPanel
        id="settings-export"
        icon={HardDriveDownload}
        title="Seus dados"
        description="Baixe uma cópia completa a qualquer momento, em JSON ou planilha."
      >
        <Link
          href="/dashboard/exportar"
          className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-zinc-100 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.06]"
        >
          Exportar e fazer backup
          <ArrowUpRight className="size-4 text-zinc-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-200" />
        </Link>
      </SettingsPanel>

      <SettingsPanel
        id="settings-documents"
        icon={ShieldCheck}
        title="Privacidade e termos"
        description="Seus dados não são vendidos nem compartilhados para publicidade."
      >
        <ul className="grid gap-2">
          {documents.map((document) => {
            const Icon = document.icon;
            return (
              <li key={document.href}>
                <Link
                  href={document.href}
                  target="_blank"
                  className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-100">{document.title}</span>
                    <span className="block text-xs leading-5 text-zinc-500">{document.text}</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-zinc-600 group-hover:text-zinc-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      </SettingsPanel>

      <SettingsPanel
        id="settings-delete"
        icon={Trash2}
        tone="danger"
        title="Excluir conta"
        description="Apaga sua conta e todos os dados financeiros de forma permanente. Faça um backup antes, se quiser guardar o histórico."
        className="lg:col-span-2"
        action={
          <DeleteAccountDialog>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-xl bg-rose-500/10 px-4 font-medium text-rose-300 ring-1 ring-inset ring-rose-500/25 hover:bg-rose-500/20 hover:text-rose-200"
            >
              <Trash2 className="size-4" />
              <span className="max-sm:hidden">Excluir minha conta</span>
              <span className="sm:hidden">Excluir</span>
            </Button>
          </DeleteAccountDialog>
        }
      />
    </div>
  );
}
