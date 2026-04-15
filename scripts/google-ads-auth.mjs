#!/usr/bin/env node
/**
 * Engangs-script for å generere en Google Ads API refresh token.
 *
 * To måter å kjøre på:
 *
 * A) Med JSON-fil fra Google Cloud:
 *    node scripts/google-ads-auth.mjs ~/Downloads/client_secret_xxx.json
 *
 * B) Med env-variabler (enklest hvis du ikke får lastet ned JSON):
 *    GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... node scripts/google-ads-auth.mjs
 *
 * Så:
 *   1. Scriptet printer en URL i terminalen — lim den inn i nettleseren.
 *   2. Logg inn med Google-brukeren som har tilgang til MCC-kontoen.
 *   3. Godta tilgangen.
 *   4. Scriptet printer refresh_token i terminalen.
 *   5. Kopier refresh_token til .env.local som GOOGLE_ADS_REFRESH_TOKEN.
 *
 * Refresh tokenet er langtlevende (utgår ikke med mindre du manuelt tilbakekaller
 * tilgangen i Google-kontoen). Det skal BARE genereres én gang.
 */

import http from "node:http";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const REDIRECT_URI = "http://localhost:3456/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/adwords";

async function main() {
  const jsonPath = process.argv[2];
  let clientId, clientSecret;

  if (jsonPath) {
    // Modus A: les fra JSON-fil
    try {
      const raw = await readFile(jsonPath, "utf8");
      const parsed = JSON.parse(raw);
      const cred = parsed.installed || parsed.web;
      if (!cred) {
        throw new Error(
          "Fant verken 'installed' eller 'web' i JSON-filen. Er dette en Desktop app OAuth client?"
        );
      }
      clientId = cred.client_id;
      clientSecret = cred.client_secret;
      if (!clientId || !clientSecret) {
        throw new Error("client_id eller client_secret mangler i JSON-filen.");
      }
    } catch (err) {
      console.error(`Kunne ikke lese ${jsonPath}:`, err.message);
      process.exit(1);
    }
  } else {
    // Modus B: les fra env-variabler
    clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error(
        "Mangler credentials. Kjør enten:\n" +
          "  node scripts/google-ads-auth.mjs <sti-til-oauth-client.json>\n" +
          "eller:\n" +
          "  GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... node scripts/google-ads-auth.mjs"
      );
      process.exit(1);
    }
  }

  const state = Math.random().toString(36).slice(2);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  console.log("\n=== Google Ads API — Refresh Token Generator ===\n");
  console.log("Åpne denne URL-en i nettleseren (logg inn med brukeren som har MCC-tilgang):\n");
  console.log(authUrl.toString());
  console.log("\nVenter på redirect tilbake til localhost:3456...\n");

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, "http://localhost:3456");
      if (reqUrl.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const returnedState = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Feil fra Google: ${error}`);
        console.error(`\nFeil fra Google: ${error}\n`);
        server.close();
        process.exit(1);
      }

      if (!code) {
        res.writeHead(400);
        res.end("Mangler 'code' i callback.");
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400);
        res.end("State mismatch — mulig CSRF.");
        console.error("State mismatch. Avbryter.");
        server.close();
        process.exit(1);
      }

      // Bytt code mot tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();

      if (!tokenRes.ok) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Feil ved token-bytte: ${JSON.stringify(tokens)}`);
        console.error("\nFeil ved token-bytte:", tokens);
        server.close();
        process.exit(1);
      }

      if (!tokens.refresh_token) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(
          "Fikk ikke refresh_token. Sjekk at prompt=consent og access_type=offline brukes, og at du ikke har gitt tilgang tidligere uten å trekke den tilbake."
        );
        console.error(
          "\nIngen refresh_token i responsen. Tilbakekall tilgang på https://myaccount.google.com/permissions og prøv igjen.\n"
        );
        server.close();
        process.exit(1);
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h1>✅ Ferdig</h1><p>Refresh token er printet i terminalen. Du kan lukke denne fanen.</p>"
      );

      console.log("\n=== SUCCESS ===\n");
      console.log("Refresh token (lim i .env.local som GOOGLE_ADS_REFRESH_TOKEN):\n");
      console.log(tokens.refresh_token);
      console.log("\nAccess token (kortlevende, trenger ikke lagres):");
      console.log(tokens.access_token);
      console.log(`\nScope: ${tokens.scope}`);
      console.log(`Expires in: ${tokens.expires_in} seconds\n`);

      server.close();
      process.exit(0);
    } catch (err) {
      console.error("Uventet feil:", err);
      res.writeHead(500);
      res.end("Uventet feil — se terminalen.");
      server.close();
      process.exit(1);
    }
  });

  server.listen(3456, () => {
    // klar
  });

  // Timeout etter 5 minutter
  setTimeout(() => {
    console.error("\nTimeout — du fullførte ikke login innen 5 minutter. Avbryter.\n");
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
