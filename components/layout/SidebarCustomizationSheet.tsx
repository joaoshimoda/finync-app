"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pin, PinOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  navigationItems,
  navigationSections,
} from "@/components/layout/navigationItems";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useFinanceStore,
  type NavigationPreferences,
} from "@/store/useFinanceStore";

function getCompleteItemOrder(itemOrder: string[]) {
  const validHrefs = new Set(navigationItems.map((item) => item.href));
  const orderedHrefs = itemOrder.filter((href) => validHrefs.has(href));

  navigationItems.forEach((item) => {
    if (!orderedHrefs.includes(item.href)) orderedHrefs.push(item.href);
  });

  return orderedHrefs;
}

export function SidebarCustomizationSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigationPreferences = useFinanceStore(
    (state) => state.navigationPreferences,
  );
  const updatePreferences = useFinanceStore((state) => state.updatePreferences);
  const [draft, setDraft] = useState<NavigationPreferences>(() => ({
    pinnedHrefs: [...navigationPreferences.pinnedHrefs],
    itemOrder: getCompleteItemOrder(navigationPreferences.itemOrder),
    collapsedSections: [...navigationPreferences.collapsedSections],
  }));
  const [isSaving, setIsSaving] = useState(false);

  const orderedItems = useMemo(() => {
    const positions = new Map(
      getCompleteItemOrder(draft.itemOrder).map((href, index) => [href, index]),
    );

    return [...navigationItems].sort(
      (left, right) =>
        (positions.get(left.href) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(right.href) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [draft.itemOrder]);

  function togglePinned(href: string) {
    setDraft((current) => {
      const isPinned = current.pinnedHrefs.includes(href);

      if (!isPinned && current.pinnedHrefs.length >= 6) {
        toast.error("Você pode fixar até 6 atalhos.");
        return current;
      }

      return {
        ...current,
        pinnedHrefs: isPinned
          ? current.pinnedHrefs.filter((item) => item !== href)
          : [...current.pinnedHrefs, href],
      };
    });
  }

  function moveItem(href: string, direction: -1 | 1) {
    setDraft((current) => {
      const item = navigationItems.find((candidate) => candidate.href === href);
      if (!item) return current;

      const order = getCompleteItemOrder(current.itemOrder);
      const currentIndex = order.indexOf(href);
      let targetIndex = currentIndex + direction;

      while (targetIndex >= 0 && targetIndex < order.length) {
        const targetItem = navigationItems.find(
          (candidate) => candidate.href === order[targetIndex],
        );

        if (targetItem?.section === item.section) break;
        targetIndex += direction;
      }

      if (targetIndex < 0 || targetIndex >= order.length) return current;

      [order[currentIndex], order[targetIndex]] = [
        order[targetIndex],
        order[currentIndex],
      ];

      return { ...current, itemOrder: order };
    });
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      await updatePreferences({ navigationPreferences: draft });
      toast.success("Navegação atualizada.");
      onClose();
    } catch {
      toast.error("Preferência salva localmente, mas ainda não sincronizada.");
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="max-w-lg">
        <SheetHeader className="border-b border-white/[0.07]">
          <SheetTitle>Personalizar navegação</SheetTitle>
          <SheetDescription>
            Fixe seus atalhos e escolha a ordem dos itens em cada grupo.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            {navigationSections.map((section) => {
              const sectionItems = orderedItems.filter(
                (item) => item.section === section.key,
              );

              return (
                <section key={section.key}>
                  <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-600">
                    {section.label}
                  </p>
                  <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-zinc-900/35">
                    {sectionItems.map((item, index) => {
                      const Icon = item.icon;
                      const isPinned = draft.pinnedHrefs.includes(item.href);

                      return (
                        <div
                          key={item.href}
                          className="flex min-h-14 items-center gap-3 px-3"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
                            {item.label}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0}
                            onClick={() => moveItem(item.href, -1)}
                            aria-label={`Mover ${item.label} para cima`}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === sectionItems.length - 1}
                            onClick={() => moveItem(item.href, 1)}
                            aria-label={`Mover ${item.label} para baixo`}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={isPinned ? "text-emerald-300" : "text-zinc-500"}
                            onClick={() => togglePinned(item.href)}
                            aria-label={
                              isPinned
                                ? `Desafixar ${item.label}`
                                : `Fixar ${item.label}`
                            }
                          >
                            {isPinned ? (
                              <PinOff className="size-4" />
                            ) : (
                              <Pin className="size-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setDraft({
                pinnedHrefs: [],
                itemOrder: navigationItems.map((item) => item.href),
                collapsedSections: [],
              })
            }
          >
            <RotateCcw className="size-4" />
            Restaurar
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
