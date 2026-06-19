"use client";

import { createElement, FormEvent, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TAG_ICON_OPTIONS, getTagIcon } from "@/lib/tagIcons";
import { useFinanceStore } from "@/store/useFinanceStore";

export function TagManager() {
  const tags = useFinanceStore((state) => state.tags);
  const fetchTags = useFinanceStore((state) => state.fetchTags);
  const addTag = useFinanceStore((state) => state.addTag);
  const [label, setLabel] = useState("");
  const [iconName, setIconName] = useState(TAG_ICON_OPTIONS[0].name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLabel = label.trim();
    if (!normalizedLabel || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await addTag({ label: normalizedLabel, icon: iconName });
      setLabel("");
      setIconName(TAG_ICON_OPTIONS[0].name);
      toast.success("Tag criada.");
    } catch (error) {
      console.error("Erro ao criar tag:", error);
      toast.error("Não foi possível criar a tag.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950 shadow-none">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle>Tags personalizadas</CardTitle>
        <CardDescription>
          Crie marcadores visuais para organizar lançamentos além das categorias.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-7 py-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="tag-label">Nome da tag</Label>
            <Input
              id="tag-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex: Jogos"
              className="h-10 border-zinc-700 bg-zinc-900"
              maxLength={40}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={iconName} onValueChange={setIconName}>
              <SelectTrigger className="h-10 border-zinc-700 bg-zinc-900">
                <div className="flex items-center gap-2">
                  {createElement(getTagIcon(iconName), {
                    className: "size-4 text-zinc-400",
                  })}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {TAG_ICON_OPTIONS.map((option) => {
                  const Icon = option.icon;

                  return (
                    <SelectItem key={option.name} value={option.name}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar tag
          </Button>
        </form>

        <div className="border-t border-zinc-800 pt-5">
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const Icon = getTagIcon(tag.icon);

                return (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                  >
                    <Icon className="size-4 text-zinc-400" />
                    {tag.label}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Nenhuma tag criada.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
