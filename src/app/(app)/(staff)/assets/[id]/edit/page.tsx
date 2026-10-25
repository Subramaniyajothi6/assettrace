import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/server/db";
import { managedAssetScope, requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { assetFormOptions } from "@/server/queries/assets";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AssetForm } from "../../AssetForm";

export const metadata = { title: "Edit asset" };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const asset = await prisma.asset.findFirst({ where: { AND: [{ id }, managedAssetScope(user)] }, include: { category: true } });
  if (!asset) notFound();
  if (asset.status === "RETIRED") {
    return (
      <EmptyState icon={<Lock size={30} />} title="Retired assets are read-only">
        <Link className="btn" href={`/assets/${asset.id}`}>
          Back
        </Link>
      </EmptyState>
    );
  }
  const [options, { assetTagPrefix }] = await Promise.all([assetFormOptions(user), getSettings()]);
  return (
    <>
      <PageHeader crumbs={[{ label: "Assets", href: "/assets" }, { label: asset.assetTag, href: `/assets/${asset.id}` }, { label: "Edit" }]} title={`Edit ${asset.name}`} />
      <AssetForm
        options={options}
        prefix={assetTagPrefix}
        nextNumbers={{}}
        asset={{
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          assetType: asset.assetType,
          brand: asset.brand,
          model: asset.model,
          serialNumber: asset.serialNumber,
          purchaseDate: day(asset.purchaseDate),
          purchaseCost: asset.purchaseCost ? String(asset.purchaseCost) : "",
          vendorId: asset.vendorId,
          warrantyStart: day(asset.warrantyStart),
          warrantyEnd: day(asset.warrantyEnd),
          locationId: asset.locationId,
          departmentId: asset.departmentId,
          condition: asset.condition,
          notes: asset.notes,
          categoryName: asset.category.name,
        }}
      />
    </>
  );
}
