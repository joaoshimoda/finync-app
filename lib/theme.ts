/* Light/dark theme. The choice is kept on the device; "system" follows the
   operating system. The <html> element carries `dark` or `light`, set by
   the inline script in the root layout before the first paint. */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "finync-theme";
const THEME_CHANGE_EVENT = "finync-theme-change";
const darkQuery = "(prefers-color-scheme: dark)";

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    /* Private mode: the choice still applies to this visit. */
  }

  applyTheme(resolveTheme(preference));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/* Notifies on an explicit choice, on a change in another tab and, while on
   "system", when the operating system switches. */
export function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia(darkQuery);
  const handleSystemChange = () => {
    if (readThemePreference() === "system") applyTheme(resolveTheme("system"));
    onChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(resolveTheme(readThemePreference()));
    onChange();
  };

  media.addEventListener("change", handleSystemChange);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => {
    media.removeEventListener("change", handleSystemChange);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

/* Inlined in <head> so the page never flashes the wrong theme. Without
   JavaScript the server-rendered `dark` class stays. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("${darkQuery}").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("light",!d)}catch(e){}})();`;
