"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

export type DemoAccount = { role: string; name: string; email: string; password: string };

export function LoginForm({ next, demoAccounts }: { next: string; demoAccounts: DemoAccount[] }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(demoAccounts[1]?.email ?? "");
  const [password, setPassword] = useState(demoAccounts[1]?.password ?? "");
  const picked = demoAccounts.find((d) => d.email === email);

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
        {pending ? "Signing in…" : picked ? `Sign in as ${picked.role.toLowerCase()}` : "Sign in"}
      </button>

      {demoAccounts.length ? (
        <div className="card pad-s" style={{ display: "flex", flexDirection: "column", gap: 8, boxShadow: "none" }}>
          <small style={{ fontWeight: 700, letterSpacing: ".08em" }} className="muted">
            DEMO ACCOUNTS · TAP TO FILL
          </small>
          {demoAccounts.map((d) => (
            <button
              key={d.email}
              type="button"
              className="demo"
              aria-pressed={email === d.email}
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
            >
              <span>
                <b>{d.role}</b>
                <br />
                <small className="muted">{d.name}</small>
              </span>
              <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                {d.email}
                <br />
                <span className="muted">{d.password}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
