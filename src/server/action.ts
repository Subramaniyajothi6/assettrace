import "server-only";
import { revalidatePath } from "next/cache";
import { toActionError, type ActionResult } from "./errors";

/**
 * Wrap a service call for a server action: converts thrown errors to an ActionResult
 * (CLAUDE.md rule 4) and revalidates the given paths on success.
 */
export async function run<T>(fn: () => Promise<T>, revalidate: string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    for (const p of revalidate) revalidatePath(p, p.includes("[") ? "page" : undefined);
    // Shell badges and counts live in the (app) layout.
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (err) {
    // Let Next.js redirects/notFound bubble up.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    return toActionError(err);
  }
}
