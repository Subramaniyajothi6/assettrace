import "server-only";
import { prisma } from "../db";

/** Active employees as select options ("Name · Department"), optionally excluding one. */
export async function employeeOptions(excludeId?: string | null) {
  const rows = await prisma.employee.findMany({
    where: { isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true, department: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((e) => ({ value: e.id, label: `${e.name} · ${e.department.name}` }));
}

export async function locationOptions() {
  const rows = await prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return rows.map((l) => ({ value: l.id, label: l.name }));
}
