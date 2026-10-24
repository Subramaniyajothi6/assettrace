import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

/** Breadcrumb + big page title, actions on the right (prototype `ph()`). */
export function PageHeader({ crumbs, title, actions }: { crumbs: Crumb[]; title: string; actions?: React.ReactNode }) {
  return (
    <div className="ph rise">
      <div>
        <nav className="crumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) =>
            i === crumbs.length - 1 || !c.href ? (
              <b key={i}>{c.label}</b>
            ) : (
              <Fragment key={i}>
                <Link href={c.href}>{c.label}</Link>
                <span aria-hidden="true">›</span>
              </Fragment>
            ),
          )}
        </nav>
        <h1 className="pt">{title}</h1>
      </div>
      {actions ? <div className="gap8">{actions}</div> : null}
    </div>
  );
}
