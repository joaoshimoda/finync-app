"use client";

import { CalendarDays, Coins, EyeOff, Globe2 } from "lucide-react";

import {
  Field,
  OptionGroup,
  OptionRow,
  accentSwitchClassName,
  selectTriggerClassName,
} from "@/components/modals/ModalKit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useFinanceStore,
  type DefaultCurrency,
  type UserDateFormat,
} from "@/store/useFinanceStore";

import { AppearanceCard } from "./AppearanceCard";
import { CategoryManager } from "./CategoryManager";
import { SettingsPanel } from "./SettingsPanel";
import { usePreferenceUpdater } from "./usePreferenceUpdater";

export function PreferenceSettings() {
  const defaultCurrency = useFinanceStore((state) => state.defaultCurrency);
  const dateFormat = useFinanceStore((state) => state.dateFormat);
  const hideBalancesByDefault = useFinanceStore((state) => state.hideBalancesByDefault);
  const { update, isSaving } = usePreferenceUpdater();

  return (
    <div className="grid gap-5 sm:gap-6">
      <AppearanceCard />

      <SettingsPanel
        id="settings-regional"
        icon={Globe2}
        title="Valores e datas"
        description="Vale para todas as telas, relatórios e exportações. Valores não são convertidos entre moedas."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Moeda" icon={Coins}>
            <Select
              value={defaultCurrency}
              disabled={isSaving}
              onValueChange={(value) =>
                void update({ defaultCurrency: value as DefaultCurrency })
              }
            >
              <SelectTrigger aria-label="Moeda" className={selectTriggerClassName("emerald")}>
                <SelectValue placeholder="Selecione a moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">R$ · Real brasileiro</SelectItem>
                <SelectItem value="USD">US$ · Dólar americano</SelectItem>
                <SelectItem value="EUR">€ · Euro</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Formato de data" icon={CalendarDays}>
            <Select
              value={dateFormat}
              disabled={isSaving}
              onValueChange={(value) =>
                void update({ dateFormat: value as UserDateFormat })
              }
            >
              <SelectTrigger aria-label="Formato de data" className={selectTriggerClassName("emerald")}>
                <SelectValue placeholder="Selecione o formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/AAAA">DD/MM/AAAA · 24/10/2026</SelectItem>
                <SelectItem value="MM/DD/AAAA">MM/DD/AAAA · 10/24/2026</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-4">
          <OptionGroup>
            <OptionRow
              id="hide-balances"
              icon={EyeOff}
              title="Ocultar valores"
              description="Esconde saldos e valores nas telas e nas notificações. Bom para usar em público."
              control={
                <Switch
                  id="hide-balances"
                  checked={hideBalancesByDefault}
                  disabled={isSaving}
                  className={accentSwitchClassName("emerald")}
                  onCheckedChange={(checked) =>
                    void update({ hideBalancesByDefault: checked })
                  }
                />
              }
            />
          </OptionGroup>
        </div>
      </SettingsPanel>

      <CategoryManager />
    </div>
  );
}
