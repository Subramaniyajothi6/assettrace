"use client";

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> };
};

/**
 * Switch light/dark with motion: where the browser supports View Transitions, the new theme spreads out as a
 * circle from the button that was clicked; elsewhere the colours fade. Instant with prefers-reduced-motion.
 */
export function switchTheme(from: HTMLElement, next: "light" | "dark", setTheme: (t: string) => void) {
  const root = document.documentElement;
  const apply = () => {
    // next-themes applies the attribute in an effect; set it now so the transition snapshot has the new colours.
    root.setAttribute("data-mode", next);
    root.style.colorScheme = next;
    setTheme(next);
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();

  const doc = document as ViewTransitionDoc;
  if (!doc.startViewTransition) {
    root.classList.add("theme-fade");
    apply();
    window.setTimeout(() => root.classList.remove("theme-fade"), 400);
    return;
  }
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  // The skin fades body/button colours (transition: background-color .5s). Left on, the "new" snapshot would be
  // taken mid-fade, still in the old colours, and the circle would reveal nothing. Switch them off meanwhile.
  root.classList.add("theme-switching");
  const t = doc.startViewTransition(() => {
    apply();
    void root.offsetHeight; // flush styles so the snapshot has the final colours
  });
  t.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {});
  // Clean up whether the transition ran or was skipped; a skipped one rejects, which is not an error.
  t.finished.catch(() => {}).finally(() => root.classList.remove("theme-switching"));
  t.updateCallbackDone.catch(() => {});
}
