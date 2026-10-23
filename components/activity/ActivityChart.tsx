"use client";

import { motion } from "framer-motion";

import { dashboardEase } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const BAR_HEIGHT = 48;

/* Events per day; a click narrows the timeline to that day. */
export function ActivityChart({
  days,
  selectedDay,
  onSelectDay,
}: {
  days: Array<{ key: string; date: Date; count: number }>;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}) {
  const largest = Math.max(...days.map((day) => day.count), 1);

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: BAR_HEIGHT }}>
        {days.map((day, index) => {
          const isSelected = selectedDay === day.key;
          const height = day.count ? Math.max((day.count / largest) * BAR_HEIGHT, 4) : 2;

          return (
            <button
              key={day.key}
              type="button"
              disabled={!day.count}
              onClick={() => onSelectDay(isSelected ? null : day.key)}
              aria-pressed={isSelected}
              aria-label={`${dayFormatter.format(day.date)}: ${day.count} ${day.count === 1 ? "evento" : "eventos"}`}
              title={`${dayFormatter.format(day.date)} · ${day.count}`}
              className="group flex h-full min-w-0 flex-1 items-end disabled:cursor-default"
            >
              <motion.span
                className={cn(
                  "block w-full rounded-[3px] transition-colors",
                  day.count === 0
                    ? "bg-zinc-800"
                    : isSelected
                      ? "bg-emerald-300"
                      : selectedDay
                        ? "bg-emerald-400/30 group-hover:bg-emerald-400/60"
                        : "bg-emerald-400/70 group-hover:bg-emerald-300",
                )}
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ duration: 0.5, delay: index * 0.01, ease: dashboardEase }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
        <span>{dayFormatter.format(days[0].date)}</span>
        <span>hoje</span>
      </div>
    </div>
  );
}
