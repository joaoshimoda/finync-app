import {
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  {
    label: "Visao Geral",
    shortLabel: "Geral",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Transacoes",
    shortLabel: "Transacoes",
    href: "/dashboard/transactions",
    icon: Receipt,
  },
  {
    label: "Cartoes",
    shortLabel: "Cartoes",
    href: "/dashboard/cards",
    icon: CreditCard,
  },
  {
    label: "Configuracoes",
    shortLabel: "Config",
    href: "/dashboard/settings",
    icon: Settings,
  },
];
