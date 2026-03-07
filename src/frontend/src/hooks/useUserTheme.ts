import { useCallback, useState } from "react";

export type ThemeId = "default" | "dark" | "ocean" | "amber" | "slate" | "rose";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  primary: string; // OKLCH color for swatch
  sidebar: string; // OKLCH color for swatch
}

export const THEMES: ThemeOption[] = [
  {
    id: "default",
    label: "Forest",
    primary: "oklch(0.42 0.13 155)",
    sidebar: "oklch(0.18 0.025 250)",
  },
  {
    id: "dark",
    label: "Dark",
    primary: "oklch(0.55 0.16 155)",
    sidebar: "oklch(0.09 0.01 250)",
  },
  {
    id: "ocean",
    label: "Ocean",
    primary: "oklch(0.45 0.18 220)",
    sidebar: "oklch(0.18 0.04 220)",
  },
  {
    id: "amber",
    label: "Amber",
    primary: "oklch(0.6 0.18 65)",
    sidebar: "oklch(0.20 0.04 55)",
  },
  {
    id: "slate",
    label: "Slate",
    primary: "oklch(0.38 0.08 260)",
    sidebar: "oklch(0.22 0.015 260)",
  },
  {
    id: "rose",
    label: "Rose",
    primary: "oklch(0.52 0.2 10)",
    sidebar: "oklch(0.18 0.03 10)",
  },
];

function storageKey(principalId: string) {
  return `user_theme_${principalId}`;
}

function applyTheme(themeId: ThemeId) {
  if (themeId === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }
}

export function useUserTheme(principalId?: string) {
  const key = principalId ? storageKey(principalId) : "user_theme_guest";
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(key) as ThemeId | null;
    const t = stored || "default";
    applyTheme(t);
    return t;
  });

  const setTheme = useCallback(
    (t: ThemeId) => {
      localStorage.setItem(key, t);
      applyTheme(t);
      setThemeState(t);
    },
    [key],
  );

  return { theme, setTheme, themes: THEMES };
}
