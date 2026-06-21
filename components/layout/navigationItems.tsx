import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileUp,
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
    label: "Importar Faturas",
    shortLabel: "Importar",
    href: "/dashboard/importar",
    icon: FileUp,
  },
  {
    label: "Analytics",
    shortLabel: "Dados",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    label: "Contas Fixas",
    shortLabel: "Fixas",
    href: "/dashboard/fixed",
    icon: CalendarDays,
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
    href: "/configuracoes",
    icon: Settings,
  },
];
