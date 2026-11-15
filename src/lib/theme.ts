export type ThemeMode = "light" | "dark" | "system";

const KEY = "zubix.theme";

export function getThemeMode(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode): void {
  const dark = mode === "dark" || (mode === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* the choice still applies for this visit */
  }
  applyTheme(mode);
}
