"use client";

// Dedikert redigeringspanel for A5-kundearket. Vises i høyre panel i
// editoren når format === "a5_kundeark". Ingen "Special slides"-paradigme
// her — Brit redigerer direkte. A5 er en print-PDF, ikke en slideshow-slide.
//
// Internt lagres dataen som en jubileum_event-CustomSlide i settings.custom_slides
// så vi gjenbruker rendrings-pipelinen i a5-kundeark-renderer.tsx.

import type { CustomSlide } from "./types";

interface Props {
  slide: CustomSlide;
  onChange: (changes: Partial<CustomSlide>) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--chrome-muted)",
  marginBottom: 4,
  display: "block",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--chrome-bg-3)",
  border: "1px solid var(--chrome-border)",
  color: "var(--chrome-text)",
  borderRadius: 3,
  padding: "5px 7px",
  fontSize: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--chrome-muted)",
  marginTop: 18,
  marginBottom: 8,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function A5KundearkEditor({ slide, onChange }: Props) {
  const partners = slide.partners ?? [];

  const updatePartner = (idx: number, changes: Partial<NonNullable<CustomSlide["partners"]>[number]>) => {
    const next = partners.map((p, i) => (i === idx ? { ...p, ...changes } : p));
    onChange({ partners: next });
  };

  const addPartner = () => {
    onChange({ partners: [...partners, { name: "Ny partner", logo_url: "" }] });
  };

  const removePartner = (idx: number) => {
    onChange({ partners: partners.filter((_, i) => i !== idx) });
  };

  const movePartner = (idx: number, dir: -1 | 1) => {
    const next = [...partners];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    onChange({ partners: next });
  };

  return (
    <div>
      <div style={sectionLabel}>Tekst</div>
      <label style={labelStyle}>Eyebrow (helt øverst, under FT-logo)</label>
      <input
        type="text"
        value={slide.eyebrow ?? ""}
        onChange={(e) => onChange({ eyebrow: e.target.value })}
        style={fieldStyle}
        placeholder="25-ÅRSJUBILEUM · BUTIKKÅPNING"
      />
      <label style={{ ...labelStyle, marginTop: 8 }}>Tekst over dato (valgfri)</label>
      <textarea
        rows={2}
        value={slide.pre_title ?? ""}
        onChange={(e) => onChange({ pre_title: e.target.value })}
        style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }}
        placeholder="Valgfri intro-linje rett over 26. juni 2026 — la stå tom for å skjule"
      />
      <label style={{ ...labelStyle, marginTop: 8 }}>Dato (stor sentralt)</label>
      <input
        type="text"
        value={slide.title ?? ""}
        onChange={(e) => onChange({ title: e.target.value })}
        style={fieldStyle}
        placeholder="26. JUNI 2026"
      />
      <label style={{ ...labelStyle, marginTop: 8 }}>Subtitle (under dato)</label>
      <textarea
        rows={2}
        value={slide.subtitle ?? ""}
        onChange={(e) => onChange({ subtitle: e.target.value })}
        style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }}
        placeholder="LEVERANDØR-STANDER\nHOLD AV DAGEN"
      />
      <label style={{ ...labelStyle, marginTop: 8 }}>Tagline-linje (over tids-kort)</label>
      <input
        type="text"
        value={slide.url ?? ""}
        onChange={(e) => onChange({ url: e.target.value })}
        style={fieldStyle}
        placeholder="VI FEIRER 25 ÅR & ÅPNER PROFF-BUTIKK · BREKSTAD"
      />
      <label style={{ ...labelStyle, marginTop: 8 }}>Ekstra tekst (under tagline)</label>
      <textarea
        rows={2}
        value={slide.extra_text ?? ""}
        onChange={(e) => onChange({ extra_text: e.target.value })}
        style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }}
        placeholder="Valgfri ekstra tekst — la stå tom for å skjule"
      />

      <div style={sectionLabel}>Tider</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <label style={labelStyle}>Åpningstid</label>
          <input
            type="text"
            value={slide.hours ?? ""}
            onChange={(e) => onChange({ hours: e.target.value })}
            style={fieldStyle}
            placeholder="10:00–16:00"
          />
        </div>
        <div>
          <label style={labelStyle}>Grilling</label>
          <input
            type="text"
            value={slide.grilling_hours ?? ""}
            onChange={(e) => onChange({ grilling_hours: e.target.value })}
            style={fieldStyle}
            placeholder="Fra kl. 11"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 11 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--chrome-muted)" }}>
          <input
            type="radio"
            name="time_layout"
            checked={(slide.time_layout ?? "row") === "row"}
            onChange={() => onChange({ time_layout: "row" })}
          />
          Side om side
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--chrome-muted)" }}>
          <input
            type="radio"
            name="time_layout"
            checked={slide.time_layout === "stacked"}
            onChange={() => onChange({ time_layout: "stacked" })}
          />
          Grilling under
        </label>
      </div>

      <div style={sectionLabel}>Logo-størrelser</div>
      <label style={labelStyle}>FT-merket ({((slide.top_logo_size ?? 1) * 100).toFixed(0)} %)</label>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={slide.top_logo_size ?? 1}
        onChange={(e) => onChange({ top_logo_size: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />
      <label style={{ ...labelStyle, marginTop: 6 }}>Jubileumslogoer 25 + 100 ({((slide.jub_logo_size ?? 1) * 100).toFixed(0)} %)</label>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={slide.jub_logo_size ?? 1}
        onChange={(e) => onChange({ jub_logo_size: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />
      <label style={{ ...labelStyle, marginTop: 6 }}>Hvite partner-bokser ({((slide.partner_size ?? 1) * 100).toFixed(0)} %)</label>
      <input
        type="range"
        min={0.7}
        max={2.5}
        step={0.05}
        value={slide.partner_size ?? 1}
        onChange={(e) => onChange({ partner_size: parseFloat(e.target.value) })}
        style={{ width: "100%" }}
      />

      <div style={sectionLabel}>Farger</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <label style={labelStyle}>Bakgrunn (rød-seksjon)</label>
          <input
            type="color"
            value={slide.bg_color || "#ED1C24"}
            onChange={(e) => onChange({ bg_color: e.target.value })}
            style={{ width: "100%", height: 32, border: "none", background: "transparent" }}
          />
        </div>
        <div>
          <label style={labelStyle}>Tekst</label>
          <input
            type="color"
            value={slide.text_color || "#ffffff"}
            onChange={(e) => onChange({ text_color: e.target.value })}
            style={{ width: "100%", height: 32, border: "none", background: "transparent" }}
          />
        </div>
      </div>

      <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Partnere ({partners.length})</span>
        <button
          onClick={addPartner}
          style={{
            background: "var(--ft-red)",
            color: "#fff",
            border: "none",
            padding: "3px 10px",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >+ Legg til</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {partners.map((p, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--chrome-bg-3)",
              border: "1px solid var(--chrome-border)",
              borderRadius: 4,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--chrome-muted)", flexShrink: 0, width: 14 }}>
                {idx + 1}.
              </span>
              <input
                type="text"
                value={p.name}
                onChange={(e) => updatePartner(idx, { name: e.target.value })}
                style={{ ...fieldStyle, flex: 1, padding: "3px 6px" }}
                placeholder="Navn"
              />
              <button
                onClick={() => movePartner(idx, -1)}
                disabled={idx === 0}
                style={{ background: "transparent", border: "1px solid var(--chrome-border)", color: "var(--chrome-text)", padding: "2px 6px", borderRadius: 3, fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}
              >↑</button>
              <button
                onClick={() => movePartner(idx, 1)}
                disabled={idx === partners.length - 1}
                style={{ background: "transparent", border: "1px solid var(--chrome-border)", color: "var(--chrome-text)", padding: "2px 6px", borderRadius: 3, fontSize: 11, cursor: idx === partners.length - 1 ? "not-allowed" : "pointer", opacity: idx === partners.length - 1 ? 0.3 : 1 }}
              >↓</button>
              <button
                onClick={() => removePartner(idx)}
                style={{ background: "transparent", border: "1px solid var(--chrome-border)", color: "#ef4444", padding: "2px 6px", borderRadius: 3, fontSize: 11, cursor: "pointer" }}
              >×</button>
            </div>
            <input
              type="text"
              value={p.logo_url ?? ""}
              onChange={(e) => updatePartner(idx, { logo_url: e.target.value })}
              style={{ ...fieldStyle, fontSize: 11, padding: "3px 6px" }}
              placeholder="Logo-URL (la stå tom for tekst-fallback)"
            />
            <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--chrome-muted)" }}>
                <input
                  type="checkbox"
                  checked={p.filter_black ?? false}
                  onChange={(e) => updatePartner(idx, { filter_black: e.target.checked })}
                />
                Svart silhuett (Zweibrüder-type)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--chrome-muted)", marginLeft: "auto" }}>
                Scale
                <input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={p.scale ?? 1}
                  onChange={(e) => updatePartner(idx, { scale: parseFloat(e.target.value) || 1 })}
                  style={{ width: 50, padding: "2px 4px", fontSize: 11, background: "var(--chrome-bg-2)", border: "1px solid var(--chrome-border)", color: "var(--chrome-text)", borderRadius: 2 }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
