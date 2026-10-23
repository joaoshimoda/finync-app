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
  section: NavigationSectionKey;
  tourId?: string;
}

export type NavigationSectionKey =
  "overview" | "planning" | "tools" | "support";

export const navigationSections: Array<{
  key: NavigationSectionKey;
  label: string;
}> = [
  { key: "overview", label: "Principal" },
  { key: "planning", label: "Finanças" },
  { key: "tools", label: "Ferramentas" },
  { key: "support", label: "Ajuda" },
];

export const navigationItems: NavigationItem[] = [
  {
    label: "Visão Geral",
    shortLabel: "Geral",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "overview",
  },
  {
    label: "Transações",
    shortLabel: "Transações",
    href: "/dashboard/transactions",
    icon: Receipt,
    section: "overview",
    tourId: "nav-transactions",
  },
  {
    label: "Análises",
    shortLabel: "Dados",
    href: "/dashboard/analytics",
    icon: BarChart3,
    section: "overview",
    tourId: "nav-analytics",
  },
  {
    label: "Cartões",
    shortLabel: "Cartões",
    href: "/dashboard/cards",
    icon: CreditCard,
    section: "planning",
    tourId: "nav-cards",
  },
  {
    label: "Contas Fixas",
    shortLabel: "Fixas",
    href: "/dashboard/fixed",
    icon: CalendarDays,
    section: "planning",
    tourId: "nav-fixed",
  },
  {
    label: "Orçamentos",
    shortLabel: "Limites",
    href: "/dashboard/orcamentos",
    icon: Gauge,
    section: "planning",
    tourId: "nav-budgets",
  },
  {
    label: "Dependentes",
    shortLabel: "Deps.",
    href: "/dashboard/dependentes",
    icon: UsersRound,
    section: "planning",
    tourId: "nav-dependents",
  },
  {
    label: "Importar Faturas",
    shortLabel: "Importar",
    href: "/dashboard/importar",
    icon: FileUp,
    section: "tools",
    tourId: "nav-import",
  },
  {
    label: "Exportar e Backup",
    shortLabel: "Backup",
    href: "/dashboard/exportar",
    icon: FileDown,
    section: "tools",
    tourId: "nav-export",
  },
  {
    label: "Integridade",
    shortLabel: "Saúde",
    href: "/dashboard/integridade",
    icon: ShieldCheck,
    section: "tools",
    tourId: "nav-integrity",
  },
  {
    label: "Atividades",
    shortLabel: "Histórico",
    href: "/dashboard/atividades",
    icon: Activity,
    section: "tools",
    tourId: "nav-activity",
  },
  {
    label: "Guia do Usuário",
    shortLabel: "Guia",
    href: "/dashboard/ajuda",
    icon: CircleHelp,
    section: "support",
    tourId: "nav-guide",
  },
  {
    label: "Configurações",
    shortLabel: "Config.",
    href: "/configuracoes",
    icon: Settings,
    section: "support",
  },
];
