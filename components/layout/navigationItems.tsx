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
    label: "Visão Geral",
    shortLabel: "Geral",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Transações",
    shortLabel: "Transações",
    href: "/dashboard/transactions",
    icon: Receipt,
  },
  {
    label: "Cartões",
    shortLabel: "Cartões",
    href: "/dashboard/cards",
    icon: CreditCard,
  },
  {
    label: "Configurações",
    shortLabel: "Config.",
    href: "/dashboard/settings",
    icon: Settings,
  },
];
