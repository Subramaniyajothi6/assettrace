import NextAuth from "next-auth";
import { authConfig } from "@/server/auth.config";

// Layer 1 of 3 (docs/ARCHITECTURE.md §3): signed in or redirected to /login.
// Role checks happen in route-group layouts; the real enforcement is in services.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
