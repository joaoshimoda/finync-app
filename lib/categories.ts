export type CategoryKind = "expense" | "income";

export const ESSENTIAL_CATEGORY_LABELS = [
  "Outros",
  "Crédito/Estorno",
] as const;

export function isEssentialCategory(label: string) {
  const normalizedLabel = label.trim().toLocaleLowerCase("pt-BR");

  return ESSENTIAL_CATEGORY_LABELS.some(
    (essentialLabel) =>
      essentialLabel.toLocaleLowerCase("pt-BR") === normalizedLabel,
  );
}

export const DEFAULT_CATEGORIES = [
  { label: "Alimentação", kind: "expense" as const, icon: "Utensils" },
  { label: "Transporte", kind: "expense" as const, icon: "Car" },
  { label: "Moradia", kind: "expense" as const, icon: "House" },
  { label: "Lazer", kind: "expense" as const, icon: "Gamepad2" },
  { label: "Saúde", kind: "expense" as const, icon: "HeartPulse" },
  { label: "Educação", kind: "expense" as const, icon: "GraduationCap" },
  { label: "Outros", kind: "expense" as const, icon: "Tag" },
  {
    label: "Crédito/Estorno",
    kind: "income" as const,
    icon: "RefreshCcw",
  },
  { label: "Receita", kind: "income" as const, icon: "Landmark" },
  { label: "Salário", kind: "income" as const, icon: "BriefcaseBusiness" },
  { label: "Freelance", kind: "income" as const, icon: "Laptop" },
  { label: "Investimentos", kind: "income" as const, icon: "TrendingUp" },
  { label: "Outras Receitas", kind: "income" as const, icon: "CircleDollarSign" },
];
