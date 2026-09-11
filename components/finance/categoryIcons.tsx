import {
  BriefcaseBusiness,
  Car,
  CircleDollarSign,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  Plane,
  RefreshCcw,
  Shirt,
  ShoppingCart,
  Tag,
  Utensils,
  type LucideProps,
} from "lucide-react";

export type CategoryIconOption = {
  name: string;
  label: string;
};

export const categoryIconOptions: CategoryIconOption[] = [
  { name: "Tag", label: "Geral" },
  { name: "Utensils", label: "Alimentação" },
  { name: "ShoppingCart", label: "Compras" },
  { name: "Car", label: "Transporte" },
  { name: "House", label: "Moradia" },
  { name: "Gamepad2", label: "Lazer" },
  { name: "HeartPulse", label: "Saúde" },
  { name: "GraduationCap", label: "Educação" },
  { name: "PawPrint", label: "Pets" },
  { name: "Plane", label: "Viagens" },
  { name: "Shirt", label: "Vestuário" },
  { name: "Dumbbell", label: "Atividade" },
  { name: "BriefcaseBusiness", label: "Trabalho" },
  { name: "Laptop", label: "Freelance" },
  { name: "CircleDollarSign", label: "Receita" },
  { name: "RefreshCcw", label: "Estorno" },
];

export function CategoryGlyph({
  name,
  ...props
}: LucideProps & { name: string | null | undefined }) {
  switch (name) {
    case "Utensils":
      return <Utensils {...props} />;
    case "ShoppingCart":
      return <ShoppingCart {...props} />;
    case "Car":
      return <Car {...props} />;
    case "House":
      return <House {...props} />;
    case "Gamepad2":
      return <Gamepad2 {...props} />;
    case "HeartPulse":
      return <HeartPulse {...props} />;
    case "GraduationCap":
      return <GraduationCap {...props} />;
    case "PawPrint":
      return <PawPrint {...props} />;
    case "Plane":
      return <Plane {...props} />;
    case "Shirt":
      return <Shirt {...props} />;
    case "Dumbbell":
      return <Dumbbell {...props} />;
    case "BriefcaseBusiness":
      return <BriefcaseBusiness {...props} />;
    case "Laptop":
      return <Laptop {...props} />;
    case "CircleDollarSign":
      return <CircleDollarSign {...props} />;
    case "RefreshCcw":
      return <RefreshCcw {...props} />;
    default:
      return <Tag {...props} />;
  }
}
