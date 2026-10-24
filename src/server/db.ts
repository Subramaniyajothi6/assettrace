import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // The database is in another region: a lifecycle transaction makes 6–12 round trips,
    // which can exceed Prisma's 5 s default and roll back the whole change.
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Transaction client passed into helpers that must run inside `prisma.$transaction`. */
export type Tx = Prisma.TransactionClient;
