"use client";

import { TriangleAlert } from "lucide-react";

/** Error state for any page in the app. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.name === "ForbiddenError" || /permission|access/i.test(error.message);
  return (
    <div className="card pad empty rise">
      <TriangleAlert size={34} aria-hidden="true" />
      <b>{forbidden ? "You don't have access to this page" : "Something went wrong"}</b>
      <span>{forbidden ? "Your role can't open it." : "The page couldn't load. Check your connection and try again."}</span>
      <button type="button" className="btn pri" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
