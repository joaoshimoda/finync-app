import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileUp,
  CircleHelp,
  LayoutDashboard,
  Receipt,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  tourId?: string;
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
    tourId: "nav-transactions",
  },
  {
    label: "Importar Faturas",
    shortLabel: "Importar",
    href: "/dashboard/importar",
    icon: FileUp,
    tourId: "nav-import",
  },
  {
    label: "Analytics",
    shortLabel: "Dados",
    href: "/dashboard/analytics",
    icon: BarChart3,
    tourId: "nav-analytics",
  },
  {
    label: "Dependentes",
    shortLabel: "Deps.",
    href: "/dashboard/dependentes",
    icon: UsersRound,
    tourId: "nav-dependents",
  },
  {
    label: "Contas Fixas",
    shortLabel: "Fixas",
    href: "/dashboard/fixed",
    icon: CalendarDays,
    tourId: "nav-fixed",
  },
  {
    label: "Cartões",
    shortLabel: "Cartões",
    href: "/dashboard/cards",
    icon: CreditCard,
    tourId: "nav-cards",
  },
  {
    label: "Guia do Usuário",
    shortLabel: "Guia",
    href: "/dashboard/ajuda",
    icon: CircleHelp,
    tourId: "nav-guide",
  },
  {
    label: "Configurações",
    shortLabel: "Config.",
    href: "/configuracoes",
    icon: Settings,
  },
];
