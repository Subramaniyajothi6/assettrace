import { prisma } from "@/server/db";
import { requireUser } from "@/server/permissions";
import { getSettings } from "@/server/settings";
import { assetFormOptions } from "@/server/queries/assets";
import { PageHeader } from "@/components/PageHeader";
import { AssetForm } from "../AssetForm";

export const metadata = { title: "Register asset" };

export default async function NewAssetPage() {
  const user = await requireUser();
  const [options, { assetTagPrefix }, seqs] = await Promise.all([
    assetFormOptions(user),
    getSettings(),
    prisma.sequence.findMany({ where: { name: { startsWith: "AST-" } } }),
  ]);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Assets", href: "/assets" }, { label: "Register" }]}
        title="Register an asset"
        actions={<span className="muted">Fields marked * are required</span>}
      />
      <AssetForm options={options} prefix={assetTagPrefix} nextNumbers={Object.fromEntries(seqs.map((s) => [s.name, s.value]))} />
    </>
  );
}
