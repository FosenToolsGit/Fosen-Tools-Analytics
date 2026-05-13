#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BRAND_RE = [/fosen[\s-]?tools?/i, /^fosen$/i, /fosentools/i];
const isBrand = (t) => BRAND_RE.some((r) => r.test(String(t).toLowerCase().trim()));

const PMAX_ID = "23086139934";

async function main() {
  // Per-snapshot brand-andel for å se om trenden faller
  const { data: terms } = await supabase
    .from("google_ads_search_terms")
    .select("search_term, clicks, impressions, metric_date")
    .eq("campaign_id", PMAX_ID)
    .eq("source", "pmax_insight")
    .gte("metric_date", "2026-04-20")
    .order("metric_date", { ascending: true });

  const byDate = new Map();
  for (const t of terms ?? []) {
    const d = t.metric_date;
    const entry = byDate.get(d) ?? { brandClicks: 0, totalClicks: 0, brandImps: 0, totalImps: 0, rows: 0 };
    entry.totalClicks += t.clicks || 0;
    entry.totalImps += t.impressions || 0;
    entry.rows += 1;
    if (isBrand(t.search_term)) {
      entry.brandClicks += t.clicks || 0;
      entry.brandImps += t.impressions || 0;
    }
    byDate.set(d, entry);
  }

  console.log("=== PMAX BRAND-ANDEL PER SNAPSHOT (rullende 90d-aggregat fra hver sync) ===");
  console.log("snapshot   | rader | brand-klikk | total-klikk | brand-% | brand-imp / total-imp");
  for (const [d, e] of [...byDate.entries()].sort()) {
    const pct = e.totalClicks ? ((e.brandClicks / e.totalClicks) * 100).toFixed(1) : "—";
    const impPct = e.totalImps ? ((e.brandImps / e.totalImps) * 100).toFixed(1) : "—";
    console.log(`${d} | ${String(e.rows).padStart(5)} | ${String(e.brandClicks).padStart(11)} | ${String(e.totalClicks).padStart(11)} | ${pct.padStart(6)}% | ${impPct}%`);
  }

  // Sjekk sync_logs separat med riktig kolonner
  const { data: syncs, error: syncErr } = await supabase
    .from("sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(8);
  if (syncErr) console.log("sync err:", syncErr);
  console.log("\n=== SYNC-LOGS (siste 8) ===");
  for (const s of syncs ?? []) {
    console.log(JSON.stringify(s, null, 2));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
