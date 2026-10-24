import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; employeeId: string | null } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    employeeId: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { employee: { select: { id: true } } },
        });
        if (!user || !user.isActive) return null;
        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employee?.id ?? null,
        };
      },
    }),
  ],
});
