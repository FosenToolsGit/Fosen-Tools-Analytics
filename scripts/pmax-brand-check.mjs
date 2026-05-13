#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BRAND_RE = [/fosen[\s-]?tools?/i, /^fosen$/i, /fosentools/i];
const isBrand = (t) => BRAND_RE.some((r) => r.test(String(t).toLowerCase().trim()));

const fmt = (n) => Number(n).toLocaleString("nb-NO", { maximumFractionDigits: 2 });

async function main() {
  // 1. Sync-status
  const { data: syncs } = await supabase
    .from("sync_logs")
    .select("platform, status, started_at, completed_at, records_processed, error_message")
    .in("platform", ["google_ads", "all"])
    .order("started_at", { ascending: false })
    .limit(8);

  console.log("\n=== SYNC-STATUS (siste 8) ===");
  for (const s of syncs ?? []) {
    const d = new Date(s.started_at);
    const datetime = d.toLocaleString("nb-NO", { timeZone: "Europe/Oslo" });
    console.log(
      `${datetime} [${s.platform}] ${s.status} — ${s.records_processed ?? 0} records ${s.error_message ? "ERR: " + s.error_message : ""}`
    );
  }

  // 2. Identifiser Pmax-kampanjen
  const { data: camps } = await supabase
    .from("google_ads_campaigns")
    .select("campaign_id, campaign_name, channel_type")
    .order("metric_date", { ascending: false })
    .limit(50);

  const uniqueCamps = new Map();
  for (const c of camps ?? []) {
    if (!uniqueCamps.has(c.campaign_id)) uniqueCamps.set(c.campaign_id, c);
  }
  console.log("\n=== UNIKE KAMPANJER (siste 50 rader) ===");
  for (const c of uniqueCamps.values()) {
    console.log(`  ${c.campaign_id} — ${c.campaign_name} (channel: ${c.channel_type})`);
  }

  // Anta Pmax er "General" (Performance Max)
  const pmaxCamp = [...uniqueCamps.values()].find(
    (c) => /general/i.test(c.campaign_name) || c.channel_type === "PERFORMANCE_MAX"
  );
  if (!pmaxCamp) {
    console.log("FANT IKKE Pmax-kampanjen.");
    return;
  }
  console.log(`\nPMAX-kampanje: ${pmaxCamp.campaign_id} — ${pmaxCamp.campaign_name}`);

  // 3. Hent freshness fra search_terms for Pmax
  const { data: pmaxDates } = await supabase
    .from("google_ads_search_terms")
    .select("metric_date")
    .eq("campaign_id", pmaxCamp.campaign_id)
    .eq("source", "pmax_insight")
    .order("metric_date", { ascending: false })
    .limit(5);

  console.log("\n=== PMAX search_terms ferskeste snapshot_dates ===");
  for (const r of pmaxDates ?? []) console.log(`  ${r.metric_date}`);

  // 4. Periode-sammenligning
  // Pmax-insights er aggregerte over en periode, lagret med snapshot-dato
  // Vi sammenligner: før negative keywords (8. mai) vs etter
  async function brandPeriod(label, fromDate, toDate) {
    const { data: terms } = await supabase
      .from("google_ads_search_terms")
      .select("search_term, clicks, cost_nok, impressions, metric_date")
      .eq("campaign_id", pmaxCamp.campaign_id)
      .eq("source", "pmax_insight")
      .gte("metric_date", fromDate)
      .lte("metric_date", toDate);

    let brandClicks = 0, totalClicks = 0, brandImps = 0, totalImps = 0;
    const brandTerms = new Map();
    const allTerms = new Map();

    for (const t of terms ?? []) {
      const clicks = t.clicks || 0;
      const imps = t.impressions || 0;
      totalClicks += clicks;
      totalImps += imps;
      allTerms.set(t.search_term, (allTerms.get(t.search_term) || 0) + clicks);
      if (isBrand(t.search_term)) {
        brandClicks += clicks;
        brandImps += imps;
        brandTerms.set(t.search_term, (brandTerms.get(t.search_term) || 0) + clicks);
      }
    }

    console.log(`\n--- ${label} (${fromDate} → ${toDate}) ---`);
    console.log(`  Rows: ${terms?.length ?? 0}`);
    console.log(`  Brand-klikk: ${brandClicks} / ${totalClicks} = ${totalClicks ? ((brandClicks / totalClicks) * 100).toFixed(1) : 0}%`);
    console.log(`  Brand-imp:   ${brandImps} / ${totalImps} = ${totalImps ? ((brandImps / totalImps) * 100).toFixed(1) : 0}%`);
    console.log(`  Top 5 brand-termer:`);
    [...brandTerms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([t, c]) => console.log(`    ${t}: ${c} klikk`));
    console.log(`  Top 5 ikke-brand-termer:`);
    [...allTerms.entries()].filter(([t]) => !isBrand(t)).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([t, c]) => console.log(`    ${t}: ${c} klikk`));
    return { brandClicks, totalClicks, brandImps, totalImps };
  }

  // Før negative keywords ble lagt inn (8. mai 2026)
  await brandPeriod("FØR (1.-7. mai)", "2026-05-01", "2026-05-07");
  // Etter negative keywords
  await brandPeriod("ETTER (8.-13. mai)", "2026-05-08", "2026-05-13");
  // Bredere kontekst — april til 7. mai
  await brandPeriod("BASELINE (1. april - 7. mai)", "2026-04-01", "2026-05-07");
  await brandPeriod("SISTE 7d", "2026-05-07", "2026-05-13");

  // 5. Kost/klikk-trend per dag for Pmax
  const { data: campDaily } = await supabase
    .from("google_ads_campaigns")
    .select("metric_date, clicks, impressions, cost_nok, conversions")
    .eq("campaign_id", pmaxCamp.campaign_id)
    .gte("metric_date", "2026-04-25")
    .order("metric_date", { ascending: true });

  console.log("\n=== PMAX KAMPANJE-DATA per dag (fra 25. april) ===");
  console.log("dato         | klikk | imp   | kost      | konv");
  for (const r of campDaily ?? []) {
    console.log(
      `${r.metric_date} | ${String(r.clicks).padStart(5)} | ${String(r.impressions).padStart(5)} | ${fmt(r.cost_nok).padStart(9)} | ${r.conversions}`
    );
  }

  // Sammendrag
  if (campDaily?.length) {
    const pre = campDaily.filter((r) => r.metric_date < "2026-05-08");
    const post = campDaily.filter((r) => r.metric_date >= "2026-05-08");
    const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);
    console.log("\n--- AGG ---");
    console.log(`FØR  (${pre.length}d): klikk=${sum(pre, "clicks")}, kost=${fmt(sum(pre, "cost_nok"))}, snitt-CPC=${(sum(pre, "cost_nok") / Math.max(1, sum(pre, "clicks"))).toFixed(2)}`);
    console.log(`ETTER(${post.length}d): klikk=${sum(post, "clicks")}, kost=${fmt(sum(post, "cost_nok"))}, snitt-CPC=${(sum(post, "cost_nok") / Math.max(1, sum(post, "clicks"))).toFixed(2)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
