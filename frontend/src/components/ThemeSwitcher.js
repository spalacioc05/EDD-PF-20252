"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, BookOpenText } from "lucide-react";

const THEMES = ["dark", "light", "paper"];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("dark");

  // init from localStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("loom-theme") : null;
    const initial = THEMES.includes(saved) ? saved : "dark";
    setTheme(initial);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("loom-theme", next);
    }
  };

  const Icon = theme === "light" ? Sun : theme === "paper" ? BookOpenText : Moon;
  const label = theme === "light" ? "Claro" : theme === "paper" ? "Papel" : "Oscuro";

  return (
    <button
      onClick={cycleTheme}
      className="rounded-full p-2 hover:bg-white/5 flex items-center gap-2"
      title={`Tema: ${label}`}
      aria-label="Cambiar tema"
    >
      <Icon className="h-5 w-5" />
      <span className="hidden md:inline text-sm">{label}</span>
    </button>
  );
}
