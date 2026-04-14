@AGENTS.md

# Fosen Tools Analytics

Internt analytics-dashboard for Fosen Tools AS som samler markedsdata fra GA4, Meta (Facebook), Mailchimp og Google Search Console på ett sted. Bygget for å gi sjefen og marketing-teamet rask innsikt i hva som fungerer og hva som bør endres.

**Live URL:** Deployet på Vercel via FosenToolsGit-konto (auto-deploy fra `main`-branchen)
**Repo:** https://github.com/FosenToolsGit/Fosen-Tools-Analytics (public)

---

## Tech stack

- **Framework:** Next.js 16.2.3 (App Router, Turbopack)
- **React:** 19.2.4
- **Database:** Supabase (Postgres) — prosjekt `evfbfiqruxzaraksetok`
- **Auth:** Supabase Auth (e-post + passord)
- **Styling:** Tailwind CSS, dark theme
- **Charts:** Recharts (line, bar, donut)
- **Verdenskart:** react-svg-worldmap
- **Data fetching:** SWR
- **Excel:** xlsx (for søkeord-generator)

---

## Datakilder og integrasjoner

### 1. Google Analytics 4 (GA4)
- **Property ID:** `properties/388008623`
- **Service account:** `fosen-tools-analytics@fosen-tools-analytics.iam.gserviceaccount.com`
- **Henter:** Daglige metrics, topp sider, geografi, trafikkilder, Google Ads-kampanjer
- **Service:** `src/lib/services/ga4.ts`
- Bruker `date` som dimensjon i alle queries så vi får én rad per dag (ikke aggregert)

### 2. Google Search Console
- **Site:** `sc-domain:fosen-tools.no`
- **Henter:** Søkeord, posisjoner, klikk, visninger, CTR
- Service-accounten må være lagt til som Full bruker i Search Console
- API kalt direkte (ikke via GA4) i `fetchSearchKeywords()`

### 3. Meta (Facebook)
- **Page ID:** `85450506782` (Fosen Tools)
- **App ID:** `954716570471955` (Fosen Tools Analytics)
- **Henter:** Page insights, posts med likes/comments/shares/clicks
- **Service:** `src/lib/services/meta.ts`
- Bruker langtlevende Page Access Token. Appen er publisert (Live mode)
- Bruker `pages_show_list`, `pages_read_engagement`, `read_insights`, `pages_read_user_content`

### 4. Mailchimp
- **List ID:** `09df5a33bd` (FTNett, ~1670 abonnenter)
- **Server prefix:** `us2`
- **Henter:** Kampanjer (sent, opens, clicks, open rate, bounce rate)
- **Service:** `src/lib/services/mailchimp.ts`

### 5. LinkedIn (planlagt)
- **Organization ID:** `10387634`
- Venter på godkjenning av Community Management API fra LinkedIn
- Service-stub finnes i `src/lib/services/linkedin.ts`

### 6. Google Calendar (planlagt)
- Venter på Workspace admin-tilgang for Domain-Wide Delegation
- Mål: vise events som markører på grafene for å se hvilke aktiviteter påvirket trafikk

---

## Database (Supabase)

**Prosjekt:** `evfbfiqruxzaraksetok` (region: us-east?)

### Tabeller

| Tabell | Innhold |
|--------|---------|
| `analytics_metrics` | Daglige aggregerte metrics per plattform (sessions, reach, engagement, etc.) |
| `platform_posts` | Innlegg/sider/kampanjer fra alle plattformer (samme tabell, filtreres på `platform`) |
| `search_keywords` | Søkeord per dag fra Search Console (query, clicks, impressions, position, ctr) |
| `geo_data` | Geo-data per dag (country, city, sessions, users) |
| `traffic_sources` | Trafikkilder per dag (channel, source, medium) |
| `ad_campaigns` | Google Ads kampanje-data per dag |
| `competitors` | Konkurrent-liste (manuelt vedlikeholdt) |
| `sync_logs` | Logg over alle sync-kjøringer |

**Viktig:** `platform_type` er en Postgres enum som inkluderer: `ga4`, `meta`, `linkedin`, `mailchimp`. Husk `ALTER TYPE platform_type ADD VALUE` om du legger til en ny plattform.

### Konfliktnøkler for upsert
- `analytics_metrics`: `(platform, metric_date)`
- `platform_posts`: `(platform, platform_post_id)`
- `search_keywords`: `(query, metric_date)`
- `geo_data`: `(country, city, metric_date)`
- `traffic_sources`: `(channel, source, medium, metric_date)`
- `ad_campaigns`: `(campaign_name, ad_group, keyword, metric_date)`

---

## Sider

### Hovedsider
- `/dashboard` — Oversikt: samlet rekkevidde, engasjement, besøkende, følgere
- `/posts` — Alle innlegg + kampanjer med filter (Alle/Facebook/Mailchimp/LinkedIn) og sortering
- `/sokeord-generator` — Last opp Google Ads Excel, få optimalisert anbefaling tilbake
- `/settings` — Innstillinger
- `/login` — Innlogging

### Plattform-sider
- `/platform/ga4` — Google Analytics overview
- `/platform/meta` — Facebook
- `/platform/mailchimp` — Mailchimp
- `/platform/linkedin` — LinkedIn (placeholder)

### GA4-undersider
- `/ga4/sokeord` — Søkeord fra Search Console (med dropdown for daglig fordeling per søkeord)
- `/ga4/geografi` — Verdenskart med trafikk per land
- `/ga4/trafikkilder` — Donut-diagram over trafikkilder
- `/ga4/annonser` — Google Ads kampanjer
- `/ga4/konkurrenter` — Konkurrent-liste

---

## API-ruter

| Rute | Funksjon |
|------|----------|
| `POST /api/sync` | Synker alle konfigurerte plattformer (skipper LinkedIn til den er klar) |
| `POST /api/sync/[platform]` | Synker én plattform |
| `GET /api/metrics` | Aggregerte metrics med filter på dato + platform |
| `GET /api/posts` | Innlegg med filter på platform |
| `GET /api/keywords` | Søkeord aggregert per query, paginert, max 100 toppsøkeord, med `daily` for dropdown |
| `GET /api/geo` | Geo-data, paginert |
| `GET /api/sources` | Trafikkilder, paginert, aggregert per channel+source+medium |
| `GET /api/campaigns` | Google Ads kampanjer, paginert |
| `GET /api/competitors` | Konkurrent-liste |
| `POST /api/competitors` | Legg til konkurrent |
| `DELETE /api/competitors` | Slett konkurrent |
| `POST /api/keyword-generator` | Tar imot Google Ads Excel-fil, returnerer optimalisert Excel |

**Auth:** Alle API-ruter krever innlogget bruker via Supabase. Sync-rutene støtter også `Bearer ${SYNC_SECRET_KEY}` for cron-jobs.

---

## Sentrale UX-mønstre

### Datovelger (`src/components/filters/date-range-picker.tsx`)
- Preset-knapper: 7 dager, 30 dager, 90 dager
- Custom datoinput-felter for vilkårlig periode
- URL-state via `?preset=30d` eller `?from=2026-01-01&to=2026-04-01`
- Hook: `src/hooks/use-date-range.ts` — henter state direkte fra URL-params (ikke useState)

### Sortering
- Alle tabeller har klikkbare kolonneoverskrifter
- Mønster: `useState<SortColumn>` + `useMemo` for sortert data + `<SortIcon>` chevron
- Søkeord-tabellen har i tillegg utvidbar dropdown per søkeord for daglig fordeling

### Tooltips
- KPI-kort har `tooltip`-prop som vises på hover
- Norsk forklaring av hva hvert tall betyr

### Aggregering i API-rutene
- Søkeord/geo/sources/campaigns aggregeres per unik kombinasjon i API (ikke i DB)
- Vektet snitt brukes for posisjon/CTR (vektet etter visninger)
- Søkeord normaliseres med trim+lowercase for å unngå duplikater pga whitespace/casing

### Plattform-spesifikke kolonner i `top-posts-table.tsx`
- **Mailchimp:** Sendt, Åpninger, Klikk, Åpningsrate
- **GA4:** Visninger, Brukere
- **Meta/LinkedIn:** Klikk, Engasjement, Likes
- Alle med sortering

---

## Sync-pipeline

### Automatisk sync
- **Lokalt scheduled task:** `CronCreate` i Claude (kjører bare når Claude-sesjonen er aktiv)
- **Script:** `scripts/sync-all.sh` for cron/launchd
- **Cron-trigger:** `POST /api/sync` med `Authorization: Bearer fosen-sync-2026`

### Hva som synkroniseres
- **GA4:** Daily metrics + topp 30 sider + søkeord (5000+) + geo (1267 rader) + trafikkilder (290 rader) + Google Ads kampanjer
- **Meta:** Daily insights + 50 nyeste poster med engasjement og clicks
- **Mailchimp:** Kampanjer i siste 30 dager + abonnent-stats

### Sync-utils
- `src/app/api/sync/sync-utils.ts` — `syncPlatform(admin, platform, triggeredBy)`
- Sanitizer metrics-objekter før upsert (fjerner felter som ikke er i DB-skjema)
- Loggfører til `sync_logs`

---

## Søkeord-generator

**Side:** `/sokeord-generator`
**API:** `POST /api/keyword-generator`

### Slik fungerer det
1. Bruker drar inn Excel-fil med Google Ads-rapport
2. Robust header-deteksjon: leter etter både "søkeord/keyword" OG "klikk/clicks" i samme rad
3. Konverterer alle celler til strenger først (unngår type-issues)
4. Søker hele filen, ikke bare første 10 rader
5. Henter Search Console-data fra DB for å finne nye muligheter
6. Genererer Excel med 5 ark:
   - **Sammendrag** — totaler, anbefalinger, mulig besparelse
   - **Kutt disse** — konkurrent-merker, dyre uten volum, 0 klikk
   - **Behold disse** — søkeord som leverer (5+ klikk, CPC < 12)
   - **Nye muligheter** — fra Search Console (visninger ≥ 50, posisjon ≥ 4)
   - **Vurder disse** — borderline-cases

### Logikk for klassifisering
- **Konkurrent-merker:** `luna`, `flex tools`, `bosch`, `kz tools`, `idg`, `lntool`, `milwaukee`, `dewalt`, `makita`, `hilti`, `festool` → KUTT
- **Dyre uten volum:** CPC > 25 NOK og klikk ≤ 2 → KUTT
- **0 klikk:** → KUTT
- **5+ klikk og CPC < 12:** → BEHOLD
- **Resten:** → VURDER

### Feilmeldinger
- Hvis kolonner ikke finnes, returneres `found_headers` i feilresponsen så brukeren ser hva som faktisk var i filen
- Frontend (`src/app/(dashboard)/sokeord-generator/page.tsx`) viser `found_headers` i feilboksen

---

## Komponenter

| Komponent | Plassering | Funksjon |
|-----------|-----------|----------|
| `Sidebar` | `src/components/layout/sidebar.tsx` | Hovednavigasjon med GA4 ekspanderbar undermeny |
| `Header` | `src/components/layout/header.tsx` | Topp-bar med synkroniser + logout |
| `MetricCard` | `src/components/dashboard/metric-card.tsx` | KPI-kort med tooltip og trend-indikator |
| `MetricGrid` | `src/components/dashboard/metric-grid.tsx` | Grid-layout for KPI-kort |
| `OverviewChart` | `src/components/dashboard/overview-chart.tsx` | Linjediagram for tids-serier |
| `ChannelChart` | `src/components/dashboard/channel-chart.tsx` | Bar/line for plattform-data |
| `KeywordTable` | `src/components/dashboard/keyword-table.tsx` | Sortable + ekspanderbar dropdown for daglig fordeling |
| `GeoMap` | `src/components/dashboard/geo-map.tsx` | Verdenskart + bar chart + sortable detail-tabell |
| `SourceChart` | `src/components/dashboard/source-chart.tsx` | Donut + sortable detail-tabell |
| `CampaignTable` | `src/components/dashboard/campaign-table.tsx` | Sortable Google Ads-tabell |
| `CompetitorTable` | `src/components/dashboard/competitor-table.tsx` | Sortable konkurrent-liste med add/delete |
| `TopPostsTable` | `src/components/dashboard/top-posts-table.tsx` | Sortable, plattform-spesifikke kolonner |
| `DateRangePicker` | `src/components/filters/date-range-picker.tsx` | Preset + custom datovelger |
| `ComparisonToggle` | `src/components/filters/comparison-toggle.tsx` | Toggle for sammenligning med forrige periode |

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

# Meta
META_ACCESS_TOKEN=...
META_PAGE_ID=85450506782
META_INSTAGRAM_ACCOUNT_ID=

# Mailchimp
MAILCHIMP_API_KEY=...-us2
MAILCHIMP_SERVER_PREFIX=us2
MAILCHIMP_LIST_ID=09df5a33bd

# LinkedIn (planlagt)
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_ID=

# Sync secret (cron)
SYNC_SECRET_KEY=fosen-sync-2026
```

Alle disse er også lagt inn i Vercel som Environment Variables.

---

## Vercel-deploy

- **Prosjekt:** `fosen-tools-analytics` under `fosentoolsgits-projects`
- **Auto-deploy:** Ja, fra `main`-branchen
- **Pre-deployment:** Repoet må være public (Hobby-plan blokkerer collab på private repos)
- **Push krever:** Bruker må committe selv fra terminal — Claude sine commits blir blokkert av Vercel hvis bruker også er commit-author på samme commit (multi-author issue)

### Push-flyt
```bash
cd "/Users/adrianhpettersen/Downloads/Fosen Tools Analytics"
git add -A
git commit -m "..."
git push
```
Vercel deployer automatisk innen 1–2 minutter.

---

## Cross-platform analyse-funn (per april 2026)

### Trafikk-fordeling (siste 30 dager)
- **Nettside:** ~4 700 sesjoner, ~3 300 brukere
- **Facebook:** ~11 000 personer rekkevidde, ~1 000 engasjement
- **Mailchimp:** ~3 500 åpninger på 5 kampanjer, 49% åpningsrate (svært bra)
- **Google-synlighet:** ~14 000 søkevisninger/mnd

### Trafikkilder til nettside
- **Organisk søk:** 41% (1 676 sesjoner) — hovedmotor
- **Direkte:** 28% (merkevaregjenkjenning)
- **Cross-network:** 12% (Google Ads)
- **E-post:** 4.4% (Mailchimp) — beste konvertering 14.6%
- **Sosiale medier:** 1.4% — bare 0.5% konvertering fra Facebook-rekkevidde

### Søkeord-innsikter
- **Brand-søk:** 62% av klikk (Fosen Tools, Snap-on)
- **Generiske søk:** 38%
- **SEO-muligheter:** "pelicase" (1364 visn), "verktøyvogn" (819 visn, posisjon 14.5)

### Google Ads (Oct 2025 – Mar 2026)
- **Totalt klikk:** 1 127
- **Total kostnad:** 6 355 NOK
- **Snitt CPC:** 5.64 NOK
- **Best:** Brand-kampanje (Fosen Tools – General) — 825 klikk, 2 825 NOK
- **Best bransje:** Politi (våpenskap) — 244 klikk
- **Bør kuttes:** Brannvesen (12 klikk), Entreprenør (3 klikk), VVS (2 klikk)
- **Bør pauses:** Konkurrent-merker (Bosch, Luna, Flex Tools, KZ Tools)

---

## Kjente begrensninger og TODOs

- **LinkedIn:** Venter på Community Management API-godkjenning fra LinkedIn (kan ta uker)
- **Google Calendar:** Venter på Workspace admin-tilgang for Domain-Wide Delegation
- **Tag-system:** Ikke implementert ennå — planlagt funksjon for å gi tags til søkeord/sider for visualisering
- **Søkeord-aggregering:** API begrenser til topp 100 søkeord (etter visninger) — ellers blir det for mange rader for store perioder
- **Search Console-data:** Maks ~30 dagers historikk fra Google
- **Singapore/Kina-trafikk:** ~6% hver — uventet høyt, kan være bots, bør undersøkes
- **Mailchimp-kampanjer:** Synker bare siste 30 dagers send-vindu

---

## Kjente quirks

1. **Vercel Hobby-plan blokkerer multi-author commits** — derfor må bruker selv pushe fra terminal, ikke Claude
2. **Search Console-data lagres med faktisk dato per query** (etter siste fix), så 7/30/90-knappene viser nå korrekte forskjeller
3. **Supabase REST returnerer maks 1000 rader uten paginering** — alle API-ruter har paginering implementert
4. **Meta API har deprecated mange Page Insights-metrics** — bruker `page_post_engagements`, `page_views_total`, `page_impressions_unique`
5. **GA4 må ha `date` som dimensjon** for å få per-dag-data (ikke aggregert over hele perioden)
