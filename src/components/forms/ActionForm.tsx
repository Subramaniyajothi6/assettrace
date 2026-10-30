"use client";

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/utils";

/** Outcome of the last submit, so the submit button can show a tick or shake (`n` restarts the animation). */
type Flash = { kind: "ok" | "err"; n: number } | null;
type FormCtx = { errors: Record<string, string>; pending: boolean; prefix: string; flash: Flash };
const Ctx = createContext<FormCtx>({ errors: {}, pending: false, prefix: "f", flash: null });
export const useFormCtx = () => useContext(Ctx);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyResult = ActionResult<any>;
/** The success payload of an action result type. */
export type DataOf<R> = R extends { ok: true; data: infer D } ? D : never;

export type ToastMsg = string | { title: string; description?: string };

type Props<R extends AnyResult, T = DataOf<R>> = {
  action: (fd: FormData) => Promise<R>;
  /** Toast on success: a line of text, or a bold title with a detail line. */
  success?: ToastMsg | ((data: T) => ToastMsg);
  /** Navigate after success; otherwise the page is refreshed. */
  redirectTo?: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  /** Extra check before sending (e.g. signature present). Return an error message to block. */
  beforeSubmit?: (fd: FormData) => string | null | Promise<string | null>;
  resetOnSuccess?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Form that posts FormData to a server action, shows field errors inline and a toast,
 * then refreshes or navigates. Validation is Zod on the server (single source of truth).
 */
export function ActionForm<R extends AnyResult>({ action, success, redirectTo, onSuccess, beforeSubmit, resetOnSuccess, className, style, children }: Props<R>) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const prefix = useId();
  const [flash, setFlash] = useState<Flash>(null);
  useEffect(() => {
    if (flash?.kind !== "ok") return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name) fd.set(submitter.name, submitter.value);
    const blocked = beforeSubmit ? await beforeSubmit(fd) : null;
    if (blocked) {
      toast.error(blocked);
      setFlash({ kind: "err", n: Date.now() });
      return;
    }
    start(async () => {
      const res: AnyResult | undefined = await action(fd);
      if (!res) return; // the action redirected
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        setFlash({ kind: "err", n: Date.now() });
        const first = res.fieldErrors && Object.keys(res.fieldErrors)[0];
        if (first) (form.querySelector(`[name="${first}"], [name="${first}[]"]`) as HTMLElement | null)?.focus();
        return;
      }
      setErrors({});
      setFlash({ kind: "ok", n: Date.now() });
      if (success) {
        const msg = typeof success === "function" ? success(res.data) : success;
        if (typeof msg === "string") toast.success(msg);
        else toast.success(msg.title, { description: msg.description });
      }
      if (resetOnSuccess) form.reset();
      onSuccess?.(res.data);
      if (redirectTo) router.push(typeof redirectTo === "function" ? redirectTo(res.data) : redirectTo);
      else router.refresh();
    });
  }

  return (
    <Ctx.Provider value={{ errors, pending, prefix, flash }}>
      <form onSubmit={onSubmit} className={className} style={style} noValidate>
        {children}
      </form>
    </Ctx.Provider>
  );
}

/** Label + control + inline error. Gives the (single) child control a form-unique id so several forms can share field names. */
export function Field({
  name,
  label,
  hint,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const { errors, prefix } = useFormCtx();
  const err = errors[name];
  const id = `${prefix}-${name}`;
  const only = Children.count(children) === 1 && isValidElement<{ id?: string }>(children) ? children : null;
  return (
    <div className={cn("f", err && "has-err", className)}>
      <label htmlFor={id}>{label}</label>
      {only ? cloneElement(only, { id }) : children}
      {err ? (
        <span className="err" role="alert">
          {err}
        </span>
      ) : hint ? (
        <small className="muted">{hint}</small>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  className,
  name,
  value,
  pendingText = "Saving…",
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingText?: string;
}) {
  const { pending, flash } = useFormCtx();
  const saved = !pending && flash?.kind === "ok";
  const shake = !pending && flash?.kind === "err";
  return (
    // Keyed on the error so each failed submit replays the shake.
    <button key={shake ? flash.n : "btn"} type="submit" className={cn("btn pri", className, shake && "shake", saved && "is-saved")} disabled={pending} name={name} value={value}>
      {pending ? (
        <span className="btn-state">
          <span className="spin" aria-hidden="true" /> {pendingText}
        </span>
      ) : saved ? (
        <span className="btn-state">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path className="tick" d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>{" "}
          Saved
        </span>
      ) : (
        children
      )}
    </button>
  );
}

type Option = { value: string; label: string };

/** <select class="inp"> with options and an optional empty choice. */
export function Select({
  id,
  name,
  options,
  defaultValue,
  placeholder,
  required,
  onChange,
}: {
  id?: string;
  name: string;
  options: Option[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <select
      id={id ?? name}
      name={name}
      className="inp"
      defaultValue={defaultValue ?? ""}
      required={required}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
