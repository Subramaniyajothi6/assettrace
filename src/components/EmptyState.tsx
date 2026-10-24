import Link from "next/link";

type Props = {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: { label: string; href: string };
};

/** Centered empty / denied / not-found card (prototype `.empty`). */
export function EmptyState({ icon, title, children, action }: Props) {
  return (
    <div className="card pad empty rise">
      {icon}
      <b>{title}</b>
      {children ? <span>{children}</span> : null}
      {action ? (
        <Link className="btn pri" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
