# Google Ads API-oppsett

Guide for å koble Fosen Tools Analytics direkte mot Google Ads API for full kostnads- og kampanje-data. Dette supplerer den indirekte GA4-integrasjonen vi allerede har.

## Hva du får

| Data | Via GA4 i dag | Via Google Ads API |
|------|---------------|---------------------|
| Kampanjestruktur | ✅ | ✅ |
| Sesjoner / konverteringer etter klikk | ✅ | ✅ |
| **Faktisk kostnad / CPC** | ❌ | ✅ |
| **Bud og budstrategier** | ❌ | ✅ |
| **Kvalitetsscore** | ❌ | ✅ |
| **Annonsetekster** | ❌ | ✅ |
| **Match-type (broad/phrase/exact)** | ❌ | ✅ |
| **Negative keywords** | ❌ | ✅ |
| **Change history** | ❌ | ✅ |
| **Recommendations** | ❌ | ✅ |

## Steg 1: Søk om Developer Token

1. Gå til [ads.google.com](https://ads.google.com) — logg inn som admin
2. **Tools & Settings → Setup → API Center**
3. Fyll inn:
   - Company name: Fosen Tools AS
   - Company URL: https://fosen-tools.no
   - Email: (din)
   - API usage: "Own account management and reporting"
4. Godta Terms of Service
5. Klikk **Apply**

**Basic access** (15 000 operasjoner/dag) godkjennes vanligvis innen 1-2 arbeidsdager uten videre spørsmål. For en enkeltbedriftkonto er dette mer enn nok.

Når godkjent får du et **Developer Token** — en streng som ser ut som `ABcdeFG1234hIJKLMN`. Lagre den.

## Steg 2: OAuth 2.0 credentials

Vi gjenbruker Google Cloud projektet `fosen-tools-analytics` som allerede er satt opp for GA4.

1. Gå til [console.cloud.google.com](https://console.cloud.google.com/)
2. Velg prosjekt **fosen-tools-analytics**
3. **APIs & Services → Library** → søk "Google Ads API" → **Enable**
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: "Fosen Tools Analytics — Ads"
5. Last ned JSON-filen. Den inneholder `client_id` og `client_secret`.

## Steg 3: Generere refresh token (engangs-jobb)

Fordi vi trenger en vedvarende refresh token, bruker vi en liten Node-helper lokalt én gang.

Opprett `scripts/google-ads-auth.mjs` og kjør den lokalt:

```js
import { google } from "googleapis";
import http from "http";
import { URL } from "url";

const CLIENT_ID = "DIN_CLIENT_ID";
const CLIENT_SECRET = "DIN_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:3456/oauth2callback";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/adwords"],
});

console.log("Åpne denne URL-en i nettleseren:\n", url);

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, "http://localhost:3456").searchParams.get("code");
  if (!code) return;
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nREFRESH TOKEN:", tokens.refresh_token);
  res.end("OK — lukk denne fanen og sjekk terminalen.");
  server.close();
});
server.listen(3456);
```

Kjør `node scripts/google-ads-auth.mjs`, klikk lenken, logg inn med fosen-tools admin, godta, og refresh-tokenet printes i terminalen. Lagre det.

## Steg 4: Finn Customer ID

På ads.google.com, øverst til høyre — en 10-sifret ID (format `123-456-7890`). Fjern bindestrekene når du setter den i env.

Hvis dere har flere kontoer under en MCC: login_customer_id = MCC-en, customer_id = operativ konto.

## Steg 5: Legg env-variabler i Vercel

```bash
vercel env add GOOGLE_ADS_DEVELOPER_TOKEN
vercel env add GOOGLE_ADS_CLIENT_ID
vercel env add GOOGLE_ADS_CLIENT_SECRET
vercel env add GOOGLE_ADS_REFRESH_TOKEN
vercel env add GOOGLE_ADS_CUSTOMER_ID
# Hvis MCC:
vercel env add GOOGLE_ADS_LOGIN_CUSTOMER_ID
```

Eller via Vercel dashboard → Settings → Environment Variables. Pass på at alle er satt til "All environments" (Preview + Production + Development).

Trekk deretter ned til lokalt `.env.local`:

```bash
vercel env pull .env.local
```

## Steg 6: Verifisering

Når alt er satt opp vil `/api/google-ads/health` (som jeg bygger i neste steg) returnere:

```json
{
  "ok": true,
  "customer_id": "123-456-7890",
  "account_name": "Fosen Tools AS",
  "currency": "NOK",
  "timezone": "Europe/Oslo"
}
```

Si fra når du har developer token + refresh token, så aktiverer vi synkroniseringen.

---

## Feilsøking

**"Developer token not approved"** — du må faktisk klikke Apply og vente på Google. Sjekk e-post fra Google Ads API team.

**"User did not grant access"** — consent-skjermen i Google Cloud er ikke satt opp. Gå til OAuth consent screen → Publishing status → legg til deg selv som test-bruker eller publiser appen.

**"Customer not authorized"** — `login_customer_id` er feil. For enkeltkonto uten MCC, skal denne være tom. For MCC, skal den være MCC-kontoens ID.
