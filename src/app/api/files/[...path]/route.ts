import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, managedAssetScope, type CurrentUser } from "@/server/permissions";
import { signedUrl } from "@/server/storage";

/**
 * Stored files are private (CLAUDE.md rule 6). Find the record that owns the key,
 * check the user may see it, then redirect to a 5-minute signed URL.
 */
async function canView(user: CurrentUser, key: string): Promise<boolean> {
  const [asset, issue, ret, assignment] = await Promise.all([
    prisma.asset.findFirst({ where: { photoPath: key }, select: { id: true } }),
    prisma.assetIssue.findFirst({ where: { photoPath: key }, select: { assetId: true, reportedById: true } }),
    prisma.assetReturn.findFirst({ where: { photoPaths: { has: key } }, select: { assetId: true, returnedById: true } }),
    prisma.assignment.findFirst({ where: { handoverSignaturePath: key }, select: { assetId: true, employeeId: true } }),
  ]);
  const owner = asset ? { assetId: asset.id, employeeId: null } : issue
    ? { assetId: issue.assetId, employeeId: issue.reportedById }
    : ret
      ? { assetId: ret.assetId, employeeId: ret.returnedById }
      : assignment
        ? { assetId: assignment.assetId, employeeId: assignment.employeeId }
        : null;
  if (!owner) return false;

  // The employee the record is about (reporter, returner, signer).
  if (user.employeeId && owner.employeeId === user.employeeId) return true;
  // Current or past holder may see the asset photo.
  if (user.employeeId && asset) {
    const held = await prisma.assignment.count({ where: { assetId: asset.id, employeeId: user.employeeId } });
    if (held) return true;
  }
  if (user.role === "EMPLOYEE") return false;
  return (await prisma.asset.count({ where: { AND: [{ id: owner.assetId }, managedAssetScope(user)] } })) > 0;
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const key = (await params).path.join("/");
  if (!/^[a-z-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return new NextResponse("Not found", { status: 404 });
  if (!(await canView(user, key))) return new NextResponse("Forbidden", { status: 403 });
  const url = await signedUrl(key);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=240" } });
}
