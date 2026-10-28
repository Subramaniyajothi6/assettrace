import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/permissions";
import { bellData } from "@/server/services/notifications";

/**
 * Bell data for the topbar, polled every minute and on navigation.
 * A GET route, not a server action: Next.js runs server actions one at a time on the router's
 * queue, so a polled read would hold up navigations and refreshes while the database is slow.
 */
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Signed out" }, { status: 401 });
  return NextResponse.json(await bellData(), { headers: { "Cache-Control": "private, no-store" } });
}
