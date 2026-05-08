// Brosjyre-editor — typer for dokument-modellen.
// Holdes pragmatiske: nok struktur til å fange fatale feil, ikke over-engineered.

export type PaperId = "A4P" | "A4L" | "A5P" | "Letter";

export interface PaperSize {
  id: PaperId;
  label: string;
  w: number; // mm
  h: number; // mm
}

export interface BrandTokens {
  red: string;
  redCmyk: string;
  ink: string;
  textMain: string;
  textBody: string;
  textMuted: string;
  link: string;
  bgPage: string;
  cardBg: string;
  borderSoft: string;
  shadowSoft: string;
  headingFont: string;
  bodyFont: string;
  showVat: boolean;
  vatRate: number;
}

export interface Product {
  source_url: string;
  name: string;
  manufacturer: string;
  manufacturer_logo_url?: string | null; // Produsent-logo fra produktsiden (.ProducerLogoImage)
  image_url?: string | null; // Faktisk produktbilde fra fosen-tools.no
  image_placeholder?: string; // Fallback-monogram hvis image_url mangler
  price_before: number;
  price_now: number;
  discount_pct: number;
  in_stock: boolean;
  category: string;
  bullets?: string[];
}

// --- Object types ---
export type ProductCardVariant = "compact" | "standard" | "hero" | "compare" | "bundle";
export type BurstStyle = "star" | "circle" | "ribbon" | "stamp" | "diagonal";
export type TextPreset = "h1" | "h2" | "h3" | "h4" | "h5" | "body";
export type BannerStyle = "straight" | "diagonal" | "double";
export type ShapeKind = "rect" | "circle" | "diamond";
export type ImageMask = "none" | "circle" | "hex";
export type ImageFit = "cover" | "contain";
export type VatMode = "ex" | "inc";

export interface ProductCardProps {
  variant: ProductCardVariant;
  product: Product;
  showBurst: boolean;
  burstStyle: BurstStyle;
  burstText: string | null;
  showQR: boolean;
  showStock: boolean;
  showWarranty: boolean;
  vatMode: VatMode;
  bulletCount: number;
  bgColor: string;
  accentColor: string | null;
}

export interface PriceBlockProps {
  priceBefore: number;
  priceNow: number;
  vatMode: VatMode;
  strikeStyle: "diagonal" | "horizontal";
  suffixSize: number;
  color?: string;
  size?: number;
}

export interface BadgeProps {
  text: string;
  style: BurstStyle;
  color: string;
  textColor: string;
  fontSize: number;
}

export interface TextProps {
  content: string;
  preset: TextPreset;
  align: "left" | "center" | "right";
  color: string;
  weight: number;
  italic: boolean;
  isHeading: boolean;
}

export interface BannerProps {
  title: string;
  subtitle: string;
  style: BannerStyle;
  bg: string;
  color: string;
}

export interface ImageProps {
  src: string | null;
  label: string;
  mask: ImageMask;
  fit: ImageFit;
  focusX: number;
  focusY: number;
  /** Optional fargefilter — bruk "white" for å gjøre logo hvit på mørk bakgrunn. */
  tint?: "white" | "dark" | null;
}

export interface ShapeProps {
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeW: number;
  radius: number;
}

export interface ContactProps {
  phone: string;
  email: string;
  address: string;
  web: string;
  showMiljofyrtarn: boolean;
}

export interface FooterProps {
  left: string;
  right: string;
  color: string;
}

export interface GalleryProps {
  cols: number;
  products: Product[];
  gap: number;
}

export interface ComboCardProps {
  productA: Product;
  productB: Product;
  comboPrice: number;
  comboLabel: string;
  vatMode: VatMode;
  bgColor: string;
  accentColor: string | null;
  showSavings: boolean;
}

// Discriminated union for objects
export type PageObject =
  | { id: string; type: "productCard"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: ProductCardProps }
  | { id: string; type: "priceBlock"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: PriceBlockProps }
  | { id: string; type: "badge"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: BadgeProps }
  | { id: string; type: "text"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: TextProps }
  | { id: string; type: "banner"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: BannerProps }
  | { id: string; type: "image"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: ImageProps }
  | { id: string; type: "shape"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: ShapeProps }
  | { id: string; type: "contact"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: ContactProps }
  | { id: string; type: "footer"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: FooterProps }
  | { id: string; type: "gallery"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: GalleryProps }
  | { id: string; type: "comboCard"; x: number; y: number; w: number; h: number; rot: number; locked: boolean; props: ComboCardProps };

export type ObjectType = PageObject["type"];

export interface Page {
  id: string;
  paper: PaperId;
  w: number;
  h: number;
  bg: string;
  objects: PageObject[];
}

export interface Asset {
  id: string;
  name: string;
  /** Base64 data-URL (legacy / inline-bilder). Kun nyere uploads bruker public_url. */
  dataUrl?: string;
  /** Path i brochure_assets-bucket: `{user_id}/{uuid}-{filename}`. */
  storage_path?: string;
  /** Full URL for rendering. Brukes som primær src — fallback til dataUrl. */
  public_url?: string;
}

export interface BrochureDoc {
  id: string;
  title: string;
  paper: PaperId;
  tokens: BrandTokens;
  pages: Page[];
  assets: Asset[];
}

// Library-drop payloads (when dragging from sidebar onto canvas)
export type LibPayload =
  | { kind: "productCard"; variant?: ProductCardVariant; product?: Product }
  | { kind: "priceBlock" }
  | { kind: "badge"; style?: BurstStyle; text?: string }
  | { kind: "banner" }
  | { kind: "text"; preset?: TextPreset; content?: string }
  | { kind: "image"; src?: string; label?: string }
  | { kind: "logo"; tint?: "white" | "dark" | null }
  | { kind: "shape" }
  | { kind: "divider" }
  | { kind: "contact" }
  | { kind: "gallery" }
  | { kind: "comboCard"; productA?: Product; productB?: Product; comboPrice?: number };

// Template definition
export interface Template {
  id: string;
  label: string;
  category: "Forside" | "Produkter" | "Bundle" | "Bransje" | "Bakside";
  build: (idx: number, doc?: BrochureDoc) => Page;
}

export interface DragState {
  kind: "move" | "resize";
  ids?: string[];
  objId?: string;
  handle?: string;
  startMM: { mmX: number; mmY: number };
  orig: Array<{ id: string; x: number; y: number }> | { x: number; y: number; w: number; h: number };
  shift?: boolean;
}

export interface SmartGuide {
  kind: "v" | "h";
  x?: number;
  y?: number;
}
