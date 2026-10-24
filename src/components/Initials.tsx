import { cn } from "@/lib/utils";

const COLORS = ["#DDE6F4", "#DCEFE2", "#F6D3E3", "#FBEBD2", "#EDE7F6", "#E3EBF7", "#CFE3DF"];

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Round initials avatar, colour picked from the name (same as the prototype). */
export function Initials({ name, small, className }: { name: string; small?: boolean; className?: string }) {
  return (
    <span
      className={cn("av", small && "sm", className)}
      style={{ background: COLORS[name.length % COLORS.length], color: "#141414" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
