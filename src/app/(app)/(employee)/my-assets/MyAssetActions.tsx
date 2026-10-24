import Link from "next/link";

/** Self-service actions on a held asset. Grows as later workflows land. */
export function MyAssetActions({ assetId }: { assetId: string; canReturn: boolean }) {
  return (
    <Link className="btn" href={`/report-issue?asset=${assetId}`}>
      Report issue
    </Link>
  );
}
