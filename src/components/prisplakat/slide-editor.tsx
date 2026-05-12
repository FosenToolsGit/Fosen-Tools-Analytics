"use client";

// Slide-editor — list + per-slide edit-panel for custom slides.
// Brukes i prisplakat-editorens høyre kolonne for slideshow-formater.

import { useState } from "react";
import type { CustomSlide, LogoKey, PricetagProduct, SlidePlacement, SlideTemplate } from "./types";
import { SLIDE_TEMPLATE_LABELS, LOGO_LABELS, makeNewSlide, defaultCustomSlides, newSlideId } from "./types";

// Felles UI-konstanter
const FIELD_BG = "var(--chrome-bg)";
const PANEL_BG = "var(--chrome-bg-3)";
const BORDER = "var(--chrome-border)";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: FIELD_BG,
  border: `1px solid ${BORDER}`,
  color: "#fff",
  padding: "5px 7px",
  borderRadius: 3,
  fontSize: 11,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "var(--chrome-muted)",
  marginBottom: 2,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  color: "var(--chrome-muted)",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginTop: 10,
  marginBottom: 4,
};

interface Props {
  slides: CustomSlide[] | undefined;
  products: PricetagProduct[];
  onChange: (slides: CustomSlide[]) => void;
}

export function SlideEditor({ slides, products, onChange }: Props) {
  const current = slides ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const update = (id: string, patch: Partial<CustomSlide>) => {
    onChange(current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const remove = (id: string) => {
    if (!confirm("Slette denne slide?")) return;
    onChange(current.filter((s) => s.id !== id));
  };

  const duplicate = (id: string) => {
    const src = current.find((s) => s.id === id);
    if (!src) return;
    const copy: CustomSlide = {
      ...src,
      id: newSlideId(),
      label: (src.label || src.template) + " (kopi)",
      order: src.order + 1,
    };
    onChange([...current, copy]);
  };

  const addNew = (template: SlideTemplate) => {
    const slide = makeNewSlide(template);
    onChange([...current, slide]);
    setShowAdd(false);
    setExpandedId(slide.id);
  };

  const restoreDefaults = () => {
    if (!confirm("Tilbakestille til standard intro/sertifisert/kontakt-slides? (Dette overskriver din custom slide-liste)")) return;
    onChange(defaultCustomSlides());
  };

  // Flytt opp/ned innen samme placement
  const move = (id: string, dir: -1 | 1) => {
    const idx = current.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[idx], next[target]] = [next[target], next[idx]];
    // Re-tildel order-tall så de er stabile
    onChange(next.map((s, i) => ({ ...s, order: i })));
  };

  if (current.length === 0) {
    return (
      <div style={{ padding: 8, background: PANEL_BG, borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 6 }}>
          Ingen custom slides. Slideshowet bruker da bare produktene.
        </div>
        <button onClick={restoreDefaults} style={{
          width: "100%", background: "var(--ft-red)", color: "#fff", border: "none",
          padding: "6px 10px", borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: "pointer",
          marginBottom: 4,
        }}>+ Last inn standard-slides</button>
        <button onClick={() => addNew("blank")} style={{
          width: "100%", background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
          padding: "6px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer",
        }}>+ Tom slide</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {current.map((slide, idx) => (
        <SlideRow
          key={slide.id}
          slide={slide}
          idx={idx}
          total={current.length}
          products={products}
          expanded={expandedId === slide.id}
          onToggle={() => setExpandedId(expandedId === slide.id ? null : slide.id)}
          onChange={(patch) => update(slide.id, patch)}
          onDelete={() => remove(slide.id)}
          onDuplicate={() => duplicate(slide.id)}
          onMove={(dir) => move(slide.id, dir)}
        />
      ))}

      {showAdd ? (
        <div style={{ background: PANEL_BG, padding: 8, borderRadius: 4, marginTop: 4 }}>
          <div style={sectionLabel}>Velg mal å starte med</div>
          {(Object.entries(SLIDE_TEMPLATE_LABELS) as [SlideTemplate, string][]).map(([key, label]) => (
            <button key={key} onClick={() => addNew(key)} style={{
              width: "100%", textAlign: "left", background: "transparent", color: "#fff",
              border: `1px solid ${BORDER}`, padding: "5px 8px", borderRadius: 3,
              fontSize: 11, marginBottom: 3, cursor: "pointer",
            }}>{label}</button>
          ))}
          <button onClick={() => setShowAdd(false)} style={{
            width: "100%", background: "transparent", color: "var(--chrome-muted)",
            border: "none", padding: 4, fontSize: 10, marginTop: 2, cursor: "pointer",
          }}>Avbryt</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
          padding: "6px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer", marginTop: 6,
        }}>+ Ny slide</button>
      )}

      <button onClick={restoreDefaults} style={{
        background: "transparent", color: "var(--chrome-muted)", border: `1px solid ${BORDER}`,
        padding: "5px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", marginTop: 4,
      }}>↺ Tilbakestill til standard-slides</button>
    </div>
  );
}

interface SlideRowProps {
  slide: CustomSlide;
  idx: number;
  total: number;
  products: PricetagProduct[];
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CustomSlide>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}

function SlideRow({ slide, idx, total, products, expanded, onToggle, onChange, onDelete, onDuplicate, onMove }: SlideRowProps) {
  return (
    <div style={{
      background: PANEL_BG, borderRadius: 4,
      border: slide.enabled ? "1px solid transparent" : `1px dashed ${BORDER}`,
      opacity: slide.enabled ? 1 : 0.55,
    }}>
      <div style={{ padding: 8, display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={onToggle} style={{
          background: "transparent", color: "var(--chrome-muted)", border: "none",
          cursor: "pointer", fontSize: 10, padding: 2, flexShrink: 0,
        }} title={expanded ? "Lukk" : "Åpne"}>{expanded ? "▾" : "▸"}</button>

        {/* Color-swatch som visuell indikator */}
        <div style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          background: slide.bg_color,
          border: "1px solid rgba(255,255,255,0.2)",
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {slide.label || SLIDE_TEMPLATE_LABELS[slide.template]}
          </div>
          <div style={{ fontSize: 9, color: "var(--chrome-muted)" }}>
            {SLIDE_TEMPLATE_LABELS[slide.template]} · {slide.placement === "start" ? "Først" : slide.placement === "end" ? "Sist" : `Etter ${slide.after_product_idx != null ? `#${slide.after_product_idx + 1}` : "?"}`}
          </div>
        </div>

        <button onClick={() => onChange({ enabled: !slide.enabled })} style={{
          background: "transparent", color: slide.enabled ? "#16a34a" : "var(--chrome-muted)",
          border: "none", cursor: "pointer", fontSize: 12, padding: 2,
        }} title={slide.enabled ? "Skjul slide" : "Vis slide"}>{slide.enabled ? "●" : "○"}</button>
        <button onClick={() => onMove(-1)} disabled={idx === 0} style={{ background: "transparent", color: "#fff", border: "none", cursor: idx > 0 ? "pointer" : "not-allowed", opacity: idx > 0 ? 0.6 : 0.2, fontSize: 10, padding: 2 }}>▲</button>
        <button onClick={() => onMove(1)} disabled={idx === total - 1} style={{ background: "transparent", color: "#fff", border: "none", cursor: idx < total - 1 ? "pointer" : "not-allowed", opacity: idx < total - 1 ? 0.6 : 0.2, fontSize: 10, padding: 2 }}>▼</button>
        <button onClick={onDuplicate} style={{ background: "transparent", color: "var(--chrome-muted)", border: "none", cursor: "pointer", fontSize: 10, padding: 2 }} title="Duplisér">⎘</button>
        <button onClick={onDelete} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
      </div>

      {expanded && (
        <div style={{ padding: "0 8px 10px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
          {/* ─── Etikett + mal ─── */}
          <div style={sectionLabel}>Generelt</div>
          <label style={labelStyle}>Etikett (kun synlig i listen)</label>
          <input type="text" value={slide.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} style={fieldStyle} placeholder={SLIDE_TEMPLATE_LABELS[slide.template]} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            <div>
              <label style={labelStyle}>Mal (utgangspunkt)</label>
              <select value={slide.template} onChange={(e) => onChange({ template: e.target.value as SlideTemplate })} style={fieldStyle}>
                {(Object.entries(SLIDE_TEMPLATE_LABELS) as [SlideTemplate, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Plassering</label>
              <select value={slide.placement} onChange={(e) => onChange({ placement: e.target.value as SlidePlacement })} style={fieldStyle}>
                <option value="start">Først</option>
                <option value="end">Sist</option>
                <option value="after_product">Etter produkt …</option>
              </select>
            </div>
          </div>

          {slide.placement === "after_product" && (
            <div style={{ marginTop: 6 }}>
              <label style={labelStyle}>Etter hvilket produkt?</label>
              <select
                value={slide.after_product_idx ?? 0}
                onChange={(e) => onChange({ after_product_idx: parseInt(e.target.value, 10) })}
                style={fieldStyle}
              >
                {products.map((p, i) => (
                  <option key={i} value={i}>#{i + 1} — {p.name_override || p.name || p.source_url}</option>
                ))}
                {products.length === 0 && <option value={0}>(ingen produkter)</option>}
              </select>
            </div>
          )}

          {/* ─── Bakgrunn ─── */}
          <div style={sectionLabel}>Bakgrunn</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label style={labelStyle}>Bakgrunnsfarge</label>
              <input type="color" value={slide.bg_color} onChange={(e) => onChange({ bg_color: e.target.value })} style={{ width: "100%", height: 28, border: "none", background: "transparent" }} />
            </div>
            <div>
              <label style={labelStyle}>Accent-farge</label>
              <input type="color" value={slide.accent_color} onChange={(e) => onChange({ accent_color: e.target.value })} style={{ width: "100%", height: 28, border: "none", background: "transparent" }} />
            </div>
          </div>
          <label style={{ ...labelStyle, marginTop: 6 }}>Tekst-farge</label>
          <input type="color" value={slide.text_color} onChange={(e) => onChange({ text_color: e.target.value })} style={{ width: "100%", height: 28, border: "none", background: "transparent" }} />
          <label style={{ ...labelStyle, marginTop: 6 }}>Bakgrunnsbilde (URL)</label>
          <input type="text" value={slide.bg_image_url ?? ""} onChange={(e) => onChange({ bg_image_url: e.target.value || null })} placeholder="https://… (la stå tom for kun farge)" style={fieldStyle} />
          {slide.bg_image_url && (
            <div style={{ marginTop: 4 }}>
              <label style={labelStyle}>Mørk overlay over bilde (0-100%)</label>
              <input type="range" min={0} max={1} step={0.05} value={slide.bg_dim ?? 0} onChange={(e) => onChange({ bg_dim: parseFloat(e.target.value) })} style={{ width: "100%" }} />
            </div>
          )}

          {/* ─── Logoer ─── */}
          <div style={sectionLabel}>Logoer</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label style={labelStyle}>Topp-logo</label>
              <select value={slide.top_logo ?? ""} onChange={(e) => onChange({ top_logo: (e.target.value || null) as LogoKey })} style={fieldStyle}>
                <option value="">— Ingen</option>
                {(Object.entries(LOGO_LABELS) as [NonNullable<LogoKey>, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Bunn-logo</label>
              <select value={slide.bottom_logo ?? ""} onChange={(e) => onChange({ bottom_logo: (e.target.value || null) as LogoKey })} style={fieldStyle}>
                <option value="">— Ingen</option>
                {(Object.entries(LOGO_LABELS) as [NonNullable<LogoKey>, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {(slide.top_logo === "custom" || slide.bottom_logo === "custom") && (
            <div style={{ marginTop: 6 }}>
              <label style={labelStyle}>Egen logo (URL)</label>
              <input type="text" value={slide.custom_logo_url ?? ""} onChange={(e) => onChange({ custom_logo_url: e.target.value || undefined })} style={fieldStyle} placeholder="https://…" />
            </div>
          )}

          {/* ─── Tekst-innhold ─── */}
          {slide.template !== "multi_product" && slide.template !== "combo" && (
            <>
              <div style={sectionLabel}>Tekst</div>
              <label style={labelStyle}>Eyebrow (liten tekst på toppen)</label>
              <input type="text" value={slide.eyebrow ?? ""} onChange={(e) => onChange({ eyebrow: e.target.value })} style={fieldStyle} placeholder="KAMPANJE VÅR 2026" />
              <label style={{ ...labelStyle, marginTop: 6 }}>
                Tittel (\n for linjeskift)
              </label>
              <textarea
                value={slide.title ?? ""}
                onChange={(e) => onChange({ title: e.target.value })}
                rows={3}
                style={{ ...fieldStyle, resize: "vertical", minHeight: 50 }}
                placeholder={"SERTIFISERT\nLEVERANDØR\nTIL FORSVARET"}
              />
              <label style={{ ...labelStyle, marginTop: 6 }}>Undertekst</label>
              <input type="text" value={slide.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} style={fieldStyle} placeholder="HDFI · CADLAB · BREKSTAD" />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--chrome-muted)", marginTop: 6 }}>
                <input type="checkbox" checked={slide.divider ?? false} onChange={(e) => onChange({ divider: e.target.checked })} />
                Vis accent-divider mellom eyebrow og tittel
              </label>

              {/* Title scale slider */}
              <label style={{ ...labelStyle, marginTop: 6 }}>Tittel-størrelse: {(slide.title_scale ?? 1).toFixed(2)}×</label>
              <input type="range" min={0.5} max={2} step={0.05} value={slide.title_scale ?? 1} onChange={(e) => onChange({ title_scale: parseFloat(e.target.value) })} style={{ width: "100%" }} />

              {/* Pills */}
              {(slide.template === "certified" || slide.template === "blank") && (
                <>
                  <label style={{ ...labelStyle, marginTop: 6 }}>
                    Pills (én per linje — vises som badges)
                  </label>
                  <textarea
                    value={(slide.pills ?? []).join("\n")}
                    onChange={(e) => onChange({ pills: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    rows={4}
                    style={{ ...fieldStyle, resize: "vertical", minHeight: 60 }}
                    placeholder={"MILJØFYRTÅRN\nGASELLE 2023\n25 ÅR"}
                  />
                </>
              )}

              {/* Footer-info */}
              {(slide.template === "outro" || slide.template === "blank") && (
                <>
                  <label style={{ ...labelStyle, marginTop: 6 }}>Telefon (stor)</label>
                  <input type="text" value={slide.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} style={fieldStyle} placeholder="72 51 51 20" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                    <div>
                      <label style={labelStyle}>URL</label>
                      <input type="text" value={slide.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} style={fieldStyle} placeholder="fosen-tools.no" />
                    </div>
                    <div>
                      <label style={labelStyle}>Åpningstider</label>
                      <input type="text" value={slide.hours ?? ""} onChange={(e) => onChange({ hours: e.target.value })} style={fieldStyle} placeholder="MAN-FRE 07:00-15:00" />
                    </div>
                  </div>
                </>
              )}

              {/* Brand-spotlight extras */}
              {slide.template === "brand_spotlight" && (
                <>
                  <label style={{ ...labelStyle, marginTop: 6 }}>Merke-navn</label>
                  <input type="text" value={slide.brand_name ?? ""} onChange={(e) => onChange({ brand_name: e.target.value })} style={fieldStyle} placeholder="Husqvarna" />
                  <label style={{ ...labelStyle, marginTop: 6 }}>Merke-logo (URL)</label>
                  <input type="text" value={slide.brand_logo_url ?? ""} onChange={(e) => onChange({ brand_logo_url: e.target.value })} style={fieldStyle} placeholder="https://… eller la stå tom for tekst-fallback" />
                </>
              )}
            </>
          )}

          {/* ─── Multi-produkt-spesifikt ─── */}
          {slide.template === "multi_product" && (
            <>
              <div style={sectionLabel}>Velg produkter (maks 4)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 200, overflowY: "auto" }}>
                {products.map((p, i) => {
                  const selected = (slide.product_indexes ?? []).includes(i);
                  return (
                    <label key={i} style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#fff",
                      padding: "3px 6px", background: selected ? "rgba(237,28,36,0.15)" : "transparent",
                      borderRadius: 3, cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const cur = slide.product_indexes ?? [];
                          if (selected) {
                            onChange({ product_indexes: cur.filter((x) => x !== i) });
                          } else if (cur.length < 4) {
                            onChange({ product_indexes: [...cur, i] });
                          }
                        }}
                      />
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        #{i + 1} {p.name_override || p.name || ""}
                      </span>
                    </label>
                  );
                })}
                {products.length === 0 && <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>Legg til produkter først</div>}
              </div>
            </>
          )}

          {/* ─── Combo-spesifikt ─── */}
          {slide.template === "combo" && (
            <>
              <div style={sectionLabel}>Combo: velg 2 produkter</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <label style={labelStyle}>Produkt A</label>
                  <select value={slide.combo_a_idx ?? 0} onChange={(e) => onChange({ combo_a_idx: parseInt(e.target.value, 10) })} style={fieldStyle}>
                    {products.map((p, i) => <option key={i} value={i}>#{i + 1} {p.name_override || p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Produkt B</label>
                  <select value={slide.combo_b_idx ?? 1} onChange={(e) => onChange({ combo_b_idx: parseInt(e.target.value, 10) })} style={fieldStyle}>
                    {products.map((p, i) => <option key={i} value={i}>#{i + 1} {p.name_override || p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                <div>
                  <label style={labelStyle}>Combo-pris (kr)</label>
                  <input type="number" value={slide.combo_price ?? ""} onChange={(e) => onChange({ combo_price: e.target.value ? parseFloat(e.target.value) : undefined })} style={fieldStyle} placeholder="auto: 10% rabatt" />
                </div>
                <div>
                  <label style={labelStyle}>Badge-tekst</label>
                  <input type="text" value={slide.combo_badge ?? ""} onChange={(e) => onChange({ combo_badge: e.target.value })} style={fieldStyle} placeholder="KOMBI-PRIS" />
                </div>
              </div>
            </>
          )}

          {/* ─── Align ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginTop: 8 }}>
            <div>
              <label style={labelStyle}>Tekst-justering</label>
              <select value={slide.align ?? "center"} onChange={(e) => onChange({ align: e.target.value as "center" | "left" })} style={fieldStyle}>
                <option value="center">Sentrert</option>
                <option value="left">Venstre</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
