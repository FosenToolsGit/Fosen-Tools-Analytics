"use client";

// Prisplakat-editor — A4-print + slideshow.
// Bruker felles produkt-velger og rendering for begge formater.

import { useState, useEffect, useCallback, useMemo } from "react";
import type { PricetagProduct, PricetagPlaylist, PricetagFormat, PricetagSettings, ProductMode, CustomSlide } from "./types";
import { DEFAULT_SETTINGS, FORMAT_LABELS, defaultCustomSlides, PRODUCT_MODE_LABELS, buildSlideList, SLIDE_TEMPLATE_LABELS, makeNewSlide } from "./types";
import { PricetagA4Single, PricetagA4_2Up, PricetagA4_4Up, PricetagA4Variants } from "./a4-renderer";
import { PricetagA5Kundeark } from "./a5-kundeark-renderer";
import { A5KundearkEditor } from "./a5-kundeark-editor";
import { Slideshow } from "./slideshow";
import { SlideEditor } from "./slide-editor";

type ListItem = { id: string; title: string; format: PricetagFormat; updated_at: string; products: PricetagProduct[]; share_token?: string };
type BrochureListItem = { id: string; title: string; page_count: number; updated_at: string };

const STORAGE_KEY = "ft-prisplakat-state-v1";

export function PrisplakatEditor() {
  const [playlists, setPlaylists] = useState<ListItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [title, setTitle] = useState("Ny prisplakat");
  const [format, setFormat] = useState<PricetagFormat>("a4_single");
  const [products, setProducts] = useState<PricetagProduct[]>([]);
  const [settings, setSettings] = useState<PricetagSettings>(DEFAULT_SETTINGS);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showPlaylistList, setShowPlaylistList] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "slideshow" | "a4">("all");
  const [zoom, setZoom] = useState(0.55);
  /** Vis midtstillings-guides (vertikal + horisontal linje gjennom midtpunktet)
   *  på A5/A4-preview. Kun visuell i editoren — påvirker IKKE PDF-eksport. */
  const [showGuides, setShowGuides] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [brochures, setBrochures] = useState<BrochureListItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // Slideshow-redigering: hvilken slide som er fokusert (ekspandert i SlideEditor)
  // og om preview er pauset manuelt.
  const [focusedSlideId, setFocusedSlideId] = useState<string | null>(null);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Bygg slide-listen for å finne hvilken idx den fokuserte slide-en har
  const previewSlides = useMemo(() => {
    if (!format.startsWith("slideshow")) return [];
    return buildSlideList(products, settings.custom_slides ?? defaultCustomSlides());
  }, [products, settings.custom_slides, format]);

  const focusedIdx = useMemo(() => {
    if (!focusedSlideId) return null;
    return previewSlides.findIndex((s) => s.kind === "custom" && s.custom?.id === focusedSlideId);
  }, [focusedSlideId, previewSlides]);

  // Når fokuset endres til en gyldig slide: hopp preview dit + pause automatisk
  // (Slik at brukeren ikke ser slide-en hoppe videre mens hen redigerer.)
  useEffect(() => {
    if (focusedIdx != null && focusedIdx >= 0) {
      setPreviewIdx(focusedIdx);
      setPreviewPaused(true);
    }
  }, [focusedIdx]);

  // Oppdater override på et produkt
  const setProductOverride = (idx: number, patch: Partial<PricetagProduct>) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  // Last spillelister
  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/prisplakat/list");
      if (!r.ok) return;
      const d = await r.json();
      setPlaylists(d.playlists || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Last lokal state fra localStorage på første mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (state.title) setTitle(state.title);
        if (state.format) setFormat(state.format);
        if (Array.isArray(state.products)) setProducts(state.products);
        if (state.settings) setSettings({ ...DEFAULT_SETTINGS, ...state.settings });
        if (state.currentId) setCurrentId(state.currentId);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save til localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentId, title, format, products, settings }));
    } catch { /* ignore quota etc */ }
  }, [currentId, title, format, products, settings]);

  // Når A5-kundeark-format velges, sørg for at det finnes en jubileum_event-slide
  // som data-kilde. Hvis ikke, opprett en default.
  useEffect(() => {
    if (format !== "a5_kundeark") return;
    const slides = settings.custom_slides ?? [];
    const hasJub = slides.some((s) => s.template === "jubileum_event");
    if (!hasJub) {
      const newSlide = makeNewSlide("jubileum_event");
      setSettings((s) => ({
        ...s,
        custom_slides: [...(s.custom_slides ?? []), newSlide],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  // Når slideshow-format velges og custom_slides mangler, last inn default-slides.
  // (For A4-formater trenger vi ikke disse.)
  useEffect(() => {
    if (format.startsWith("slideshow") && !settings.custom_slides) {
      setSettings((s) => ({ ...s, custom_slides: defaultCustomSlides() }));
    }
  }, [format, settings.custom_slides]);

  // Re-bygg slide-handler som kan gjenbrukes
  const updateCustomSlides = (slides: CustomSlide[]) => {
    setSettings((s) => ({ ...s, custom_slides: slides }));
  };

  // Scrape produkt fra URL
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

  // Lagre playlist
  const save = async () => {
    setSaveStatus("saving");
    try {
      const body = { id: currentId, title, format, products, settings };
      const r = await fetch("/api/prisplakat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setCurrentId(d.playlist.id);
      if (d.playlist.share_token) setShareToken(d.playlist.share_token);
      setSaveStatus("saved");
      loadList();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  };

  const loadPlaylist = async (id: string) => {
    try {
      const r = await fetch(`/api/prisplakat/${id}`);
      const d = await r.json();
      if (!r.ok) return;
      const pl = d.playlist as PricetagPlaylist;
      setCurrentId(pl.id);
      setShareToken(pl.share_token ?? null);
      setTitle(pl.title);
      setFormat(pl.format);
      setProducts(pl.products);
      setSettings({ ...DEFAULT_SETTINGS, ...pl.settings });
      setShowPlaylistList(false);
    } catch { /* ignore */ }
  };

  const newPlaylist = () => {
    setCurrentId(null);
    setShareToken(null);
    setTitle("Ny prisplakat");
    setFormat("a4_single");
    setProducts([]);
    setSettings(DEFAULT_SETTINGS);
    setShowPlaylistList(false);
  };

  const copyShareUrl = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/prisplakat/share/${shareToken}/play`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback for ikke-secure context
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
      finally { document.body.removeChild(ta); }
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!confirm("Slette denne prisplakaten?")) return;
    await fetch(`/api/prisplakat/${id}`, { method: "DELETE" });
    if (currentId === id) newPlaylist();
    loadList();
  };

  // Hent liste over brosjyrer for "Importer fra brosjyre"
  const loadBrochures = async () => {
    try {
      const r = await fetch("/api/brosjyre/list");
      if (!r.ok) return;
      const d = await r.json();
      setBrochures(d.brochures || []);
    } catch { /* ignore */ }
  };

  // Importer alle produkter fra en spesifikk brosjyre
  const importFromBrochure = async (brochureId: string) => {
    setImporting(true);
    try {
      const r = await fetch(`/api/brosjyre/${brochureId}`);
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      const doc = d.brochure?.doc;
      if (!doc) throw new Error("No doc");
      // Plukk ut unike produkter
      const seen = new Map<string, PricetagProduct>();
      for (const page of doc.pages) {
        for (const o of page.objects) {
          if (o.props?.product?.source_url) seen.set(o.props.product.source_url, o.props.product);
          if (o.props?.productA?.source_url) seen.set(o.props.productA.source_url, o.props.productA);
          if (o.props?.productB?.source_url) seen.set(o.props.productB.source_url, o.props.productB);
        }
      }
      const newProducts = [...seen.values()];
      setProducts(prev => {
        const existing = new Set(prev.map(p => p.source_url));
        return [...prev, ...newProducts.filter(p => !existing.has(p.source_url))];
      });
      setShowImport(false);
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

  const exportPdf = async () => {
    try {
      const { exportPricetagToPdf } = await import("./export-pdf");
      await exportPricetagToPdf({ title, format, products, settings });
    } catch (e) {
      console.error("Export failed:", e);
      alert("PDF-eksport feilet. Sjekk konsollen for detaljer.");
    }
  };

  // Telle pages basert på format og antall produkter
  const productsPerPage = format === "a4_single" ? 1 : format === "a4_2up" ? 2 : format === "a4_4up" ? 4 : (products.length || 1);
  const pageGroups: PricetagProduct[][] = [];
  if (format === "a4_variants") {
    // Variant-plakat: alle produkter på ett ark (produkt 1 = hero, alle = type-kort)
    pageGroups.push(products);
  } else if (format.startsWith("a4_")) {
    for (let i = 0; i < products.length; i += productsPerPage) {
      pageGroups.push(products.slice(i, i + productsPerPage));
    }
  }

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
          PRISPLAKAT
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tittel på prisplakat"
          style={{
            background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)",
            color: "#fff", padding: "6px 10px", borderRadius: 4, fontSize: 13,
            fontFamily: "inherit", minWidth: 240,
          }}
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PricetagFormat)}
          style={{
            background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)",
            color: "#fff", padding: "6px 10px", borderRadius: 4, fontSize: 13,
          }}
        >
          {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={save} disabled={saveStatus === "saving"} style={{
          background: "var(--ft-red)", color: "#fff", border: "none",
          padding: "6px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          {saveStatus === "saving" ? "Lagrer..." : saveStatus === "saved" ? "✓ Lagret" : saveStatus === "error" ? "Feil!" : "Lagre"}
        </button>
        <button onClick={() => { setShowPlaylistList(true); loadList(); }} style={{
          background: "var(--chrome-bg-3)", color: "#fff", border: "1px solid var(--chrome-border)",
          padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer",
        }}>Mine prisplakater</button>
        <button onClick={newPlaylist} style={{
          background: "var(--chrome-bg-3)", color: "#fff", border: "1px solid var(--chrome-border)",
          padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer",
        }}>+ Ny</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {format.startsWith("slideshow") && products.length > 0 && (
            <button onClick={() => {
              // Test-modus: lagre state i localStorage (deles mellom tabs)
              // sessionStorage fungerer IKKE — den er isolert per tab
              const tmpId = `tmp-${Date.now()}`;
              try {
                localStorage.setItem(`prisplakat-tmp-${tmpId}`, JSON.stringify({
                  title, format, products, settings, ts: Date.now(),
                }));
              } catch (e) {
                alert("Kunne ikke lagre test-data: " + (e instanceof Error ? e.message : "ukjent feil"));
                return;
              }
              window.open(`/prisplakat/tmp/${tmpId}/play?autoplay=1`, "_blank", "noopener");
            }} style={{
              background: "var(--chrome-bg-3)", color: "#fff",
              padding: "6px 14px", borderRadius: 4, fontSize: 13, border: "1px solid var(--chrome-border)",
              cursor: "pointer",
            }}>▶ Test fullskjerm</button>
          )}
          {currentId && format.startsWith("slideshow") && (
            <a href={`/prisplakat/${currentId}/play?autoplay=1`} target="_blank" rel="noreferrer" style={{
              background: "var(--ft-red)", color: "#fff", textDecoration: "none",
              padding: "6px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700,
            }}>▶ Spill av</a>
          )}
          {shareToken && format.startsWith("slideshow") && (
            <button
              onClick={copyShareUrl}
              title="Kopier offentlig skjerm-URL — bruk på UniFi US Cast Pro eller andre kiosk-spillere uten innlogging"
              style={{
                background: shareCopied ? "#16a34a" : "var(--chrome-bg-3)",
                color: "#fff",
                border: shareCopied ? "1px solid #16a34a" : "1px solid var(--chrome-border)",
                padding: "6px 14px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {shareCopied ? "✓ URL kopiert" : "📺 Skjerm-URL"}
            </button>
          )}
          {(format.startsWith("a4_") || format === "a5_kundeark") && (
            <>
              <button
                onClick={() => setShowGuides((g) => !g)}
                title="Vis midtstillings-guides (vertikal + horisontal linje gjennom midtpunktet) — kun i preview, ikke i PDF"
                style={{
                  background: showGuides ? "var(--ft-red)" : "var(--chrome-bg-3)",
                  color: "#fff", border: "none",
                  padding: "6px 12px", borderRadius: 4, fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}
              >{showGuides ? "✓ Guides" : "+ Guides"}</button>
              <button
                onClick={exportPdf}
                disabled={format.startsWith("a4_") && products.length === 0}
                style={{
                  background: "var(--ft-red)", color: "#fff", border: "none",
                  padding: "6px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700,
                  cursor:
                    format === "a5_kundeark" || products.length > 0
                      ? "pointer"
                      : "not-allowed",
                  opacity:
                    format === "a5_kundeark" || products.length > 0 ? 1 : 0.5,
                }}
              >Eksporter PDF</button>
            </>
          )}
        </div>
      </div>

      {/* Body: 3-panel layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 280px", overflow: "hidden" }}>
        {/* Venstre — produkt-velger */}
        <div style={{
          background: "var(--chrome-bg-2)", borderRight: "1px solid var(--chrome-border)",
          overflowY: "auto", padding: 14,
        }}>
          {/* «Mine prisplakater» vises nå som modal-galleri (nederst i fila) */}
          {false ? (
            <div>
              <button onClick={() => setShowPlaylistList(false)} style={{
                width: "100%", background: "transparent", color: "#fff",
                border: "1px solid var(--chrome-border)",
                padding: "6px 10px", borderRadius: 4, fontSize: 12,
                cursor: "pointer", marginBottom: 10, textAlign: "left",
              }}>← Tilbake til editor</button>
              <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Mine prisplakater</div>
              {playlists.length === 0 && <div style={{ fontSize: 12, color: "var(--chrome-muted)" }}>Ingen lagret ennå</div>}
              {playlists.map(pl => (
                <div key={pl.id} style={{ background: "var(--chrome-bg-3)", padding: 8, borderRadius: 4, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => loadPlaylist(pl.id)}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{pl.title}</div>
                    <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>{FORMAT_LABELS[pl.format]} · {pl.products?.length || 0} produkter</div>
                  </div>
                  {pl.share_token && pl.format.startsWith("slideshow") && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/prisplakat/share/${pl.share_token}/play`;
                        try {
                          await navigator.clipboard.writeText(url);
                          const btn = e.currentTarget;
                          const orig = btn.textContent;
                          btn.textContent = "✓";
                          setTimeout(() => { btn.textContent = orig; }, 1500);
                        } catch { /* ignore */ }
                      }}
                      title="Kopier offentlig skjerm-URL (UniFi/kiosk-spillere)"
                      style={{ background: "transparent", color: "var(--chrome-muted)", border: "1px solid var(--chrome-border)", cursor: "pointer", fontSize: 11, padding: "3px 6px", borderRadius: 3 }}
                    >📺</button>
                  )}
                  <button onClick={() => deletePlaylist(pl.id)} style={{ background: "transparent", color: "var(--chrome-muted)", border: "none", cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <>
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

              {/* Importer fra brosjyre */}
              <button onClick={() => { setShowImport(true); loadBrochures(); }} style={{
                width: "100%", background: "transparent", color: "#fff",
                border: "1px solid var(--chrome-border)",
                padding: "8px 12px", borderRadius: 4, fontSize: 12, marginTop: 8,
                cursor: "pointer",
              }}>↥ Importér fra brosjyre</button>

              {/* Foreslå topp populære fra GA4 + Mailchimp */}
              <button onClick={async () => {
                setScraping(true);
                setScrapeError(null);
                try {
                  const r = await fetch("/api/brosjyre/suggest-products?days=60&limit=8");
                  if (!r.ok) throw new Error("Failed");
                  const d = await r.json();
                  const suggUrls = (d.suggestions || []).map((s: { url: string }) => s.url);
                  const existing = new Set(products.map(p => p.source_url));
                  const newUrls = suggUrls.filter((u: string) => !existing.has(u));
                  // Scrape hver i sekvens
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
              }} disabled={scraping} style={{
                width: "100%", background: "transparent", color: "#fff",
                border: "1px solid var(--chrome-border)",
                padding: "8px 12px", borderRadius: 4, fontSize: 12, marginTop: 6,
                cursor: "pointer",
              }}>⭐ Topp 8 populære</button>

              {showImport && (
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
                  <button onClick={() => setShowImport(false)} style={{
                    width: "100%", background: "transparent", color: "var(--chrome-muted)",
                    border: "1px solid var(--chrome-border)", padding: "4px 8px",
                    borderRadius: 4, fontSize: 11, marginTop: 6, cursor: "pointer",
                  }}>Avbryt</button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "var(--chrome-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Produkter ({products.length})
                </div>
                {products.length > 0 && (
                  <button onClick={() => { if (confirm(`Tøm alle ${products.length} produkter?`)) setProducts([]); }} style={{
                    background: "transparent", color: "var(--chrome-muted)", border: "none",
                    cursor: "pointer", fontSize: 10, padding: 2,
                  }}>↺ Tøm alle</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {products.map((p, i) => {
                  const expanded = expandedIdx === i;
                  const displayName = p.name_override || p.name || "(uten navn)";
                  const displayPrice = p.price_override ?? p.price_now;
                  const hasOverrides = !!(p.price_override || p.price_before_override || p.burst_text_override || p.name_override || p.hide_burst || p.hide_qr || p.mode);
                  return (
                    <div key={i} style={{ background: "var(--chrome-bg-3)", borderRadius: 4, border: hasOverrides ? "1px solid var(--ft-red)" : "1px solid transparent" }}>
                      <div style={{ padding: 8, display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => setExpandedIdx(expanded ? null : i)} style={{
                          background: "transparent", color: "var(--chrome-muted)", border: "none",
                          cursor: "pointer", fontSize: 10, padding: 2, flexShrink: 0,
                        }} title={expanded ? "Lukk" : "Rediger pris, rabatt, etc."}>{expanded ? "▾" : "▸"}</button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {displayName}{hasOverrides && <span style={{ color: "var(--ft-red)", marginLeft: 4 }}>●</span>}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--chrome-muted)" }}>
                            {p.sku ? `Art.nr ${p.sku} · ` : ""}{displayPrice ? `${displayPrice} kr` : ""}
                          </div>
                        </div>
                        <button onClick={() => moveProduct(i, -1)} disabled={i === 0} style={{ background: "transparent", color: "#fff", border: "none", cursor: i > 0 ? "pointer" : "not-allowed", opacity: i > 0 ? 0.6 : 0.2, fontSize: 11, padding: 2 }}>▲</button>
                        <button onClick={() => moveProduct(i, 1)} disabled={i === products.length - 1} style={{ background: "transparent", color: "#fff", border: "none", cursor: i < products.length - 1 ? "pointer" : "not-allowed", opacity: i < products.length - 1 ? 0.6 : 0.2, fontSize: 11, padding: 2 }}>▼</button>
                        <button onClick={() => removeProduct(i)} style={{ background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                      </div>
                      {expanded && (
                        <div style={{ padding: "0 8px 10px", borderTop: "1px solid var(--chrome-border)", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 9, color: "var(--chrome-muted)", marginTop: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Overstyringer</div>

                          <label style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                            Navn (overstyr)
                            <input type="text" value={p.name_override ?? ""} onChange={(e) => setProductOverride(i, { name_override: e.target.value || undefined })}
                              placeholder={p.name || ""}
                              style={{ width: "100%", marginTop: 2, padding: "4px 6px", fontSize: 11, background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)", color: "#fff", borderRadius: 3, fontFamily: "inherit" }} />
                          </label>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <label style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                              Pris nå (kr)
                              <input type="number" value={p.price_override ?? ""} onChange={(e) => setProductOverride(i, { price_override: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder={p.price_now?.toString() || ""}
                                style={{ width: "100%", marginTop: 2, padding: "4px 6px", fontSize: 11, background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)", color: "#fff", borderRadius: 3 }} />
                            </label>
                            <label style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                              Pris før (kr)
                              <input type="number" value={p.price_before_override ?? ""} onChange={(e) => setProductOverride(i, { price_before_override: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder={p.price_before?.toString() || ""}
                                style={{ width: "100%", marginTop: 2, padding: "4px 6px", fontSize: 11, background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)", color: "#fff", borderRadius: 3 }} />
                            </label>
                          </div>

                          <label style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                            Modus
                            <select
                              value={p.mode ?? "sale"}
                              onChange={(e) => setProductOverride(i, { mode: e.target.value === "sale" ? undefined : (e.target.value as ProductMode) })}
                              style={{ width: "100%", marginTop: 2, padding: "4px 6px", fontSize: 11, background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)", color: "#fff", borderRadius: 3 }}
                            >
                              {(Object.entries(PRODUCT_MODE_LABELS) as [ProductMode, string][]).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </label>

                          <label style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                            Burst-tekst (overstyr rabatt, f.eks. «−30%», «KAMPANJE», «NYHET»)
                            <input type="text" value={p.burst_text_override ?? ""} onChange={(e) => setProductOverride(i, { burst_text_override: e.target.value || undefined })}
                              placeholder={`Auto: ${p.discount_pct ? `−${p.discount_pct}%` : "ingen"}`}
                              style={{ width: "100%", marginTop: 2, padding: "4px 6px", fontSize: 11, background: "var(--chrome-bg)", border: "1px solid var(--chrome-border)", color: "#fff", borderRadius: 3, fontFamily: "inherit" }} />
                          </label>

                          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                            <label style={{ fontSize: 10, color: "var(--chrome-muted)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                              <input type="checkbox" checked={p.hide_burst ?? false} onChange={(e) => setProductOverride(i, { hide_burst: e.target.checked || undefined })} />
                              Skjul burst
                            </label>
                            <label style={{ fontSize: 10, color: "var(--chrome-muted)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                              <input type="checkbox" checked={p.hide_qr ?? false} onChange={(e) => setProductOverride(i, { hide_qr: e.target.checked || undefined })} />
                              Skjul QR
                            </label>
                          </div>

                          {hasOverrides && (
                            <button onClick={() => setProductOverride(i, { name_override: undefined, price_override: undefined, price_before_override: undefined, burst_text_override: undefined, hide_burst: undefined, hide_qr: undefined, mode: undefined })} style={{
                              background: "transparent", color: "var(--chrome-muted)", border: "1px solid var(--chrome-border)",
                              padding: "4px 8px", borderRadius: 3, fontSize: 10, marginTop: 4, cursor: "pointer",
                            }}>↺ Tilbakestill overstyringer</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Midten — preview-canvas */}
        <div style={{ background: "#1a1a1f", overflow: "auto", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {products.length === 0 && (
            <div style={{ color: "var(--chrome-muted)", fontSize: 14, marginTop: 80, textAlign: "center" }}>
              Legg til produkter til venstre.<br/>
              Lim inn URL fra fosen-tools.no eller velg fra populære.
            </div>
          )}
          {format.startsWith("a4_") && pageGroups.map((grp, i) => (
            <div key={i} style={{
              transform: `scale(${zoom})`, transformOrigin: "top center",
              boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
              marginBottom: `${(297 * (1 - zoom))}mm`,
              position: "relative",
            }}>
              {format === "a4_single" && grp[0] && <PricetagA4Single product={grp[0]} settings={settings} />}
              {format === "a4_2up" && <PricetagA4_2Up products={grp} settings={settings} />}
              {format === "a4_4up" && <PricetagA4_4Up products={grp} settings={settings} />}
              {format === "a4_variants" && <PricetagA4Variants products={grp} settings={settings} heroTitle={title} />}
              {showGuides && <CenterGuides />}
            </div>
          ))}
          {format === "a5_kundeark" && (() => {
            const jubSlide = (settings.custom_slides ?? []).find(
              (s) => s.template === "jubileum_event",
            );
            if (!jubSlide) {
              return (
                <div style={{ color: "var(--chrome-muted)", fontSize: 14, marginTop: 80, textAlign: "center" }}>
                  Initialiserer A5-kundeark…
                </div>
              );
            }
            return (
              <div style={{
                transform: `scale(${zoom})`, transformOrigin: "top center",
                boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
                marginBottom: `${(210 * (1 - zoom))}mm`,
                position: "relative",
              }}>
                <PricetagA5Kundeark slide={jubSlide} />
                {showGuides && <CenterGuides />}
              </div>
            );
          })()}
          {format.startsWith("slideshow") && products.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", alignItems: "center" }}>
              {/* Preview-toolbar: pause + slide-navigasjon */}
              <div style={{
                display: "flex", gap: 6, alignItems: "center",
                background: "rgba(0,0,0,0.4)", padding: "6px 10px", borderRadius: 6,
                maxWidth: format === "slideshow_landscape" ? 1100 : 480,
                width: "100%", flexWrap: "wrap",
              }}>
                <button onClick={() => setPreviewPaused(p => !p)} style={{
                  background: previewPaused ? "var(--ft-red)" : "var(--chrome-bg-3)",
                  color: "#fff", border: "none",
                  padding: "5px 12px", borderRadius: 4, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", flexShrink: 0,
                }}>{previewPaused ? "▶ Spill" : "❚❚ Pause"}</button>
                <button onClick={() => {
                  setFocusedSlideId(null);
                  setPreviewPaused(true);
                  setPreviewIdx(i => (i - 1 + previewSlides.length) % previewSlides.length);
                }} style={{
                  background: "var(--chrome-bg-3)", color: "#fff", border: "none",
                  padding: "5px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer", flexShrink: 0,
                }}>◀</button>
                <button onClick={() => {
                  setFocusedSlideId(null);
                  setPreviewPaused(true);
                  setPreviewIdx(i => (i + 1) % previewSlides.length);
                }} style={{
                  background: "var(--chrome-bg-3)", color: "#fff", border: "none",
                  padding: "5px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer", flexShrink: 0,
                }}>▶</button>

                {/* Slide-numerisk strip */}
                <div style={{
                  display: "flex", gap: 3, flex: 1, overflowX: "auto",
                  paddingLeft: 6, alignItems: "center",
                }}>
                  {previewSlides.map((s, i) => {
                    const isActive = i === previewIdx;
                    const isCustom = s.kind === "custom";
                    const label = isCustom
                      ? (s.custom?.label || (s.custom?.template ? SLIDE_TEMPLATE_LABELS[s.custom.template] : "Slide"))
                      : (s.product?.name_override || s.product?.name || `Produkt ${i + 1}`);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isCustom && s.custom) {
                            // useEffect setter previewIdx + paused via focusedIdx
                            setFocusedSlideId(s.custom.id);
                          } else {
                            setFocusedSlideId(null);
                            setPreviewPaused(true);
                            setPreviewIdx(i);
                          }
                        }}
                        title={label}
                        style={{
                          background: isActive ? "var(--ft-red)" : isCustom ? "rgba(168,85,247,0.18)" : "var(--chrome-bg-3)",
                          color: "#fff", border: isActive ? "1px solid #fff" : "1px solid transparent",
                          padding: "4px 9px", borderRadius: 3, fontSize: 11,
                          cursor: "pointer", flexShrink: 0,
                          fontWeight: isActive ? 700 : 500,
                          fontFamily: '"Roboto Mono", ui-monospace, monospace',
                        }}
                      >
                        {isCustom ? "·" : ""}{i + 1}
                      </button>
                    );
                  })}
                </div>

                <span style={{
                  fontSize: 11, color: "var(--chrome-muted)", flexShrink: 0,
                  fontFamily: '"Roboto Mono", monospace',
                }}>
                  {previewIdx + 1} / {previewSlides.length}
                </span>
              </div>

              <div style={{
                width: "100%",
                maxWidth: format === "slideshow_landscape" ? 1100 : 480,
                aspectRatio: format === "slideshow_landscape" ? "16 / 9" : "9 / 16",
                maxHeight: "calc(100vh - 220px)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
                position: "relative", overflow: "hidden",
                background: "#000",
              }}>
                <Slideshow
                  products={products}
                  settings={settings}
                  landscape={format === "slideshow_landscape"}
                  embedded
                  pinIdx={previewPaused ? previewIdx : null}
                  pausedOverride={previewPaused}
                  onIdxChange={setPreviewIdx}
                />
              </div>
            </div>
          )}
          {format.startsWith("slideshow") && products.length === 0 && (
            <div style={{ color: "var(--chrome-muted)", fontSize: 14, marginTop: 80, textAlign: "center" }}>
              Slideshow-modus — legg til produkter til venstre, så vises preview her.<br />
              <span style={{ fontSize: 12, opacity: 0.7 }}>Lagre playlist og åpne «Spill av» for fullskjerm-versjon.</span>
            </div>
          )}
        </div>

        {/* Høyre — innstillinger */}
        <div style={{ background: "var(--chrome-bg-2)", borderLeft: "1px solid var(--chrome-border)", padding: 14, overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Visning</div>
          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 11, marginBottom: 4 }}>Zoom: {Math.round(zoom * 100)}%</div>
            <input type="range" min={0.2} max={1.5} step={0.05} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </label>

          <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginTop: 18, marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Globalt</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
            <input type="checkbox" checked={settings.show_burst ?? true} onChange={(e) => setSettings({ ...settings, show_burst: e.target.checked })} />
            Vis rabatt-burst
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
            <input type="checkbox" checked={settings.show_qr ?? true} onChange={(e) => setSettings({ ...settings, show_qr: e.target.checked })} />
            Vis QR-kode (A4-print)
          </label>
          <label style={{ display: "block", fontSize: 11, marginBottom: 4, marginTop: 10 }}>
            Aksent-farge
            <input type="color" value={settings.accent_color ?? "#ed1c24"} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} style={{ width: "100%", height: 32, border: "none", background: "transparent", marginTop: 4 }} />
          </label>

          {/* Slideshow-spesifikke toggles */}
          {format.startsWith("slideshow") && (
            <>
              <label style={{ display: "block", fontSize: 11, marginBottom: 4, marginTop: 12 }}>
                Sekunder per slide: {settings.seconds_per_slide ?? 12}
                <input type="range" min={5} max={30} step={1} value={settings.seconds_per_slide ?? 12} onChange={(e) => setSettings({ ...settings, seconds_per_slide: parseInt(e.target.value, 10) })} style={{ width: "100%" }} />
              </label>

              <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginTop: 18, marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Slideshow-overlays</div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
                <input type="checkbox" checked={settings.show_clock ?? false} onChange={(e) => setSettings({ ...settings, show_clock: e.target.checked })} />
                Vis klokke + dato i hjørnet
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
                <input type="checkbox" checked={settings.show_stock_status ?? false} onChange={(e) => setSettings({ ...settings, show_stock_status: e.target.checked })} />
                Vis lager-pill (på lager / bestilling)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
                <input type="checkbox" checked={settings.animate_price_reveal ?? true} onChange={(e) => setSettings({ ...settings, animate_price_reveal: e.target.checked })} />
                Animér pris-reveal når slide aktiverer
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6 }}>
                <input type="checkbox" checked={settings.show_product_qr ?? false} onChange={(e) => setSettings({ ...settings, show_product_qr: e.target.checked })} />
                Vis QR på produkt-slide
              </label>

              <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginTop: 18, marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Special slides</span>
                <span style={{ fontSize: 9, fontWeight: 500, color: "var(--chrome-muted)", textTransform: "none", letterSpacing: 0 }}>
                  {(settings.custom_slides ?? []).filter(s => s.enabled).length} / {(settings.custom_slides ?? []).length}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginBottom: 8, lineHeight: 1.45 }}>
                Redigerbare maler — intro, sertifisert, kontakt-info, brand-spotlight, multi-produkt, kombi-pris. Klikk ▸ for å endre tekst, farger og bakgrunn.
              </div>
              <SlideEditor
                slides={settings.custom_slides}
                products={products}
                onChange={updateCustomSlides}
                expandedId={focusedSlideId}
                onExpandedIdChange={setFocusedSlideId}
              />
            </>
          )}

          {/* A5-kundeark — dedikert redigeringspanel uten "slide"-paradigme */}
          {format === "a5_kundeark" && (() => {
            const jubSlide = (settings.custom_slides ?? []).find(
              (s) => s.template === "jubileum_event",
            );
            if (!jubSlide) return null;
            return (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--chrome-muted)",
                    marginTop: 18,
                    marginBottom: 8,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  A5-kundeark
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--chrome-muted)",
                    marginBottom: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Rediger alt direkte under. Endringer vises live i preview. Bruk
                  <strong> «+ Guides»</strong> for midtstillings-linjer og <strong>«Eksporter PDF»</strong>
                  for å laste ned A5-arket.
                </div>
                <A5KundearkEditor
                  slide={jubSlide}
                  onChange={(changes) => {
                    const slides = (settings.custom_slides ?? []).map((s) =>
                      s.id === jubSlide.id ? { ...s, ...changes } : s,
                    );
                    setSettings((prev) => ({ ...prev, custom_slides: slides }));
                  }}
                />
              </>
            );
          })()}

          <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginTop: 18, marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Info</div>
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", lineHeight: 1.5 }}>
            {format === "a5_kundeark"
              ? "A5-print: rediger felter til høyre, eksportér PDF for å printe."
              : format.startsWith("a4_")
                ? "A4-print: bruk «Eksporter PDF» for å laste ned printbart ark."
                : "Slideshow: lagre playlist, åpne /prisplakat/[id]/play for fullskjerm-visning."}
          </div>
        </div>
      </div>

      {/* ───────── Mine prisplakater — modal-galleri ───────── */}
      {showPlaylistList && (
        <div
          onClick={() => setShowPlaylistList(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(1080px, 96vw)", maxHeight: "86vh", background: "var(--chrome-bg-2)", border: "1px solid var(--chrome-border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderBottom: "1px solid var(--chrome-border)" }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff" }}>Mine prisplakater</div>
              <input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Søk…"
                style={{ flex: 1, maxWidth: 300, background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {([["all", "Alle"], ["slideshow", "Slideshow"], ["a4", "A4-print"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setLibraryFilter(k)}
                    style={{ fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 99, border: "1px solid var(--chrome-border)", cursor: "pointer", background: libraryFilter === k ? "var(--ft-red)" : "transparent", color: libraryFilter === k ? "#fff" : "var(--chrome-muted)" }}
                  >{label}</button>
                ))}
              </div>
              <button onClick={() => setShowPlaylistList(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--chrome-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            {/* Kort-rutenett */}
            <div style={{ padding: 20, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, alignContent: "start" }}>
              {playlists
                .filter((pl) => {
                  const s = librarySearch.trim().toLowerCase();
                  if (s && !pl.title.toLowerCase().includes(s)) return false;
                  const isSlide = pl.format.startsWith("slideshow");
                  if (libraryFilter === "slideshow" && !isSlide) return false;
                  if (libraryFilter === "a4" && isSlide) return false;
                  return true;
                })
                .map((pl) => {
                  const isSlide = pl.format.startsWith("slideshow");
                  const stripe = isSlide ? "var(--ft-red)" : pl.format === "a5_kundeark" ? "#6b7280" : "#3b82f6";
                  return (
                    <div key={pl.id} style={{ background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ height: 5, background: stripe }} />
                      <div style={{ padding: "13px 15px", flex: 1, cursor: "pointer" }} onClick={() => { loadPlaylist(pl.id); setShowPlaylistList(false); }}>
                        <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 8px", borderRadius: 6, marginBottom: 9, color: stripe, background: "rgba(255,255,255,0.06)" }}>{FORMAT_LABELS[pl.format]}</span>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{pl.title}</div>
                        <div style={{ fontSize: 12, color: "var(--chrome-muted)" }}>{pl.products?.length || 0} produkter · {new Date(pl.updated_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, padding: "9px 12px", borderTop: "1px solid var(--chrome-border)" }}>
                        <button onClick={() => { loadPlaylist(pl.id); setShowPlaylistList(false); }} style={{ flex: 1, background: "var(--ft-red)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Åpne</button>
                        {isSlide && (
                          <a href={`/prisplakat/${pl.id}/play?autoplay=1`} target="_blank" rel="noreferrer" title="Spill av" style={{ flex: "0 0 36px", background: "var(--chrome-bg-2)", color: "#cfd3da", borderRadius: 6, padding: "7px 0", fontSize: 12, textAlign: "center", textDecoration: "none", border: "1px solid var(--chrome-border)" }}>▶</a>
                        )}
                        {isSlide && pl.share_token && (
                          <button
                            title="Kopier skjerm-URL"
                            onClick={async (e) => {
                              const url = `${window.location.origin}/prisplakat/share/${pl.share_token}/play`;
                              try {
                                await navigator.clipboard.writeText(url);
                                const b = e.currentTarget; const o = b.textContent;
                                b.textContent = "✓"; setTimeout(() => { b.textContent = o; }, 1200);
                              } catch { /* ignore */ }
                            }}
                            style={{ flex: "0 0 36px", background: "var(--chrome-bg-2)", color: "#cfd3da", border: "1px solid var(--chrome-border)", borderRadius: 6, padding: "7px 0", fontSize: 12, cursor: "pointer" }}
                          >📺</button>
                        )}
                        <button title="Slett" onClick={() => deletePlaylist(pl.id)} style={{ flex: "0 0 36px", background: "var(--chrome-bg-2)", color: "var(--chrome-muted)", border: "1px solid var(--chrome-border)", borderRadius: 6, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              {playlists.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--chrome-muted)", fontSize: 13, padding: 30 }}>Ingen prisplakater lagret ennå.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Midtstillings-guides (vertikal + horisontal linje gjennom midtpunktet) ──
// Vises kun i editor-preview når Brit toggler "Guides"-knappen. Inkluderer
// IKKE i PDF-eksport siden vi rendrer plakaten direkte med .a4-pricetag/
// .a5-pricetag-class — guidene ligger utenfor disse.
function CenterGuides() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* Vertikal midt-linje */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "1px",
          background: "rgba(34, 197, 94, 0.7)",
          boxShadow: "0 0 2px rgba(34, 197, 94, 0.5)",
        }}
      />
      {/* Horisontal midt-linje */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background: "rgba(34, 197, 94, 0.7)",
          boxShadow: "0 0 2px rgba(34, 197, 94, 0.5)",
        }}
      />
      {/* Midt-prikk */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22c55e",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 4px rgba(34, 197, 94, 0.8)",
        }}
      />
      {/* Tredjedels-snitt (rule of thirds) — svakere streker */}
      {[33.33, 66.66].map((pct) => (
        <div key={`v-${pct}`} style={{
          position: "absolute", left: `${pct}%`, top: 0, bottom: 0,
          width: "1px", background: "rgba(34, 197, 94, 0.25)",
        }} />
      ))}
      {[33.33, 66.66].map((pct) => (
        <div key={`h-${pct}`} style={{
          position: "absolute", top: `${pct}%`, left: 0, right: 0,
          height: "1px", background: "rgba(34, 197, 94, 0.25)",
        }} />
      ))}
    </div>
  );
}
