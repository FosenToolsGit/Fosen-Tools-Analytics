"use client";

// Etikett-editor — Brother QL-580N hyllekant-etiketter (60×28mm, DK-11209).
// Gjenbruker produktvelger-flyt fra prisplakat (URL-scrape, topp populære,
// import fra brosjyre/prisplakat). PDF-eksport via jsPDF (en side per etikett).

import { useState, useEffect, useCallback } from "react";
import type { EtikettProduct } from "./types";
import { LABEL_W_MM, LABEL_H_MM } from "./types";
import { LabelPreview } from "./label-renderer";
import { exportEtiketterToPdf } from "./export-pdf";

type BrochureListItem = { id: string; title: string; page_count: number; updated_at: string };
type PlaylistListItem = { id: string; title: string; products: EtikettProduct[] };

const STORAGE_KEY = "ft-etikett-state-v1";

export function EtikettEditor() {
  const [products, setProducts] = useState<EtikettProduct[]>([]);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState<"none" | "brosjyre" | "prisplakat">("none");
  const [brochures, setBrochures] = useState<BrochureListItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistListItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [zoom, setZoom] = useState(4); // px per mm i preview

  // Last lokal state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (Array.isArray(state.products)) setProducts(state.products);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products }));
    } catch { /* ignore */ }
  }, [products]);

  const scrapeProduct = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    try {
      const r = await fetch(`/api/brosjyre/scrape-product?url=${encodeURIComponent(scrapeUrl)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Scrape failed");
      setProducts(prev => [...prev, d.product]);
      setScrapeUrl("");
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Feil");
    } finally {
      setScraping(false);
    }
  };

  const suggestPopular = useCallback(async () => {
    setScraping(true);
    setScrapeError(null);
    try {
      const r = await fetch("/api/brosjyre/suggest-products?days=60&limit=8");
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      const suggUrls = (d.suggestions || []).map((s: { url: string }) => s.url);
      const existing = new Set(products.map(p => p.source_url));
      const newUrls = suggUrls.filter((u: string) => !existing.has(u));
      for (const url of newUrls) {
        try {
          const r2 = await fetch(`/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`);
          if (!r2.ok) continue;
          const d2 = await r2.json();
          setProducts(prev => [...prev, d2.product]);
        } catch { /* skip */ }
      }
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Feil");
    } finally {
      setScraping(false);
    }
  }, [products]);

  const loadBrochures = async () => {
    try {
      const r = await fetch("/api/brosjyre/list");
      if (!r.ok) return;
      const d = await r.json();
      setBrochures(d.brochures || []);
    } catch { /* ignore */ }
  };

  const loadPlaylists = async () => {
    try {
      const r = await fetch("/api/prisplakat/list");
      if (!r.ok) return;
      const d = await r.json();
      setPlaylists(d.playlists || []);
    } catch { /* ignore */ }
  };

  const importFromBrochure = async (brochureId: string) => {
    setImporting(true);
    try {
      const r = await fetch(`/api/brosjyre/${brochureId}`);
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      const doc = d.brochure?.doc;
      if (!doc) throw new Error("No doc");
      const seen = new Map<string, EtikettProduct>();
      for (const page of doc.pages) {
        for (const o of page.objects) {
          const p = o.props?.product || o.props?.productA || o.props?.productB;
          if (p?.source_url) seen.set(p.source_url, {
            source_url: p.source_url, name: p.name, sku: p.sku ?? null,
          });
        }
      }
      const newProducts = [...seen.values()];
      setProducts(prev => {
        const existing = new Set(prev.map(p => p.source_url));
        return [...prev, ...newProducts.filter(p => !existing.has(p.source_url))];
      });
      setShowImport("none");
    } catch (e) {
      console.error(e);
      alert("Import feilet");
    } finally {
      setImporting(false);
    }
  };

  const importFromPlaylist = async (playlistId: string) => {
    setImporting(true);
    try {
      const r = await fetch(`/api/prisplakat/${playlistId}`);
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      const pl = d.playlist;
      if (!pl?.products) throw new Error("Empty");
      const newProducts: EtikettProduct[] = pl.products.map((p: { source_url: string; name?: string; sku?: string | null }) => ({
        source_url: p.source_url, name: p.name, sku: p.sku ?? null,
      }));
      setProducts(prev => {
        const existing = new Set(prev.map(p => p.source_url));
        return [...prev, ...newProducts.filter(p => !existing.has(p.source_url))];
      });
      setShowImport("none");
    } catch (e) {
      console.error(e);
      alert("Import feilet");
    } finally {
      setImporting(false);
    }
  };

  const removeProduct = (idx: number) => {
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const moveProduct = (idx: number, dir: -1 | 1) => {
    setProducts(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const setNameOverride = (idx: number, value: string) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name_override: value || undefined } : p));
  };

  const exportAll = async () => {
    try {
      await exportEtiketterToPdf(products, "etiketter");
    } catch (e) {
      console.error(e);
      alert("PDF-eksport feilet: " + (e instanceof Error ? e.message : "ukjent"));
    }
  };

  return (
    <div className="brosjyre-editor" style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column",
      background: "var(--chrome-bg)", color: "var(--chrome-text)",
      fontFamily: 'var(--body-stack, "Manrope", system-ui)',
    }}>
      {/* Toolbar */}
      <div className="no-print" style={{
        height: 56, background: "var(--chrome-bg-2)", borderBottom: "1px solid var(--chrome-border)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0,
      }}>
        <a href="/dashboard" style={{ color: "#fff", textDecoration: "none", fontSize: 14 }}>← Dashboard</a>
        <div style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 13, marginRight: 16 }}>
          ETIKETTER
        </div>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)" }}>
          Brother QL-580N · DK-11209 · {LABEL_W_MM}×{LABEL_H_MM}mm
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--chrome-muted)" }}>
            {products.length} etikett{products.length === 1 ? "" : "er"}
          </span>
          <button onClick={exportAll} disabled={products.length === 0} style={{
            background: "var(--ft-red)", color: "#fff", border: "none",
            padding: "6px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700,
            cursor: products.length > 0 ? "pointer" : "not-allowed",
            opacity: products.length > 0 ? 1 : 0.5,
          }}>Eksporter PDF</button>
        </div>
      </div>

      {/* Body: 2-panel layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr", overflow: "hidden" }}>
        {/* Venstre — produktvelger + liste */}
        <div style={{
          background: "var(--chrome-bg-2)", borderRight: "1px solid var(--chrome-border)",
          overflowY: "auto", padding: 14,
        }}>
          <div style={{ fontSize: 11, color: "var(--ft-red)", marginBottom: 8, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Legg til produkt</div>
          <input
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="fosen-tools.no/produkter/..."
            onKeyDown={(e) => { if (e.key === "Enter") scrapeProduct(); }}
            style={{
              width: "100%", background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)",
              color: "#fff", padding: "8px 10px", borderRadius: 4, fontSize: 12, fontFamily: "inherit",
              boxSizing: "border-box", marginBottom: 6,
            }}
          />
          <button onClick={scrapeProduct} disabled={scraping || !scrapeUrl.trim()} style={{
            width: "100%", background: "var(--ft-red)", color: "#fff", border: "none",
            padding: "8px 12px", borderRadius: 4, fontSize: 12, fontWeight: 700,
            cursor: scrapeUrl.trim() ? "pointer" : "not-allowed", opacity: scrapeUrl.trim() ? 1 : 0.5,
          }}>{scraping ? "Henter..." : "Hent fra URL"}</button>
          {scrapeError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{scrapeError}</div>}

          <button onClick={() => { setShowImport("brosjyre"); loadBrochures(); }} style={{
            width: "100%", background: "transparent", color: "#fff",
            border: "1px solid var(--chrome-border)",
            padding: "8px 12px", borderRadius: 4, fontSize: 12, marginTop: 8,
            cursor: "pointer",
          }}>↥ Importér fra brosjyre</button>

          <button onClick={() => { setShowImport("prisplakat"); loadPlaylists(); }} style={{
            width: "100%", background: "transparent", color: "#fff",
            border: "1px solid var(--chrome-border)",
            padding: "8px 12px", borderRadius: 4, fontSize: 12, marginTop: 6,
            cursor: "pointer",
          }}>↥ Importér fra prisplakat</button>

          <button onClick={suggestPopular} disabled={scraping} style={{
            width: "100%", background: "transparent", color: "#fff",
            border: "1px solid var(--chrome-border)",
            padding: "8px 12px", borderRadius: 4, fontSize: 12, marginTop: 6,
            cursor: "pointer",
          }}>⭐ Topp 8 populære</button>

          {showImport === "brosjyre" && (
            <div style={{
              background: "var(--chrome-bg-3)", padding: 10, borderRadius: 4, marginTop: 8,
              maxHeight: 240, overflowY: "auto",
            }}>
              <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Velg brosjyre</div>
              {brochures.length === 0 && <div style={{ fontSize: 11, color: "var(--chrome-muted)" }}>Laster…</div>}
              {brochures.map(b => (
                <button key={b.id} onClick={() => importFromBrochure(b.id)} disabled={importing} style={{
                  width: "100%", textAlign: "left", background: "transparent", color: "#fff",
                  border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 11, marginBottom: 2,
                  display: "flex", flexDirection: "column", gap: 2,
                }}>
                  <span style={{ fontWeight: 600 }}>{b.title}</span>
                  <span style={{ fontSize: 9, color: "var(--chrome-muted)" }}>{b.page_count} sider</span>
                </button>
              ))}
              <button onClick={() => setShowImport("none")} style={{
                width: "100%", background: "transparent", color: "var(--chrome-muted)",
                border: "1px solid var(--chrome-border)", padding: "4px 8px",
                borderRadius: 4, fontSize: 11, marginTop: 6, cursor: "pointer",
              }}>Avbryt</button>
            </div>
          )}

          {showImport === "prisplakat" && (
            <div style={{
              background: "var(--chrome-bg-3)", padding: 10, borderRadius: 4, marginTop: 8,
              maxHeight: 240, overflowY: "auto",
            }}>
              <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Velg prisplakat</div>
              {playlists.length === 0 && <div style={{ fontSize: 11, color: "var(--chrome-muted)" }}>Laster…</div>}
              {playlists.map(pl => (
                <button key={pl.id} onClick={() => importFromPlaylist(pl.id)} disabled={importing} style={{
                  width: "100%", textAlign: "left", background: "transparent", color: "#fff",
                  border: "none", padding: "6px 4px", cursor: "pointer", fontSize: 11, marginBottom: 2,
                  display: "flex", flexDirection: "column", gap: 2,
                }}>
                  <span style={{ fontWeight: 600 }}>{pl.title}</span>
                  <span style={{ fontSize: 9, color: "var(--chrome-muted)" }}>{pl.products?.length || 0} produkter</span>
                </button>
              ))}
              <button onClick={() => setShowImport("none")} style={{
                width: "100%", background: "transparent", color: "var(--chrome-muted)",
                border: "1px solid var(--chrome-border)", padding: "4px 8px",
                borderRadius: 4, fontSize: 11, marginTop: 6, cursor: "pointer",
              }}>Avbryt</button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--chrome-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Etiketter ({products.length})
            </div>
            {products.length > 0 && (
              <button onClick={() => { if (confirm(`Tøm alle ${products.length} etiketter?`)) setProducts([]); }} style={{
                background: "transparent", color: "var(--chrome-muted)", border: "none",
                cursor: "pointer", fontSize: 10, padding: 2,
              }}>↺ Tøm alle</button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {products.map((p, i) => {
              const displayName = p.name_override || p.name || "(uten navn)";
              const hasOverride = !!p.name_override;
              return (
                <div key={i} style={{
                  background: "var(--chrome-bg-3)", borderRadius: 4,
                  padding: 8, display: "flex", gap: 6, alignItems: "center",
                  border: hasOverride ? "1px solid var(--ft-red)" : "1px solid transparent",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--chrome-muted)" }}>
                      {p.sku ? `Art.nr ${p.sku}` : "uten SKU"}
                    </div>
                    <input
                      type="text"
                      value={p.name_override ?? ""}
                      onChange={(e) => setNameOverride(i, e.target.value)}
                      placeholder="Overstyr navn (valgfritt)"
                      style={{
                        width: "100%", marginTop: 4, padding: "3px 5px",
                        background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)",
                        color: "#fff", borderRadius: 3, fontSize: 10, fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button onClick={() => moveProduct(i, -1)} disabled={i === 0} style={{ background: "transparent", color: "#fff", border: "none", cursor: i > 0 ? "pointer" : "not-allowed", opacity: i > 0 ? 0.6 : 0.2, fontSize: 10, padding: 1 }}>▲</button>
                    <button onClick={() => moveProduct(i, 1)} disabled={i === products.length - 1} style={{ background: "transparent", color: "#fff", border: "none", cursor: i < products.length - 1 ? "pointer" : "not-allowed", opacity: i < products.length - 1 ? 0.6 : 0.2, fontSize: 10, padding: 1 }}>▼</button>
                  </div>
                  <button onClick={() => removeProduct(i)} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Midten — preview */}
        <div style={{ background: "#1a1a1f", overflow: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {products.length === 0 && (
            <div style={{ color: "var(--chrome-muted)", fontSize: 14, marginTop: 80, textAlign: "center", maxWidth: 480 }}>
              Legg til produkter til venstre.<br/>
              Bruk URL fra fosen-tools.no, importer fra brosjyre/prisplakat, eller velg populære.
              <div style={{ fontSize: 11, marginTop: 16, opacity: 0.6 }}>
                Hver etikett blir én side på 60×28mm i PDF-eksporten.
                <br/>Skriv ut på Brother QL-580N med DK-11209 + «Skala: 100%».
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, alignSelf: "center" }}>
              <span style={{ fontSize: 11, color: "var(--chrome-muted)" }}>Zoom:</span>
              <input type="range" min={2} max={8} step={0.5} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ width: 200 }} />
              <span style={{ fontSize: 11, color: "var(--chrome-muted)", fontFamily: '"Roboto Mono", monospace' }}>
                {zoom.toFixed(1)}× ({LABEL_W_MM * zoom}×{LABEL_H_MM * zoom}px)
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
            {products.map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <LabelPreview product={p} zoom={zoom} />
                <div style={{ fontSize: 10, color: "var(--chrome-muted)", fontFamily: '"Roboto Mono", monospace' }}>
                  Side {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
