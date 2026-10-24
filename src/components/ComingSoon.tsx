import { Hammer } from "lucide-react";
import { PageHeader, type Crumb } from "./PageHeader";
import { EmptyState } from "./EmptyState";

/** Placeholder so every nav link resolves while later phases are being built. Remove as pages land. */
export function ComingSoon({ title, crumbs, phase }: { title: string; crumbs?: Crumb[]; phase: number }) {
  return (
    <>
      <PageHeader crumbs={crumbs ?? [{ label: title }]} title={title} />
      <EmptyState icon={<Hammer size={34} />} title="Not built yet">
        This page arrives in Phase {phase} of docs/PLAN.md.
      </EmptyState>
    </>
  );
}
