import { GoogleAuth } from "google-auth-library";

const GA4_CLIENT_EMAIL = process.env.GA4_CLIENT_EMAIL;
const GA4_PRIVATE_KEY = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SITE_URL = "sc-domain:fosen-tools.no";

async function getToken() {
  const auth = new GoogleAuth({
    credentials: { client_email: GA4_CLIENT_EMAIL, private_key: GA4_PRIVATE_KEY },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const t = await client.getAccessToken();
  return t.token;
}

async function gscQuery(token, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) { console.error(await res.text()); return []; }
  const data = await res.json();
  return data.rows || [];
}

const token = await getToken();

// === 1. Key pages: position trend (last 14d vs previous 14d) ===
const now = new Date();
const d = (offset) => {
  const dt = new Date(now); dt.setDate(dt.getDate() - offset);
  return dt.toISOString().slice(0, 10);
};

// GSC data has ~3 day lag
const recentStart = d(17); // 14 days ending 3 days ago
const recentEnd = d(3);
const prevStart = d(31);
const prevEnd = d(17);

const keyPages = [
  "/leatherman", "/facom", "/produkter/piper-og-skraller/pipesett",
  "/wera", "/stahlwille", "/knipex", "/snap-on", "/pelicase",
  "/milwaukee", "/husqvarna", "/produkter/verktøyvogner",
  "/hdfi", "/aviation", "/produkter"
];

console.log("=== SEO HEALTH CHECK — " + new Date().toISOString().slice(0,10) + " ===\n");
console.log(`Periode: ${recentStart} → ${recentEnd} vs ${prevStart} → ${prevEnd}\n`);

// Per-page data (recent)
const recentPageRows = await gscQuery(token, {
  startDate: recentStart, endDate: recentEnd,
  dimensions: ["page"],
  rowLimit: 5000, type: "web",
});

const prevPageRows = await gscQuery(token, {
  startDate: prevStart, endDate: prevEnd,
  dimensions: ["page"],
  rowLimit: 5000, type: "web",
});

const recentMap = new Map();
for (const r of recentPageRows) {
  const path = new URL(r.keys[0]).pathname;
  recentMap.set(path, r);
}
const prevMap = new Map();
for (const r of prevPageRows) {
  const path = new URL(r.keys[0]).pathname;
  prevMap.set(path, r);
}

console.log("── NØKKELSIDER (posisjon + klikk + visninger) ──\n");
console.log("Side".padEnd(45) + "Pos nå".padStart(8) + "Pos før".padStart(8) + "Δ pos".padStart(8) + "Klikk".padStart(8) + "Vis".padStart(8));
console.log("─".repeat(85));

for (const page of keyPages) {
  const r = recentMap.get(page);
  const p = prevMap.get(page);
  const posNow = r ? r.position.toFixed(1) : "—";
  const posPrev = p ? p.position.toFixed(1) : "—";
  const delta = (r && p) ? (p.position - r.position).toFixed(1) : "—";
  const clicks = r ? r.clicks : 0;
  const imps = r ? r.impressions : 0;
  const arrow = (r && p) ? (r.position < p.position ? "↑" : r.position > p.position ? "↓" : "→") : "";
  console.log(
    page.padEnd(45) +
    posNow.padStart(8) +
    posPrev.padStart(8) +
    (arrow + delta).padStart(8) +
    String(clicks).padStart(8) +
    String(imps).padStart(8)
  );
}

// === 2. Check /manufacturers/ cannibalization (should be gone after redirects) ===
console.log("\n── /manufacturers/ KANNIBALISERING (bør være 0 etter redirects 6. mai) ──\n");
const mfgRows = recentPageRows.filter(r => r.keys[0].includes("/manufacturers/"));
if (mfgRows.length === 0) {
  console.log("✅ Ingen /manufacturers/-URLer i GSC siste 14 dager!");
} else {
  console.log(`⚠️  ${mfgRows.length} /manufacturers/-URLer har fortsatt visninger:`);
  for (const r of mfgRows.sort((a,b) => b.impressions - a.impressions).slice(0, 15)) {
    console.log(`  ${new URL(r.keys[0]).pathname.padEnd(40)} pos ${r.position.toFixed(1)} — ${r.impressions} vis, ${r.clicks} klikk`);
  }
}

// === 3. /categories/ cannibalization ===
console.log("\n── /categories/ KANNIBALISERING (bør være 0 etter redirects 6. mai) ──\n");
const catRows = recentPageRows.filter(r => r.keys[0].includes("/categories/"));
if (catRows.length === 0) {
  console.log("✅ Ingen /categories/-URLer i GSC siste 14 dager!");
} else {
  console.log(`⚠️  ${catRows.length} /categories/-URLer har fortsatt visninger:`);
  for (const r of catRows.sort((a,b) => b.impressions - a.impressions).slice(0, 15)) {
    console.log(`  ${new URL(r.keys[0]).pathname.padEnd(40)} pos ${r.position.toFixed(1)} — ${r.impressions} vis, ${r.clicks} klikk`);
  }
}

// === 4. Top movers (biggest position improvement) ===
console.log("\n── TOPP STIGERE (største posisjons-forbedring) ──\n");
const movers = [];
for (const [path, r] of recentMap) {
  const p = prevMap.get(path);
  if (p && r.impressions >= 10 && p.impressions >= 10) {
    movers.push({ path, posNow: r.position, posPrev: p.position, delta: p.position - r.position, clicks: r.clicks, imps: r.impressions });
  }
}
movers.sort((a, b) => b.delta - a.delta);
console.log("Side".padEnd(50) + "Pos nå".padStart(8) + "Pos før".padStart(8) + "Δ".padStart(8) + "Klikk".padStart(7));
console.log("─".repeat(81));
for (const m of movers.slice(0, 15)) {
  console.log(m.path.padEnd(50) + m.posNow.toFixed(1).padStart(8) + m.posPrev.toFixed(1).padStart(8) + ("+" + m.delta.toFixed(1)).padStart(8) + String(m.clicks).padStart(7));
}

// === 5. Top fallers ===
console.log("\n── TOPP FALLERE (størst posisjons-forverring) ──\n");
const fallers = movers.filter(m => m.delta < -1).sort((a, b) => a.delta - b.delta);
console.log("Side".padEnd(50) + "Pos nå".padStart(8) + "Pos før".padStart(8) + "Δ".padStart(8) + "Klikk".padStart(7));
console.log("─".repeat(81));
for (const m of fallers.slice(0, 15)) {
  console.log(m.path.padEnd(50) + m.posNow.toFixed(1).padStart(8) + m.posPrev.toFixed(1).padStart(8) + (m.delta.toFixed(1)).padStart(8) + String(m.clicks).padStart(7));
}

// === 6. Top queries for key pages ===
console.log("\n── TOPP SØKEORD FOR NØKKELSIDER ──\n");
const focusPages = ["/leatherman", "/facom", "/produkter/piper-og-skraller/pipesett"];
for (const page of focusPages) {
  const rows = await gscQuery(token, {
    startDate: recentStart, endDate: recentEnd,
    dimensions: ["query"],
    dimensionFilterGroups: [{ filters: [{ dimension: "page", expression: `https://fosen-tools.no${page}` }] }],
    rowLimit: 10, type: "web",
  });
  console.log(`\n  ${page}:`);
  if (rows.length === 0) { console.log("    (ingen data)"); continue; }
  for (const r of rows) {
    console.log(`    "${r.keys[0]}" — pos ${r.position.toFixed(1)}, ${r.clicks} klikk, ${r.impressions} vis`);
  }
}

// === 7. Overall site health ===
console.log("\n── TOTALT SITE-HELSE ──\n");
const totalRecent = await gscQuery(token, {
  startDate: recentStart, endDate: recentEnd,
  type: "web",
});
const totalPrev = await gscQuery(token, {
  startDate: prevStart, endDate: prevEnd,
  type: "web",
});
if (totalRecent.length && totalPrev.length) {
  const r = totalRecent[0], p = totalPrev[0];
  console.log(`  Klikk:      ${r.clicks} (var ${p.clicks}, ${((r.clicks-p.clicks)/p.clicks*100).toFixed(1)}%)`);
  console.log(`  Visninger:  ${r.impressions} (var ${p.impressions}, ${((r.impressions-p.impressions)/p.impressions*100).toFixed(1)}%)`);
  console.log(`  CTR:        ${(r.ctr*100).toFixed(2)}% (var ${(p.ctr*100).toFixed(2)}%)`);
  console.log(`  Snitt pos:  ${r.position.toFixed(1)} (var ${p.position.toFixed(1)})`);
}

console.log("\n=== FERDIG ===");
