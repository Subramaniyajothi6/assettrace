"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type VT = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> };
type VTDoc = Document & { startViewTransition?: (update: () => Promise<void>) => VT };

/** Chrome aborts a transition whose DOM update takes ~4 s; stop waiting well before that. */
const MAX_WAIT_MS = 2500;

/** Marks the element on the destination page that the clicked link morphs into (see MorphLink). */
export const MORPH_TARGET = "record-title";

/**
 * A link whose content glides into the title of the page it opens (View Transitions): the clicked element
 * and the destination's `[data-vt="record-title"]` share one transition name. Falls back to a plain link
 * without View Transitions, with reduced motion, or for new-tab clicks.
 */
export function MorphLink({ href, className, style, children }: { href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        const doc = document as VTDoc;
        if (!doc.startViewTransition || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        e.preventDefault();
        const source = e.currentTarget;
        source.style.viewTransitionName = MORPH_TARGET;
        const t = doc.startViewTransition(
          () =>
            new Promise<void>((done) => {
              // Resolve once the destination title is on screen (not the loading skeleton). If the page is
              // slow (e.g. compiling in dev), give up early: the page then simply appears without the glide.
              const ready = () => !!document.querySelector(`[data-vt="${MORPH_TARGET}"]`) && !document.body.contains(source);
              const finish = () => {
                obs.disconnect();
                clearTimeout(timer);
                done();
              };
              const obs = new MutationObserver(() => ready() && finish());
              const timer = setTimeout(finish, MAX_WAIT_MS);
              obs.observe(document.body, { childList: true, subtree: true });
              router.push(href);
            }),
        );
        // A skipped or timed-out transition rejects these; that only means "no animation", never an error.
        const quiet = () => {};
        t.ready.catch(quiet);
        t.finished.catch(quiet);
        t.updateCallbackDone.catch(quiet);
      }}
    >
      {children}
    </Link>
  );
}
