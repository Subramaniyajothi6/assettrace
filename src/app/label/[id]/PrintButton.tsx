"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn pri print-hide" onClick={() => window.print()}>
      Print label
      <style>{`@media print { .print-hide { display: none !important; } }`}</style>
    </button>
  );
}
