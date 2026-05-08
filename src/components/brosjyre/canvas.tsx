"use client";

// Canvas — viser aktiv side, håndterer drag/resize/select.

import { useState, useEffect, useRef } from "react";
import type { LibPayload, PageObject, SmartGuide } from "./types";
import {
  MM_TO_PX,
  BLEED_MM,
  SAFE_MARGIN_MM,
  EditorStore,
  DUMMY_PRODUCTS,
  makeProductCardObj,
  makePriceBlock,
  makeBadge,
  makeText,
  makeBanner,
  makeImage,
  makeRect,
  makeDivider,
  makeContact,
  makeGallery,
  makeComboCard,
} from "./store";
import { ObjectRenderer } from "./object-renderer";

type DragState =
  | { kind: "move"; ids: string[]; startMM: { mmX: number; mmY: number }; orig: Array<{ id: string; x: number; y: number }> }
  | { kind: "resize"; objId: string; handle: string; startMM: { mmX: number; mmY: number }; orig: { x: number; y: number; w: number; h: number }; shift: boolean };

export function makeFromLib(parsed: LibPayload, x: number, y: number): PageObject | null {
  switch (parsed.kind) {
    case "productCard":
      return makeProductCardObj(parsed.product || DUMMY_PRODUCTS[0], x, y, parsed.variant || "standard");
    case "priceBlock":
      return makePriceBlock(x, y);
    case "badge":
      return makeBadge(x, y, parsed.text || "-30%", parsed.style || "star");
    case "banner":
      return makeBanner(x, y, 180, 30);
    case "text":
      return makeText(x, y, parsed.content || "Skriv tekst...", parsed.preset || "h3");
    case "image": {
      const obj = makeImage(x, y, 80, 60);
      if (obj.type === "image" && parsed.src) {
        obj.props = { ...obj.props, src: parsed.src, label: parsed.label || "" };
      }
      return obj;
    }
    case "logo": {
      // Fosen Tools wordmark — hvit SVG, 11:1 aspekt. Default-størrelse matcher aspekt.
      const obj = makeImage(x, y, 70, 7, "Fosen Tools logo");
      if (obj.type === "image") {
        obj.props = {
          ...obj.props,
          src: "/brosjyre/Fosen-Tools_white.svg",
          fit: "contain",
          tint: parsed.tint ?? null,
        };
      }
      return obj;
    }
    case "shape":
      return makeRect(x, y, 60, 40);
    case "divider":
      return makeDivider(x, y, 150);
    case "contact":
      return makeContact(x, y);
    case "gallery":
      return makeGallery(x, y);
    case "comboCard":
      return makeComboCard(parsed.productA, parsed.productB, parsed.comboPrice, x, y);
    default:
      return null;
  }
}

export function Canvas({ store }: { store: EditorStore }) {
  const {
    activePage, selection, setSelection, zoom, updateObject, addObject,
    showBleed, showSafe, snapToGrid, snapToObjects,
  } = store;

  const [drag, setDrag] = useState<DragState | null>(null);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  if (!activePage) return <div style={{ padding: 20, color: "#888" }}>Ingen side valgt</div>;

  const pageW = activePage.w * MM_TO_PX;
  const pageH = activePage.h * MM_TO_PX;

  const mmFromClient = (cx: number, cy: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      mmX: (cx - r.left) / zoom / MM_TO_PX,
      mmY: (cy - r.top) / zoom / MM_TO_PX,
    };
  };

  const startMove = (e: React.MouseEvent, obj: PageObject) => {
    if (obj.locked) return;
    e.stopPropagation();
    const sel = selection.includes(obj.id) ? selection : [obj.id];
    if (!selection.includes(obj.id)) setSelection(e.shiftKey ? [...selection, obj.id] : [obj.id]);
    else if (e.shiftKey) setSelection(selection.filter(s => s !== obj.id));
    const start = mmFromClient(e.clientX, e.clientY);
    const orig = sel.map(id => {
      const o = activePage.objects.find(oo => oo.id === id)!;
      return { id, x: o.x, y: o.y };
    });
    setDrag({ kind: "move", ids: sel, startMM: start, orig });
  };

  const startResize = (e: React.MouseEvent, obj: PageObject, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (obj.locked) return;
    const start = mmFromClient(e.clientX, e.clientY);
    setDrag({
      kind: "resize",
      objId: obj.id,
      handle,
      startMM: start,
      orig: { x: obj.x, y: obj.y, w: obj.w, h: obj.h },
      shift: e.shiftKey,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const cur = mmFromClient(e.clientX, e.clientY);
      const dx = cur.mmX - drag.startMM.mmX;
      const dy = cur.mmY - drag.startMM.mmY;
      if (drag.kind === "move") {
        let snappedDx = dx, snappedDy = dy;
        if (snapToGrid) {
          const g = 1;
          snappedDx = Math.round(dx / g) * g;
          snappedDy = Math.round(dy / g) * g;
        }
        const guides: SmartGuide[] = [];
        drag.orig.forEach(o => {
          const obj = activePage.objects.find(oo => oo.id === o.id);
          if (!obj) return;
          let nx = o.x + snappedDx;
          const ny = o.y + snappedDy;
          if (snapToObjects) {
            const others = activePage.objects.filter(oo => !drag.ids.includes(oo.id));
            others.forEach(other => {
              if (Math.abs(nx - other.x) < 1.5) { nx = other.x; guides.push({ kind: "v", x: other.x }); }
              if (Math.abs(nx + obj.w - (other.x + other.w)) < 1.5) {
                nx = other.x + other.w - obj.w;
                guides.push({ kind: "v", x: other.x + other.w });
              }
              if (Math.abs(ny - other.y) < 1.5) { guides.push({ kind: "h", y: other.y }); }
            });
          }
          updateObject(o.id, { x: nx, y: ny }, { skipHistory: true });
        });
        setSmartGuides(guides);
      } else {
        const { handle, orig, shift } = drag;
        let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
        if (handle.includes("e")) nw = Math.max(5, orig.w + dx);
        if (handle.includes("s")) nh = Math.max(5, orig.h + dy);
        if (handle.includes("w")) { nw = Math.max(5, orig.w - dx); nx = orig.x + (orig.w - nw); }
        if (handle.includes("n")) { nh = Math.max(5, orig.h - dy); ny = orig.y + (orig.h - nh); }
        if (e.shiftKey || shift) {
          const ratio = orig.w / orig.h;
          nh = nw / ratio;
        }
        updateObject(drag.objId, { x: nx, y: ny, w: nw, h: nh }, { skipHistory: true });
      }
    };
    const up = () => { setDrag(null); setSmartGuides([]); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, activePage, snapToGrid, snapToObjects]);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === stageRef.current || target.dataset.canvasBg) {
      setSelection([]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-ft-component");
    if (!data) return;
    let parsed: LibPayload;
    try { parsed = JSON.parse(data); } catch { return; }
    const pos = mmFromClient(e.clientX, e.clientY);
    const obj = makeFromLib(parsed, pos.mmX, pos.mmY);
    if (obj) addObject(obj);
  };

  return (
    <div
      style={{ width: "100%", height: "100%", overflow: "auto", background: "#0a0c11", position: "relative" }}
      className="chrome-scroll"
      onMouseDown={onCanvasMouseDown}
    >
      <div style={{ width: pageW * zoom + 200, height: pageH * zoom + 200, position: "relative" }}>
        <div
          ref={stageRef}
          className="page-paper"
          data-canvas-bg
          style={{
            position: "absolute", left: 100, top: 100,
            width: pageW, height: pageH,
            transform: `scale(${zoom})`, transformOrigin: "top left",
            background: activePage.bg,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {showBleed && (
            <div className="bleed-guide" style={{
              left: -BLEED_MM * MM_TO_PX, top: -BLEED_MM * MM_TO_PX,
              width: pageW + 2 * BLEED_MM * MM_TO_PX, height: pageH + 2 * BLEED_MM * MM_TO_PX,
            }} />
          )}
          {showSafe && (
            <div className="safe-guide" style={{
              left: SAFE_MARGIN_MM * MM_TO_PX, top: SAFE_MARGIN_MM * MM_TO_PX,
              width: pageW - 2 * SAFE_MARGIN_MM * MM_TO_PX, height: pageH - 2 * SAFE_MARGIN_MM * MM_TO_PX,
            }} />
          )}
          {activePage.objects.map((obj) => {
            const isSel = selection.includes(obj.id);
            return (
              <div
                key={obj.id}
                style={{
                  position: "absolute",
                  left: obj.x * MM_TO_PX,
                  top: obj.y * MM_TO_PX,
                  width: obj.w * MM_TO_PX,
                  height: obj.h * MM_TO_PX,
                  transform: obj.rot ? `rotate(${obj.rot}deg)` : undefined,
                  cursor: obj.locked ? "default" : "move",
                }}
                className={isSel ? "obj-selected" : ""}
                onMouseDown={(e) => startMove(e, obj)}
              >
                <ObjectRenderer obj={obj} tokens={store.doc.tokens} />
                {isSel && !obj.locked && (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map(h => {
                  const styleByHandle: Record<string, React.CSSProperties> = {
                    nw: { left: -5, top: -5, cursor: "nwse-resize" },
                    n: { left: "calc(50% - 5px)", top: -5, cursor: "ns-resize" },
                    ne: { right: -5, top: -5, cursor: "nesw-resize" },
                    e: { right: -5, top: "calc(50% - 5px)", cursor: "ew-resize" },
                    se: { right: -5, bottom: -5, cursor: "nwse-resize" },
                    s: { left: "calc(50% - 5px)", bottom: -5, cursor: "ns-resize" },
                    sw: { left: -5, bottom: -5, cursor: "nesw-resize" },
                    w: { left: -5, top: "calc(50% - 5px)", cursor: "ew-resize" },
                  };
                  return <div key={h} className="handle" style={styleByHandle[h]} onMouseDown={(e) => startResize(e, obj, h)} />;
                })}
                {isSel && (
                  <div style={{
                    position: "absolute", top: -22, left: 0, background: "#4f8cff", color: "#fff",
                    fontSize: 10, padding: "2px 6px", borderRadius: 3, fontFamily: "Roboto Mono, monospace",
                    whiteSpace: "nowrap",
                  }}>
                    {Math.round(obj.w)}×{Math.round(obj.h)} mm
                  </div>
                )}
              </div>
            );
          })}
          {smartGuides.map((g, i) =>
            g.kind === "v" ? (
              <div key={i} className="smart-guide" style={{ left: (g.x ?? 0) * MM_TO_PX, top: 0, width: 1, height: pageH }} />
            ) : (
              <div key={i} className="smart-guide" style={{ top: (g.y ?? 0) * MM_TO_PX, left: 0, height: 1, width: pageW }} />
            )
          )}
        </div>

        <div style={{ position: "absolute", left: 100, top: 70, color: "#8b90a0", fontSize: 11, fontFamily: "Roboto Mono, monospace" }}>
          {activePage.w} × {activePage.h} mm
        </div>
      </div>
    </div>
  );
}
