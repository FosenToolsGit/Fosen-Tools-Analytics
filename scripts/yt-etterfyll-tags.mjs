#!/usr/bin/env node
/**
 * Etterfyller tags på FT-videoer som ble lastet opp før yt-last-opp.mjs
 * begynte å sette dem (alle 17 fra august 2026).
 *
 *   node --env-file=.env.local scripts/yt-etterfyll-tags.mjs            # tørrkjøring
 *   node --env-file=.env.local scripts/yt-etterfyll-tags.mjs --skriv    # utfør
 *
 * Rører kun videoer uten tags fra og med --fra (default 2026-08-01), og
 * hopper alltid over titler merket [HOLD]. videos.update tar HELE snippet,
 * så tittel/beskrivelse/kategori/språk leses og sendes uendret tilbake —
 * utelates et felt, blir det nullet ut.
 */
import { tagsFor } from "./yt-tags.mjs";

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : undefined; };
const SKRIV = argv.includes("--skriv");
const FRA = arg("fra") ?? "2026-08-01";

const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET,
    refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token" }) });
const { access_token } = await r.json();
if (!access_token) { console.error("Token-feil"); process.exit(1); }
const A = { Authorization: `Bearer ${access_token}` };
const get = async (u) => (await fetch(u, { headers: A })).json();

const ch = await get("https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true");
console.log(`Kanal: ${ch.items[0].snippet.title}\n`);
const pl = ch.items[0].contentDetails.relatedPlaylists.uploads;

let ids = [], side = "";
do {
  const j = await get(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${pl}${side ? `&pageToken=${side}` : ""}`);
  ids.push(...j.items.map((i) => i.contentDetails.videoId));
  side = j.nextPageToken ?? "";
} while (side);

const vids = [];
for (let i = 0; i < ids.length; i += 50) {
  const j = await get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.slice(i, i + 50).join(",")}`);
  vids.push(...j.items);
}

let endret = 0, hoppet = 0;
for (const v of vids) {
  const s = v.snippet;
  if (s.publishedAt.slice(0, 10) < FRA) continue;
  if (s.tags?.length) { console.log(`  = ${s.title.slice(0, 50)} (har ${s.tags.length} tags)`); hoppet++; continue; }
  if (/^\[HOLD\]/i.test(s.title)) { console.log(`  – ${s.title.slice(0, 50)} (HOLD, urørt)`); hoppet++; continue; }

  const tags = tagsFor({ tittel: s.title, beskrivelse: s.description });
  console.log(`  ${SKRIV ? "→" : "·"} ${s.title.slice(0, 50)}\n      ${tags.join(" | ")}`);

  if (SKRIV) {
    const body = { id: v.id, snippet: {
      title: s.title, description: s.description, categoryId: s.categoryId, tags,
      ...(s.defaultLanguage ? { defaultLanguage: s.defaultLanguage } : {}),
      ...(s.defaultAudioLanguage ? { defaultAudioLanguage: s.defaultAudioLanguage } : {}),
    } };
    const u = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet", {
      method: "PUT", headers: { ...A, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!u.ok) { console.error(`      FEIL ${u.status}: ${(await u.text()).slice(0, 200)}`); continue; }
  }
  endret++;
}
console.log(`\n${SKRIV ? "Oppdatert" : "Ville oppdatert"} ${endret} video(er), hoppet over ${hoppet}.`);
if (!SKRIV) console.log("Kjør på nytt med --skriv for å utføre.");
