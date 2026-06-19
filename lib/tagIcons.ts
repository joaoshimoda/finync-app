import {
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  ShoppingCart,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface TagIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const TAG_ICON_OPTIONS: TagIconOption[] = [
  { name: "Tag", label: "Geral", icon: Tag },
  { name: "Gamepad2", label: "Jogos", icon: Gamepad2 },
  { name: "Utensils", label: "Alimentação", icon: Utensils },
  { name: "ShoppingCart", label: "Compras", icon: ShoppingCart },
  { name: "Car", label: "Transporte", icon: Car },
  { name: "Home", label: "Moradia", icon: Home },
  { name: "HeartPulse", label: "Saúde", icon: HeartPulse },
  { name: "GraduationCap", label: "Educação", icon: GraduationCap },
  { name: "Dumbbell", label: "Esporte", icon: Dumbbell },
  { name: "Film", label: "Entretenimento", icon: Film },
  { name: "Plane", label: "Viagem", icon: Plane },
  { name: "Gift", label: "Presentes", icon: Gift },
  { name: "BriefcaseBusiness", label: "Trabalho", icon: BriefcaseBusiness },
  { name: "BookOpen", label: "Estudos", icon: BookOpen },
];

export function getTagIcon(iconName: string): LucideIcon {
  return (
    TAG_ICON_OPTIONS.find((option) => option.name === iconName)?.icon ?? Tag
  );
}
