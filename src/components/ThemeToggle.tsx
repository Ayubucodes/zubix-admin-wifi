import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getThemeMode, setThemeMode, type ThemeMode } from "../lib/theme";

const OPTIONS: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "system", label: "Match device", icon: Monitor },
  { mode: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  // When following the device, react to the device switching between light and dark.
  useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-md bg-white p-0.5 ring-1 ring-neutral-200">
      {OPTIONS.map(({ mode: value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          aria-label={label}
          title={label}
          onClick={() => {
            setMode(value);
            setThemeMode(value);
          }}
          className={`inline-flex size-8 items-center justify-center rounded transition-colors ${
            mode === value ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
