"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/forms/ActionForm";
import { scanTagAction } from "@/actions/assets";

const READER_ID = "qr-reader";

/** Camera QR scanner (html5-qrcode) with manual asset-ID entry as a fallback. */
export function Scanner() {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanner = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode(READER_ID);
      scanner.current = s;
      try {
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            // Only follow links to our own scan route; never open arbitrary URLs.
            const m = /\/scan\/([A-Za-z0-9_-]+)\/?$/.exec(text);
            if (!m) {
              setError("That QR code isn't an AssetTrace label.");
              return;
            }
            void s.stop().finally(() => router.push(`/scan/${m[1]}`));
          },
          () => {},
        );
      } catch {
        setError("Couldn't open the camera. Allow camera access, or type the asset ID below.");
        setOn(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = scanner.current;
      scanner.current = null;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [on, router]);

  return (
    <section className="hero-dark pad side rise" style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="viewfinder" style={{ display: on ? "block" : undefined }}>
        <div id={READER_ID} style={{ width: "100%", height: "100%" }} />
        {!on ? (
          <>
            <span className="c" style={{ left: "26%", top: "18%", borderLeftWidth: 4, borderTopWidth: 4, borderRadius: "10px 0 0 0" }} />
            <span className="c" style={{ right: "26%", top: "18%", borderRightWidth: 4, borderTopWidth: 4, borderRadius: "0 10px 0 0" }} />
            <span className="c" style={{ left: "26%", bottom: "18%", borderLeftWidth: 4, borderBottomWidth: 4, borderRadius: "0 0 0 10px" }} />
            <span className="c" style={{ right: "26%", bottom: "18%", borderRightWidth: 4, borderBottomWidth: 4, borderRadius: "0 0 10px 0" }} />
            <span className="line" />
          </>
        ) : null}
      </div>
      <button type="button" className="btn pri" onClick={() => { setError(null); setOn((v) => !v); }}>
        {on ? <CameraOff size={18} /> : <Camera size={18} />} {on ? "Stop camera" : "Start camera"}
      </button>
      {error ? (
        <span role="alert" style={{ color: "var(--at-hd-bad)", fontWeight: 600 }}>
          {error}
        </span>
      ) : (
        <span>Point your camera at the QR label on the asset. It opens the record if you have access.</span>
      )}
      <ActionForm action={scanTagAction} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Field name="tag" label="Or type the asset ID" className="main-col">
          <input name="tag" className="inp mono" placeholder="AST-LAP-0001" autoComplete="off" />
        </Field>
        <SubmitButton pendingText="Opening…">Open</SubmitButton>
      </ActionForm>
    </section>
  );
}
