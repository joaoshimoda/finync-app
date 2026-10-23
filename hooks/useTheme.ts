"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  readThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

/* Server render and first hydration assume the dark default; the boot
   script has already painted the real theme by then. */
export function useTheme() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToTheme,
    readThemePreference,
    () => "system",
  );
  const resolvedTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToTheme,
    () => resolveTheme(readThemePreference()),
    () => "dark",
  );
  const setPreference = useCallback(
    (next: ThemePreference) => setThemePreference(next),
    [],
  );

  return { preference, resolvedTheme, setPreference };
}
