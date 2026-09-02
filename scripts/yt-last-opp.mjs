#!/usr/bin/env node
/**
 * Last opp og planlegg YouTube Shorts via Data API v3 — erstatter den trege
 * nettleser-flyten (18. aug 2026).
 *
 * Én video:
 *   node --env-file=.env.local scripts/yt-last-opp.mjs \
 *     --fil out/dagens/2026-08-24/mandag-momentverktøy/reel.mp4 \
 *     --tittel "Ukens topp 3, momentverktøy" \
 *     --beskrivelse-fil /sti/til/beskrivelse.txt \
 *     --publiser "2026-08-24T12:00:00+02:00"
 *
 * Flere: --plan plan.json  (array av {fil, tittel, beskrivelse, publiser})
 *
 * Regler (bakt inn): privat ved opplasting + publishAt (12:00-planen),
 * ikke laget for barn, norsk språk, kategori Science & Technology.
 * Caption-regler: ingen lenker, «norskprodusert», «Søk varenr. X på
 * fosen-tools.no» — se project_youtube_kanal i memory.
 *
 * ⚠️ Til API-revisjonen er godkjent låser YouTube API-opplastede videoer til
 * privat — publishAt løfter dem IKKE. Frem til da: bruk scriptet for
 * opplasting + metadata, og sett Schedule manuelt i Studio (10 sek/video).
 * Kvote: videos.insert koster 1600 enheter, standardkvote 10 000/dag ≈ 6
 * opplastinger per dag.
 */
import fs from "node:fs";
import { tagsFor } from "./yt-tags.mjs";

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : undefined; };

// --kanal fta → laster opp til FT Aviation (YT_REFRESH_TOKEN_FTA); default Fosen Tools
const KANAL = arg("kanal") ?? "ft";
const { YT_CLIENT_ID, YT_CLIENT_SECRET } = process.env;
const YT_REFRESH_TOKEN = KANAL === "fta" ? process.env.YT_REFRESH_TOKEN_FTA : process.env.YT_REFRESH_TOKEN;
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
  console.error(`Mangler YT_CLIENT_ID / YT_CLIENT_SECRET / ${KANAL === "fta" ? "YT_REFRESH_TOKEN_FTA" : "YT_REFRESH_TOKEN"} — kjør scripts/yt-auth.mjs${KANAL === "fta" ? " --kanal fta" : ""} først.`);
  process.exit(1);
}

async function accessToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Token-feil: " + JSON.stringify(j));
  return j.access_token;
}

async function lastOpp(token, { fil, tittel, beskrivelse, publiser, tags }) {
  // FT-tags utledes av tittel + beskrivelse. FTA setter sine i planen, siden
  // det innholdet er engelsk. Lagt til 2. sept 2026 — før det gikk alle
  // FT-videoene ut uten tags i det hele tatt.
  const emneord = tags ?? (KANAL === "fta" ? undefined : tagsFor({ tittel, beskrivelse }));
  const meta = {
    snippet: {
      title: tittel,
      description: beskrivelse,
      ...(emneord?.length ? { tags: emneord } : {}),
      categoryId: "28", // Science & Technology
      // FTA-innhold er engelsk (NATO/eksportmarked), FT-innhold norsk
      defaultLanguage: KANAL === "fta" ? "en" : "no",
      defaultAudioLanguage: KANAL === "fta" ? "en" : "no",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
      ...(publiser ? { publishAt: new Date(publiser).toISOString() } : {}),
    },
  };

  const størrelse = fs.statSync(fil).size;
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(størrelse),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(meta),
    },
  );
  if (!start.ok) throw new Error(`Init feilet (${start.status}): ${await start.text()}`);
  const uploadUrl = start.headers.get("location");

  const opp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(størrelse) },
    body: fs.readFileSync(fil),
  });
  if (!opp.ok) throw new Error(`Opplasting feilet (${opp.status}): ${await opp.text()}`);
  const video = await opp.json();
  return video;
}

const jobber = [];
if (arg("plan")) {
  jobber.push(...JSON.parse(fs.readFileSync(arg("plan"), "utf8")));
} else {
  const beskrivelse = arg("beskrivelse") ?? fs.readFileSync(arg("beskrivelse-fil"), "utf8").trim();
  jobber.push({ fil: arg("fil"), tittel: arg("tittel"), beskrivelse, publiser: arg("publiser") });
}

const token = await accessToken();
for (const jobb of jobber) {
  if (!jobb.fil || !jobb.tittel || !jobb.beskrivelse) {
    console.error("Hopper over ufullstendig jobb:", jobb.fil ?? "(uten fil)");
    continue;
  }
  process.stdout.write(`▶ ${jobb.tittel} … `);
  const v = await lastOpp(token, jobb);
  console.log(`OK — https://youtube.com/shorts/${v.id}` +
    ` · ${v.snippet?.tags?.length ?? 0} tags` +
    (jobb.publiser ? ` (publishAt ${jobb.publiser})` : " (privat)"));
}
console.log("\nHusk: før API-revisjonen er godkjent må Schedule bekreftes i Studio.");
