import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { AppError } from "../errors";
import { requireUser } from "../permissions";
import { password } from "@/lib/validation/common";

const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: password(),
    repeat: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.next !== v.repeat) ctx.addIssue({ code: "custom", path: ["repeat"], message: "The new passwords don't match" });
    if (v.next === v.current) ctx.addIssue({ code: "custom", path: ["next"], message: "Choose a password you haven't just used" });
  });

/** Change your own password; clears the "must change on next sign-in" flag. */
export async function changeOwnPassword(input: unknown) {
  const user = await requireUser();
  const data = changePasswordSchema.parse(input);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(data.current, row.passwordHash))) {
    throw new AppError("Your current password is incorrect.", { current: "Incorrect password" });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(data.next, 10), mustChangePassword: false },
  });
}
