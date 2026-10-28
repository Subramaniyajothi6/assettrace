"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  // Controlled so a failed sign-in keeps what was typed (React resets forms after an action).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: "-.02em" }}>Sign in</h2>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Use the account your administrator created for you.
        </p>
      </div>

      <div className="f">
        <label htmlFor="lg-e">Work email</label>
        <input
          id="lg-e"
          name="email"
          type="email"
          className="inp"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "lg-err" : undefined}
        />
      </div>
      <div className="f">
        <label htmlFor="lg-p">Password</label>
        <input
          id="lg-p"
          name="password"
          type="password"
          className="inp"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      {state.error ? (
        <p id="lg-err" className="err" role="alert" style={{ margin: 0 }}>
          {state.error}
        </p>
      ) : null}

      <button className="btn pri" style={{ height: 52 }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
