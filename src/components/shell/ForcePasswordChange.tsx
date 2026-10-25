import { KeyRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { PasswordForm } from "@/components/PasswordForm";

/** Shown instead of the app until a temporary password is replaced. */
export function ForcePasswordChange({ name }: { name: string }) {
  return (
    <div className="page bare" style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, paddingTop: 48 }}>
      <div className="banner info rise">
        <KeyRound size={20} />
        <span>
          <b>Welcome, {name.split(" ")[0]}.</b> You signed in with a temporary password. Choose your own to continue.
        </span>
      </div>
      <PasswordForm title="Set a new password" onDone="reload" />
      <form action={logoutAction} style={{ alignSelf: "center" }}>
        <button type="submit" className="btn sm">
          Sign out
        </button>
      </form>
    </div>
  );
}
