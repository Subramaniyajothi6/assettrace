"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

const ALL = "__all";

type Props = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
};

/**
 * Toolbar filter. Replaces the native <select>, whose list the browser opens upwards
 * when the window is short; this one always opens below and scrolls instead.
 */
export function FilterSelect({ label, value, options, onChange }: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <Select.Root value={value || ALL} onValueChange={(v) => onChange(v === ALL || v == null ? null : String(v))}>
      <Select.Trigger className="inp fsel" aria-label={label}>
        <span>{current ? `${label}: ${current.label}` : `${label}: all`}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          alignItemWithTrigger={false}
          collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}
          className="fsel-pos"
        >
          <Select.Popup className="fsel-pop">
            <Select.List>
              {[{ value: ALL, label: `${label}: all` }, ...options].map((o) => (
                <Select.Item key={o.value} value={o.value} className="fsel-item">
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="fsel-check">
                    <Check size={15} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
