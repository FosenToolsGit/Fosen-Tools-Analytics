/**
 * Fosen Tools — år mot år, med bot-korreksjon.
 *   node --env-file=.env.local scripts/aar-mot-aar.mjs [--fra 2026-10-01] [--til 2026-10-31]
 *
 * Bakgrunn: GA4 registrerte en bot-flom på fosen-tools.no høsten 2025.
 * September 2025 var 60 % «Unassigned» med 0 % engasjement, oktober 46 %,
 * november 44 %. Trafikken var ikke mennesker, men den ligger i GA4 og gjør at
 * enhver sammenligning mot i fjor viser et fall som ikke er ekte.
 *
 * Vår egen database hjelper ikke — `analytics_metrics` starter i januar 2026,
 * så høsten 2025 finnes bare i GA4. Derfor dette scriptet: det henter begge år
 * fra GA4, trekker fra Unassigned i fjorårsvinduet, og viser begge tall så man
 * ser hva korreksjonen gjør.
 *
 * Standard periode er inneværende måned til i går, mot samme datoer i fjor.
 */
import { GoogleAuth } from "google-auth-library";

const PROP = process.env.GA4_PROPERTY_ID || "properties/388008623";
const creds = {
  client_email: process.env.GA4_CLIENT_EMAIL,
  private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Vinduet der GA4 er forurenset. Utvid hvis en ny flom oppdages.
export const FORURENSET = { fra: "2025-09-01", til: "2025-11-30" };

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const iDag = new Date();
const iGaar = new Date(iDag.getTime() - 864e5).toISOString().slice(0, 10);
const TIL = arg("til", iGaar);
const FRA = arg("fra", `${TIL.slice(0, 7)}-01`);
const iFjor = (d) => `${+d.slice(0, 4) - 1}${d.slice(4)}`;

const NO = (n) => Number(n).toLocaleString("nb-NO", { maximumFractionDigits: 1 });
const pst = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);
const pil = (p) => (p === null ? "  —  " : p > 0 ? `+${p} %` : `${p} %`);

const overlapper = (a, b) => a <= FORURENSET.til && b >= FORURENSET.fra;

const auth = new GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
const klient = await auth.getClient();

async function hent(fra, til) {
  const { data } = await klient.request({
    url: `https://analyticsdata.googleapis.com/v1beta/${PROP}:runReport`,
    method: "POST",
    data: {
      dateRanges: [{ startDate: fra, endDate: til }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "keyEvents" }, { name: "screenPageViews" }],
      limit: 30,
    },
  });
  const rader = (data.rows || []).map((r) => ({
    kanal: r.dimensionValues[0].value,
    sesj: +r.metricValues[0].value,
    hend: +r.metricValues[1].value,
    visn: +r.metricValues[2].value,
  }));
  const sum = (f, filter = () => true) => rader.filter(filter).reduce((s, r) => s + r[f], 0);
  return {
    rader,
    raa: { sesj: sum("sesj"), hend: sum("hend"), visn: sum("visn") },
    rent: {
      sesj: sum("sesj", (r) => r.kanal !== "Unassigned"),
      hend: sum("hend", (r) => r.kanal !== "Unassigned"),
      visn: sum("visn", (r) => r.kanal !== "Unassigned"),
    },
    unassigned: rader.find((r) => r.kanal === "Unassigned") || { sesj: 0, hend: 0, visn: 0 },
  };
}

const [naa, fjor] = await Promise.all([hent(FRA, TIL), hent(iFjor(FRA), iFjor(TIL))]);
const smittet = overlapper(iFjor(FRA), iFjor(TIL));
const andel = fjor.raa.sesj > 0 ? (fjor.unassigned.sesj / fjor.raa.sesj) * 100 : 0;

console.log(`\nFOSEN TOOLS — ${FRA} til ${TIL} mot ${iFjor(FRA)} til ${iFjor(TIL)}\n`);

if (smittet) {
  console.log(`⚠️  Fjorårsvinduet overlapper bot-flommen (${FORURENSET.fra} – ${FORURENSET.til}).`);
  console.log(`    ${NO(fjor.unassigned.sesj)} av ${NO(fjor.raa.sesj)} sesjoner i fjor var «Unassigned» — ${NO(andel)} %.`);
  console.log(`    Bruk den korrigerte linjen. Den rå viser et fall som ikke er ekte.\n`);
} else {
  console.log(`✔  Fjorårsvinduet ligger utenfor bot-flommen. Rå og korrigert er samme tall.\n`);
}

const linje = (navn, a, b) =>
  `${navn.padEnd(22)} ${String(NO(a)).padStart(9)} ${String(NO(b)).padStart(11)}   ${pil(pst(a, b)).padStart(8)}`;

console.log(`${"".padEnd(22)} ${"i år".padStart(9)} ${"i fjor".padStart(11)}   ${"endring".padStart(8)}`);
if (smittet) {
  console.log("  RÅTT (misvisende)");
  console.log("  " + linje("sesjoner", naa.raa.sesj, fjor.raa.sesj));
  console.log("  " + linje("sidevisninger", naa.raa.visn, fjor.raa.visn));
  console.log("\n  KORRIGERT (uten Unassigned)");
}
console.log("  " + linje("sesjoner", naa.rent.sesj, fjor.rent.sesj));
console.log("  " + linje("sidevisninger", naa.rent.visn, fjor.rent.visn));
console.log("  " + linje("nøkkelhendelser", naa.rent.hend, fjor.rent.hend));

console.log("\nPer kanal (korrigert):");
const kanaler = [...new Set([...naa.rader, ...fjor.rader].map((r) => r.kanal))].filter((k) => k !== "Unassigned");
kanaler
  .map((k) => ({
    k,
    a: naa.rader.find((r) => r.kanal === k)?.sesj || 0,
    b: fjor.rader.find((r) => r.kanal === k)?.sesj || 0,
  }))
  .sort((x, y) => y.a - x.a)
  .forEach((r) => console.log("  " + linje(r.k, r.a, r.b)));

if (smittet) {
  const feil = pst(naa.raa.sesj, fjor.raa.sesj), rett = pst(naa.rent.sesj, fjor.rent.sesj);
  console.log(`\nUten korreksjon ville tallet vært ${pil(feil)}. Riktig er ${pil(rett)}.`);
}
console.log();
