"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Option {
  value: string;
  label: string;
}

interface FilterField {
  key: string; // URL param key, e.g. 'country'
  label: string;
  options: Option[];
}

interface FilterBarProps {
  fields: FilterField[];
  clearLabel: string;
  allLabel: string;
}

/**
 * 通用篩選列：每個 field 對應一個 URL search param（單選）。
 * 改動時用 router.replace 更新 URL，server component 接到新 searchParams 重新渲染。
 */
export function FilterBar({ fields, clearLabel, allLabel }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const hasAny = fields.some((f) => searchParams.get(f.key));

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
      onSubmit={(e) => e.preventDefault()}
    >
      {fields.map((field) => {
        const current = searchParams.get(field.key) ?? "";
        return (
          <label key={field.key} className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-neutral-600 dark:text-neutral-400">
              {field.label}
            </span>
            <select
              value={current}
              disabled={pending}
              onChange={(e) => update(field.key, e.target.value)}
              className="min-w-[8rem] rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm transition hover:border-neutral-500 focus:border-neutral-900 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-500 dark:focus:border-neutral-100"
            >
              <option value="">{allLabel}</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {hasAny ? (
        <button
          type="button"
          onClick={clearAll}
          disabled={pending}
          className="ml-auto text-xs text-neutral-600 underline-offset-2 transition hover:text-neutral-900 hover:underline disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {clearLabel}
        </button>
      ) : null}
    </form>
  );
}
