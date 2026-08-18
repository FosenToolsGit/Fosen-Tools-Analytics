#!/usr/bin/env node
/**
 * Engangs OAuth-flyt for YouTube-opplasting.
 *
 * Starter en lokal callback-server, åpner Googles samtykkeside i nettleseren
 * (VIKTIG: velg «Fosen Tools»-KANALEN i kontovelgeren, ikke den personlige
 * kontoen), fanger koden og skriver YT_REFRESH_TOKEN til .env.local.
 *
 *   node --env-file=.env.local scripts/yt-auth.mjs
 *
 * Krever i .env.local: YT_CLIENT_ID + YT_CLIENT_SECRET (OAuth-klient av type
 * «Desktop app» i Google Cloud-prosjektet, med YouTube Data API v3 aktivert).
 */
import http from "node:http";
import { execSync } from "node:child_process";
import fs from "node:fs";

// --kanal fta → lagrer som YT_REFRESH_TOKEN_FTA (velg FT Aviation-kanalen i
// kontovelgeren). Uten flagg → YT_REFRESH_TOKEN (velg Fosen Tools-kanalen).
const kanal = process.argv.includes("--kanal")
  ? process.argv[process.argv.indexOf("--kanal") + 1]
  : "ft";
const ENV_VAR = kanal === "fta" ? "YT_REFRESH_TOKEN_FTA" : "YT_REFRESH_TOKEN";
const KANAL_NAVN = kanal === "fta" ? "FT Aviation" : "Fosen Tools";

const CLIENT_ID = process.env.YT_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Mangler YT_CLIENT_ID / YT_CLIENT_SECRET i .env.local");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube";

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth" +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&response_type=code&access_type=offline&prompt=consent` +
  `&scope=${encodeURIComponent(SCOPES)}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== "/callback") { res.writeHead(404).end(); return; }
  const code = url.searchParams.get("code");
  if (!code) { res.end("Mangler kode — lukk fanen og prøv igjen."); return; }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT, grant_type: "authorization_code",
    }),
  });
  const tok = await tokenRes.json();
  if (!tok.refresh_token) {
    res.end("Fikk ikke refresh_token — sjekk terminalen.");
    console.error("Token-svar uten refresh_token:", JSON.stringify({ ...tok, access_token: "…" }));
    process.exit(1);
  }

  // skriv/erstatt tokenet i .env.local uten å logge selve verdien
  let env = fs.readFileSync(".env.local", "utf8");
  env = env.replace(new RegExp(`\\n${ENV_VAR}=.*\\n?`, "g"), "\n");
  fs.writeFileSync(".env.local", env.trimEnd() + `\n${ENV_VAR}=${tok.refresh_token}\n`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end("<h2 style='font-family:sans-serif'>✅ YouTube-tilgang lagret. Lukk fanen.</h2>");
  console.log(`${ENV_VAR} lagret i .env.local`);
  setTimeout(() => process.exit(0), 500);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Venter på samtykke … VELG «${KANAL_NAVN}»-kanalen i kontovelgeren!`);
  execSync(`open "${authUrl}"`);
});
