"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, CalendarRange, Info, Send } from "lucide-react";
import { toast } from "sonner";

import {
  OptionGroup,
  OptionRow,
  accentSwitchClassName,
} from "@/components/modals/ModalKit";
import { deliverReminder } from "@/components/notifications/ReminderRunner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getNotificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from "@/lib/browserNotifications";
import { REMINDER_DAYS_AHEAD } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/useFinanceStore";

import { SettingsPanel, settingsSecondaryButtonClassName } from "./SettingsPanel";
import { usePreferenceUpdater } from "./usePreferenceUpdater";

const permissionCopy: Record<NotificationSupport, { label: string; text: string; tone: string }> = {
  granted: {
    label: "Notificações do navegador ativas",
    text: "Os avisos aparecem como notificação do sistema.",
    tone: "bg-emerald-400/10 text-emerald-200",
  },
  default: {
    label: "Notificações do navegador desligadas",
    text: "Sem permissão, os avisos aparecem dentro do Finync.",
    tone: "bg-white/[0.04] text-zinc-300",
  },
  denied: {
    label: "Notificações bloqueadas no navegador",
    text: "Os avisos aparecem dentro do Finync. Para receber no sistema, libere as notificações nas configurações do site.",
    tone: "bg-amber-400/10 text-amber-200",
  },
  unsupported: {
    label: "Navegador sem notificações",
    text: "Os avisos aparecem dentro do Finync.",
    tone: "bg-white/[0.04] text-zinc-300",
  },
};

export function NotificationSettings() {
  const router = useRouter();
  const invoiceReminder = useFinanceStore((state) => state.invoiceReminder);
  const weeklySummary = useFinanceStore((state) => state.weeklySummary);
  const { update, isSaving } = usePreferenceUpdater();
  const [support, setSupport] = useState<NotificationSupport>(getNotificationSupport);
  const permission = permissionCopy[support];

  async function askPermission() {
    const result = await requestNotificationPermission();
    setSupport(result);
    return result;
  }

  async function handleToggle(
    key: "invoiceReminder" | "weeklySummary",
    checked: boolean,
  ) {
    // Turning a reminder on is the natural moment to ask for permission;
    // a refusal still keeps the in-app version working.
    if (checked && support === "default") await askPermission();
    await update({ [key]: checked });
  }

  function sendTest() {
    deliverReminder(
      "Lembretes do Finync ativos",
      "É assim que você vai ver os avisos de vencimento.",
      "finync-test",
      router.push,
    );
    if (support !== "granted") toast.message("Teste enviado aqui no app.");
  }

  return (
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <SettingsPanel
        id="settings-reminders"
        icon={BellRing}
        title="Lembretes"
        description="O Finync confere seus vencimentos sempre que você abre o app."
        footer={
          <Button
            type="button"
            variant="ghost"
            onClick={sendTest}
            className={settingsSecondaryButtonClassName}
          >
            <Send className="size-4" />
            Enviar teste
          </Button>
        }
      >
        <OptionGroup>
          <OptionRow
            id="invoice-reminder"
            icon={CalendarClock}
            title="Vencimentos de faturas e contas"
            description={`Avisa ${REMINDER_DAYS_AHEAD} dias antes, no dia e enquanto estiver vencido. Uma vez por dia.`}
            control={
              <Switch
                id="invoice-reminder"
                checked={invoiceReminder}
                disabled={isSaving}
                className={accentSwitchClassName("emerald")}
                onCheckedChange={(checked) => void handleToggle("invoiceReminder", checked)}
              />
            }
          />
          <OptionRow
            id="weekly-summary"
            icon={CalendarRange}
            title="Resumo da semana"
            description="No primeiro acesso da semana: quantas contas vencem nos próximos 7 dias e o total."
            control={
              <Switch
                id="weekly-summary"
                checked={weeklySummary}
                disabled={isSaving}
                className={accentSwitchClassName("emerald")}
                onCheckedChange={(checked) => void handleToggle("weeklySummary", checked)}
              />
            }
          />
        </OptionGroup>
      </SettingsPanel>

      <SettingsPanel
        id="settings-notification-permission"
        icon={Info}
        title="Onde os avisos aparecem"
      >
        <div className={cn("rounded-xl px-3.5 py-3", permission.tone)}>
          <p className="text-sm font-medium">{permission.label}</p>
          <p className="mt-0.5 text-xs leading-5 opacity-80">{permission.text}</p>
        </div>
        {support === "default" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void askPermission()}
            className={cn(settingsSecondaryButtonClassName, "mt-3 w-full")}
          >
            Permitir notificações
          </Button>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Os lembretes são gerados no seu aparelho enquanto o Finync está aberto.
          Se você ocultou os valores, eles não aparecem nas notificações.
        </p>
      </SettingsPanel>
    </div>
  );
}
