"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { isDarkMode, toggleDarkMode } from "@/lib/dark-mode";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(isDarkMode());
  }, []);

  if (!mounted) return null;

  const handleToggle = () => {
    const newState = toggleDarkMode();
    setIsDark(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
