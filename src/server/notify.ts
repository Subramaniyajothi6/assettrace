import type { NotificationType } from "@prisma/client";
import type { Tx } from "./db";

export type NotifyInput = {
  userIds: (string | null | undefined)[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** Skip the user who caused the event (they already saw the toast). */
  excludeUserId?: string;
};

/** Create one notification per distinct recipient, inside the caller's transaction. */
export async function createNotification(tx: Tx, input: NotifyInput) {
  const ids = [...new Set(input.userIds.filter((id): id is string => !!id))].filter(
    (id) => id !== input.excludeUserId,
  );
  if (ids.length === 0) return;
  await tx.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    })),
  });
}

/** Managers of the asset's department plus every active admin. */
export async function managersOf(tx: Tx, departmentId: string | null | undefined): Promise<string[]> {
  const users = await tx.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: "ADMIN" },
        ...(departmentId
          ? [{ role: "MANAGER" as const, managedDepartments: { some: { id: departmentId } } }]
          : []),
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** The login (if any) linked to an employee record. */
export async function userIdOfEmployee(tx: Tx, employeeId: string | null | undefined): Promise<string | null> {
  if (!employeeId) return null;
  const emp = await tx.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
  return emp?.userId ?? null;
}
