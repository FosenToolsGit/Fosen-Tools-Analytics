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
  return (await client.getAccessToken()).token;
}

async function gscQuery(token, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.rows || [];
}

const token = await getToken();
const d = (offset) => { const dt = new Date(); dt.setDate(dt.getDate() - offset); return dt.toISOString().slice(0,10); };

// 3 periods: recent (14d), mid (14d before), early (14d before that)
const periods = [
  { label: "Siste 14d (26.apr-10.mai)", start: d(17), end: d(3) },
  { label: "Forrige 14d (12-26.apr)", start: d(31), end: d(17) },
  { label: "Tidlig april (29.mar-12.apr)", start: d(45), end: d(31) },
];

// Video-hero sider (fra CLAUDE.md)
const videoHero = [
  { path: "/facom", name: "FACOM (video 2-slide)" },
  { path: "/husqvarna", name: "Husqvarna (video 3-slide)" },
  { path: "/brockhaus-heuer", name: "Brockhaus HEUER (video)" },
  { path: "/stahlwille", name: "Stahlwille (video)" },
];

// Bilde-hero sider (for sammenligning)
const imageHero = [
  { path: "/leatherman", name: "Leatherman (bilde)" },
  { path: "/knipex", name: "Knipex (bilde)" },
  { path: "/bahco", name: "Bahco (bilde)" },
  { path: "/pelicase", name: "Pelicase (bilde)" },
  { path: "/wera", name: "Wera (bilde)" },
  { path: "/milwaukee", name: "Milwaukee (bilde)" },
  { path: "/pb-swiss-tools", name: "PB Swiss Tools (bilde)" },
  { path: "/gedore", name: "Gedore (bilde)" },
  { path: "/zarges", name: "Zarges (bilde)" },
  { path: "/rennsteig", name: "Rennsteig (bilde)" },
  { path: "/fluke", name: "Fluke (bilde)" },
  { path: "/ledlenser", name: "Ledlenser (bilde)" },
  { path: "/kc-tools", name: "KC Tools (bilde)" },
];

const allPages = [...videoHero, ...imageHero];

console.log("=== VIDEO-HERO vs BILDE-HERO — POSISJONS-TREND ===\n");

// Collect data per period
const periodData = [];
for (const period of periods) {
  const rows = await gscQuery(token, {
    startDate: period.start, endDate: period.end,
    dimensions: ["page"], rowLimit: 5000, type: "web",
  });
  const map = new Map();
  for (const r of rows) map.set(new URL(r.keys[0]).pathname, r);
  periodData.push({ ...period, map });
}

// Print header
console.log("".padEnd(35) + periods.map(p => p.label.slice(0,18).padStart(20)).join(""));
console.log("Side".padEnd(35) + "  Pos    Klikk   Vis".repeat(3));
console.log("─".repeat(95));

function printGroup(label, pages) {
  console.log(`\n  ── ${label} ──`);
  let totalDelta = 0;
  let counted = 0;
  for (const page of pages) {
    let line = page.name.padEnd(35);
    const vals = [];
    for (const pd of periodData) {
      const r = pd.map.get(page.path);
      if (r) {
        line += `${r.position.toFixed(1).padStart(6)} ${String(r.clicks).padStart(6)} ${String(r.impressions).padStart(6)}`;
        vals.push(r.position);
      } else {
        line += "     —      —      —";
        vals.push(null);
      }
    }
    // Calculate trend from earliest to latest
    if (vals[0] != null && vals[2] != null) {
      const delta = vals[2] - vals[0]; // positive = improvement (position went down = worse, went up = better)
      const arrow = delta > 1 ? " ↑" + delta.toFixed(1) : delta < -1 ? " ↓" + delta.toFixed(1) : " →";
      line += arrow;
      totalDelta += delta;
      counted++;
    }
    console.log(line);
  }
  if (counted > 0) {
    console.log(`  Snitt Δ for ${label}: ${totalDelta > 0 ? "+" : ""}${(totalDelta/counted).toFixed(1)} plasser`);
  }
}

printGroup("VIDEO-HERO", videoHero);
printGroup("BILDE-HERO", imageHero);

// Summary
console.log("\n=== OPPSUMMERING ===\n");

// Calculate averages
for (const group of [{ label: "Video-hero", pages: videoHero }, { label: "Bilde-hero", pages: imageHero }]) {
  const latest = periodData[0].map;
  const earliest = periodData[2].map;
  let sumDelta = 0, count = 0;
  let sumLatestPos = 0, countLatest = 0;
  for (const p of group.pages) {
    const l = latest.get(p.path);
    const e = earliest.get(p.path);
    if (l) { sumLatestPos += l.position; countLatest++; }
    if (l && e) { sumDelta += (e.position - l.position); count++; }
  }
  console.log(`${group.label}: snitt posisjon nå = ${countLatest ? (sumLatestPos/countLatest).toFixed(1) : "—"}, snitt Δ fra tidlig apr = ${count ? (sumDelta/count > 0 ? "+" : "") + (sumDelta/count).toFixed(1) : "—"} (${count} sider med data begge perioder)`);
}

