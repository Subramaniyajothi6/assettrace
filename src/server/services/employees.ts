import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { assertCan, requireUser, type CurrentUser } from "../permissions";
import { nextNumber } from "../sequence";
import { employeeSchema } from "@/lib/validation/masterdata";
import { checkbox } from "@/lib/validation/common";

/** Managers may only manage employees of departments they manage. */
function assertDeptInScope(user: CurrentUser, departmentId: string) {
  if (user.role === "MANAGER" && !user.managedDepartmentIds.includes(departmentId)) {
    throw new ForbiddenError("You can only manage employees in your departments.");
  }
}

export const DEFAULT_TEMP_PASSWORD = () => `Welcome@${new Date().getFullYear()}`;

export async function createEmployee(input: Record<string, unknown>) {
  const user = await requireUser();
  assertCan(user, "employee:manage");
  const data = employeeSchema.parse(input);
  const withLogin = checkbox().parse(input.createLogin);
  assertDeptInScope(user, data.departmentId);

  return prisma.$transaction(async (tx) => {
    const employeeCode = await nextNumber(tx, "EMP");
    let userId: string | null = null;
    if (withLogin) {
      const exists = await tx.user.findUnique({ where: { email: data.email }, select: { id: true } });
      if (exists) throw new AppError("A login with that email already exists.", { email: "Email already has a login" });
      const u = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: "EMPLOYEE",
          passwordHash: await bcrypt.hash(DEFAULT_TEMP_PASSWORD(), 10),
          mustChangePassword: true,
        },
      });
      userId = u.id;
    }
    return tx.employee.create({ data: { ...data, employeeCode, userId } });
  });
}

export async function updateEmployee(id: string, input: unknown) {
  const user = await requireUser();
  assertCan(user, "employee:manage");
  const data = employeeSchema.parse(input);
  const current = await prisma.employee.findUnique({ where: { id }, select: { departmentId: true, userId: true } });
  if (!current) throw new NotFoundError("Employee");
  assertDeptInScope(user, current.departmentId);
  assertDeptInScope(user, data.departmentId);
  return prisma.$transaction(async (tx) => {
    const emp = await tx.employee.update({ where: { id }, data });
    // Keep the linked login's name/email in step.
    if (current.userId) await tx.user.update({ where: { id: current.userId }, data: { name: data.name, email: data.email } });
    return emp;
  });
}

/** Deactivate instead of delete (rule 3). Blocked while they still hold assets. */
export async function setEmployeeActive(id: string, isActive: boolean) {
  const user = await requireUser();
  assertCan(user, "employee:manage");
  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { departmentId: true, userId: true, _count: { select: { currentAssets: true } } },
  });
  if (!emp) throw new NotFoundError("Employee");
  assertDeptInScope(user, emp.departmentId);
  if (!isActive && emp._count.currentAssets > 0) {
    throw new AppError(`They still hold ${emp._count.currentAssets} asset(s). Receive the returns first.`);
  }
  if (!isActive && emp.userId === user.id) throw new AppError("You can't deactivate yourself.");
  return prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data: { isActive } });
    if (!isActive && emp.userId) await tx.user.update({ where: { id: emp.userId }, data: { isActive: false } });
  });
}
