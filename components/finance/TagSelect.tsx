"use client";

import { createElement } from "react";
import { Tag } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getTagIcon } from "@/lib/tagIcons";
import type { FinanceTag } from "@/store/useFinanceStore";

interface TagSelectProps {
  tags: FinanceTag[];
  value: string;
  onValueChange: (value: string) => void;
}

const NO_TAG_VALUE = "__no_tag__";

export function TagSelect({ tags, value, onValueChange }: TagSelectProps) {
  const selectedTag = tags.find((tag) => tag.id === value);
  const selectedIcon = selectedTag ? getTagIcon(selectedTag.icon) : Tag;

  return (
    <div className="space-y-2">
      <Label>Tag opcional</Label>
      <Select
        value={value || NO_TAG_VALUE}
        onValueChange={(nextValue) =>
          onValueChange(nextValue === NO_TAG_VALUE ? "" : nextValue)
        }
      >
        <SelectTrigger>
          <span className="flex min-w-0 items-center gap-2">
            {createElement(selectedIcon, {
              className: "size-4 shrink-0 text-muted-foreground",
            })}
            <span className="truncate">
              {selectedTag?.label ?? "Sem tag"}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TAG_VALUE}>
            <span className="flex items-center gap-2">
              <Tag className="size-4" />
              Sem tag
            </span>
          </SelectItem>
          {tags.map((tag) => {
            const Icon = getTagIcon(tag.icon);

            return (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {tag.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
