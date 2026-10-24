import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="page bare">
      <EmptyState title="Page not found" action={{ label: "Go home", href: "/" }}>
        That link doesn&apos;t lead anywhere in AssetTrace.
      </EmptyState>
    </div>
  );
}
