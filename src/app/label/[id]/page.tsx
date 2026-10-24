import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { appUrl } from "@/server/url";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "QR label" };

/** Printable QR label (bare page, no app shell). */
export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role === "EMPLOYEE") notFound();
  const a = await prisma.asset.findFirst({ where: { AND: [{ id }, managedAssetScope(user)] }, include: { location: true } });
  if (!a) notFound();
  const { orgName } = await getSettings();
  const qr = await QRCode.toDataURL(`${await appUrl()}/scan/${a.qrToken}`, { margin: 1, width: 600 });
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: "#fff", minHeight: "100vh", color: "#141414" }}>
      <div
        style={{
          width: "70mm",
          border: "1px solid #141414",
          borderRadius: 10,
          padding: "5mm",
          display: "flex",
          gap: "4mm",
          alignItems: "center",
          fontFamily: "var(--at-font)",
        }}
      >
        <Image src={qr} alt="" width={96} height={96} unoptimized style={{ width: "26mm", height: "26mm" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <b style={{ fontSize: 11, letterSpacing: ".06em" }}>{orgName.toUpperCase()} PROPERTY</b>
          <span style={{ fontFamily: "var(--at-mono)", fontSize: 14, fontWeight: 600 }}>{a.assetTag}</span>
          <span style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
          <span style={{ fontSize: 9, color: "#5F5B55" }}>Scan to view · {a.location?.name ?? ""}</span>
        </div>
      </div>
      <PrintButton />
    </div>
  );
}
