import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkWarranties } from "@/server/services/notifications";

/**
 * Daily warranty check (optional Vercel cron, see vercel.json).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await checkWarranties();
  return NextResponse.json(result);
}
