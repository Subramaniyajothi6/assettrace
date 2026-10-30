import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Lock, TriangleAlert, Undo2, Check } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { getAssetDetail, type AssetDetail } from "@/server/queries/assets";
import { fileUrl } from "@/server/storage";
import { appUrl } from "@/server/url";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Initials } from "@/components/Initials";
import { Timeline } from "@/components/Timeline";
import { daysUntil } from "@/components/WarrantyCell";
import { formatDate, rupee } from "@/lib/format";
import {
  CONDITION_LABELS,
  DISPOSAL_LABELS,
  HANDOVER_LABELS,
  INSPECTION_RESULT_LABELS,
  ISSUE_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  RETURN_STATUS_LABELS,
  SEVERITY_LABELS,
  TRANSFER_STATUS_LABELS,
} from "@/lib/labels";
import { param, type SearchParams } from "@/lib/list";
import { AssetActions } from "./AssetActions";
import { TabIndicator } from "@/components/motion/TabIndicator";

export const metadata = { title: "Asset" };

const TABS = [
  ["history", "History"],
  ["assignments", "Assignments"],
  ["transfers", "Transfers"],
  ["maintenance", "Maintenance"],
  ["issues", "Issues"],
  ["returns", "Returns & inspections"],
  ["qr", "QR"],
] as const;

const END_REASON: Record<string, string> = { RETURNED: "Returned", TRANSFERRED: "Transferred", LOST: "Lost", RETIRED: "Retired" };

export default async function AssetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const a = await getAssetDetail(user, id);
  if (!a) notFound();
  const { warrantyAlertDays } = await getSettings();
  const tab = (TABS.find(([k]) => k === param(sp, "tab"))?.[0] ?? "history") as (typeof TABS)[number][0];

  const g = a.assignments.find((x) => x.isActive) ?? null;
  const openReturn = a.returns.find((r) => r.status === "REQUESTED" || r.status === "RECEIVED") ?? null;
  const pendingTransfer = a.transfers.find((t) => t.status === "REQUESTED") ?? null;
  const qrUrl = `${await appUrl()}/scan/${a.qrToken}`;
  const qr = await QRCode.toDataURL(qrUrl, { margin: 1, width: 512 });
  const w = a.warrantyEnd ? daysUntil(a.warrantyEnd) : null;

  const details: [string, React.ReactNode][] = [
    ["Category", a.category.name],
    ["Type", a.assetType && a.assetType !== a.category.name ? a.assetType : "—"],
    ["Brand · model", [a.brand, a.model].filter(Boolean).join(" · ") || "—"],
    ["Serial no.", <span key="s" className="mono">{a.serialNumber ?? "—"}</span>],
    ["Department", a.department?.name ?? "—"],
    ["Location", a.location?.name ?? "—"],
    ["Condition", CONDITION_LABELS[a.condition]],
    ["Purchased", formatDate(a.purchaseDate)],
    ["Cost", a.purchaseCost ? rupee(a.purchaseCost) : "—"],
    ["Vendor", a.vendor?.name ?? "—"],
    [
      "Warranty",
      a.warrantyEnd ? (
        <span key="w">
          {formatDate(a.warrantyStart)} – {formatDate(a.warrantyEnd)}
          {w !== null && w >= 0 && w <= warrantyAlertDays && a.status !== "RETIRED" ? (
            <small style={{ color: "var(--at-t-warn)", display: "block" }}>Ends in {w} days</small>
          ) : w !== null && w < 0 ? (
            <small style={{ color: "var(--at-t-bad)", display: "block" }}>Expired</small>
          ) : null}
        </span>
      ) : (
        "—"
      ),
    ],
    ["Notes", a.notes || "—"],
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Assets", href: "/assets" }, { label: a.category.name, href: `/assets?category=${a.categoryId}` }, { label: a.assetTag }]}
        title={a.name}
        morph
        actions={<AssetActions asset={a} user={user} openReturn={openReturn} pendingTransfer={pendingTransfer} />}
      />
      <div className="gap8 rise">
        <span className="mono" style={{ fontSize: 13, background: "var(--at-card)", padding: "4px 10px", borderRadius: "var(--at-pill)" }}>
          {a.assetTag}
        </span>
        <StatusBadge status={a.status} />
        {openReturn?.status === "REQUESTED" ? <StatusBadge status="REQUESTED" label="Return requested" /> : null}
        {pendingTransfer ? <StatusBadge status="REQUESTED" label="Transfer pending" /> : null}
      </div>
      <Banners a={a} g={g} openReturn={openReturn} />

      <div className="row">
        <div className="side stack">
          <section className="card rise" style={{ overflow: "hidden", animationDelay: "140ms" }}>
            {a.photoPath ? (
              <Image className="asset-photo" src={fileUrl(a.photoPath)} alt={`Photo of ${a.name}`} width={480} height={170} unoptimized />
            ) : (
              <div style={{ height: 170, background: "var(--at-chip)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--at-muted)", fontSize: 13 }}>
                <CategoryIcon code={a.category.code} name={a.category.name} size={52} boxed={false} />
                No photo
              </div>
            )}
            <dl className="kv" style={{ padding: "18px 22px 22px" }}>
              {details.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card pad rise" style={{ animationDelay: "180ms", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Image src={qr} alt={`QR code for ${a.assetTag}`} width={116} height={116} unoptimized style={{ background: "#fff", borderRadius: 14, padding: 8, border: "1px solid var(--at-line)" }} />
            <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={{ fontSize: 16 }}>QR label</b>
              <span className="muted" style={{ fontSize: 14 }}>
                Scanning opens this record only for signed-in people with access.
              </span>
              <div className="gap8">
                <a className="btn sm" href={qr} download={`${a.assetTag}-qr.png`}>
                  Download PNG
                </a>
                <Link className="btn sm" href={`/label/${a.id}`} target="_blank">
                  Print label
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="main-col stack">
          {g ? (
            <section className="hero-dark pad rise" style={{ animationDelay: "160ms", display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
              <Initials name={g.employee.name} />
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 2 }}>
                <small>Currently with</small>
                <b style={{ fontSize: 20 }}>{g.employee.name}</b>
                <small>
                  {g.employee.employeeCode} · {a.currentHolder?.department.name ?? "—"} · {a.currentHolder?.location?.name ?? a.location?.name ?? "—"}
                </small>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 22, fontSize: 14 }}>
                <span>
                  <small>Assigned</small>
                  <br />
                  <b>{formatDate(g.assignedAt)}</b>
                </span>
                <span>
                  <small>Handover</small>
                  <br />
                  <b>{HANDOVER_LABELS[g.handoverStatus]}</b>
                </span>
                <span>
                  <small>Return by</small>
                  <br />
                  <b>{formatDate(g.expectedReturnDate)}</b>
                </span>
              </div>
            </section>
          ) : null}

          <section className="card rise" style={{ animationDelay: "200ms" }}>
            <div style={{ padding: 10, borderBottom: "1px solid var(--at-line)", overflowX: "auto" }}>
              <nav className="tabs" aria-label="Asset sections" style={{ boxShadow: "none" }}>
                <TabIndicator />
                {TABS.map(([k, label]) => (
                  <Link key={k} href={k === "history" ? `/assets/${a.id}` : `/assets/${a.id}?tab=${k}`} aria-current={k === tab ? "page" : undefined} scroll={false}>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <TabBody tab={tab} a={a} qr={qr} qrUrl={qrUrl} />
          </section>
        </div>
      </div>
    </>
  );
}

function Banners({ a, g, openReturn }: { a: AssetDetail; g: AssetDetail["assignments"][number] | null; openReturn: AssetDetail["returns"][number] | null }) {
  return (
    <>
      {openReturn?.status === "REQUESTED" ? (
        <div className="banner warn rise" role="status">
          <Undo2 size={20} />
          <span style={{ flex: "1 1 300px" }}>
            <b>{openReturn.returnedBy.name} asked to return this asset on {formatDate(openReturn.requestedAt)}.</b> {openReturn.reason ? `Reason: ${openReturn.reason}` : ""}
          </span>
          <Link href={`/returns/${openReturn.id}/receive`}>Receive now →</Link>
        </div>
      ) : null}
      {a.status === "RETURNED" && openReturn?.status === "RECEIVED" ? (
        <div className="banner info rise" role="status">
          <Check size={20} />
          <span style={{ flex: "1 1 300px" }}>
            <b>Returned and waiting for inspection.</b> It can&apos;t be assigned until the inspection is done.
          </span>
          <Link href={`/returns/${openReturn.id}/inspect`}>Inspect now →</Link>
        </div>
      ) : null}
      {a.status === "RETIRED" ? (
        <div className="banner bad rise">
          <Lock size={20} />
          <span>
            <b>Retired{a.retirement ? ` on ${formatDate(a.retirement.retirementDate)}` : ""}.</b>{" "}
            {a.retirement ? `${a.retirement.reason} · ${DISPOSAL_LABELS[a.retirement.disposalMethod].toLowerCase()}. ` : ""}This record is read-only.
          </span>
        </div>
      ) : null}
      {g?.handoverStatus === "DISPUTED" ? (
        <div className="banner bad rise">
          <TriangleAlert size={20} />
          <span>
            <b>Handover disputed:</b> {g.handoverNote || "the employee reported a problem"}
          </span>
        </div>
      ) : null}
    </>
  );
}

function Li({ tag, title, sub, right }: { tag: string; title: React.ReactNode; sub: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="li" style={{ background: "var(--at-chip)", flexWrap: "wrap" }}>
      <span className="tag">{tag}</span>
      <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column" }}>
        <b>{title}</b>
        <small className="muted">{sub}</small>
      </span>
      {right}
    </div>
  );
}

function TabBody({ tab, a, qr, qrUrl }: { tab: string; a: AssetDetail; qr: string; qrUrl: string }) {
  const list = (children: React.ReactNode) => <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
  const empty = (t: string) => (
    <div className="empty">
      <b>{t}</b>
    </div>
  );

  switch (tab) {
    case "assignments":
      return a.assignments.length ? (
        <div className="tw" style={{ padding: "6px 10px 14px" }}>
          <table className="tbl" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>From</th>
                <th>To</th>
                <th>Ended because</th>
                <th>Handover</th>
                <th>Accessories</th>
              </tr>
            </thead>
            <tbody>
              {a.assignments.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.employee.name}</b>
                    <br />
                    <small className="muted">by {x.assignedBy.name}</small>
                  </td>
                  <td>{formatDate(x.assignedAt)}</td>
                  <td>{x.isActive ? "Now" : formatDate(x.endedAt)}</td>
                  <td>{x.endReason ? END_REASON[x.endReason] : "—"}</td>
                  <td>
                    <StatusBadge status={x.handoverStatus} label={HANDOVER_LABELS[x.handoverStatus]} />
                  </td>
                  <td className="muted">{x.accessories.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        empty("Never assigned")
      );
    case "transfers":
      return a.transfers.length
        ? list(
            a.transfers.map((t) => (
              <Li
                key={t.id}
                tag={t.transferNo}
                title={`${t.fromEmployee?.name ?? "—"} → ${t.toEmployee.name}`}
                sub={`${t.reason} · requested by ${t.requestedBy.name} · ${formatDate(t.requestedAt)}${t.reviewRemarks ? ` · ${t.reviewRemarks}` : ""}`}
                right={<StatusBadge status={t.status} label={TRANSFER_STATUS_LABELS[t.status]} />}
              />
            )),
          )
        : empty("No transfers");
    case "maintenance": {
      const total = a.maintenance.reduce((s, m) => s + Number(m.cost), 0);
      return a.maintenance.length
        ? list(
            <>
              {a.maintenance.map((m) => (
                <Li
                  key={m.id}
                  tag={m.maintenanceNo}
                  title={m.problem}
                  sub={`${MAINTENANCE_TYPE_LABELS[m.type]} · ${m.serviceProvider ?? "—"} · ${formatDate(m.serviceDate)}${m.warrantyCovered ? " · warranty" : ""}`}
                  right={
                    <>
                      <StatusBadge status={m.status} label={MAINTENANCE_STATUS_LABELS[m.status]} />
                      <b className="num">{rupee(m.cost)}</b>
                    </>
                  }
                />
              ))}
              <span className="muted">
                Total maintenance cost: <b style={{ color: "var(--at-ink)" }}>{rupee(total)}</b>
              </span>
            </>,
          )
        : empty("No maintenance yet");
    }
    case "issues":
      return a.issues.length
        ? list(
            a.issues.map((i) => (
              <Li
                key={i.id}
                tag={i.issueNo}
                title={i.title}
                sub={`${i.reportedBy.name} · ${SEVERITY_LABELS[i.severity]} · ${formatDate(i.reportedAt)}${i.resolution ? ` · ${i.resolution}` : ""}`}
                right={<StatusBadge status={i.status} label={ISSUE_STATUS_LABELS[i.status]} />}
              />
            )),
          )
        : empty("No issues reported");
    case "returns":
      return a.returns.length
        ? list(
            a.returns.map((r) => (
              <Li
                key={r.id}
                tag={r.returnNo}
                title={`Returned by ${r.returnedBy.name}`}
                sub={[
                  r.reason,
                  r.condition ? `condition ${CONDITION_LABELS[r.condition].toLowerCase()}` : null,
                  r.missingAccessories.length ? `missing ${r.missingAccessories.join(", ")}` : null,
                  r.inspection ? `inspection: ${INSPECTION_RESULT_LABELS[r.inspection.result]}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                right={<StatusBadge status={r.status} label={RETURN_STATUS_LABELS[r.status]} />}
              />
            )),
          )
        : empty("No returns yet");
    case "qr":
      return (
        <div style={{ padding: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <Image src={qr} alt={`QR code for ${a.assetTag}`} width={220} height={220} unoptimized style={{ background: "#fff", borderRadius: 18, padding: 12, border: "1px solid var(--at-line)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 260px" }}>
            <b style={{ fontSize: 18 }}>{a.assetTag}</b>
            <span className="muted" style={{ fontSize: 14 }}>
              Encodes a random link, not the asset ID: <span className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>{qrUrl}</span>
            </span>
            <span className="muted" style={{ fontSize: 14 }}>People without access see &quot;You don&apos;t have access&quot; and no details.</span>
            <div className="gap8">
              <a className="btn pri" href={qr} download={`${a.assetTag}-qr.png`}>
                Download PNG
              </a>
              <Link className="btn" href={`/label/${a.id}`} target="_blank">
                Print label
              </Link>
              <Link className="btn" href={`/scan/${a.qrToken}`}>
                Test scan
              </Link>
            </div>
          </div>
        </div>
      );
    default:
      return <Timeline items={a.history} />;
  }
}
