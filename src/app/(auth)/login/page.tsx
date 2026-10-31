import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { getCurrentUser } from "@/server/permissions";
import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings";
import { STATUS_COLORS } from "@/lib/labels";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Already signed in with a valid, active account → go home. A stale cookie just shows the form.
  if (await getCurrentUser()) redirect("/");
  const { orgName } = await getSettings();
  // Status colours only — no asset details are exposed before sign-in.
  const statuses = await prisma.asset.findMany({ select: { status: true }, orderBy: { createdAt: "asc" }, take: 90 });
  const cells = Array.from({ length: Math.min(90, statuses.length * 3) }, (_, i) => statuses[i % statuses.length].status);

  return (
    // <main>: the page's landmark for screen readers (Lighthouse "Document does not have a main landmark").
    <main className="login">
      <section className="hero rise">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="logo" style={{ background: "var(--at-hd-ink)", color: "var(--at-hd)" }}>
            <Briefcase size={22} strokeWidth={1.8} />
          </span>
          <b style={{ fontSize: 22, fontFamily: "var(--at-display)" }}>AssetTrace</b>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h1>Every asset, every hand it passes through.</h1>
          <p style={{ margin: 0, fontSize: 17, maxWidth: 480, opacity: 0.85 }}>
            Register, assign, transfer, repair, return and retire company equipment, with a full trail of who did what and when.
          </p>
          <div className="cells" role="img" aria-label="Assets coloured by status" style={{ maxWidth: 470 }}>
            {cells.map((s, i) => (
              <i key={i} style={{ background: STATUS_COLORS[s], animationDelay: `${300 + i * 9}ms` }} />
            ))}
          </div>
        </div>
        <small style={{ opacity: 0.7 }}>{orgName} · internal system · authorised staff only</small>
      </section>
      <section className="formside rise" style={{ animationDelay: "120ms" }}>
        <LoginForm next={next ?? ""} />
      </section>
    </main>
  );
}
