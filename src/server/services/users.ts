import "server-only";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "../db";
import { AppError, NotFoundError } from "../errors";
import { assertCan, requireUser } from "../permissions";
import { resetPasswordSchema, roleSchema, userCreateSchema } from "@/lib/validation/masterdata";

async function admin() {
  const user = await requireUser();
  assertCan(user, "user:manage");
  return user;
}

/** Create a login for an existing employee (admin only). They must change the password on first sign-in. */
export async function createUser(input: unknown) {
  await admin();
  const data = userCreateSchema.parse(input);
  const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!emp || !emp.isActive) throw new NotFoundError("Employee");
  if (emp.userId) throw new AppError("That employee already has a login.", { employeeId: "Already has a login" });
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 10),
        mustChangePassword: true,
      },
    });
    await tx.employee.update({ where: { id: emp.id }, data: { userId: u.id } });
    return u;
  });
}

export async function setUserRole(id: string, role: Role) {
  const me = await admin();
  const next = roleSchema.parse(role);
  if (id === me.id && next !== "ADMIN") throw new AppError("You can't remove your own admin role.");
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id }, data: { role: next } });
    // A non-manager can't keep managing departments.
    if (next !== "MANAGER") await tx.user.update({ where: { id }, data: { managedDepartments: { set: [] } } });
    return u;
  });
}

export async function setUserActive(id: string, isActive: boolean) {
  const me = await admin();
  if (id === me.id) throw new AppError("You can't deactivate your own account.");
  return prisma.user.update({ where: { id }, data: { isActive } });
}

export async function resetUserPassword(id: string, input: unknown) {
  await admin();
  const { password } = resetPasswordSchema.parse(input);
  return prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
  });
}
