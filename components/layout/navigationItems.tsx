import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  FileDown,
  FileUp,
  CircleHelp,
  Gauge,
  LayoutDashboard,
  Receipt,
  Settings,
  ShieldCheck,
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
    label: "Orçamentos",
    shortLabel: "Limites",
    href: "/dashboard/orcamentos",
    icon: Gauge,
    tourId: "nav-budgets",
  },
  {
    label: "Importar Faturas",
    shortLabel: "Importar",
    href: "/dashboard/importar",
    icon: FileUp,
    tourId: "nav-import",
  },
  {
    label: "Exportar e Backup",
    shortLabel: "Backup",
    href: "/dashboard/exportar",
    icon: FileDown,
    tourId: "nav-export",
  },
  {
    label: "Analytics",
    shortLabel: "Dados",
    href: "/dashboard/analytics",
    icon: BarChart3,
    tourId: "nav-analytics",
  },
  {
    label: "Integridade",
    shortLabel: "Saúde",
    href: "/dashboard/integridade",
    icon: ShieldCheck,
    tourId: "nav-integrity",
  },
  {
    label: "Atividades",
    shortLabel: "Histórico",
    href: "/dashboard/atividades",
    icon: Activity,
    tourId: "nav-activity",
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
