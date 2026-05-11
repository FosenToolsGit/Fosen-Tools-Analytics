"use client";

// Venstre + høyre paneler.

import { useState, useRef, useEffect } from "react";
import type { LibPayload, PageObject, BrandTokens, BrochureDoc, Product } from "./types";
import { PAPER_SIZES, EditorStore, DUMMY_PRODUCTS, formatNOK, makeProductCardObj } from "./store";
import type { BrochureListItem } from "./store";
import { TEMPLATES } from "./templates";
import { DYNAMIC_TEMPLATES, applyTemplate, applyBackCover } from "./dynamic-templates";
import { exportBrochureToPdf } from "./export-pdf";

// ---------- Venstre panel ----------
export function LeftPanel({ store }: { store: EditorStore }) {
  const [tab, setTab] = useState<"pages" | "components" | "templates" | "assets">("pages");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--chrome-bg-2)", borderRight: "1px solid var(--chrome-border)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--chrome-border)" }}>
        {([
          { id: "pages", label: "Sider" },
          { id: "components", label: "Bibliotek" },
          { id: "templates", label: "Maler" },
          { id: "assets", label: "Bilder" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: tab === t.id ? "var(--chrome-bg)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--chrome-muted)",
              border: "none", borderBottom: tab === t.id ? "2px solid var(--ft-red)" : "2px solid transparent",
              padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
              fontWeight: 600, cursor: "pointer",
            }}
          >{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }} className="chrome-scroll">
        {tab === "pages" && <PagesTab store={store} />}
        {tab === "components" && <ComponentsTab />}
        {tab === "templates" && <TemplatesTab store={store} />}
        {tab === "assets" && <AssetsTab store={store} />}
      </div>
    </div>
  );
}

function PagesTab({ store }: { store: EditorStore }) {
  const { doc, activePageId, setActivePageId, addPage, duplicatePage, removePage, reorderPages } = store;
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  return (
    <div style={{ padding: 12 }}>
      <button className="ft-btn ft-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => addPage()}>
        + Ny tom side
      </button>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {doc.pages.map((p, idx) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx !== null && dragIdx !== idx) reorderPages(dragIdx, idx); setDragIdx(null); }}
            onClick={() => setActivePageId(p.id)}
            style={{
              border: activePageId === p.id ? "2px solid var(--ft-red)" : "1px solid var(--chrome-border)",
              borderRadius: 6, padding: 8, cursor: "pointer", background: "var(--chrome-bg-3)",
              display: "flex", gap: 8, alignItems: "center",
            }}
          >
            <div style={{
              width: 38, height: 54, background: "#fff", borderRadius: 2, position: "relative",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)", overflow: "hidden", flexShrink: 0,
            }}>
              <div style={{ width: "100%", height: 8, background: "var(--ft-red)" }} />
              <div style={{ position: "absolute", bottom: 4, right: 4, fontSize: 8, fontFamily: "Roboto Mono, monospace", color: "#666" }}>
                {idx + 1}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>Side {idx + 1}</div>
              <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>{PAPER_SIZES[p.paper]?.label}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }} onClick={(e) => e.stopPropagation()}>
              <button className="ft-btn ft-btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => duplicatePage(p.id)} title="Dupliser">⧉</button>
              <button className="ft-btn ft-btn-ghost" style={{ padding: "2px 6px", fontSize: 10 }} onClick={() => removePage(p.id)} title="Slett" disabled={doc.pages.length === 1}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LibCard({ label, hint, parsed }: { label: string; hint?: string; parsed: LibPayload }) {
  return (
    <div
      className="lib-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("application/x-ft-component", JSON.stringify(parsed))}
      style={{
        border: "1px solid var(--chrome-border)", borderRadius: 6, padding: 10, cursor: "grab",
        background: "var(--chrome-bg-3)",
      }}
    >
      <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{label}</div>
      {hint && <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function ComponentsTab() {
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 14 }}>
      <Section title="Produktkort">
        <LibCard label="Standard" hint="90×110 mm" parsed={{ kind: "productCard", variant: "standard" }} />
        <LibCard label="Kompakt" hint="60×70 mm — 6-grid" parsed={{ kind: "productCard", variant: "compact" }} />
        <LibCard label="Hero" hint="180×240 mm — fullside" parsed={{ kind: "productCard", variant: "hero" }} />
        <LibCard label="Sammenligning" hint="170×90 mm horisontal" parsed={{ kind: "productCard", variant: "compare" }} />
        <LibCard label="Kombi-kort (2 produkter)" hint="140×100 mm — kombinert pris" parsed={{ kind: "comboCard" }} />
      </Section>
      <Section title="Pris & rabatt">
        <LibCard label="Pris-blokk" parsed={{ kind: "priceBlock" }} />
        <LibCard label="Stjerne-burst" parsed={{ kind: "badge", style: "star", text: "-30%" }} />
        <LibCard label="Sirkel-burst" parsed={{ kind: "badge", style: "circle", text: "-25%" }} />
        <LibCard label="Sjokkstempel" parsed={{ kind: "badge", style: "stamp", text: "KAMPANJE" }} />
        <LibCard label="Sløyfe (ribbon)" parsed={{ kind: "badge", style: "ribbon", text: "TILBUD" }} />
        <LibCard label="Diagonal banner" parsed={{ kind: "badge", style: "diagonal", text: "-20%" }} />
      </Section>
      <Section title="Layout">
        <LibCard label="Kampanje-banner" hint="Rett" parsed={{ kind: "banner" }} />
        <LibCard label="Galleri-grid" hint="3-kol auto-fyll" parsed={{ kind: "gallery" }} />
        <LibCard label="Bilde-blokk" parsed={{ kind: "image" }} />
        <LibCard label="Rektangel" parsed={{ kind: "shape" }} />
        <LibCard label="Divider" parsed={{ kind: "divider" }} />
      </Section>
      <Section title="Tekst">
        <LibCard label="H1 Heading" parsed={{ kind: "text", preset: "h1", content: "OVERSKRIFT" }} />
        <LibCard label="H2 Heading" parsed={{ kind: "text", preset: "h2", content: "Underoverskrift" }} />
        <LibCard label="Brødtekst" parsed={{ kind: "text", preset: "body", content: "Brødtekst-paragraf..." }} />
      </Section>
      <Section title="Branding">
        <LibCard label="Fosen Tools logo (hvit)" hint="Hvit wordmark — for mørke / fargede bakgrunner" parsed={{ kind: "logo" }} />
      </Section>
      <Section title="Sidefot / kontakt">
        <LibCard label="Kontakt-blokk" parsed={{ kind: "contact" }} />
      </Section>
    </div>
  );
}

function TemplatesTab({ store }: { store: EditorStore }) {
  const cats = [...new Set(TEMPLATES.map(t => t.category))];
  const dynCats = [...new Set(DYNAMIC_TEMPLATES.map(t => t.category))];
  const activeIdx = store.doc.pages.findIndex(p => p.id === store.activePageId);
  const activePage = activeIdx >= 0 ? store.doc.pages[activeIdx] : null;
  const [lastApply, setLastApply] = useState<string | null>(null);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Dynamiske maler — bytt LAYOUT på eksisterende side */}
      <div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ft-red)", marginBottom: 6, fontWeight: 800 }}>
          DYNAMISKE — bytt layout, behold produkter
        </div>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)", marginBottom: 10, lineHeight: 1.4 }}>
          Klikk «Anvend» for å bytte layout på <span style={{ color: "#fff", fontWeight: 600 }}>aktiv side</span> — produktene blir flyttet inn i ny grid. Produkter som ikke får plass, droppes.
        </div>
        {lastApply && (
          <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 10, padding: 6, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 4 }}>
            {lastApply}
          </div>
        )}
        {dynCats.map(cat => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700 }}>{cat}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DYNAMIC_TEMPLATES.filter(t => t.category === cat).map(t => (
                <div key={t.id} style={{ background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)", borderRadius: 4, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>{t.capacityLabel}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (!activePage) return;
                        const result = applyTemplate(activePage, t, {
                          pageNo: activeIdx + 1,
                          totalPages: store.doc.pages.length,
                          brandLabel: store.doc.title,
                        });
                        store.setPageProp(activePage.id, { objects: result.newObjects });
                        const msg = result.overflowProducts > 0
                          ? `Anvendt «${t.label}» — ${result.placedProducts} plassert, ${result.overflowProducts} ikke fikk plass`
                          : `Anvendt «${t.label}» — ${result.placedProducts} produkter`;
                        setLastApply(msg);
                        setTimeout(() => setLastApply(null), 5000);
                      }}
                      disabled={!activePage}
                      style={{
                        background: "var(--ft-red)", color: "#fff", border: "none", borderRadius: 3,
                        padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: activePage ? "pointer" : "not-allowed",
                        opacity: activePage ? 1 : 0.4,
                      }}
                    >
                      Anvend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* FT-bakside — egen "Anvend"-knapp */}
        <div style={{ background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)", borderRadius: 4, padding: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>FT-bakside (offisielle logoer)</div>
            <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>Mørk bunn · 25-års- og 100-årslogo · kontakt</div>
          </div>
          <button
            onClick={() => {
              if (!activePage) return;
              const updated = applyBackCover(activePage, activePage.paper);
              store.setPageProp(activePage.id, { objects: updated.objects, bg: updated.bg });
              setLastApply("Anvendt FT-bakside");
              setTimeout(() => setLastApply(null), 5000);
            }}
            disabled={!activePage}
            style={{
              background: "var(--ft-red)", color: "#fff", border: "none", borderRadius: 3,
              padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: activePage ? "pointer" : "not-allowed",
              opacity: activePage ? 1 : 0.4,
            }}
          >
            Anvend
          </button>
        </div>
      </div>

      {/* Statiske maler — sett inn NY side */}
      <div style={{ borderTop: "1px solid var(--chrome-border)", paddingTop: 14 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700 }}>
          Statiske — sett inn ny side
        </div>
        {cats.map(cat => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chrome-muted)", marginBottom: 6, fontWeight: 700, opacity: 0.6 }}>{cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TEMPLATES.filter(t => t.category === cat).map(t => (
                <button
                  key={t.id}
                  onClick={() => store.addPage((idx, doc) => t.build(idx, doc))}
                  style={{
                    background: "var(--chrome-bg-3)", border: "1px solid var(--chrome-border)",
                    borderRadius: 6, padding: 10, cursor: "pointer", color: "#fff", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <div style={{ background: "#fff", aspectRatio: "210/297", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "20%", background: "var(--ft-red)" }} />
                    <div style={{ padding: 4, fontSize: 6, color: "#111" }}>{t.label}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProductSuggestion {
  url: string;
  ga4_views: number;
  mailchimp_clicks: number;
  unique_clicks: number;
  score: number;
  last_click_at: string | null;
}

function AssetsTab({ store }: { store: EditorStore }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedProduct, setScrapedProduct] = useState<Product | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Upload-state
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Foreslåtte produkter
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(files.length);
    let remaining = files.length;
    for (const f of files) {
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/brosjyre/upload-asset", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error || `Feil (${res.status})`);
        } else {
          store.addAsset({
            id: data.id,
            name: data.name,
            storage_path: data.storage_path,
            public_url: data.public_url,
          });
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Nettverksfeil");
      }
      remaining -= 1;
      setUploading(remaining);
    }
    // Resett input så samme fil kan lastes opp på nytt
    if (e.target) e.target.value = "";
  };

  const assetSrc = (a: { public_url?: string; dataUrl?: string }) =>
    a.public_url ?? a.dataUrl ?? "";

  const scrapeUrl = async (url: string): Promise<Product | null> => {
    const res = await fetch(`/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Feil (${res.status})`);
    return data.product as Product;
  };

  const importProduct = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setScraping(true);
    setScrapeError(null);
    setScrapedProduct(null);
    try {
      const product = await scrapeUrl(url);
      setScrapedProduct(product);
      setUrlInput("");
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/brosjyre/suggest-products?days=60&limit=12");
      const data = await res.json();
      if (!res.ok) {
        setSuggestError(data.error || `Feil (${res.status})`);
        return;
      }
      setSuggestions(data.suggestions || []);
      setSuggestionsLoaded(true);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setSuggestLoading(false);
    }
  };

  const importSuggestion = async (url: string) => {
    setSuggestBusy(url);
    setSuggestError(null);
    try {
      const product = await scrapeUrl(url);
      if (product) {
        store.addObject(makeProductCardObj(product, 20, 20, "standard"));
        // Fjern fra forslag-lista så bruker ikke ved et uhell legger inn dobbelt
        setSuggestions(prev => prev.filter(s => s.url !== url));
      }
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setSuggestBusy(null);
    }
  };

  const insertScraped = () => {
    if (!scrapedProduct) return;
    store.addObject(makeProductCardObj(scrapedProduct, 20, 20, "standard"));
    setScrapedProduct(null);
  };

  const proxiedImg = (raw: string | null) =>
    raw ? `/api/brosjyre/image-proxy?url=${encodeURIComponent(raw)}` : null;

  return (
    <div style={{ padding: 12 }}>
      <button
        className="ft-btn"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={() => fileRef.current?.click()}
        disabled={uploading > 0}
      >
        {uploading > 0 ? `Laster opp (${uploading} igjen)...` : "+ Last opp bilder"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onUpload} />
      {uploadError && (
        <div style={{ marginTop: 8, padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10 }}>
          {uploadError}
        </div>
      )}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {store.doc.assets.map(a => {
          const src = assetSrc(a);
          return (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/x-ft-component", JSON.stringify({ kind: "image", src, label: a.name } satisfies LibPayload))}
              title={a.name}
              style={{ aspectRatio: "1/1", background: "#000", borderRadius: 4, overflow: "hidden", cursor: "grab" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
        {store.doc.assets.length === 0 && (
          <div style={{ gridColumn: "1 / -1", color: "var(--chrome-muted)", fontSize: 11, textAlign: "center", padding: "20px 0" }}>
            Ingen bilder ennå. Last opp og dra inn på canvas.
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, padding: 10, background: "var(--chrome-bg-3)", borderRadius: 6, fontSize: 11, color: "var(--chrome-muted)" }}>
        <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>Hent fra URL</div>
        <input
          className="ft-input"
          placeholder="https://fosen-tools.no/p/..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") importProduct(); }}
          disabled={scraping}
        />
        <button
          className="ft-btn"
          style={{ marginTop: 6, width: "100%", justifyContent: "center" }}
          onClick={importProduct}
          disabled={scraping || !urlInput.trim()}
        >
          {scraping ? "Henter..." : "Importer produkt"}
        </button>
        {scrapeError && (
          <div style={{ marginTop: 6, padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10 }}>
            {scrapeError}
          </div>
        )}
        {scrapedProduct && (
          <div
            draggable
            onDragStart={(e) => e.dataTransfer.setData(
              "application/x-ft-component",
              JSON.stringify({ kind: "productCard", variant: "standard", product: scrapedProduct } satisfies LibPayload)
            )}
            style={{ marginTop: 8, padding: 8, background: "var(--chrome-bg-2)", borderRadius: 6, border: "1px solid var(--chrome-border)", cursor: "grab" }}
            title="Dra på canvas eller klikk «Sett inn på siden»"
          >
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 56, height: 56, background: "#fff", borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#111", fontWeight: 700 }}>
                {scrapedProduct.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxiedImg(scrapedProduct.image_url) || ""} alt={scrapedProduct.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 22 }}>{scrapedProduct.image_placeholder}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#fff", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {scrapedProduct.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginTop: 2 }}>
                  {scrapedProduct.manufacturer || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#fff", marginTop: 4 }}>
                  {scrapedProduct.discount_pct > 0 && (
                    <span style={{ color: "var(--chrome-muted)", textDecoration: "line-through", marginRight: 6 }}>
                      {formatNOK(scrapedProduct.price_before)}
                    </span>
                  )}
                  <strong>{formatNOK(scrapedProduct.price_now)}</strong>
                  {scrapedProduct.discount_pct > 0 && (
                    <span style={{ marginLeft: 6, color: "var(--ft-red)", fontWeight: 700 }}>
                      −{scrapedProduct.discount_pct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                className="ft-btn ft-btn-primary"
                style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                onClick={insertScraped}
              >
                Sett inn på siden
              </button>
              <button
                className="ft-btn ft-btn-ghost"
                style={{ justifyContent: "center", fontSize: 11 }}
                onClick={() => setScrapedProduct(null)}
                title="Forkast"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 10, background: "var(--chrome-bg-3)", borderRadius: 6, fontSize: 11, color: "var(--chrome-muted)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 600, color: "#fff" }}>Foreslåtte produkter</div>
          <button
            className="ft-btn ft-btn-ghost"
            style={{ fontSize: 10, padding: "2px 6px" }}
            onClick={() => void loadSuggestions()}
            disabled={suggestLoading}
            title="Henter mest besøkte produktsider på fosen-tools.no (GA4) + Mailchimp-klikk"
          >
            {suggestionsLoaded ? "↻" : "Hent"}
          </button>
        </div>
        <div style={{ fontSize: 10, marginBottom: 6 }}>
          Mest besøkte produktsider på fosen-tools.no (GA4-views vektet 2x) + Mailchimp-klikk.
        </div>
        {suggestError && (
          <div style={{ padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10, marginBottom: 6 }}>
            {suggestError}
          </div>
        )}
        {suggestLoading && suggestions.length === 0 && (
          <div style={{ fontSize: 10, padding: "4px 0" }}>Henter...</div>
        )}
        {suggestionsLoaded && !suggestLoading && suggestions.length === 0 && !suggestError && (
          <div style={{ fontSize: 10, padding: "4px 0" }}>Ingen produkt-URLer i Mailchimp-klikk siste 60 dager.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {suggestions.map(s => {
            const isBusy = suggestBusy === s.url;
            const slug = s.url.replace(/^https?:\/\/(?:www\.)?fosen-tools\.no\//i, "");
            return (
              <div
                key={s.url}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: 6,
                  background: "var(--chrome-bg-2)", borderRadius: 4,
                  border: "1px solid var(--chrome-border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#fff", fontFamily: "Roboto Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    /{slug}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--chrome-muted)" }}>
                    {s.ga4_views} views · {s.mailchimp_clicks} klikk
                  </div>
                </div>
                <button
                  className="ft-btn"
                  style={{ fontSize: 10, padding: "4px 8px", flexShrink: 0 }}
                  onClick={() => void importSuggestion(s.url)}
                  disabled={isBusy || !!suggestBusy}
                  title="Hent + sett inn på siden"
                >
                  {isBusy ? "..." : "+ Sett inn"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Høyre panel ----------
export function RightPanel({ store }: { store: EditorStore }) {
  const [tab, setTab] = useState<"properties" | "brand" | "document">("properties");
  const sel = store.selection;
  const obj = sel.length === 1 ? store.activePage?.objects.find(o => o.id === sel[0]) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--chrome-bg-2)", borderLeft: "1px solid var(--chrome-border)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--chrome-border)" }}>
        {([
          { id: "properties", label: "Egenskaper" },
          { id: "brand", label: "Brand" },
          { id: "document", label: "Dokument" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: tab === t.id ? "var(--chrome-bg)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--chrome-muted)",
              border: "none", borderBottom: tab === t.id ? "2px solid var(--ft-red)" : "2px solid transparent",
              padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
              fontWeight: 600, cursor: "pointer",
            }}
          >{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto" }} className="chrome-scroll">
        {tab === "properties" && <PropertiesTab store={store} obj={obj ?? null} multiSel={sel.length > 1} />}
        {tab === "brand" && <BrandTab store={store} />}
        {tab === "document" && <DocumentTab store={store} />}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label className="ft-panel-label">{label}</label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, suffix }: {
  label: string; value: number | undefined; onChange: (v: number) => void; step?: number; suffix?: string;
}) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input className="ft-input" type="number" value={value ?? ""} step={step} onChange={(e) => onChange(parseFloat(e.target.value))} />
        {suffix && <span style={{ color: "var(--chrome-muted)", fontSize: 10 }}>{suffix}</span>}
      </div>
    </Field>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 32, height: 28, padding: 0, border: "1px solid var(--chrome-border)", borderRadius: 4, background: "transparent" }}
        />
        <input className="ft-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Array<string | { value: string; label: string }>;
}) {
  return (
    <Field label={label}>
      <select className="ft-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) =>
          typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </Field>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field label={label}>
      <div className={`ft-toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)} />
    </Field>
  );
}

function PropertiesTab({ store, obj, multiSel }: { store: EditorStore; obj: PageObject | null; multiSel: boolean }) {
  if (multiSel) return <div style={{ padding: 16, color: "var(--chrome-muted)", fontSize: 12 }}>{store.selection.length} objekter valgt — bruk geometri-feltene under.</div>;
  if (!obj) return (
    <div style={{ padding: 16, color: "var(--chrome-muted)", fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>Ingen valgt</div>
      Klikk på et objekt på canvas, eller dra inn et fra biblioteket.
    </div>
  );
  const update = (patch: { x?: number; y?: number; w?: number; h?: number; rot?: number; locked?: boolean }) => store.updateObject(obj.id, patch);
  const updateProps = (patch: Record<string, unknown>) => store.updateObject(obj.id, { props: patch });
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{obj.type}</div>
      <div style={{ fontSize: 13, color: "#fff", marginBottom: 12, fontFamily: "Roboto Mono, monospace" }}>{obj.id}</div>

      <details open style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 6 }}>Geometri</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <NumberField label="X (mm)" value={Math.round(obj.x * 10) / 10} onChange={(v) => update({ x: v })} step={0.5} />
          <NumberField label="Y (mm)" value={Math.round(obj.y * 10) / 10} onChange={(v) => update({ y: v })} step={0.5} />
          <NumberField label="Bredde" value={Math.round(obj.w * 10) / 10} onChange={(v) => update({ w: v })} step={0.5} />
          <NumberField label="Høyde" value={Math.round(obj.h * 10) / 10} onChange={(v) => update({ h: v })} step={0.5} />
          <NumberField label="Rotasjon" value={obj.rot || 0} onChange={(v) => update({ rot: v })} step={1} suffix="°" />
          <ToggleField label="Lås" value={obj.locked} onChange={(v) => update({ locked: v })} />
        </div>
      </details>

      <details open style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 6 }}>Innhold</summary>
        <TypeSpecificProps obj={obj} updateProps={updateProps} store={store} />
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 6 }}>Lag</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button className="ft-btn" onClick={() => store.reorderObject(obj.id, "up")}>Frem</button>
          <button className="ft-btn" onClick={() => store.reorderObject(obj.id, "down")}>Bak</button>
          <button className="ft-btn" onClick={() => store.reorderObject(obj.id, "top")}>Til topp</button>
          <button className="ft-btn" onClick={() => store.reorderObject(obj.id, "bottom")}>Til bunn</button>
        </div>
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary style={{ fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", marginBottom: 6 }}>JSON (power-user)</summary>
        <textarea
          className="ft-input"
          rows={8}
          style={{ fontFamily: "Roboto Mono, monospace", fontSize: 10 }}
          value={JSON.stringify(obj.props, null, 2)}
          onChange={(e) => { try { const v = JSON.parse(e.target.value); store.updateObject(obj.id, { props: v }); } catch { /* ignore */ } }}
        />
      </details>
    </div>
  );
}

function TypeSpecificProps({ obj, updateProps, store }: { obj: PageObject; updateProps: (patch: Record<string, unknown>) => void; store: EditorStore }) {
  // Bruker any internt for å unngå tvunget eksplisitt branching for hver type — props-skjemaet er kjent fra obj.type
  switch (obj.type) {
    case "productCard": {
      const p = obj.props;
      return (
        <>
          <SelectField label="Variant" value={p.variant} onChange={(v) => updateProps({ variant: v })}
            options={[{ value: "standard", label: "Standard" }, { value: "compact", label: "Kompakt" }, { value: "hero", label: "Hero" }, { value: "compare", label: "Sammenligning" }, { value: "bundle", label: "Bundle" }]} />
          <Field label="Produkt">
            <select className="ft-input" value={p.product?.source_url || ""} onChange={(e) => {
              const found = DUMMY_PRODUCTS.find(pp => pp.source_url === e.target.value);
              if (found) updateProps({ product: found });
            }}>
              {DUMMY_PRODUCTS.map(pp => <option key={pp.source_url} value={pp.source_url}>{pp.manufacturer} — {pp.name}</option>)}
            </select>
          </Field>
          <div style={{ padding: 8, background: "var(--chrome-bg-3)", borderRadius: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "var(--chrome-muted)", textTransform: "uppercase", marginBottom: 4 }}>Produktdata (kan overstyres)</div>
            <Field label="Navn">
              <input className="ft-input" value={p.product?.name || ""} onChange={(e) => updateProps({ product: { ...p.product, name: e.target.value } })} />
            </Field>
            <Field label="Produsent">
              <input className="ft-input" value={p.product?.manufacturer || ""} onChange={(e) => updateProps({ product: { ...p.product, manufacturer: e.target.value } })} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <NumberField label="Pris før" value={p.product?.price_before} onChange={(v) => updateProps({ product: { ...p.product, price_before: v } })} suffix="kr" />
              <NumberField label="Pris nå" value={p.product?.price_now} onChange={(v) => {
                const before = p.product?.price_before || v;
                const pct = before > 0 ? Math.round((1 - v / before) * 100) : 0;
                updateProps({ product: { ...p.product, price_now: v, discount_pct: pct } });
              }} suffix="kr" />
            </div>
            <NumberField label="Rabatt %" value={p.product?.discount_pct} onChange={(v) => {
              const before = p.product?.price_before || 0;
              const now = Math.round(before * (1 - v / 100));
              updateProps({ product: { ...p.product, discount_pct: v, price_now: now } });
            }} suffix="%" />
            <ToggleField label="På lager" value={p.product?.in_stock} onChange={(v) => updateProps({ product: { ...p.product, in_stock: v } })} />
          </div>
          <ToggleField label="Vis rabatt-burst" value={p.showBurst} onChange={(v) => updateProps({ showBurst: v })} />
          {p.showBurst && (
            <>
              <SelectField label="Burst-stil" value={p.burstStyle} onChange={(v) => updateProps({ burstStyle: v })}
                options={["star", "circle", "ribbon", "stamp", "diagonal"]} />
              <Field label="Burst-tekst (auto fra rabatt hvis tom)">
                <input className="ft-input" value={p.burstText || ""} onChange={(e) => updateProps({ burstText: e.target.value || null })} placeholder={`-${p.product?.discount_pct || 0}%`} />
              </Field>
            </>
          )}
          <ToggleField label="Vis lager-prikk" value={p.showStock} onChange={(v) => updateProps({ showStock: v })} />
          <SelectField label="MVA-visning" value={p.vatMode} onChange={(v) => updateProps({ vatMode: v })}
            options={[{ value: "ex", label: "Eks. mva" }, { value: "inc", label: "Inkl. mva" }]} />
          <NumberField label="Antall bullets" value={p.bulletCount} onChange={(v) => updateProps({ bulletCount: v })} />
          <ColorField label="Bakgrunn" value={p.bgColor} onChange={(v) => updateProps({ bgColor: v })} />
          <ColorField label="Aksent (overstyr brand)" value={p.accentColor || ""} onChange={(v) => updateProps({ accentColor: v || null })} />
        </>
      );
    }
    case "text": {
      const p = obj.props;
      return (
        <>
          <Field label="Innhold"><textarea className="ft-input" rows={4} value={p.content} onChange={(e) => updateProps({ content: e.target.value })} /></Field>
          <SelectField label="Preset" value={p.preset} onChange={(v) => updateProps({ preset: v, isHeading: v.startsWith("h") })}
            options={["h1", "h2", "h3", "h4", "h5", "body"]} />
          <SelectField label="Justering" value={p.align} onChange={(v) => updateProps({ align: v })} options={["left", "center", "right"]} />
          <ColorField label="Farge" value={p.color} onChange={(v) => updateProps({ color: v })} />
          <ToggleField label="Kursiv" value={p.italic} onChange={(v) => updateProps({ italic: v })} />
        </>
      );
    }
    case "badge": {
      const p = obj.props;
      return (
        <>
          <Field label="Tekst"><textarea className="ft-input" rows={2} value={p.text} onChange={(e) => updateProps({ text: e.target.value })} /></Field>
          <SelectField label="Stil" value={p.style} onChange={(v) => updateProps({ style: v })} options={["star", "circle", "ribbon", "stamp", "diagonal"]} />
          <ColorField label="Bakgrunn" value={p.color} onChange={(v) => updateProps({ color: v })} />
          <ColorField label="Tekst-farge" value={p.textColor} onChange={(v) => updateProps({ textColor: v })} />
          <NumberField label="Skriftstørrelse" value={p.fontSize} onChange={(v) => updateProps({ fontSize: v })} />
        </>
      );
    }
    case "banner": {
      const p = obj.props;
      return (
        <>
          <Field label="Tittel"><input className="ft-input" value={p.title} onChange={(e) => updateProps({ title: e.target.value })} /></Field>
          <Field label="Periode/undertekst"><input className="ft-input" value={p.subtitle || ""} onChange={(e) => updateProps({ subtitle: e.target.value })} /></Field>
          <SelectField label="Stil" value={p.style} onChange={(v) => updateProps({ style: v })} options={["straight", "diagonal", "double"]} />
          <ColorField label="Bakgrunn" value={p.bg} onChange={(v) => updateProps({ bg: v })} />
          <ColorField label="Tekst-farge" value={p.color} onChange={(v) => updateProps({ color: v })} />
        </>
      );
    }
    case "priceBlock": {
      const p = obj.props;
      return (
        <>
          <NumberField label="Pris før" value={p.priceBefore} onChange={(v) => updateProps({ priceBefore: v })} suffix="kr" />
          <NumberField label="Pris nå" value={p.priceNow} onChange={(v) => updateProps({ priceNow: v })} suffix="kr" />
          <SelectField label="MVA" value={p.vatMode} onChange={(v) => updateProps({ vatMode: v })} options={[{ value: "ex", label: "Eks. mva" }, { value: "inc", label: "Inkl. mva" }]} />
          <SelectField label="Strikethrough" value={p.strikeStyle} onChange={(v) => updateProps({ strikeStyle: v })} options={["diagonal", "horizontal"]} />
        </>
      );
    }
    case "comboCard": {
      const p = obj.props;
      const sumNow = (p.productA?.price_now || 0) + (p.productB?.price_now || 0);
      const savings = Math.max(0, sumNow - (p.comboPrice || 0));
      return (
        <>
          <Field label="Etikett (badge øverst)">
            <input className="ft-input" value={p.comboLabel} onChange={(e) => updateProps({ comboLabel: e.target.value })} placeholder="KOMBI-PRIS" />
          </Field>

          <div style={{ padding: 8, background: "var(--chrome-bg-3)", borderRadius: 4, marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "var(--chrome-muted)", textTransform: "uppercase", marginBottom: 4 }}>Produkt A</div>
            <Field label="Velg fra dummy-katalog">
              <select className="ft-input" value={p.productA?.source_url || ""} onChange={(e) => {
                const found = DUMMY_PRODUCTS.find(pp => pp.source_url === e.target.value);
                if (found) updateProps({ productA: found });
              }}>
                {DUMMY_PRODUCTS.map(pp => <option key={pp.source_url} value={pp.source_url}>{pp.manufacturer} — {pp.name}</option>)}
              </select>
            </Field>
            <Field label="Navn"><input className="ft-input" value={p.productA?.name || ""} onChange={(e) => updateProps({ productA: { ...p.productA, name: e.target.value } })} /></Field>
            <NumberField label="Pris nå (A)" value={p.productA?.price_now} onChange={(v) => updateProps({ productA: { ...p.productA, price_now: v } })} suffix="kr" />
          </div>

          <div style={{ padding: 8, background: "var(--chrome-bg-3)", borderRadius: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "var(--chrome-muted)", textTransform: "uppercase", marginBottom: 4 }}>Produkt B</div>
            <Field label="Velg fra dummy-katalog">
              <select className="ft-input" value={p.productB?.source_url || ""} onChange={(e) => {
                const found = DUMMY_PRODUCTS.find(pp => pp.source_url === e.target.value);
                if (found) updateProps({ productB: found });
              }}>
                {DUMMY_PRODUCTS.map(pp => <option key={pp.source_url} value={pp.source_url}>{pp.manufacturer} — {pp.name}</option>)}
              </select>
            </Field>
            <Field label="Navn"><input className="ft-input" value={p.productB?.name || ""} onChange={(e) => updateProps({ productB: { ...p.productB, name: e.target.value } })} /></Field>
            <NumberField label="Pris nå (B)" value={p.productB?.price_now} onChange={(v) => updateProps({ productB: { ...p.productB, price_now: v } })} suffix="kr" />
          </div>

          <NumberField label="Kombi-pris" value={p.comboPrice} onChange={(v) => updateProps({ comboPrice: v })} suffix="kr" />
          <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginTop: -2, marginBottom: 6 }}>
            Sum hver-for-seg: {sumNow.toLocaleString("nb-NO")} kr · Kunde sparer: {savings.toLocaleString("nb-NO")} kr
          </div>

          <SelectField label="MVA" value={p.vatMode} onChange={(v) => updateProps({ vatMode: v })} options={[{ value: "ex", label: "Eks. mva" }, { value: "inc", label: "Inkl. mva" }]} />
          <ToggleField label="Vis spar-stempel" value={p.showSavings} onChange={(v) => updateProps({ showSavings: v })} />
          <ColorField label="Aksent (overstyr brand)" value={p.accentColor || ""} onChange={(v) => updateProps({ accentColor: v || null })} />
          <ColorField label="Bakgrunn" value={p.bgColor} onChange={(v) => updateProps({ bgColor: v })} />
        </>
      );
    }
    case "image": {
      const p = obj.props;
      return (
        <>
          <Field label="Etikett (placeholder)"><input className="ft-input" value={p.label || ""} onChange={(e) => updateProps({ label: e.target.value })} /></Field>
          <Field label="Asset">
            <select className="ft-input" value={p.src || ""} onChange={(e) => updateProps({ src: e.target.value || null })}>
              <option value="">— ingen (placeholder) —</option>
              {store.doc.assets.map(a => <option key={a.id} value={a.public_url ?? a.dataUrl ?? ""}>{a.name}</option>)}
            </select>
          </Field>
          <SelectField label="Maske" value={p.mask} onChange={(v) => updateProps({ mask: v })} options={["none", "circle", "hex"]} />
          <SelectField label="Tilpasning" value={p.fit} onChange={(v) => updateProps({ fit: v })} options={["cover", "contain"]} />
          <SelectField
            label="Fargefilter"
            value={p.tint || "none"}
            onChange={(v) => updateProps({ tint: v === "none" ? null : v })}
            options={[
              { value: "none", label: "Ingen" },
              { value: "white", label: "Hvit (for mørk bg)" },
              { value: "dark", label: "Mørk" },
            ]}
          />
          <button className="ft-btn" disabled style={{ width: "100%", justifyContent: "center" }}>Fjern bakgrunn (TODO)</button>
        </>
      );
    }
    case "shape": {
      const p = obj.props;
      return (
        <>
          <SelectField label="Form" value={p.shape} onChange={(v) => updateProps({ shape: v })} options={["rect", "circle", "diamond"]} />
          <ColorField label="Fyll" value={p.fill} onChange={(v) => updateProps({ fill: v })} />
          <ColorField label="Kantlinje" value={p.stroke === "none" ? "" : p.stroke} onChange={(v) => updateProps({ stroke: v || "none" })} />
          <NumberField label="Kant-tykkelse" value={p.strokeW} onChange={(v) => updateProps({ strokeW: v })} />
          <NumberField label="Hjørneradius" value={p.radius} onChange={(v) => updateProps({ radius: v })} />
        </>
      );
    }
    case "contact": {
      const p = obj.props;
      return (
        <>
          <Field label="Telefon"><input className="ft-input" value={p.phone} onChange={(e) => updateProps({ phone: e.target.value })} /></Field>
          <Field label="E-post"><input className="ft-input" value={p.email} onChange={(e) => updateProps({ email: e.target.value })} /></Field>
          <Field label="Adresse"><input className="ft-input" value={p.address} onChange={(e) => updateProps({ address: e.target.value })} /></Field>
          <Field label="Web"><input className="ft-input" value={p.web} onChange={(e) => updateProps({ web: e.target.value })} /></Field>
          <ToggleField label="Vis Miljøfyrtårn" value={p.showMiljofyrtarn} onChange={(v) => updateProps({ showMiljofyrtarn: v })} />
        </>
      );
    }
    case "footer": {
      const p = obj.props;
      return (
        <>
          <Field label="Venstre tekst"><input className="ft-input" value={p.left} onChange={(e) => updateProps({ left: e.target.value })} /></Field>
          <Field label="Høyre tekst (auto-sidetall)"><input className="ft-input" value={p.right} onChange={(e) => updateProps({ right: e.target.value })} /></Field>
          <ColorField label="Farge" value={p.color} onChange={(v) => updateProps({ color: v })} />
        </>
      );
    }
    case "gallery": {
      const p = obj.props;
      return (
        <>
          <NumberField label="Kolonner" value={p.cols} onChange={(v) => updateProps({ cols: v })} />
          <NumberField label="Mellomrom (mm)" value={p.gap} onChange={(v) => updateProps({ gap: v })} />
        </>
      );
    }
    default:
      return <div style={{ color: "var(--chrome-muted)", fontSize: 11 }}>Ingen ekstra egenskaper</div>;
  }
}

function BrandTab({ store }: { store: EditorStore }) {
  const t = store.doc.tokens;
  const set = (patch: Partial<BrandTokens>) => store.setTokens(patch);
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Brand-tokens</div>
      <div style={{ background: "var(--chrome-bg-3)", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 11, color: "var(--chrome-muted)" }}>
        Endringer påvirker alle komponenter som arver brand. Komponenter med eget aksent-overstyr forblir uendret.
      </div>
      <ColorField label="Primær rød (RGB)" value={t.red} onChange={(v) => set({ red: v })} />
      <ColorField label="Rød — CMYK-trygg" value={t.redCmyk} onChange={(v) => set({ redCmyk: v })} />
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button className="ft-btn" style={{ flex: 1 }} onClick={() => set({ red: t.redCmyk })}>Bruk CMYK-rød overalt</button>
        <button className="ft-btn" style={{ flex: 1 }} onClick={() => set({ red: "#ed1c24" })}>Tilbakestill RGB</button>
      </div>
      <ColorField label="Tekst (overskrift)" value={t.textMain} onChange={(v) => set({ textMain: v })} />
      <ColorField label="Tekst (brød)" value={t.textBody} onChange={(v) => set({ textBody: v })} />
      <ColorField label="Tekst (subtil)" value={t.textMuted} onChange={(v) => set({ textMuted: v })} />
      <ColorField label="Lenke" value={t.link} onChange={(v) => set({ link: v })} />
      <ColorField label="Sidebakgrunn" value={t.bgPage} onChange={(v) => set({ bgPage: v })} />
      <SelectField label="Heading-font" value={t.headingFont} onChange={(v) => set({ headingFont: v })}
        options={[
          { value: "Korolev, Roboto, Arial, Helvetica, sans-serif", label: "Korolev (heading default)" },
          { value: "Roboto, Arial, Helvetica, sans-serif", label: "Roboto" },
          { value: "Playfair Display, Georgia, serif", label: "Playfair Display" },
          { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
        ]} />
      <SelectField label="Body-font" value={t.bodyFont} onChange={(v) => set({ bodyFont: v })}
        options={[
          { value: "Roboto, Arial, Helvetica, sans-serif", label: "Roboto" },
          { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
        ]} />
      <ToggleField label="Vis 'inkl. mva' globalt" value={t.showVat} onChange={(v) => set({ showVat: v })} />
      <NumberField label="MVA-sats %" value={t.vatRate} onChange={(v) => set({ vatRate: v })} />

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--chrome-border)" }}>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Sesong-paletter</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button className="ft-btn" onClick={() => set({ red: "#ed1c24", bgPage: "#f5f7fa" })}>Standard</button>
          <button className="ft-btn" onClick={() => set({ red: "#0b2545", bgPage: "#f5f7fa" })}>Forsvar</button>
          <button className="ft-btn" onClick={() => set({ red: "#ff6b00", bgPage: "#fff8f0" })}>Sommer</button>
          <button className="ft-btn" onClick={() => set({ red: "#1f6b3a", bgPage: "#f4f8f5" })}>Maritim</button>
        </div>
      </div>
    </div>
  );
}

interface ManufacturerOption {
  slug: string;
  label: string;
  page_count: number;
  ga4_views: number;
  mailchimp_clicks: number;
  combined_score: number;
}

function DocumentTab({ store }: { store: EditorStore }) {
  const d = store.doc;
  const [brochures, setBrochures] = useState<BrochureListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Produsent-mal
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [mfLoading, setMfLoading] = useState(false);
  const [mfError, setMfError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [productCount, setProductCount] = useState<number>(6);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genWarning, setGenWarning] = useState<string | null>(null);

  const refreshList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/brosjyre/list");
      const data = await res.json();
      if (!res.ok) { setListError(data.error || `Feil (${res.status})`); return; }
      setBrochures(data.brochures || []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Nettverksfeil");
    } finally {
      setListLoading(false);
    }
  };

  const loadManufacturers = async () => {
    setMfLoading(true);
    setMfError(null);
    try {
      const res = await fetch("/api/brosjyre/manufacturers");
      const data = await res.json();
      if (!res.ok) { setMfError(data.error || `Feil (${res.status})`); return; }
      const list = data.manufacturers || [];
      setManufacturers(list);
      if (list.length > 0 && !selectedSlug) setSelectedSlug(list[0].slug);
    } catch (e) {
      setMfError(e instanceof Error ? e.message : "Nettverksfeil");
    } finally {
      setMfLoading(false);
    }
  };

  useEffect(() => { void refreshList(); }, [store.currentBrochureId, store.saveStatus]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadManufacturers(); }, []);

  const loadPreset = async (path: string) => {
    if (!confirm("Dette erstatter gjeldende brosjyre. Fortsett?")) return;
    try {
      const r = await fetch(path);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const preset = await r.json() as Partial<BrochureDoc>;
      store.setDocProp(preset);
    } catch (e) {
      alert(`Kunne ikke laste preset: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const generateManufacturerBrochure = async () => {
    if (!selectedSlug) return;
    if (store.saveStatus === "unsaved") {
      if (!confirm("Du har ulagrede endringer. Generér ny brosjyre likevel?")) return;
    } else if (d.pages.length > 1) {
      if (!confirm("Dette erstatter gjeldende brosjyre. Fortsett?")) return;
    }
    setGenerating(true);
    setGenError(null);
    setGenWarning(null);
    try {
      const res = await fetch("/api/brosjyre/generate-from-manufacturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSlug, count: productCount, only_in_stock: onlyInStock }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error || `Feil (${res.status})`); return; }
      store.setDocProp(data.doc as Partial<BrochureDoc>);
      // Hvis vi fikk færre produkter enn ønsket, vis info
      if (data.meta?.products_returned < productCount) {
        const skipped = data.meta?.out_of_stock_skipped || 0;
        const errs = data.meta?.scrape_errors?.length || 0;
        const parts = [];
        if (skipped > 0) parts.push(`${skipped} utsolgt`);
        if (errs > 0) parts.push(`${errs} feilet`);
        const detail = parts.length > 0 ? ` (${parts.join(", ")}).` : ".";
        setGenWarning(
          `Fikk bare ${data.meta.products_returned} av ${productCount} produkter${detail}`
        );
      }
      // Reset til ny brosjyre — denne er ikke lagret enda
      store.newBrochure();
      // Sett doc igjen (newBrochure tilbakestiller, men vi vil beholde generert)
      store.setDocProp(data.doc as Partial<BrochureDoc>);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Nettverksfeil");
    } finally {
      setGenerating(false);
    }
  };

  const onLoad = async (id: string) => {
    if (store.saveStatus === "unsaved") {
      if (!confirm("Du har ulagrede endringer. Last inn likevel?")) return;
    }
    const ok = await store.loadFromServer(id);
    if (!ok) alert("Kunne ikke laste brosjyren.");
  };

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Slett «${title}»? Dette kan ikke angres.`)) return;
    const ok = await store.deleteBrochure(id);
    if (!ok) { alert("Kunne ikke slette brosjyren."); return; }
    await refreshList();
  };

  return (
    <div style={{ padding: 14 }}>
      <Field label="Dokument-tittel">
        <input className="ft-input" value={d.title} onChange={(e) => store.setDocProp({ title: e.target.value })} />
      </Field>
      <SelectField label="Standard-papir" value={d.paper} onChange={(v) => store.setDocProp({ paper: v as BrochureDoc["paper"] })}
        options={Object.values(PAPER_SIZES).map(p => ({ value: p.id, label: p.label }))} />

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--chrome-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Mine brosjyrer
          </div>
          <button
            className="ft-btn ft-btn-ghost"
            style={{ fontSize: 10, padding: "2px 6px" }}
            onClick={() => void refreshList()}
            disabled={listLoading}
            title="Oppdater liste"
          >
            ↻
          </button>
        </div>
        {listError && (
          <div style={{ padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10, marginBottom: 6 }}>
            {listError}
          </div>
        )}
        {listLoading && brochures.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", padding: "6px 0" }}>Henter...</div>
        )}
        {!listLoading && brochures.length === 0 && !listError && (
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", padding: "6px 0" }}>
            Ingen lagrede brosjyrer ennå. Klikk «Lagre» i toppmenyen.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {brochures.map(b => {
            const active = b.id === store.currentBrochureId;
            return (
              <div
                key={b.id}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: 6,
                  borderRadius: 4, background: active ? "rgba(237,28,36,0.12)" : "var(--chrome-bg-3)",
                  border: active ? "1px solid var(--ft-red)" : "1px solid transparent",
                }}
              >
                <button
                  onClick={() => void onLoad(b.id)}
                  disabled={active}
                  style={{
                    flex: 1, minWidth: 0, background: "transparent", border: "none",
                    color: "#fff", textAlign: "left", cursor: active ? "default" : "pointer", padding: 0,
                  }}
                  title={active ? "Aktiv" : "Last inn"}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.title || "(uten tittel)"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--chrome-muted)" }}>
                    {b.page_count} sider · {new Date(b.updated_at).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
                <button
                  onClick={() => void onDelete(b.id, b.title)}
                  className="ft-btn ft-btn-ghost"
                  style={{ padding: "2px 6px", fontSize: 10, color: "var(--chrome-muted)" }}
                  title="Slett"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--chrome-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Generér produsent-brosjyre
          </div>
          <button
            className="ft-btn ft-btn-ghost"
            style={{ fontSize: 10, padding: "2px 6px" }}
            onClick={() => void loadManufacturers()}
            disabled={mfLoading}
            title="Oppdater produsent-liste"
          >
            ↻
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginBottom: 8 }}>
          Velg en produsent. Vi henter de mest besøkte produktsidene fra GA4 + Mailchimp og bygger en ferdig brosjyre med produsent-logo på forsiden.
        </div>
        {mfError && (
          <div style={{ marginBottom: 6, padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10 }}>
            {mfError}
          </div>
        )}
        <Field label="Produsent">
          <select
            className="ft-input"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            disabled={mfLoading || generating || manufacturers.length === 0}
          >
            {manufacturers.length === 0 && (
              <option value="">{mfLoading ? "Henter..." : "Ingen produsenter funnet"}</option>
            )}
            {manufacturers.map(m => (
              <option key={m.slug} value={m.slug}>
                {m.label} ({m.page_count} {m.page_count === 1 ? "side" : "sider"} · {m.ga4_views} views · {m.mailchimp_clicks} klikk)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Antall produkter">
          <input
            className="ft-input"
            type="number"
            min={1}
            max={12}
            value={productCount}
            onChange={(e) => setProductCount(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
            disabled={generating}
          />
        </Field>
        <label
          style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 4,
            fontSize: 11, color: "#fff", cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.5 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            disabled={generating}
            style={{ cursor: "inherit" }}
          />
          Kun lagerførte produkter
        </label>
        <button
          className="ft-btn ft-btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
          onClick={() => void generateManufacturerBrochure()}
          disabled={generating || !selectedSlug}
        >
          {generating ? "Genererer..." : "🏭 Generér brosjyre"}
        </button>
        {genError && (
          <div style={{ marginTop: 6, padding: 6, background: "rgba(237,28,36,0.15)", color: "#ff8a90", borderRadius: 4, fontSize: 10 }}>
            {genError}
          </div>
        )}
        {genWarning && (
          <div style={{ marginTop: 6, padding: 6, background: "rgba(245,158,11,0.15)", color: "#fbbf24", borderRadius: 4, fontSize: 10 }}>
            {genWarning}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--chrome-border)" }}>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Ferdige brosjyrer</div>
        <button
          className="ft-btn"
          style={{ width: "100%", justifyContent: "flex-start", marginBottom: 6, textAlign: "left" }}
          onClick={() => loadPreset("/brosjyre/presets/sommersalg-2026.json")}
        >
          ☀️ Sommersalg 2026 — 6 toppselgere
        </button>
        <div style={{ fontSize: 10, color: "var(--chrome-muted)", marginBottom: 8 }}>
          Auto-generert fra de mest klikkede produktene i Mailchimp siste 60 dager. Faktiske priser hentet fra fosen-tools.no.
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--chrome-border)" }}>
        <div style={{ fontSize: 11, color: "var(--chrome-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Eksport</div>
        <button
          className="ft-btn ft-btn-primary"
          style={{ width: "100%", justifyContent: "center", marginBottom: 6 }}
          onClick={() => exportBrochureToPdf({ doc: d }).catch((e) => alert(`Eksport feilet: ${e instanceof Error ? e.message : String(e)}`))}
        >Last ned PDF</button>
        <button className="ft-btn" style={{ width: "100%", justifyContent: "center", marginBottom: 6 }} onClick={() => {
          const json = JSON.stringify(d, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `${d.title}.json`; a.click();
          URL.revokeObjectURL(url);
        }}>Eksporter JSON</button>
        <label className="ft-btn" style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}>
          Importér JSON
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
              try {
                const parsed = JSON.parse(r.result as string) as Partial<BrochureDoc>;
                store.setDocProp(parsed);
              } catch {
                alert("Ugyldig JSON");
              }
            };
            r.readAsText(f);
          }} />
        </label>
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: "var(--chrome-muted)" }}>
        {d.pages.length} sider · {d.pages.reduce((n, p) => n + p.objects.length, 0)} objekter totalt
      </div>
    </div>
  );
}
