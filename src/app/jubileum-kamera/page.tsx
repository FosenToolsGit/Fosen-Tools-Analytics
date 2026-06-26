"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Format = "9x16" | "1x1";
type Variant = "ramme" | "minimal" | "none";
type Facing = "environment" | "user";

const DIM: Record<Format, { w: number; h: number }> = {
  "9x16": { w: 1080, h: 1920 },
  "1x1": { w: 1080, h: 1080 },
};

export default function JubileumKamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [format, setFormat] = useState<Format>("9x16");
  const [variant, setVariant] = useState<Variant>("ramme");
  const [facing, setFacing] = useState<Facing>("environment");
  const [active, setActive] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (f: Facing) => {
    setError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch (e) {
      setError(
        "Fikk ikke tilgang til kameraet. Åpne siden i Safari/Chrome og tillat kamera. " +
          (e instanceof Error ? e.message : "")
      );
      setActive(false);
    }
  }, [stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  const switchFacing = useCallback(() => {
    const next: Facing = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (active) startCamera(next);
  }, [facing, active, startCamera]);

  const overlaySrc = variant === "none" ? null : `/jubileum-kamera/${variant}-${format}.png`;

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const { w: W, h: H } = DIM[format];
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(W / vw, H / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    if (facing === "user") {
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(video, dx, dy, dw, dh);
    }

    if (overlaySrc) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, W, H);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = overlaySrc;
      });
    }

    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
  }, [format, facing, overlaySrc]);

  const dataUrlToFile = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `fosen-jubileum-${Date.now()}.jpg`, { type: "image/jpeg" });
  };

  const share = useCallback(async () => {
    if (!captured) return;
    try {
      const file = await dataUrlToFile(captured);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Fosen Tools jubileum" });
        return;
      }
    } catch {
      /* fall through til nedlasting */
    }
    const a = document.createElement("a");
    a.href = captured;
    a.download = `fosen-jubileum-${Date.now()}.jpg`;
    a.click();
  }, [captured]);

  const download = useCallback(() => {
    if (!captured) return;
    const a = document.createElement("a");
    a.href = captured;
    a.download = `fosen-jubileum-${Date.now()}.jpg`;
    a.click();
  }, [captured]);

  const ratio = format === "9x16" ? "9 / 16" : "1 / 1";

  return (
    <div style={{ minHeight: "100dvh", background: "#0F1115", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <header style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: 6, height: 22, background: "#ED1C24", borderRadius: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.04em" }}>JUBILEUMS-KAMERA</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Ta bilde med ramme · 26. juni · Brekstad</div>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 16, gap: 14 }}>
        {/* Preview / captured */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: format === "9x16" ? 340 : 460,
            aspectRatio: ratio,
            background: "#1a1d22",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {!captured && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facing === "user" ? "scaleX(-1)" : "none",
                  display: active ? "block" : "none",
                }}
              />
              {overlaySrc && active && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={overlaySrc}
                  alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                />
              )}
              {!active && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                    {error ?? "Trykk for å starte kameraet"}
                  </div>
                  <button onClick={() => startCamera(facing)} style={btnPrimary}>
                    📷 Start kamera
                  </button>
                </div>
              )}
            </>
          )}
          {captured && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captured} alt="Tatt bilde" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>

        {/* Kontroller */}
        {!captured && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Seg label="Story 9:16" on={format === "9x16"} onClick={() => setFormat("9x16")} />
              <Seg label="Kvadrat 1:1" on={format === "1x1"} onClick={() => setFormat("1x1")} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Seg label="Ramme" on={variant === "ramme"} onClick={() => setVariant("ramme")} />
              <Seg label="Minimal" on={variant === "minimal"} onClick={() => setVariant("minimal")} />
              <Seg label="Uten" on={variant === "none"} onClick={() => setVariant("none")} />
            </div>

            {active && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                <button onClick={switchFacing} style={btnGhost} aria-label="Bytt kamera">🔄</button>
                <button onClick={capture} style={shutter} aria-label="Ta bilde" />
                <div style={{ width: 48 }} />
              </div>
            )}
          </>
        )}

        {captured && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={share} style={btnPrimary}>📲 Del</button>
            <button onClick={download} style={btnGhost}>⬇︎ Last ned</button>
            <button onClick={() => setCaptured(null)} style={btnGhost}>↺ Ta nytt</button>
          </div>
        )}
      </main>

      <footer style={{ padding: "10px 16px", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        FOSEN TOOLS · 25 ÅR · TIPS: «Del» lagrer til bildene eller åpner Instagram/Facebook
      </footer>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "#ED1C24", color: "#fff", border: "none", borderRadius: 999,
  padding: "12px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 999, padding: "12px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer",
};
const shutter: React.CSSProperties = {
  width: 72, height: 72, borderRadius: "50%", background: "#fff",
  border: "5px solid rgba(237,28,36,0.9)", cursor: "pointer",
};

function Seg({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: on ? "#fff" : "rgba(255,255,255,0.08)",
        color: on ? "#0F1115" : "#fff",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 999, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
