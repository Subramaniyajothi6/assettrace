import { Lock } from "lucide-react";
import { EmptyState } from "./EmptyState";

/** Shown when a signed-in user opens a page their role can't use. */
export function Denied({ home }: { home: string }) {
  return (
    <EmptyState
      icon={<Lock size={34} />}
      title="You don't have access to this page"
      action={{ label: "Back to my home", href: home }}
    >
      Your role can&apos;t open it. Ask your administrator if you think this is wrong.
    </EmptyState>
  );
}
