"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { Locale } from "@/i18n/routing";

export function SearchBox({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const t = useTranslations("search");
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(() => sp.get("q") ?? "");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (q.length === 0) return;
    router.push(`/${locale}/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="flex items-center gap-2">
      <label htmlFor="site-search" className="sr-only">
        {t("title")}
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("placeholder")}
        autoComplete="off"
        className={
          compact
            ? "w-full rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
            : "w-full rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-base placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        }
      />
      <button
        type="submit"
        aria-label={t("submit")}
        className={
          compact
            ? "rounded-full bg-neutral-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            : "rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        }
      >
        {compact ? "🔍" : t("submit")}
      </button>
    </form>
  );
}
