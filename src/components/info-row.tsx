import type { ReactNode } from "react";

/**
 * 詳情頁 sidebar 用的 label-value 列。多筆排成 description list。
 */
export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-200 py-3 last:border-b-0 dark:border-neutral-800">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="text-sm text-neutral-800 dark:text-neutral-200">{children}</dd>
    </div>
  );
}

export function InfoList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</dl>;
}
