"use client";

// Brosjyre-editor — App-shell, toolbar, snarveier, print-rendering.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2, Save, FilePlus } from "lucide-react";

function lastSavedHint(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (isNaN(t.getTime())) return null;
  const diffSec = Math.max(0, Math.round((Date.now() - t.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s siden`;
  const m = Math.round(diffSec / 60);
  if (m < 60) return `${m} min siden`;
  return t.toLocaleString("nb-NO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
import { Canvas } from "./canvas";
import { LeftPanel, RightPanel } from "./panels";
import { ObjectRenderer } from "./object-renderer";
import { useEditorStore, EditorStore } from "./store";
import { TEMPLATES } from "./templates";
import { exportBrochureToPdf } from "./export-pdf";

export function BrochureEditor() {
  const store = useEditorStore(TEMPLATES);
  const { doc, activePage, zoom, setZoom, undo, redo, canUndo, canRedo,
    selection, setSelection, deleteObjects, duplicateObjects, tool, setTool,
    showBleed, setShowBleed, showSafe, setShowSafe, snapToGrid, setSnapToGrid,
    snapToObjects, setSnapToObjects, updateObject,
    saveStatus, currentBrochureId, saveToServer, newBrochure } = store;
  const [exporting, setExporting] = useState<{ current: number; total: number } | null>(null);

  const handleSave = async () => {
    if (!doc.title.trim()) {
      const t = window.prompt("Gi brosjyren en tittel:", doc.title || "Ny brosjyre");
      if (!t) return;
      store.setDocProp({ title: t });
    }
    await saveToServer();
  };

  const handleNew = () => {
    if (currentBrochureId || saveStatus === "unsaved") {
      if (!window.confirm("Lag ny brosjyre? Gjeldende blir ikke slettet — den ligger lagret under «Mine brosjyrer».")) return;
    }
    newBrochure();
  };

  const saveLabel = (() => {
    switch (saveStatus) {
      case "saving": return "Lagrer...";
      case "saved": return currentBrochureId ? "Lagret" : "Lagre";
      case "unsaved": return "Lagre*";
      case "error": return "Lagre (feil)";
      default: return "Lagre";
    }
  })();

  const handleExport = async () => {
    if (exporting) return;
    setExporting({ current: 0, total: doc.pages.length });
    try {
      await exportBrochureToPdf({
        doc,
        onProgress: (current, total) => setExporting({ current, total }),
      });
    } catch (err) {
      alert(`Eksport feilet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(null);
    }
  };

  // Apply tokens globally so renderers can read CSS-vars
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ft-red", doc.tokens.red);
    root.style.setProperty("--ft-text-main", doc.tokens.textMain);
    root.style.setProperty("--ft-text-body", doc.tokens.textBody);
    root.style.setProperty("--ft-bg-page", doc.tokens.bgPage);
    root.style.setProperty("--heading-stack", doc.tokens.headingFont);
    root.style.setProperty("--body-stack", doc.tokens.bodyFont);
  }, [doc.tokens]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable || tag === "SELECT";
      if (isInput) return;

      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (cmd && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (cmd && e.key.toLowerCase() === "d") { e.preventDefault(); if (selection.length) duplicateObjects(selection); return; }
      if (cmd && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); void handleExport(); return; }
      if (cmd && e.key === "=") { e.preventDefault(); setZoom(Math.min(2, zoom + 0.1)); return; }
      if (cmd && e.key === "-") { e.preventDefault(); setZoom(Math.max(0.25, zoom - 0.1)); return; }

      if (e.key === "Backspace" || e.key === "Delete") { if (selection.length) { e.preventDefault(); deleteObjects(selection); } return; }
      if (e.key === "Escape") { setSelection([]); return; }
      if (e.key === "v" || e.key === "V") setTool("V");
      if (e.key === "t" || e.key === "T") setTool("T");
      if (e.key === "i" || e.key === "I") setTool("I");
      if (e.key === "r" || e.key === "R") setTool("R");

      if (selection.length && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        selection.forEach(id => {
          const o = activePage?.objects.find(oo => oo.id === id);
          if (o) updateObject(id, { x: o.x + dx, y: o.y + dy });
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, activePage, zoom]);

  return (
    <div className="brosjyre-editor" style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--chrome-bg)", color: "var(--chrome-text)", fontFamily: "var(--body-stack)", fontSize: 13 }}>
      <Toolbar store={store} />
      <div className="no-print" style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 300px", minHeight: 0 }}>
        <LeftPanel store={store} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Canvas store={store} />
          <BottomBar store={store} />
        </div>
        <RightPanel store={store} />
      </div>

      <PrintRoot doc={doc} />
    </div>
  );

  function Toolbar({ store }: { store: EditorStore }) {
    return (
      <div className="no-print" style={{
        height: 48, background: "var(--chrome-bg)", borderBottom: "1px solid var(--chrome-border)",
        display: "flex", alignItems: "center", padding: "0 12px", gap: 10, flexShrink: 0,
      }}>
        <Link href="/dashboard" className="ft-btn ft-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title="Tilbake til dashbord">
          <ArrowLeft className="w-4 h-4" /> Dashbord
        </Link>
        <div style={{ width: 1, height: 22, background: "var(--chrome-border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>BROSJYRE</span>
          <div style={{ width: 1, height: 22, background: "var(--chrome-border)" }} />
          <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{doc.title}</div>
          <div style={{ fontSize: 10, color: "var(--chrome-muted)", fontFamily: "Roboto Mono, monospace" }}>
            {doc.pages.length} sider
          </div>
        </div>

        <div style={{ width: 1, height: 22, background: "var(--chrome-border)", marginLeft: 6 }} />

        <div style={{ display: "flex", gap: 2 }}>
          {[
            { id: "V" as const, label: "Velg" },
            { id: "T" as const, label: "Tekst" },
            { id: "I" as const, label: "Bilde" },
            { id: "R" as const, label: "Form" },
          ].map(t => (
            <button
              key={t.id}
              className="ft-btn"
              onClick={() => store.setTool(t.id)}
              style={{
                background: tool === t.id ? "var(--chrome-bg-3)" : "transparent",
                borderColor: tool === t.id ? "var(--chrome-border)" : "transparent",
                color: tool === t.id ? "#fff" : "var(--chrome-muted)",
              }}
              title={`${t.label} (${t.id})`}
            >
              {t.label}
              <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4, fontFamily: "Roboto Mono, monospace" }}>{t.id}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: "var(--chrome-border)" }} />

        <button className="ft-btn ft-btn-ghost" onClick={undo} disabled={!canUndo} title="Angre (⌘Z)">↶ Angre</button>
        <button className="ft-btn ft-btn-ghost" onClick={redo} disabled={!canRedo} title="Gjør om (⌘⇧Z)">↷ Gjør om</button>

        <div style={{ width: 1, height: 22, background: "var(--chrome-border)" }} />

        <button
          className="ft-btn ft-btn-ghost"
          onClick={handleNew}
          title="Ny brosjyre — gjeldende lagres ikke automatisk hvis ulagret"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <FilePlus className="w-3 h-3" /> Ny
        </button>
        <button
          className="ft-btn"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          title={
            saveStatus === "saved" && lastSavedHint(store.lastSavedAt)
              ? `Lagret ${lastSavedHint(store.lastSavedAt)}`
              : "Lagre brosjyre i Supabase"
          }
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: saveStatus === "error" ? "#ff8a90" : saveStatus === "saved" ? "#9ae6b4" : "#fff",
            borderColor: saveStatus === "unsaved" ? "var(--ft-red)" : undefined,
          }}
        >
          {saveStatus === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {saveLabel}
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 2 }}>
          <button className="ft-btn ft-btn-ghost" onClick={() => setShowBleed(!showBleed)} style={{ color: showBleed ? "#ed1c24" : "var(--chrome-muted)" }} title="Bleed-guides (3mm)">Bleed</button>
          <button className="ft-btn ft-btn-ghost" onClick={() => setShowSafe(!showSafe)} style={{ color: showSafe ? "#0b2545" : "var(--chrome-muted)" }} title="Safe-margin (5mm)">Safe</button>
          <button className="ft-btn ft-btn-ghost" onClick={() => setSnapToGrid(!snapToGrid)} style={{ color: snapToGrid ? "#fff" : "var(--chrome-muted)" }} title="Snap til grid">Grid</button>
          <button className="ft-btn ft-btn-ghost" onClick={() => setSnapToObjects(!snapToObjects)} style={{ color: snapToObjects ? "#fff" : "var(--chrome-muted)" }} title="Snap til objekter">Snap</button>
        </div>

        <div style={{ width: 1, height: 22, background: "var(--chrome-border)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button className="ft-btn ft-btn-ghost" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}>−</button>
          <select className="ft-input" style={{ width: 80, padding: "4px 6px" }} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}>
            {[0.25, 0.5, 0.65, 0.75, 1, 1.5, 2].map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
          </select>
          <button className="ft-btn ft-btn-ghost" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
        </div>

        <button
          className="ft-btn ft-btn-primary"
          onClick={handleExport}
          disabled={!!exporting}
          title="Eksporter PDF (⌘⇧E) — laster ned automatisk"
        >
          {exporting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Eksporterer {exporting.current}/{exporting.total}...
            </>
          ) : (
            <>
              <Printer className="w-3 h-3" /> Eksporter PDF
            </>
          )}
        </button>
      </div>
    );
  }
}

function BottomBar({ store }: { store: EditorStore }) {
  const { activePage, doc, selection } = store;
  return (
    <div className="no-print" style={{
      height: 28, background: "var(--chrome-bg)", borderTop: "1px solid var(--chrome-border)",
      display: "flex", alignItems: "center", padding: "0 12px", gap: 14, fontSize: 11,
      color: "var(--chrome-muted)", fontFamily: "Roboto Mono, monospace", flexShrink: 0,
    }}>
      <div>Side {activePage ? doc.pages.indexOf(activePage) + 1 : 0} / {doc.pages.length}</div>
      <div>{activePage?.w} × {activePage?.h} mm</div>
      <div>{selection.length} valgt</div>
      <div style={{ flex: 1 }} />
      <div>Snarveier: V T I R · ⌘D dup · ⌘Z angre · ⌘⇧E eksport · piltaster nudge</div>
    </div>
  );
}

function PrintRoot({ doc }: { doc: EditorStore["doc"] }) {
  return (
    <div className="print-root" style={{ display: "none" }}>
      {doc.pages.map((page) => (
        <div
          key={page.id}
          className="page-paper"
          style={{
            width: `${page.w}mm`, height: `${page.h}mm`, background: page.bg,
            position: "relative", overflow: "hidden",
          }}
        >
          {page.objects.map(obj => (
            <div
              key={obj.id}
              style={{
                position: "absolute",
                left: `${obj.x}mm`, top: `${obj.y}mm`,
                width: `${obj.w}mm`, height: `${obj.h}mm`,
                transform: obj.rot ? `rotate(${obj.rot}deg)` : undefined,
              }}
            >
              <ObjectRenderer obj={obj} tokens={doc.tokens} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
