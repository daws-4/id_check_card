"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@heroui/switch";
import { Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch session a mano para no requerir SessionProvider
  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(s => {
        if (s?.user) {
          setIsAuthenticated(true);
          const pref = (s.user as any).theme_preference;
          if (pref && pref !== 'system' && pref !== theme) {
            setTheme(pref);
          }
        }
        setMounted(true);
      })
      .catch(() => setMounted(true));
  }, []);

  const toggleTheme = async (isSelected: boolean) => {
    const newTheme = isSelected ? "dark" : "light";
    setTheme(newTheme);
    
    if (isAuthenticated) {
      fetch("/api/users/me/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme })
      }).catch(err => console.error(err));
    }
  };

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <Switch
      isSelected={isDark}
      onValueChange={toggleTheme}
      size="md"
      color="primary"
      thumbIcon={({ isSelected, className }) =>
        isSelected ? (
          <Moon className={className} />
        ) : (
          <Sun className={className} />
        )
      }
    />
  );
}
