"use client";

import { UserRound } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Dependent } from "@/store/useFinanceStore";

interface DependentSelectProps {
  dependents: Dependent[];
  value: string;
  onValueChange: (value: string) => void;
}

const NO_DEPENDENT_VALUE = "__no_dependent__";

export function DependentSelect({
  dependents,
  value,
  onValueChange,
}: DependentSelectProps) {
  const selectedDependent = dependents.find(
    (dependent) => dependent.id === value,
  );

  return (
    <div className="space-y-2">
      <Label>Vincular a um dependente</Label>
      <Select
        value={value || NO_DEPENDENT_VALUE}
        onValueChange={(nextValue) =>
          onValueChange(
            nextValue === NO_DEPENDENT_VALUE ? "" : nextValue,
          )
        }
      >
        <SelectTrigger>
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedDependent?.name ?? "Sem dependente"}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_DEPENDENT_VALUE}>Sem dependente</SelectItem>
          {dependents.map((dependent) => (
            <SelectItem key={dependent.id} value={dependent.id}>
              <span className="flex items-center gap-2">
                <UserRound className="size-4" />
                {dependent.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
