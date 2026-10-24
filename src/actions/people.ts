"use server";

import type { Role } from "@prisma/client";
import { run } from "@/server/action";
import { createMaster, setMasterActive, updateMaster } from "@/server/services/masterdata";
import { createEmployee, setEmployeeActive, updateEmployee } from "@/server/services/employees";
import { createUser, resetUserPassword, setUserActive, setUserRole } from "@/server/services/users";
import { formToObject } from "@/lib/validation/common";
import { MASTER_KINDS, type MasterKind } from "@/lib/validation/masterdata";

const kindOf = (k: string): MasterKind => {
  if (!(MASTER_KINDS as readonly string[]).includes(k)) throw new Error("Unknown kind");
  return k as MasterKind;
};

export async function saveMasterAction(kind: string, id: string | null, fd: FormData) {
  const k = kindOf(kind);
  return run(async () => {
    const row = id ? await updateMaster(k, id, formToObject(fd)) : await createMaster(k, formToObject(fd));
    return { name: row.name };
  }, [`/admin/${k}`]);
}

export async function toggleMasterAction(kind: string, id: string, isActive: boolean) {
  const k = kindOf(kind);
  return run(async () => void (await setMasterActive(k, id, isActive)), [`/admin/${k}`]);
}

export async function saveEmployeeAction(id: string | null, fd: FormData) {
  return run(async () => {
    const e = id ? await updateEmployee(id, formToObject(fd)) : await createEmployee(formToObject(fd));
    return { name: e.name, code: e.employeeCode };
  }, ["/employees"]);
}

export async function toggleEmployeeAction(id: string, isActive: boolean) {
  return run(() => setEmployeeActive(id, isActive), ["/employees"]);
}

export async function createUserAction(fd: FormData) {
  return run(async () => {
    const u = await createUser(formToObject(fd));
    return { name: u.name };
  }, ["/admin/users"]);
}

export async function setRoleAction(id: string, role: Role) {
  return run(async () => void (await setUserRole(id, role)), ["/admin/users"]);
}

export async function toggleUserAction(id: string, isActive: boolean) {
  return run(async () => void (await setUserActive(id, isActive)), ["/admin/users"]);
}

export async function resetPasswordAction(id: string, fd: FormData) {
  return run(async () => void (await resetUserPassword(id, formToObject(fd))), ["/admin/users"]);
}
