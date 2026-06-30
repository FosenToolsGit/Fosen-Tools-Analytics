// Auto-oppdatering av butikk-skjermer.
// For hver spilleliste med settings.auto_config henter vi de mest populære
// (GA4-besøk) + nyeste produktene for gitte merker, beholder kun de som er
// PÅ LAGER (live JSON-LD-availability), og bygger spillelista på nytt.
// Kjøres ukentlig via /api/cron/refresh-screens (Vercel cron) — bruker statisk
// scrape (ingen Playwright) så den fungerer i serverless.

import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeProductByUrl } from "./scrape-product";
import type { PricetagProduct } from "@/components/prisplakat/types";

export interface AutoConfig {
  /** URL-fragmenter (merke-slugs), f.eks. ["milwaukee"] eller flere for blandet skjerm */
  match: string[];
  /** Antall produkter på skjermen */
  count?: number;
  /** Rangering: popularitet, blanding (default), eller nyeste */
  sort?: "popularity" | "mix" | "newest";
  /** Kun produkter på lager (default true) */
  in_stock_only?: boolean;
  /** Minste eks-mva-pris for å bli vist (filtrerer bort billig tilbehør). Default 0. */
  min_price?: number;
  /** Ekskluder produkter — match mot artikkelnummer/URL-token eller SKU. */
  exclude?: string[];
}

interface Candidate { url: string; views: number; created: string }

/** Produkt-token = 2. path-segment (artikkelnummer) — brukes til dedup per produkt.
 *  post_url er ofte relativ ("/milwaukee/120323/..."), så vi strippe-r ev. domene
 *  med streng-operasjon i stedet for new URL(). */
function productToken(url: string): string | null {
  const path = String(url || "").replace(/^https?:\/\/[^/]+/i, "");
  const parts = path.split("?")[0].split("/").filter(Boolean);
  return parts.length >= 2 ? parts[1] : null;
}

/** Gjør en (mulig relativ) produkt-URL absolutt mot fosen-tools.no. */
function absoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://fosen-tools.no${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface RefreshResult {
  id: string;
  playlist: string;
  before: number;
  after: number;
  skipped: number;
}

export async function refreshAutoScreens(admin: SupabaseClient): Promise<RefreshResult[]> {
  const { data: playlists, error } = await admin
    .from("pricetag_playlists")
    .select("id, title, settings, products");
  if (error) throw new Error(error.message);

  const results: RefreshResult[] = [];

  for (const pl of playlists ?? []) {
    const cfg: AutoConfig | undefined = pl.settings?.auto_config;
    if (!cfg?.match?.length) continue;
    const count = cfg.count ?? 10;
    const sort = cfg.sort ?? "mix";
    const inStockOnly = cfg.in_stock_only ?? true;

    // 1) Samle kandidat-URLer fra GA4 platform_posts, dedup per produkt (høyeste visning vinner)
    const seen = new Map<string, Candidate>();
    for (const frag of cfg.match) {
      const { data } = await admin
        .from("platform_posts")
        .select("post_url, impressions, created_at")
        .eq("platform", "ga4")
        .ilike("post_url", `%/${frag}/%`)
        .limit(1000);
      for (const row of data ?? []) {
        const url: string = row.post_url;
        const token = productToken(url);
        if (!token || !/^[a-z0-9]/i.test(token)) continue;
        const views = row.impressions ?? 0;
        const prev = seen.get(token);
        if (!prev || views > prev.views) seen.set(token, { url, views, created: row.created_at });
      }
    }

    const all = [...seen.values()];
    const byViews = [...all].sort((a, b) => b.views - a.views);
    const byNew = [...all].sort((a, b) => (b.created || "").localeCompare(a.created || ""));

    // 2) Rekkefølge etter valgt regel
    let ordered: Candidate[];
    if (sort === "popularity") {
      ordered = byViews;
    } else if (sort === "newest") {
      ordered = byNew;
    } else {
      // mix: hovedsakelig populære + et innslag av ferske (ikke allerede med)
      const top = byViews.slice(0, count * 2);
      const topTokens = new Set(top.map((c) => productToken(c.url)));
      const fresh = byNew.filter((c) => !topTokens.has(productToken(c.url)));
      ordered = [...top, ...fresh];
    }

    // Begrens hvor mange vi skraper (buffer for lager-filtrering)
    ordered = ordered.slice(0, count * 3);

    // 3) Skrap til vi har `count` på-lager produkter
    const picked: PricetagProduct[] = [];
    const skuSeen = new Set<string>();
    let skipped = 0;
    for (const cand of ordered) {
      if (picked.length >= count) break;
      try {
        const absUrl = absoluteUrl(cand.url);
        const p = await scrapeProductByUrl(absUrl);
        if (!p || p.price_now <= 0) { skipped++; continue; }
        // "Design selv"/skreddersøm-produkter har ingen fast pris → aldri på skjerm
        if (/design\s*selv/i.test(p.name || "")) { skipped++; continue; }
        // Manuell ekskluder-liste (artikkelnummer/URL-token eller SKU)
        const tok = productToken(absUrl);
        if (cfg.exclude?.some((x) => x === tok || x === p.sku || absUrl.includes(x))) { skipped++; continue; }
        if (p.price_now < (cfg.min_price ?? 0)) { skipped++; continue; }
        if (inStockOnly && !p.in_stock) { skipped++; continue; }
        const sku = p.sku || absUrl;
        if (skuSeen.has(sku)) continue;
        skuSeen.add(sku);
        picked.push({
          source_url: absUrl,
          name: p.name,
          manufacturer: p.manufacturer,
          manufacturer_logo_url: p.manufacturer_logo_url,
          image_url: p.image_url,
          price_before: p.price_before || undefined,
          price_now: p.price_now,
          discount_pct: p.discount_pct,
          in_stock: p.in_stock,
          sku: p.sku,
          bullets: p.bullets,
        });
      } catch {
        skipped++;
      }
    }

    if (picked.length > 0) {
      await admin
        .from("pricetag_playlists")
        .update({ products: picked, updated_at: new Date().toISOString() })
        .eq("id", pl.id);
    }

    results.push({ id: pl.id, playlist: pl.title, before: (pl.products || []).length, after: picked.length, skipped });
  }

  return results;
}
