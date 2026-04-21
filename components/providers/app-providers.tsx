"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

const ThemeCtx = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function useThemeToggle() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useThemeToggle outside AppProviders");
  return v;
}

const DashCtx = createContext<{
  headerSearch: string;
  setHeaderSearch: (s: string) => void;
}>({ headerSearch: "", setHeaderSearch: () => {} });

export function useDashboardSearch() {
  return useContext(DashCtx);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("freelanceros_theme") as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "dark"; // Defaulting to dark as per original logic
    }
    return "dark";
  });
  const [mounted, setMounted] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    const initial = theme;
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      localStorage.setItem("freelanceros_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const themeValue = useMemo(() => ({ theme: mounted ? theme : "dark", toggleTheme }), [mounted, theme, toggleTheme]);

  const dashValue = useMemo(
    () => ({ headerSearch, setHeaderSearch }),
    [headerSearch]
  );

  return (
    <ThemeCtx.Provider value={themeValue}>
      <DashCtx.Provider value={dashValue}>{children}</DashCtx.Provider>
    </ThemeCtx.Provider>
  );
}
