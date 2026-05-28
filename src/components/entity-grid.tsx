import type { ReactNode } from "react";

/**
 * 響應式資料卡 grid。Brand / City / Drink / News 列表共用。
 */
export function EntityGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </ul>
  );
}
