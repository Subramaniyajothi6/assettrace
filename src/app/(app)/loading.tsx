/** Skeleton shown while any page in the app loads. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="skel" style={{ height: 22, width: 160 }} />
      <div className="skel" style={{ height: 44, width: "min(420px, 80%)" }} />
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel" style={{ height: 120, borderRadius: "var(--at-r)" }} />
        ))}
      </div>
      <div className="skel" style={{ height: 360, borderRadius: "var(--at-r)" }} />
    </div>
  );
}
