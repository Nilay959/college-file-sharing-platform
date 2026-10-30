import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem("college-files:theme") as Theme) || "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme, dispatch = true) {
  try {
    localStorage.setItem("college-files:theme", theme);
  } catch {}

  if (typeof window === "undefined") return;

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);

  if (isDark) {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }

  if (dispatch) {
    window.dispatchEvent(new Event("college-files:theme-change"));
  }
}

// Apply stored theme immediately on script load to prevent light flashes
if (typeof window !== "undefined") {
  applyTheme(getStoredTheme(), false);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystem = () => {
      setSystemDark(media.matches);
      applyTheme(getStoredTheme(), false);
    };
    media.addEventListener("change", updateSystem);

    const handleThemeChange = () => {
      setThemeState(getStoredTheme());
    };
    window.addEventListener("college-files:theme-change", handleThemeChange);

    // Initial theme application
    applyTheme(getStoredTheme(), false);

    return () => {
      media.removeEventListener("change", updateSystem);
      window.removeEventListener("college-files:theme-change", handleThemeChange);
    };
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme, true);
  };

  const isDark = theme === "dark" || (theme === "system" && systemDark);

  return { theme, setTheme, isDark, systemDark };
}
