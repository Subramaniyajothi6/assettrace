import { Computer, Network, Headphones, Keyboard, Laptop, Monitor, Mouse, Package, Printer, Projector, Router, Smartphone, Tablet, type LucideIcon } from "lucide-react";

/** Icon per asset category code (LAP, DES, MON, ...). Unknown codes fall back to a box. */
const ICONS: Record<string, LucideIcon> = {
  LAP: Laptop,
  DES: Computer,
  MON: Monitor,
  MOB: Smartphone,
  TAB: Tablet,
  KEY: Keyboard,
  MOU: Mouse,
  HEA: Headphones,
  PRN: Printer,
  RTR: Router,
  SWT: Network,
  PRJ: Projector,
};

export function CategoryIcon({ code, name, size = 18, boxed = true }: { code: string; name?: string; size?: number; boxed?: boolean }) {
  const Icon = ICONS[code] ?? Package;
  const icon = <Icon size={size} aria-hidden={!name} aria-label={name} />;
  return boxed ? (
    <span className="ico" title={name}>
      {icon}
    </span>
  ) : (
    icon
  );
}
