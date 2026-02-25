"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Compact icon-only button for tight spaces */
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Prevent hydration mismatch — render a placeholder with same dimensions
    return compact ? (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("opacity-0", className)}
        aria-hidden
      >
        <Sun className="h-4 w-4" />
      </Button>
    ) : (
      <button
        className={cn(
          "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground opacity-0",
          className,
        )}
        aria-hidden
      >
        <Sun className="h-4 w-4" />
        <span>Theme</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
