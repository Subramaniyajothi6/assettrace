import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { homeFor } from "@/components/shell/nav";
import { Scanner } from "./Scanner";

export const metadata = { title: "Scan QR code" };

export default async function ScanPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader crumbs={[{ label: "AssetTrace", href: homeFor(user.role) }, { label: "Scan QR" }]} title="Scan an asset label" />
      <div className="row" style={{ alignItems: "stretch" }}>
        <Scanner />
        <section className="card pad side rise" style={{ flex: "1 1 420px", animationDelay: "80ms", display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          <b style={{ fontSize: 20 }}>How access works</b>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, color: "var(--at-soft)" }}>
            <li>Signed out → you&apos;re asked to sign in, then come straight back.</li>
            <li>Managers see assets in their departments; admins see everything.</li>
            <li>Employees see only assets assigned to them.</li>
            <li>Anyone else sees &quot;You don&apos;t have access&quot; and no details.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
