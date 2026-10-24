import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe part of the Auth.js config (no Prisma, no bcrypt), shared by
 * middleware.ts and server/auth.ts. Providers are added in server/auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    /** Middleware gate: everything except /login needs a session. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const loggedIn = !!auth?.user;
      if (pathname === "/login") {
        return loggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      if (loggedIn) return true;
      const login = new URL("/login", request.nextUrl);
      if (pathname !== "/") login.searchParams.set("next", pathname + request.nextUrl.search);
      return Response.redirect(login);
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role: Role }).role;
        token.employeeId = (user as { employeeId: string | null }).employeeId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as Role;
      session.user.employeeId = (token.employeeId as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
