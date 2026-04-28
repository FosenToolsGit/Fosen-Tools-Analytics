"use client";

// Brosjyre-editor — store, dokument-modell, undo/redo, hjelpere.

import { useState, useEffect, useRef } from "react";
import type {
  PaperId,
  PaperSize,
  BrandTokens,
  Product,
  BrochureDoc,
  Page,
  PageObject,
  ProductCardVariant,
  Asset,
  BurstStyle,
  TextPreset,
} from "./types";

// ---------------- Konstanter ----------------
export const PAPER_SIZES: Record<PaperId, PaperSize> = {
  A4P: { id: "A4P", label: "A4 Portrett", w: 210, h: 297 },
  A4L: { id: "A4L", label: "A4 Landskap", w: 297, h: 210 },
  A5P: { id: "A5P", label: "A5 Portrett", w: 148, h: 210 },
  Letter: { id: "Letter", label: "US Letter", w: 215.9, h: 279.4 },
};
export const MM_TO_PX = 96 / 25.4;
export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 5;
export const STORAGE_KEY = "ft-brosjyre-doc-v1";
export const STORAGE_BROCHURE_ID_KEY = "ft-brosjyre-current-id-v1";
export const AUTOSAVE_DELAY_MS = 4000;

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface BrochureListItem {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  page_count: number;
}

// ---------------- Default brand-tokens ----------------
export const DEFAULT_TOKENS: BrandTokens = {
  red: "#ed1c24",
  redCmyk: "#d8121b",
  ink: "#111111",
  textMain: "#111827",
  textBody: "#4b5563",
  textMuted: "#6b7280",
  link: "#0b2545",
  bgPage: "#f5f7fa",
  cardBg: "#ffffff",
  borderSoft: "rgba(148, 163, 184, 0.4)",
  shadowSoft: "0 18px 40px rgba(15, 23, 42, 0.16)",
  headingFont: "Korolev, Roboto, Arial, Helvetica, sans-serif",
  bodyFont: "Roboto, Arial, Helvetica, sans-serif",
  showVat: true,
  vatRate: 25,
};

// ---------------- Dummy produktkatalog ----------------
export const DUMMY_PRODUCTS: Product[] = [
  {
    source_url: "https://fosen-tools.no/p/milwaukee-m18-fpd2",
    name: "Milwaukee M18 FPD2 Slagdrill",
    manufacturer: "Milwaukee",
    image_placeholder: "M18",
    price_before: 4990,
    price_now: 3490,
    discount_pct: 30,
    in_stock: true,
    category: "El-verktøy",
    bullets: ["18V FUEL™ børstefri motor", "135 Nm dreiemoment", "AUTOSTOP™ tilbakeslag", "2 × 5,0 Ah batteri"],
  },
  {
    source_url: "https://fosen-tools.no/p/wera-tool-check-plus",
    name: "Wera Tool-Check PLUS",
    manufacturer: "Wera",
    image_placeholder: "WERA",
    price_before: 2390,
    price_now: 1790,
    discount_pct: 25,
    in_stock: true,
    category: "Håndverktøy",
    bullets: ["39 deler skrutrekker- og pipesett", "Rapidaptor® hurtigskifte", "Tysk-produsert kvalitet"],
  },
  {
    source_url: "https://fosen-tools.no/p/knipex-cobra-xs",
    name: "Knipex Cobra® XS Rørtang",
    manufacturer: "Knipex",
    image_placeholder: "KNIPEX",
    price_before: 549,
    price_now: 449,
    discount_pct: 18,
    in_stock: true,
    category: "Håndverktøy",
    bullets: ["100 mm — passer i lommen", "Selvlåsende justering", "Krom-vanadium stål"],
  },
  {
    source_url: "https://fosen-tools.no/p/snap-on-flank-drive",
    name: "Snap-on Flank Drive® Pipesett",
    manufacturer: "Snap-on",
    image_placeholder: "SNAP-ON",
    price_before: 8990,
    price_now: 6990,
    discount_pct: 22,
    in_stock: true,
    category: "Verksted",
    bullets: ["1/2\" 23 deler", "Flank Drive® gripeteknologi", "Livstidsgaranti"],
  },
  {
    source_url: "https://fosen-tools.no/p/stahlwille-momentnokkel",
    name: "Stahlwille 730N/20 Momentnøkkel",
    manufacturer: "Stahlwille",
    image_placeholder: "STAHLW",
    price_before: 4290,
    price_now: 3590,
    discount_pct: 16,
    in_stock: false,
    category: "Måling",
    bullets: ["40–200 Nm", "± 4 % nøyaktighet", "DIN EN ISO 6789 sertifisert"],
  },
  {
    source_url: "https://fosen-tools.no/p/pelicase-1510",
    name: "Pelicase 1510 Trillekoffert",
    manufacturer: "Peli",
    image_placeholder: "PELI",
    price_before: 3290,
    price_now: 2690,
    discount_pct: 18,
    in_stock: true,
    category: "Oppbevaring",
    bullets: ["Vanntett IP67", "Forsvars-godkjent", "Skum + trillehjul"],
  },
];

// ---------------- ID + util ----------------
export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export const formatNOK = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(n) + ",-";
};

// ---------------- Default page-objekter ----------------
export const makeProductCardObj = (
  product: Product | undefined,
  x = 20,
  y = 20,
  variant: ProductCardVariant = "standard"
): PageObject => {
  const sizes: Record<ProductCardVariant, { w: number; h: number }> = {
    compact: { w: 60, h: 70 },
    standard: { w: 90, h: 110 },
    hero: { w: 180, h: 240 },
    bundle: { w: 130, h: 110 },
    compare: { w: 170, h: 90 },
  };
  const size = sizes[variant] || sizes.standard;
  return {
    id: uid("obj"),
    type: "productCard",
    x, y, w: size.w, h: size.h, rot: 0, locked: false,
    props: {
      variant,
      product: product || DUMMY_PRODUCTS[0],
      showBurst: true,
      burstStyle: "star",
      burstText: null,
      showQR: false,
      showStock: true,
      showWarranty: false,
      vatMode: "ex",
      bulletCount: 3,
      bgColor: "#ffffff",
      accentColor: null,
    },
  };
};

export const makePriceBlock = (x = 30, y = 30): PageObject => ({
  id: uid("obj"), type: "priceBlock", x, y, w: 70, h: 35, rot: 0, locked: false,
  props: { priceBefore: 4990, priceNow: 3490, vatMode: "ex", strikeStyle: "diagonal", suffixSize: 0.5 },
});

export const makeBadge = (x = 30, y = 30, text = "-30%", style: BurstStyle = "star"): PageObject => ({
  id: uid("obj"), type: "badge", x, y, w: 35, h: 35, rot: -8, locked: false,
  props: { text, style, color: "#ed1c24", textColor: "#ffffff", fontSize: 12 },
});

export const makeText = (x = 20, y = 20, content = "Tekst", preset: TextPreset = "h2"): PageObject => ({
  id: uid("obj"), type: "text", x, y, w: 100, h: 20, rot: 0, locked: false,
  props: { content, preset, align: "left", color: "#111827", weight: 400, italic: false, isHeading: preset.startsWith("h") },
});

export const makeBanner = (x = 0, y = 0, w = 210, h = 30): PageObject => ({
  id: uid("obj"), type: "banner", x, y, w, h, rot: 0, locked: false,
  props: { title: "KAMPANJE", subtitle: "01.04 – 30.04.2026", style: "straight", bg: "#ed1c24", color: "#ffffff" },
});

export const makeImage = (x = 20, y = 20, w = 80, h = 60, label = "Bilde"): PageObject => ({
  id: uid("obj"), type: "image", x, y, w, h, rot: 0, locked: false,
  props: { src: null, label, mask: "none", fit: "cover", focusX: 0.5, focusY: 0.5 },
});

export const makeRect = (x = 20, y = 20, w = 60, h = 40): PageObject => ({
  id: uid("obj"), type: "shape", x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill: "#ed1c24", stroke: "none", strokeW: 0, radius: 0 },
});

export const makeDivider = (x = 20, y = 50, w = 170): PageObject => ({
  id: uid("obj"), type: "shape", x, y, w, h: 1, rot: 0, locked: false,
  props: { shape: "rect", fill: "#111111", stroke: "none", strokeW: 0, radius: 0 },
});

export const makeContact = (x = 15, y = 230): PageObject => ({
  id: uid("obj"), type: "contact", x, y, w: 180, h: 40, rot: 0, locked: false,
  props: {
    phone: "72 51 51 20",
    email: "post@fosen-tools.no",
    address: "Industrigata 1, 7130 Brekstad",
    web: "fosen-tools.no",
    showMiljofyrtarn: true,
  },
});

export const makeFooter = (x = 0, y = 285, pageNum = 1): PageObject => ({
  id: uid("obj"), type: "footer", x, y, w: 210, h: 8, rot: 0, locked: false,
  props: { left: "Fosen Tools AS — Kampanje våren 2026", right: `Side ${pageNum}`, color: "#6b7280" },
});

export const makeGallery = (x = 10, y = 40, w = 190, h = 230): PageObject => ({
  id: uid("obj"), type: "gallery", x, y, w, h, rot: 0, locked: false,
  props: { cols: 3, products: DUMMY_PRODUCTS.slice(0, 6), gap: 4 },
});

// ---------------- Default dokument ----------------
export function makeBlankPage(paper: PaperId = "A4P", index = 0): Page {
  const sz = PAPER_SIZES[paper];
  return {
    id: uid("page"),
    paper,
    w: sz.w,
    h: sz.h,
    bg: "#ffffff",
    objects: [makeFooter(0, sz.h - 12, index + 1)],
  };
}

// Lazy import for templates to avoid circular import at module load
type TemplateBuilder = (idx: number, doc?: BrochureDoc) => Page;
type TemplatesArray = Array<{ id: string; build: TemplateBuilder }>;

export const STARTER_DOC = (templates: TemplatesArray | null = null): BrochureDoc => {
  const pages = templates
    ? [
        templates.find(t => t.id === "cover-classic")?.build(0),
        templates.find(t => t.id === "grid-4")?.build(1),
        templates.find(t => t.id === "hero-1")?.build(2),
        templates.find(t => t.id === "back-cover")?.build(3),
      ].filter((x): x is Page => Boolean(x))
    : [makeBlankPage("A4P", 0)];

  return {
    id: uid("doc"),
    title: "Fosen Tools — Kampanje vår 2026",
    paper: "A4P",
    tokens: { ...DEFAULT_TOKENS },
    pages,
    assets: [],
  };
};

// ---------------- localStorage persistens ----------------
function loadFromStorage(): BrochureDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrochureDoc;
  } catch {
    return null;
  }
}

function saveToStorage(doc: BrochureDoc) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // ignorer quota-feil
  }
}

// ---------------- Store ----------------
export type EditorStore = ReturnType<typeof useEditorStore>;

function loadBrochureIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(STORAGE_BROCHURE_ID_KEY); } catch { return null; }
}

function saveBrochureIdToStorage(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_BROCHURE_ID_KEY, id);
    else window.localStorage.removeItem(STORAGE_BROCHURE_ID_KEY);
  } catch { /* ignorer quota */ }
}

export function useEditorStore(initialTemplates: TemplatesArray | null = null) {
  const [doc, setDocRaw] = useState<BrochureDoc>(() => {
    const stored = loadFromStorage();
    return stored ?? STARTER_DOC(initialTemplates);
  });
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.65);
  const [showBleed, setShowBleed] = useState(true);
  const [showSafe, setShowSafe] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [tool, setTool] = useState<"V" | "T" | "I" | "R">("V");
  const undoStack = useRef<BrochureDoc[]>([]);
  const redoStack = useRef<BrochureDoc[]>([]);
  const [, setVersion] = useState(0);

  // Multi-doc state
  const [currentBrochureId, setCurrentBrochureIdRaw] = useState<string | null>(() => loadBrochureIdFromStorage());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextDirty = useRef(false);

  const setCurrentBrochureId = (id: string | null) => {
    setCurrentBrochureIdRaw(id);
    saveBrochureIdToStorage(id);
  };

  // Initial active page
  useEffect(() => {
    if (!activePageId && doc.pages[0]) setActivePageId(doc.pages[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to localStorage on every change (debounced via microtask)
  useEffect(() => {
    saveToStorage(doc);
  }, [doc]);

  // Mark dirty + schedule auto-save if linked til en lagret brosjyre.
  useEffect(() => {
    if (skipNextDirty.current) { skipNextDirty.current = false; return; }
    if (!currentBrochureId) return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void saveToServer(); }, AUTOSAVE_DELAY_MS);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, currentBrochureId]);

  const saveToServer = async (overrideTitle?: string): Promise<{ id: string } | null> => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/brosjyre/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentBrochureId ?? undefined,
          title: overrideTitle ?? doc.title,
          doc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        return null;
      }
      if (!currentBrochureId) setCurrentBrochureId(data.id);
      setLastSavedAt(data.updated_at);
      setSaveStatus("saved");
      return { id: data.id };
    } catch {
      setSaveStatus("error");
      return null;
    }
  };

  const loadFromServer = async (id: string): Promise<boolean> => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/brosjyre/${id}`);
      const data = await res.json();
      if (!res.ok) { setSaveStatus("error"); return false; }
      skipNextDirty.current = true;
      setDocRaw(data.brochure.doc as BrochureDoc);
      setCurrentBrochureId(data.brochure.id);
      setLastSavedAt(data.brochure.updated_at);
      setSaveStatus("saved");
      // Reset undo-stack — den gamle historikken hører til en annen brosjyre
      undoStack.current = [];
      redoStack.current = [];
      setVersion(v => v + 1);
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  };

  const newBrochure = () => {
    skipNextDirty.current = true;
    setDocRaw(STARTER_DOC(initialTemplates));
    setCurrentBrochureId(null);
    setLastSavedAt(null);
    setSaveStatus("idle");
    undoStack.current = [];
    redoStack.current = [];
    setVersion(v => v + 1);
  };

  const deleteBrochure = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/brosjyre/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    if (currentBrochureId === id) {
      // Hvis vi sletter den aktive, start på nytt
      newBrochure();
    }
    return true;
  };

  // If templates load AFTER initial render (we passed null first), upgrade starter doc
  useEffect(() => {
    if (initialTemplates && doc.pages.length === 1 && doc.pages[0].objects.length <= 1) {
      const stored = loadFromStorage();
      if (!stored) {
        setDocRaw(STARTER_DOC(initialTemplates));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplates]);

  const pushUndo = (snapshot: BrochureDoc) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    setVersion(v => v + 1);
  };

  const setDoc = (updater: BrochureDoc | ((prev: BrochureDoc) => BrochureDoc), opts: { skipHistory?: boolean } = {}) => {
    setDocRaw(prev => {
      const snapshot = clone(prev);
      const next = typeof updater === "function" ? (updater as (p: BrochureDoc) => BrochureDoc)(prev) : updater;
      if (!opts.skipHistory) pushUndo(snapshot);
      return next;
    });
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    setDocRaw(prev => {
      redoStack.current.push(clone(prev));
      const popped = undoStack.current.pop()!;
      setVersion(v => v + 1);
      return popped;
    });
  };
  const redo = () => {
    if (!redoStack.current.length) return;
    setDocRaw(prev => {
      undoStack.current.push(clone(prev));
      const popped = redoStack.current.pop()!;
      setVersion(v => v + 1);
      return popped;
    });
  };

  const activePage = doc.pages.find(p => p.id === activePageId) ?? doc.pages[0];

  const addPage = (template?: (idx: number, doc: BrochureDoc) => Page) => {
    setDoc(d => {
      const copy = clone(d);
      const idx = copy.pages.length;
      const page = template ? template(idx, copy) : makeBlankPage(copy.paper, idx);
      copy.pages.push(page);
      return copy;
    });
  };
  const duplicatePage = (id: string) => {
    setDoc(d => {
      const copy = clone(d);
      const idx = copy.pages.findIndex(p => p.id === id);
      if (idx < 0) return d;
      const dup = clone(copy.pages[idx]);
      dup.id = uid("page");
      dup.objects = dup.objects.map(o => ({ ...o, id: uid("obj") }));
      copy.pages.splice(idx + 1, 0, dup);
      return copy;
    });
  };
  const removePage = (id: string) => {
    setDoc(d => {
      if (d.pages.length === 1) return d;
      const copy = clone(d);
      copy.pages = copy.pages.filter(p => p.id !== id);
      return copy;
    });
    setActivePageId(prev => {
      if (prev !== id) return prev;
      const next = doc.pages.find(p => p.id !== id);
      return next ? next.id : null;
    });
  };
  const reorderPages = (fromIdx: number, toIdx: number) => {
    setDoc(d => {
      const copy = clone(d);
      const [m] = copy.pages.splice(fromIdx, 1);
      copy.pages.splice(toIdx, 0, m);
      return copy;
    });
  };

  const addObject = (obj: PageObject, pageId: string | null = activePageId) => {
    setDoc(d => {
      const copy = clone(d);
      const p = copy.pages.find(pp => pp.id === pageId);
      if (!p) return d;
      p.objects.push(obj);
      return copy;
    });
    setSelection([obj.id]);
  };
  const updateObject = (objId: string, patch: { x?: number; y?: number; w?: number; h?: number; rot?: number; locked?: boolean; props?: Record<string, unknown> }, opts: { skipHistory?: boolean } = {}) => {
    setDoc(d => {
      const copy = clone(d);
      const p = copy.pages.find(pp => pp.id === activePageId);
      if (!p) return d;
      const o = p.objects.find(oo => oo.id === objId);
      if (!o) return d;
      const { props: propsPatch, ...rest } = patch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign(o, rest);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (propsPatch) (o.props as any) = { ...(o.props as any), ...propsPatch };
      return copy;
    }, opts);
  };
  const deleteObjects = (ids: string[]) => {
    setDoc(d => {
      const copy = clone(d);
      const p = copy.pages.find(pp => pp.id === activePageId);
      if (!p) return d;
      p.objects = p.objects.filter(o => !ids.includes(o.id));
      return copy;
    });
    setSelection([]);
  };
  const duplicateObjects = (ids: string[]) => {
    const newIds: string[] = [];
    setDoc(d => {
      const copy = clone(d);
      const p = copy.pages.find(pp => pp.id === activePageId);
      if (!p) return d;
      ids.forEach(id => {
        const o = p.objects.find(oo => oo.id === id);
        if (!o) return;
        const dup = clone(o);
        dup.id = uid("obj");
        dup.x += 5; dup.y += 5;
        p.objects.push(dup);
        newIds.push(dup.id);
      });
      return copy;
    });
    if (newIds.length) setSelection(newIds);
  };
  const reorderObject = (id: string, dir: "up" | "down" | "top" | "bottom") => {
    setDoc(d => {
      const copy = clone(d);
      const p = copy.pages.find(pp => pp.id === activePageId);
      if (!p) return d;
      const idx = p.objects.findIndex(o => o.id === id);
      if (idx < 0) return d;
      const [m] = p.objects.splice(idx, 1);
      let target = idx;
      if (dir === "up") target = Math.min(p.objects.length, idx + 1);
      else if (dir === "down") target = Math.max(0, idx - 1);
      else if (dir === "top") target = p.objects.length;
      else if (dir === "bottom") target = 0;
      p.objects.splice(target, 0, m);
      return copy;
    });
  };
  const setTokens = (patch: Partial<BrandTokens>) => setDoc(d => ({ ...d, tokens: { ...d.tokens, ...patch } }));
  const setPageProp = (pageId: string, patch: Partial<Page>) => setDoc(d => {
    const copy = clone(d);
    const p = copy.pages.find(pp => pp.id === pageId);
    if (!p) return d;
    Object.assign(p, patch);
    return copy;
  });
  const setDocProp = (patch: Partial<BrochureDoc>) => setDoc(d => ({ ...d, ...patch }));
  const addAsset = (asset: Asset) => setDoc(d => ({ ...d, assets: [...d.assets, asset] }));

  return {
    doc, setDoc, setDocProp,
    activePage, activePageId, setActivePageId,
    selection, setSelection,
    zoom, setZoom,
    showBleed, setShowBleed, showSafe, setShowSafe,
    snapToGrid, setSnapToGrid, snapToObjects, setSnapToObjects,
    tool, setTool,
    undo, redo,
    canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0,
    addPage, duplicatePage, removePage, reorderPages,
    addObject, updateObject, deleteObjects, duplicateObjects, reorderObject,
    setTokens, setPageProp, addAsset,
    // Multi-doc
    currentBrochureId, saveStatus, lastSavedAt,
    saveToServer, loadFromServer, newBrochure, deleteBrochure,
  };
}
