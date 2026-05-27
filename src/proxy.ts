import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 所有路徑都走 i18n middleware，但跳過內部資源與 API
  matcher: ["/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)"],
};
