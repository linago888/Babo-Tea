import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// 包裝 Next.js navigation API，自動套 locale prefix
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
