import type { Tx } from "./db";

/**
 * Atomically bump a running number inside the caller's transaction.
 * nextNumber(tx, "AST-LAP") -> "AST-LAP-0001", nextNumber(tx, "REQ") -> "REQ-0001".
 * The row lock taken by the upsert serialises concurrent callers for the same key.
 */
export async function nextNumber(tx: Tx, key: string, pad = 4): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" ("name", "value") VALUES (${key}, 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "Sequence"."value" + 1
    RETURNING "value"`;
  return `${key}-${String(rows[0].value).padStart(pad, "0")}`;
}
