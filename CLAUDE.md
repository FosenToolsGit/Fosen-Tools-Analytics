@AGENTS.md

# Fosen Tools Analytics

Internt analytics-dashboard for Fosen Tools AS som samler markedsdata fra GA4, Meta (Facebook), Google Ads (direkte API), Mailchimp og Google Search Console på ett sted. Inkluderer anomali-varsling, søkeords-intelligens med auto-apply negative keywords, cross-platform attribusjon og ukentlige rapporter.

**Live URL:** Deployet på Vercel via FosenToolsGit-konto (auto-deploy fra `main`-branchen)
**Repo:** https://github.com/FosenToolsGit/Fosen-Tools-Analytics (public)

---

## Tech stack

- **Framework:** Next.js 16.2.3 (App Router, Turbopack)
- **React:** 19.2.4
- **Database:** Supabase (Postgres) — prosjekt `evfbfiqruxzaraksetok`
- **Auth:** Supabase Auth (e-post + passord)
- **Styling:** Tailwind CSS, dark theme, mobile-responsive
- **Charts:** Recharts (line, bar, donut, pie)
- **Verdenskart:** react-svg-worldmap
- **Data fetching:** SWR
- **Excel:** xlsx (for søkeord-generator)
- **Google Ads:** google-ads-api v23 (direkte API-tilgang via MCC)

---

## Datakilder og integrasjoner

### 1. Google Analytics 4 (GA4)
- **Property ID:** `properties/388008623`
- **Service account:** `fosen-tools-analytics@fosen-tools-analytics.iam.gserviceaccount.com`
- **Henter:** Daglige metrics, topp sider, geografi, trafikkilder, Google Ads-kampanjer (via GA4 attribusjon)
- **Service:** `src/lib/services/ga4.ts`
- Bruker `date` som dimensjon i alle queries så vi får én rad per dag (ikke aggregert)

### 2. Google Search Console
- **Site:** `sc-domain:fosen-tools.no`
- **Henter:** Søkeord, posisjoner, klikk, visninger, CTR
- Service-accounten må være lagt til som Full bruker i Search Console
- API kalt direkte (ikke via GA4) i `fetchSearchKeywords()`

### 3. Google Ads (direkte API)
- **MCC (Login Customer ID):** satt i env (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`)
- **Customer ID:** Fosen Tools operativ konto (`GOOGLE_ADS_CUSTOMER_ID`)
- **Developer Token:** Explorer-nivå (søkt om Basic Access for Keyword Planner — venter på Google, typisk 3 virkedager)
- **Service:** `src/lib/services/google-ads.ts`
- **Henter:**
  - Kampanje-metrics per dag (impressions, clicks, cost, conversions, CPC, CTR)
  - Søkeord-nivå data med kvalitetsscore
  - Faktiske søketermer via `search_term_view` (Search-kampanjer)
  - Pmax søketerm-kategorier via `campaign_search_term_insight` (Performance Max)
  - Konverterings-breakdown per action per dag (`all_conversions` + `all_conversions_value`)
  - Pmax-kampanje-deteksjon via `advertising_channel_type` (filtreres klient-side, enum 10)
- **Mutasjoner:** `customer.mutateResources()` for å legge til negative keywords på kampanje-nivå (via bekreftelses-modal i UI)
- **Keyword Planner:** `KeywordPlannerService` (`src/lib/services/keyword-planner.ts`) med graceful degradation — cacher access-status i 1 time, returnerer tom liste hvis ikke godkjent
- **Viktig:** Pmax `campaign_search_term_insight` støtter IKKE `segments.date` i SELECT — vi bruker BETWEEN i WHERE og lagrer med snapshot-dato

### 4. Meta (Facebook + Instagram)
- **Page ID:** `85450506782` (Fosen Tools)
- **App ID:** `954716570471955` (Fosen Tools Analytics)
- **Henter:** Page insights, posts med likes/comments/shares/clicks
- **Service:** `src/lib/services/meta.ts`
- **Instagram:** Kode for auto-discovery av Instagram Business Account og henting av IG-media finnes (`fetchInstagramPosts`), men Instagram er IKKE koblet til Facebook-siden per nå. Token mangler `instagram_basic` og `instagram_manage_insights` scopes. Forsøkt å oppdatere via Meta Developer UI men fikk "Invalid platform app"-feil. Droppet inntil videre. Dedikert `/platform/meta`-side viser Facebook-data + Instagram-placeholder.
- Bruker `pages_show_list`, `pages_read_engagement`, `read_insights`, `pages_read_user_content`

### 5. Mailchimp (utvidet)
- **List ID:** `09df5a33bd` (FTNett, ~1670 abonnenter)
- **Server prefix:** `us2`
- **Henter (basis):** Kampanjer (sent, opens, clicks, open rate, bounce rate)
- **Henter (utvidet):** Per-lenke klikk (`/reports/{id}/click-details`), geografisk fordeling (`/reports/{id}/locations`), abonnent-vekst (`/lists/{id}/growth-history`), daglig liste-aktivitet (`/lists/{id}/activity`)
- **Service:** `src/lib/services/mailchimp.ts`
- **Viktig dedup-quirk:** Mailchimp returnerer duplikate URLer per kampanje i click-details. Sync-koden dedupliserer per `(campaign_id, url)` før upsert.

### 6. LinkedIn (planlagt)
- **Organization ID:** `10387634`
- Venter på godkjenning av Community Management API fra LinkedIn
- Service-stub finnes i `src/lib/services/linkedin.ts`

### 7. Google Calendar (planlagt)
- Venter på Workspace admin-tilgang for Domain-Wide Delegation

---

## Database (Supabase)

**Prosjekt:** `evfbfiqruxzaraksetok`

### Tabeller

| Tabell | Innhold |
|--------|---------|
| `analytics_metrics` | Daglige aggregerte metrics per plattform (sessions, reach, engagement, etc.) |
| `platform_posts` | Innlegg/sider/kampanjer fra alle plattformer. Meta-poster har `post_type` som skiller `facebook_post` fra `instagram_*` |
| `search_keywords` | Søkeord per dag fra Search Console |
| `geo_data` | Geo-data per dag |
| `traffic_sources` | Trafikkilder per dag (channel, source, medium, sessions, conversions) |
| `ad_campaigns` | Google Ads kampanje-data per dag (via GA4 attribusjon) |
| `competitors` | Konkurrent-liste (manuelt vedlikeholdt) |
| `sync_logs` | Logg over alle sync-kjøringer |
| `google_ads_campaigns` | Direkte Google Ads kampanje-data per dag (ekte kostnad, CPC, konverteringer) |
| `google_ads_keywords` | Google Ads søkeord per dag (7 unike — bare Search-kampanjer har keywords) |
| `google_ads_search_terms` | Faktiske søketermer (2675+ fra Search + 63 Pmax-kategorier). `source`-kolonne skiller `search_term` fra `pmax_insight` |
| `google_ads_conversions` | Per-action konverterings-breakdown per kampanje per dag. Inneholder BÅDE `conversions` (primary) og `all_conversions` (alle handlinger) |
| `google_ads_campaign_settings` | Per-kampanje konfigurasjon: `business_model` (purchase/leads/mixed) + `estimated_lead_value_nok` |
| `google_ads_auto_actions` | Audit trail for auto-applied negative keywords |
| `keyword_reports` | Historikk over genererte ukentlige søkeords-rapporter |
| `analytics_anomalies` | Anomalier oppdaget automatisk av deteksjons-systemet |
| `mailchimp_campaign_links` | Per-lenke klikk per Mailchimp-kampanje |
| `mailchimp_campaign_locations` | Geografisk fordeling av åpninger per kampanje |
| `mailchimp_list_growth` | Månedlig abonnent-vekst (existing, optins, unsubs, cleaned) |
| `mailchimp_list_daily` | Daglig liste-aktivitet (sent, opens, clicks, unsubs) |
| `tags` | Tag-definisjoner |
| `tag_rules` | Automatiske tag-regler |
| `tag_assignments` | Tag-tilordninger til entities |

**Viktig:** `platform_type` er en Postgres enum: `ga4`, `meta`, `linkedin`, `mailchimp`, `google_ads`. Husk `ALTER TYPE platform_type ADD VALUE` om du legger til en ny plattform.

### Migreringer (docs/migrations/)
- `001_google_ads_tables.sql` — google_ads_campaigns + google_ads_keywords
- `002_google_ads_search_terms.sql` — google_ads_search_terms
- `003_google_ads_conversions.sql` — google_ads_conversions
- `004_google_ads_campaign_settings.sql` — campaign_settings med business_model
- `005_google_ads_auto_actions.sql` — audit trail for auto-apply
- `006_keyword_reports.sql` — ukentlige rapport-historikk
- `007_analytics_anomalies.sql` — anomali-deteksjon med dedup_key
- `008_mailchimp_extended.sql` — 4 Mailchimp-tabeller (links, locations, growth, daily)

### Storage
- **Bucket `weekly-reports`** (privat) — lagrer genererte Excel-rapporter

---

## Sider

### Hovedsider
- `/dashboard` — Oversikt med KPI-kort, anomali-widget, Google Ads spend-kort, outliers, tag-oversikt, sync-status
- `/attribution` — Cross-platform attribusjon: pie chart, per-kanal ROAS, topp kilder
- `/varsler` — Anomali-varsler med severity-filtrering og acknowledge/resolve-knapper
- `/posts` — Alle innlegg + kampanjer med filter og sortering
- `/sokeord-generator` — Last opp Excel ELLER bruk live DB-data (7/30/90 dager)
- `/sokeord-generator/intelligens` — Multi-source keyword intelligence med Keyword Planner, skaler-opp/kutt-lister, negativ-kandidater med auto-apply
- `/sokeord-generator/auto-actions` — Audit trail for alle auto-applied negative keywords
- `/sokeord-generator/rapporter` — Ukentlige rapporter med generering og nedlasting
- `/settings` — Innstillinger
- `/login` — Innlogging

### Plattform-sider
- `/platform/ga4` — Google Analytics overview (generisk [slug]-side)
- `/platform/meta` — Dedikert Meta-side: Facebook vs Instagram sammenligning, top-posts med filter, engasjement-tabell
- `/platform/mailchimp` — Dedikert Mailchimp deep dive: subject line-performance, mest klikkede lenker, abonnent-vekst, geografi
- `/platform/linkedin` — LinkedIn (placeholder via generisk [slug]-side)

### GA4-undersider
- `/ga4/sokeord` — Søkeord fra Search Console
- `/ga4/geografi` — Verdenskart med trafikk per land
- `/ga4/trafikkilder` — Donut-diagram over trafikkilder
- `/ga4/annonser` — Google Ads kampanjer (via GA4 attribusjon)
- `/ga4/google-ads` — Google Ads direkte: ekte kostnad, CPC, kvalitetsscore, søketermer, Pmax-kategorier, konverterings-breakdown
- `/ga4/google-ads/[campaign_id]` — Kampanje-detalj: daglig chart (4 metrics med dual Y-akse), KPI-kort, søkeord-tabell, søketermer, konverterings-breakdown
- `/ga4/google-ads/analyse` — ROAS-analyse med traffic-light verdikter, business model per kampanje, lead-verdsetting, tracking health
- `/ga4/konkurrenter` — Konkurrent-liste
- `/tags` — Tag-oversikt og regler

---

## API-ruter

### Eksisterende (GA4, Meta, Mailchimp)
| Rute | Funksjon |
|------|----------|
| `POST /api/sync` | Synker alle plattformer inkl. Google Ads + anomali-deteksjon |
| `POST /api/sync/[platform]` | Synker én plattform (aksepterer også `google_ads` slug) |
| `GET /api/metrics` | Aggregerte metrics med filter |
| `GET /api/posts` | Innlegg med filter |
| `GET /api/keywords` | Søkeord aggregert, paginert |
| `GET /api/geo` | Geo-data |
| `GET /api/sources` | Trafikkilder |
| `GET /api/campaigns` | Google Ads kampanjer (GA4 attribusjon) |
| `GET /api/attribution` | Cross-platform attribusjon (GA4 sources + Google Ads verdier) |

### Google Ads (direkte)
| Rute | Funksjon |
|------|----------|
| `GET /api/google-ads/health` | Sanity-sjekk mot Google Ads API |
| `POST /api/google-ads/sync` | Dedikert Google Ads sync (kampanjer + keywords + search terms + Pmax + conversions) |
| `GET /api/google-ads/campaigns` | Aggregerte kampanje-data med ekte kostnad/CPC |
| `GET /api/google-ads/campaigns/[campaign_id]` | Kampanje-detalj med daglig data |
| `GET /api/google-ads/campaigns/[campaign_id]/keywords` | Søkeord filtrert på kampanje |
| `GET /api/google-ads/keywords` | Alle søkeord aggregert |
| `GET /api/google-ads/search-terms` | Faktiske søketermer (filtrerbart på source + campaign_id) |
| `GET /api/google-ads/conversions` | Konverterings-breakdown per action |
| `GET /api/google-ads/analysis` | ROAS-analyse med verdikter, brand-share, tracking health |
| `GET/POST /api/google-ads/campaign-settings` | Les/skriv business model + lead-verdi per kampanje |
| `POST /api/google-ads/apply-negatives` | Auto-apply negative keywords med audit trail (maks 50 per batch) |
| `GET /api/google-ads/auto-actions` | Audit log over alle auto-applied handlinger |

### Søkeord-intelligens
| Rute | Funksjon |
|------|----------|
| `POST /api/keyword-generator` | Excel-opplasting → optimalisert rapport |
| `GET /api/keyword-generator?source=db&days=N` | Live DB-modus → intelligent Excel med 10 ark |
| `GET /api/keyword-generator/intelligence?days=N` | JSON-intelligens for web-side |
| `POST /api/keyword-generator/keyword-planner-ideas` | Keyword Planner seed-expansion (graceful degradation) |
| `POST /api/keyword-generator/weekly-report` | Generer + lagre ukentlig rapport i Supabase Storage |
| `GET /api/keyword-generator/reports` | Liste + signed download URL for rapporter |

### Anomali-varsling
| Rute | Funksjon |
|------|----------|
| `GET /api/anomalies` | Aktive + håndterte anomalier |
| `POST /api/anomalies` | Acknowledge eller resolve en anomali |
| `POST /api/anomalies/detect` | Manuell trigger for deteksjon |

### Mailchimp (utvidet)
| Rute | Funksjon |
|------|----------|
| `GET /api/mailchimp/links?days=N` | Aggregerte per-lenke klikk |
| `GET /api/mailchimp/growth` | Abonnent-vekst over tid |
| `GET /api/mailchimp/locations?days=N` | Geografisk fordeling |
| `GET /api/mailchimp/daily?days=N` | Daglig liste-aktivitet |

**Auth:** Alle API-ruter krever innlogget bruker via Supabase. Sync-rutene + anomali-detect + weekly-report støtter også `Bearer ${SYNC_SECRET_KEY}` for cron.

---

## Sentrale tjenester (src/lib/services/)

| Service | Fil | Funksjon |
|---------|-----|----------|
| `GA4Service` | `ga4.ts` | GA4 Data API + Search Console |
| `MetaService` | `meta.ts` | Facebook Page + Instagram (IG ikke koblet ennå). Auto-discovery av IG Business Account |
| `MailchimpService` | `mailchimp.ts` | Kampanjer + utvidet (click-details, locations, growth, daily) |
| `GoogleAdsService` | `google-ads.ts` | Kampanjer, keywords, search terms, Pmax insights, conversions, Pmax campaign detection |
| `KeywordPlannerService` | `keyword-planner.ts` | Keyword Planner med graceful degradation og 1-time cache |
| `keyword-intelligence` | `keyword-intelligence.ts` | Multi-source signal gathering, conversion enrichment, classification (scale_up/keep/optimize/cut/negative/new_opportunity/monitor) |
| `keyword-report` | `keyword-report.ts` | Excel-bygger (6 basis-ark + 4 intelligens-ark). Shared av Excel-upload og live DB-modus |
| `anomaly-detection` | `anomaly-detection.ts` | 5 sjekker: plattform-spikes, kostnad-spikes, ROAS-fall, konverterings-stopp, nye konkurrent-brands |
| `tag-rules-engine` | `tag-rules-engine.ts` | Automatisk tagging etter regler |

---

## Sync-pipeline

### Hva som synkroniseres
- **GA4:** Daily metrics + topp sider + søkeord (5000+) + geo + trafikkilder + GA4 Ads-kampanjer
- **Meta:** Daily insights + 50 nyeste poster (Facebook + Instagram hvis koblet)
- **Mailchimp:** Kampanjer + per-lenke klikk + geografi + liste-vekst + daglig aktivitet
- **Google Ads:** Kampanjer + keywords + search terms (2675+) + Pmax insights (63) + conversions (118 rader)
- **Etter sync:** `applyTagRules()` → `detectAnomalies()` (begge stille ved feil)

### Sync-utils
- `src/app/api/sync/sync-utils.ts` — `syncPlatform(admin, platform, triggeredBy, { days })` med konfigurerbart vindu (default 90 dager via `SYNC_DAYS` env)
- `src/app/api/sync/google-ads-sync.ts` — `syncGoogleAds(admin, triggeredBy, { days })` — dedikert for Google Ads (ikke PlatformService-interfacet)
- Etter GA4/Meta/Mailchimp sync: Mailchimp-spesifikk gren henter utvidet data (links, locations, growth, daily)

---

## Anomali-deteksjon

**Service:** `src/lib/services/anomaly-detection.ts`
**5 sjekker kjøres etter hver sync:**

1. **Plattform-spikes/drops** — 7d vs forrige 7d, threshold ±40% (warning) / ±70% (critical). Min volum: 30
2. **Google Ads kostnad-spike** — siste 3d vs 11d før, threshold 80%+ økning per kampanje. Min kostnad: 500 NOK
3. **Google Ads ROAS-fall** — kampanje med ROAS ≥ 2x som faller under 1x
4. **Konverterings-stopp** — 0 purchase/form_submit i 48 timer etter ≥ 3 i forrige 5 dager
5. **Nye konkurrent-brands** — søketerm matcher konkurrent-regel og dukker opp for første gang på 37 dager

**Dedup:** Samme `(category, target_type, target_id)` innenfor 24 timer gir ikke ny rad
**Auto-expire:** Aktive anomalier eldre enn 30 dager markeres automatisk som expired
**UI:** `/varsler`-side med severity-filter + acknowledge/resolve-knapper + dashboard-widget

---

## Google Ads — strategiske funn (per 15. april 2026)

### Kampanjestruktur
| Kampanje | Type | Klikk (90d) | Kostnad | Ekte kjøp | Kjøpsverdi | ROAS |
|---|---|---:|---:|---:|---:|---:|
| Fosen Tools - General | Performance Max | 2080 | 10 419 NOK | 8 | 76 703 NOK | **7,36x** |
| Produktkampanje - Bransjer | Search | 759 | 8 353 NOK | 0 | 0 NOK | 0x |

### Pmax brand-kannibalisering
- 55% av Pmax-klikk er pure brand-søk ("fosen tools" — 1137 klikk)
- ~5% er konkurrent-brands (snap on, festool, metabo, luna, kz tools, idg tools osv.)
- 18% er "(other)"-bucket (aggregerte småvolum-søk)
- ~22% er ekte generiske søk

### Konverteringssporing — fikset
- `Fosen-Tools GA4 (web) purchase` er nå **primary** med verdier fra GA4 (ekte transaksjonsverdi)
- `Kontaktoss skjema` (AW-951935006/O-DiCJWfvpwcEJ7A9cUD) er primary — fires via GTM `ft_contact_form_success` dataLayer-event
- `klikk_kontakt_oss` er fjernet som primary (var eneste primary tidligere — drev Pmax blindt)
- **Historiske primary-verdier kan ikke oppdateres retroaktivt av Google** — nye kjøp telles korrekt fra 15. april
- **Value-innstilling:** "Bruk verdien fra Google Analytics 4-området" med default 1 NOK fallback

### Google Ads API-quirks
- `campaign.advertising_channel_type = 10` (PERFORMANCE_MAX) kan ikke filtreres med enum i WHERE — filtreres klient-side
- `campaign_search_term_insight` krever filter på eksakt én `campaign_id` + kan IKKE ha `segments.date` i SELECT
- Pmax insights returnerer aggregerte data (ikke daglige) — lagres med snapshot_date
- Developer token er på "Explorer"-nivå — KeywordPlanIdeaService returnerer `DEVELOPER_TOKEN_NOT_APPROVED`. Søkt om Basic Access, venter på Google (~3 virkedager)

---

## Søkeord-generator

### Tre moduser
1. **Excel-opplasting** (`POST /api/keyword-generator`) — bruker laster opp Google Ads Excel-rapport
2. **Live DB** (`GET /api/keyword-generator?source=db&days=N`) — henter fra google_ads_keywords + search_terms + Pmax, kjører intelligens-pipeline
3. **Intelligens-side** (`/sokeord-generator/intelligens`) — interaktiv web-versjon med auto-apply

### Intelligens-pipeline (`src/lib/services/keyword-intelligence.ts`)
- `gatherSignals()` — samler fra 4 kilder: google_ads_keywords, search_terms, pmax_insight, GSC organic
- `enrichWithConversions()` — kobler keywords til konverteringsdata via campaign → purchase/leads (proporsjonalt fordelt etter klikk-andel)
- `classifySignals()` — gir verdict per keyword: scale_up / keep / optimize / cut / negative_keyword / new_opportunity / monitor
- Bruker `google_ads_campaign_settings` for business model og lead-verdi

### Auto-apply negative keywords
- UI: checkboxes + bekreftelses-modal som lister nøyaktig hva som legges til
- API: `POST /api/google-ads/apply-negatives` med maks 50 per batch
- Mutasjon: `customer.mutateResources([{ entity: "campaign_criterion", operation: "create", negative: true, keyword: { text, match_type } }])`
- Audit: alt logges til `google_ads_auto_actions` med payload, bruker, status, feilmelding

### Excel-rapport (10 ark)
Basis (6 ark): Sammendrag, Kutt disse, Behold disse, Nye muligheter, Vurder disse, Tag-oversikt
Intelligens (4 ark): Skaler opp, Negativ-kandidater, Nye muligheter (DB), Keyword Planner (tom hvis ikke godkjent)

---

## Kontaktskjema-tracking (GTM)

**Kontaktskjema på fosen-tools.no** bruker en Freshdesk-iframe. Tracking fungerer via:

1. **Nettside-script** pusher `ft_contact_form_success` til dataLayer når iframen re-loader (indikerer sendt skjema)
2. **GTM-trigger** `Custom - FT Contact form success` lytter på `ft_contact_form_success`
3. **GTM-tag** `Google Ads – Kontaktoss skjema conversion` fyrer mot `AW-951935006/O-DiCJWfvpwcEJ7A9cUD`
4. **Consent Mode v2** er aktiv — tracking blokkeres til cookies er akseptert

**FT Aviation (søsterselskap)** har tilsvarende oppsett med `fta_support_form_success`-event i sin GTM-container.

---

## Miljøvariabler (`.env.local`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://evfbfiqruxzaraksetok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# GA4
GA4_PROPERTY_ID=properties/388008623
GA4_CLIENT_EMAIL=fosen-tools-analytics@fosen-tools-analytics.iam.gserviceaccount.com
GA4_PRIVATE_KEY="..."

# Google Ads (direkte API)
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=490698342086-d3ku8jrlgp0ur6ehc5ha92v44jk32a5r.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=...     (Fosen Tools operativ konto, 10 sifre uten bindestreker)
GOOGLE_ADS_LOGIN_CUSTOMER_ID=... (MCC-konto, 10 sifre uten bindestreker)

# Meta
META_ACCESS_TOKEN=...
META_PAGE_ID=85450506782
META_INSTAGRAM_ACCOUNT_ID=     (tom — Instagram ikke koblet)

# Mailchimp
MAILCHIMP_API_KEY=...-us2
MAILCHIMP_SERVER_PREFIX=us2
MAILCHIMP_LIST_ID=09df5a33bd

# LinkedIn (planlagt)
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_ID=

# Sync
SYNC_SECRET_KEY=fosen-sync-2026
SYNC_DAYS=90                   (konfigurerbart sync-vindu, default 90)
```

Alle er også lagt inn i Vercel som Environment Variables.

---

## Vercel-deploy

- **Prosjekt:** `fosen-tools-analytics` under `fosentoolsgits-projects`
- **Auto-deploy:** Ja, fra `main`-branchen
- **Hobby-plan:** Repoet må være public. Multi-author commits kan blokkeres.
- **Push-flyt:** Bruker committer og pusher fra terminal.

---

## Kjente begrensninger og ventende ting

### Venter på ekstern godkjenning
- **Google Ads Keyword Planner:** Developer token er "Explorer"-nivå. Søkt om Basic Access (15. april). `KeywordPlannerService` aktiveres automatisk når Google godkjenner — graceful degradation i mellomtiden.
- **LinkedIn:** Venter på Community Management API-godkjenning
- **Google Calendar:** Venter på Workspace admin-tilgang

### Instagram
- Kode for Instagram-integrasjon er bygget i `meta.ts` (`fetchInstagramPosts`, `getInstagramAccountId`)
- Instagram Business Account er IKKE koblet til Facebook-siden
- Meta-appen mangler `instagram_basic` og `instagram_manage_insights` scopes
- Forsøkt å oppdatere via Meta Developer UI — fikk "Invalid platform app"-feil som ikke lot seg løse
- **Status:** Droppet inntil videre. `/platform/meta`-siden viser placeholder for Instagram.

### Tekniske begrensninger
- **Historiske Google Ads primary-verdier:** Google fryser primary-status på konverterings-tidspunktet. Eldre data viser klikk_kontakt_oss som primary (20 NOK), ikke purchase (76 703 NOK). Analyse-siden bruker `all_conversions_value` for korrekte beregninger.
- **Supabase REST maks 1000 rader** — alle API-ruter har paginering
- **Search Console-data:** Maks ~16 måneder historikk
- **Søkeord-aggregering:** API begrenser til topp 100 søkeord (etter visninger)
- **Mailchimp click-details:** Synker bare siste 30 dagers kampanjer (rate-limit-hensyn)

---

## Kjente quirks

1. **Vercel Hobby-plan blokkerer multi-author commits** — bruker må selv pushe fra terminal
2. **Supabase MCP har ikke skrivetilgang** — migreringer kjøres manuelt i SQL editor
3. **Meta API har deprecated mange Page Insights-metrics** — bruker `page_post_engagements`, `page_views_total`, `page_impressions_unique`
4. **GA4 må ha `date` som dimensjon** for per-dag-data
5. **Mailchimp returnerer duplikate URLer** i click-details — sync-koden dedupliserer
6. **Google Ads GAQL godtar ikke integer enums i WHERE** — `advertising_channel_type = 10` feiler, filtreres klient-side
7. **Pmax search_term_insight krever eksakt 1 campaign_id** og tåler ikke `segments.date` i SELECT
8. **`LAST_90_DAYS` er ikke gyldig DURING-literal** i GAQL — bruk BETWEEN med eksplisitte datoer
9. **Google Ads `metrics.conversions_value` reflekterer primary-status ved conversion-tidspunkt** — kan ikke oppdateres retroaktivt
