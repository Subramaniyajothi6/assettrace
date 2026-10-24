import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { param, type SearchParams } from "@/lib/list";
import { ReportIssueForm } from "./ReportIssueForm";

export const metadata = { title: "Report an issue" };

export default async function ReportIssuePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const assets = user.employeeId
    ? await prisma.asset.findMany({ where: { currentHolderId: user.employeeId }, select: { id: true, name: true, assetTag: true }, orderBy: { name: "asc" } })
    : [];
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/home" }, { label: "Report issue" }]} title="Report an issue" />
      {assets.length ? (
        <ReportIssueForm assets={assets} initialAssetId={param(sp, "asset")} />
      ) : (
        <EmptyState title="You don't hold any assets">Issues can only be reported for assets assigned to you.</EmptyState>
      )}
    </>
  );
}
