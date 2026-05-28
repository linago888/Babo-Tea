"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const THEME_COOKIE = "theme";
type Theme = "light" | "dark" | "system";

function readCookie(): Theme {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
  const v = m ? decodeURIComponent(m[1]) : "system";
  return v === "light" || v === "dark" ? v : "system";
}

function writeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  html.classList.toggle("dark", resolved === "dark");
  html.style.colorScheme = resolved;
}

/**
 * 三段 toggle：light / dark / system。
 * - 點圖示循環切換
 * - 寫 cookie 持久化
 * - 立即套用 .dark class 到 <html>（Tailwind v4 darkMode class 模式）
 * - system 模式下監聽 prefers-color-scheme 變化
 */
export function ThemeToggle() {
  const t = useTranslations();
  const [theme, setTheme] = useState<Theme>("system");

  // 初始化：讀 cookie + 套用
  useEffect(() => {
    const initial = readCookie();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // 監聽 system 變化
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function cycle() {
    const next: Theme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    writeCookie(next);
    applyTheme(next);
  }

  const icon = theme === "light" ? "☀" : theme === "dark" ? "☾" : "◐";
  const label =
    theme === "light"
      ? "Light theme"
      : theme === "dark"
        ? "Dark theme"
        : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t.has("theme.label") ? t("theme.label") : "Toggle theme"}
      title={label}
      className="flex size-9 items-center justify-center rounded-md text-base text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
