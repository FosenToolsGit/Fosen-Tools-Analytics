@AGENTS.md

# Fosen Tools Analytics

Internt analytics-dashboard for Fosen Tools AS som samler markedsdata fra GA4, Meta (Facebook), Google Ads (direkte API), Mailchimp og Google Search Console på ett sted. Inkluderer anomali-varsling, søkeords-intelligens med auto-apply negative keywords, cross-platform attribusjon og ukentlige rapporter.

**Status:** Kjører kun lokalt (`npm run dev`) inntil videre — **Vercel-deploy er på pause** etter sikkerhetshendelse hos Vercel (21. april 2026). Prosjektet er slettet fra Vercel og `.vercel/`-mappen er fjernet lokalt. Kan reaktiveres senere med ny `vercel link`.
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

## Publiseringsrytme (sosiale medier + nyhetsbrev)

Fast publiseringskalender som styrer hvordan vi planlegger innhold:

| Kanal | Dag | Tid | Innholdstype |
|---|---|---|---|
| **Mailchimp (FTNett)** | Tirsdag | 11:00 | Nyhetsbrev — produkter, kampanjer, midtseksjon |
| **Meta (FB + IG)** | Fredag | — | Produksjons-/leveranse-poster (Pelicase 1535-Forsvaret 1. mai er et eksempel) |
| **Meta (FB + IG)** | Ad-hoc | — | Tematiske/edukative poster (HDFI vs generisk skum 3. mai er et eksempel) |
| **LinkedIn** | Ad-hoc | — | Speiles ofte fra Meta — ikke fast plan |

**Implikasjoner for analyse:**
- **Mailchimp-utsendelser i `platform_posts`** dukker opp tirsdag — uke-i-uke-sammenligning bør respektere dette (en mandagsbrief som dekker man-søn fanger forrige tirsdag-utsendelse, en som dekker tir-man fanger 2 utsendelser eller 0).
- **Fredag-poster på Meta er typisk «levert»-format** med høy engagement-rate (skreddersøm-mønster, +144% lift per memory). Disse driver trafikk fra IG-bio og FB-organic-lenker.
- **Ad-hoc-poster** (som HDFI vs generisk) bør tagges med distinkt `utm_campaign` så de ikke blander seg med faste fredag-poster i attribusjon.

**Språkregler for sosiale medier (og alt FT-innhold):**
- **CNC-maskinert** — IKKE «CNC-frest». «CNC-frest» er nono. Gjelder alle innlegg på Meta, LinkedIn, nyhetsbrev og produkt-/landingssider. Brukes når vi beskriver HDFI-produksjon i CADLAB.

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
| `brochures` | Lagrede brosjyrer for editoren (id, user_id, title, doc jsonb, created_at, updated_at). RLS owner-only. |
| `utm_links` | Sentralt UTM-register (id, label, base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, full_url, notes, user_id). Alle innlogga kan lese/lage; eier kan endre/slette. |

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
- `009_brochures.sql` — `brochures`-tabell for multi-doc save i brosjyre-editoren. RLS owner-only + auto `updated_at`-trigger
- `010_brochure_assets.sql` — privat Storage-bucket `brochure_assets` for opplastede bilder i brosjyre-editoren. RLS path-basert (`{user_id}/...`)
- `011_utm_links.sql` — `utm_links`-tabell for sentralt UTM-register (`/innleggsbygger/utm`). RLS: alle innlogga kan lese/lage, kun eier kan endre/slette. Auto `updated_at`-trigger.
- `011_utm_links_seed.sql` — valgfri seed med 8 linker generert i samtalen 3. mai (kjør etter `011_utm_links.sql`)

### Storage
- **Bucket `weekly-reports`** (privat) — lagrer genererte Excel-rapporter
- **Bucket `brochure_assets`** (privat) — opplastede bilder i brosjyre-editoren. Path-basert RLS: bruker har full kontroll over filer i `{auth.uid()}/...`. Public URL-format: `{SUPABASE_URL}/storage/v1/object/public/brochure_assets/{path}` (rendres via image-proxy som er whitelistet for Supabase-host)

---

## Sider

### Hovedsider
- `/dashboard` — Oversikt med KPI-kort, anomali-widget, Google Ads spend-kort, outliers, tag-oversikt, sync-status
- `/mandagsmote` — Dedikert møtebrief: henter alle innsikt-data i parallell, viser hero-KPI siste 7d, trafikklys per plattform (14d), auto-generert handlingsliste, aktive varsler med konkurrent-søk-chips, topp innlegg, SEO-bevegelser (stigere/fallere), vekstmuligheter og quick-lenker til bygger-sider. Har Oppdater + Skriv ut-knapp
- `/attribution` — Cross-platform attribusjon: pie chart, per-kanal ROAS, topp kilder. Viser KUN sporbar purchase-verdi (ikke oppblåste estimater). Splittet mellom Paid Search (Bransjer) og Cross-network (Pmax) basert på kampanjetype.
- `/kundereise` — Cross-platform kundereise-visualisering: Sankey-diagram (kanal → konverteringssteg), konverteringstrakt med dropoff %, kanal-assistanse-tabell, konverteringsrate per kanal, daglig tidslinje med stacked areas
- `/varsler` — Anomali-varsler med severity-filtrering og acknowledge/resolve-knapper
- `/posts` — Alle innlegg + kampanjer med filter og sortering
- `/sokeord-generator` — Last opp Excel ELLER bruk live DB-data (7/30/90 dager)
- `/sokeord-generator/intelligens` — Multi-source keyword intelligence med Keyword Planner, skaler-opp/kutt-lister, negativ-kandidater med auto-apply
- `/sokeord-generator/auto-actions` — Audit trail for alle auto-applied negative keywords
- `/sokeord-generator/rapporter` — Ukentlige rapporter med generering og nedlasting
- `/settings` — Innstillinger
- `/login` — Innlogging

### Innsikt-sider (expanderbar meny i sidebar)
- `/innsikt/ukesrapport` — Trafikklys per plattform (grønn/gul/rød border basert på delta), Google Ads spend-sammenligning, anomali-oppsummering, topp 3 highlights
- `/innsikt/innhold-roi` — Kobler poster/kampanjer til trafikkeffekt (GA4 sesjoner 3d etter vs 3d før publisering), scatter plot (engasjement vs trafikkløft), ROI-scoring per post
- `/innsikt/geo` — Krysskobling av GA4 geo + Mailchimp locations, verdenskart med vektet score, topp regioner-tabell, GA4 vs Mailchimp sammenligning
- `/innsikt/budsjett` — Google Ads budsjett-simulator med slidere per kampanje, auto-optimalisering basert på effektiv ROAS (inkluderer lead-verdi fra campaign_settings), projeksjonstabell
- `/innsikt/seo` — SEO-muligheter fra Search Console: klassifiserer søkeord i 5 kategorier (quick_win, almost_page_one, low_ctr, declining, rising), viser side-URL per søkeord (via Search Console query+page dimensjoner), expanderbart analyse-panel per rad som fetcher HTML fra fosen-tools.no og gir konkrete anbefalinger
- `/innsikt/indeksering` — Indekseringshelse: sitemap-sjekk, robots.txt-visning, og 6 issue-kategorier med GSC-data (kannibalisering, begravde sider, zombies utenfor sitemap, legacy /categories/-URLer, parameter-URLer, orphans). Henter sitemap + robots.txt fra fosen-tools.no + GSC `searchAnalytics/query` med både `[page]` og `[query, page]` dimensjoner i parallell.
- `/innsikt/vekst` — Vekstmuligheter: henter relevante søkeord fra Google Keyword Planner basert på Fosen Tools-spesifikke seeds (verktøy, verktøyvogn, pelicase, merker), krysskobler med Search Console for nåværende rangering, beregner potensiell klikk/mnd ved å klatre til topp 3. Redigerbart seed-sett per bruker.
- `/innsikt/kalender` — Kampanjekalender: tidslinje med alle hendelser (poster, anomalier, auto-actions, syncs) overlagt på sesjonsgraf. Klikkbare dager, filtrerbare event-typer

### Plattform-sider
- `/platform/ga4` — Google Analytics overview (generisk [slug]-side)
- `/platform/meta` — Dedikert Meta-side: Facebook vs Instagram sammenligning, top-posts med filter, engasjement-tabell
- `/platform/mailchimp` — Dedikert Mailchimp deep dive: subject line-performance, mest klikkede lenker, abonnent-vekst, geografi
- `/platform/linkedin` — LinkedIn (placeholder via generisk [slug]-side — venter på Community Management API-godkjenning)

### Innleggsbygger (nye sider 20. april)
- `/innleggsbygger/sosiale` — Analyserer Meta-captions, identifiserer mønstre med lift% (spørsmål, emoji, CTA, lengde). Foreslår nye captions per tema + Native-prompts for Nano Banana 2 + organiske filming-ideer (reel/carousel/story/photo) med shot-lister
- `/innleggsbygger/nyhetsbrev` — Analyserer Mailchimp emne-linjer med lift% på åpningsrate. Foreslår nyhetsbrev-temaer basert på mest-klikkede lenker (hva abonnentene faktisk vil ha), med 4 emne-varianter + preheader + innholdsskisse per tema
- `/innleggsbygger/utm` — Sentralt register over alle UTM-linker (lagret i `utm_links`-tabellen). Hurtigmaler for FB/IG/LinkedIn/Mailchimp/Google Ads, skjema med live-forhåndsvisning, kopi-knapp per link, gruppering per `utm_campaign`, og krysskobling med `traffic_sources` for å vise sesjoner + konverteringer per kanal siste 30d. Forhindrer duplikate/inkonsistente kampanje-tags på tvers av poster.

### Brosjyre-editor (ny 27. april)
- `/brosjyre` — Fullskjerm WYSIWYG editor for kampanje-brosjyrer (PDF-eksport). Fixed inset-0 z-50 overlay som dekker dashbord-layouten. 3-panel UI: sidetre + bibliotek + property-panel. **12 objekt-typer** (productCard, priceBlock, badge, banner, gallery, contact, footer, text, image, shape, comboCard, **sigill** — FT 25-årsstempel, lagt til 11. mai), 9 ferdige statiske maler + **14 dynamiske maler** (lagt til 11. mai — 5 forsider + 8 produkt-/hero-/combo-sider + FT-bakside). Dynamiske maler tar EKSISTERENDE innhold (produkter, comboCards, tittel, hovedbilde, burst) og bygger ny layout uten å miste data. Brand-tokens system, undo/redo (60 nivåer), PDF-eksport via `modern-screenshot` + jspdf med auto-nedlasting + klikkbare PDF-lenker via jsPDF.link. Auto-save til localStorage. **Detaljer:** se egen seksjon nederst.

### Prisplakat-editor (ny 11. mai 2026)
- `/prisplakat` — Editor for A4-print-prisplakater og butikk-skjerm-slideshow. Felles produkt-velger + spilleliste-system. 5 formater: `a4_single` (1 produkt/ark), `a4_2up` (2/ark), `a4_4up` (4/ark, hyllekant), `slideshow_landscape` (16:9 butikk-TV), `slideshow_portrait` (9:16). Bruker samme FT-tokens og SVG-komponenter (NeonCard, PriceBurst, Eyebrow) som brosjyre-editoren. Ekte QR-koder via `qrcode`-npm-pakke med auto-UTM. «Importér fra brosjyre»-knapp henter alle produkter fra en eksisterende brosjyre.
- `/prisplakat/[id]/play` — Fullscreen slideshow med Fullscreen API, cross-fade transitions, Ken Burns på bilde, tastatursnarveier (pil venstre/høyre, space pause, ESC, F fullscreen). 4 atmosfæriske spesielle slides mellom produkter: intro (rød med 25-årslogo), credentials («Sertifisert leverandør til Forsvaret»), certified (sertifikat-merker), outro («Velkommen inn — Industrigata 1, Brekstad»).
- `/prisplakat/tmp/[id]/play` — Test-modus: åpner slideshow fra sessionStorage uten å lagre playlist.
- **Migrasjon 012_pricetag_playlists.sql** må kjøres i Supabase SQL editor før «Lagre» fungerer. Editor og preview fungerer uten lagring.

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
| `GET /api/google-ads/negatives` | Lister alle aktive negatives per kampanje + delte lister + hvilke kampanjer hver liste er applied på |

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

### Innleggsbygger og Mandagsmøte (nye 20. april)
| Rute | Funksjon |
|------|----------|
| `GET /api/innleggsbygger/sosiale?from=&to=&themes=` | Meta-caption-analyse: scorer poster på engagement rate (likes + 3×kommentarer + 5×delinger + klikk), finner mønstre med lift%, genererer forslag |
| `GET /api/innleggsbygger/nyhetsbrev?from=&to=` | Mailchimp emne-linje-analyse: mønstre i åpningsrate + topp-klikkede lenker som driver tema-forslag |
| `GET /api/utm-links` | Lister alle lagrede UTM-linker (filterbart på `?campaign=` og `?source=`) |
| `POST /api/utm-links` | Lagrer ny UTM-link. Body: `{label, base_url, utm_source, utm_medium, utm_campaign, utm_content?, utm_term?, notes?}`. Bygger `full_url` automatisk. |
| `DELETE /api/utm-links/[id]` | Sletter en UTM-link (RLS: kun eier) |
| `GET /api/utm-links/stats?days=30` | Krysskoble UTM-register med `traffic_sources` — sesjoner + konverteringer per (source, medium) siste N dager |
| `GET /api/linkedin/health` | Sjekker LinkedIn token + organisasjon + Community Management API-tilgang per scope |

### Mandagsmøte-utvidelser (27. april)
| Rute | Funksjon |
|------|----------|
| `GET /api/insights/weekly-validation?from=&to=` | Sammenligner Pmax brand-share, Brand Search-status og Bransjer-kampanjen siste 7d vs forrige 7d. Genererer auto-historikk-tekst per kampanje («Brand-andel falt fra 66,8% til 12,4% — brand exclusions virker»). Bruker på trafikklys-kort på `/mandagsmote`. |
| `GET /api/insights/conversions-week?from=&to=` | Aggregert konverterings-snapshot: kjøp + verdi + leads + ROAS siste 7d vs forrige 7d. Bruker `all_conversions_value` for ekte verdi. |
| `GET /api/insights/mailchimp-latest` | Siste Mailchimp-kampanje med åpningsrate vs snitt for siste 10, click rate, mest klikket lenke. |

### Brosjyre (ny 27. april)
| Rute | Funksjon |
|------|----------|
| `GET /api/brosjyre/image-proxy?url=` | Proxier eksterne bilder med CORS-headers. Whitelist: `mc10256fosentools.blob.core.windows.net`, `fosen-tools.no`. Brukes av PDF-eksport-pipelinen så modern-screenshot kan rendre bilder uten cross-origin-feil. |
| `GET /api/brosjyre/scrape-product?url=` | Scraper produktdata fra fosen-tools.no via JSON-LD Product/ProductGroup + `data-oldprice` + `.ProducerLogoImage` + `#description`. Returnerer ferdig `Product`-struct med navn, pris, før-pris, rabatt%, bilde, produsent-logo og bullets. Whitelist: `fosen-tools.no`, `www.fosen-tools.no`. 422 hvis JSON-LD mangler. Brukes av «Hent fra URL» i Bilder-tab. |
| `GET /api/brosjyre/list` | Lister brukerens lagrede brosjyrer (id, title, page_count, updated_at). RLS via `brochures.user_id`. |
| `POST /api/brosjyre/save` | Upsert av brosjyre. Body `{id?, title, doc}`. Uten `id` → ny rad; med `id` → oppdaterer eksisterende (kun egne via RLS). Returnerer `{id, updated_at}`. |
| `GET /api/brosjyre/[id]` | Henter full brosjyre (inkl. `doc` jsonb). 404 om ikke funnet/ikke eier. |
| `DELETE /api/brosjyre/[id]` | Sletter brosjyre. |
| `GET /api/brosjyre/suggest-products?days=60&limit=12` | Foreslår produkter for brosjyre-editoren. Primær kilde: GA4 page-views (`platform_posts`, vektet 2x). Sekundær: Mailchimp-klikk siste N dager (`mailchimp_campaign_links`). Aggregerer per produkt-key (`{slug}/{id}`) så samme produkt med/uten seo-suffix telles én gang. Score = `ga4_views * 2 + mailchimp_clicks`. Brukes av «Foreslåtte produkter» i Bilder-tab. |
| `POST /api/brosjyre/upload-asset` | FormData-upload av bilder til `brochure_assets`-bucket. Path: `{user_id}/{uuid}-{filename}`. Maks 10 MB, kun `image/*`. Returnerer `{id, name, storage_path, public_url}`. RLS sikrer at bruker eier sine egne filer. |
| `DELETE /api/brosjyre/upload-asset?path=` | Sletter et opplastet bilde. Path må starte med brukerens egen `user_id/` for å unngå tverrlinkede slett. |
| `GET /api/brosjyre/manufacturers` | Aggregerer produsent-slugs fra GA4 `platform_posts` + Mailchimp `mailchimp_campaign_links`. Returnerer `[{slug, label, page_count, ga4_views, mailchimp_clicks, combined_score}]` sortert på score (`ga4_views * 2 + mailchimp_clicks`). Brukes av «Generér produsent-brosjyre» i Dokument-tab. |
| `POST /api/brosjyre/generate-from-manufacturer` | Body `{slug, count, only_in_stock?}`. Henter top-N produkt-URLer for slug fra GA4 + Mailchimp, scraper i parallell (Promise.allSettled), bygger ferdig BrochureDoc med forside m/ produsent-logo + content-sider med 4-grid eller 6-grid + bakside m/ kontakt-info. **`only_in_stock`** (default true): filtrerer bort utsolgte produkter etter scraping (basert på JSON-LD `offers.availability` = "InStock"). Når på, scrapes en større pool (`count*3`, max 36) for å kompensere for filtrering. Returnerer `meta.out_of_stock_skipped` så UI kan vise advarsel. Bruker `scrapeProductByUrl` fra `src/lib/services/scrape-product.ts`. |

Note: Mandagsmøte-siden (`/mandagsmote`) henter data via SWR fra eksisterende `/api/insights/*` + `/api/anomalies` + `/api/attribution` + `/api/google-ads/analysis` — ingen dedikert API-rute

### Kundereise og Innsikt
| Rute | Funksjon |
|------|----------|
| `GET /api/customer-journey` | Sankey-data, funnel, kanal-assistanse, daglig tidslinje, KPI-er |
| `GET /api/insights/scoreboard` | Ukesrapport: per-plattform delta, Google Ads sammenligning, anomali-antall, highlights |
| `GET /api/insights/content-roi` | Posts med trafikkløft (3d etter vs 3d før publisering), ROI-scoring, summary |
| `GET /api/insights/geo` | Krysskoblet geo: GA4 + Mailchimp opens + estimerte konverteringer, vektet value_score |
| `GET /api/insights/seo` | SEO-muligheter klassifisert i 5 kategorier + posisjonsfordeling. Henter query+page fra Search Console direkte for side-URL per søkeord |
| `GET /api/insights/seo/analyze?url=&query=&position=` | On-demand HTML-analyse: fetcher side, ekstraherer title/meta/H1/H2/ord/bilder/lenker, scorer 0-100, gir konkrete anbefalinger. Dekoder HTML-entiteter korrekt. |
| `GET /api/insights/indexing?from=&to=` | Indekseringshelse: sitemap-fetch (håndterer både flat sitemap og sitemapindex), robots.txt, kannibalisering (samme query på flere URLer), zombies (rangerer uten å være i sitemap), begravde (pos > 30), legacy /categories/-URLer med alternative, parameter-URLer (?Filter=/?deviceSize=), orphans (i sitemap uten visninger). |
| `POST /api/insights/growth` | Vekstmuligheter: Keyword Planner-ideer + Search Console-rangering. Input `{seeds, from, to}`. Returnerer prioriterte søkeord med potensiell klikk/mnd. |
| `GET /api/insights/calendar` | Hendelses-tidslinje: posts + anomalier + auto-actions + syncs + daglige sesjoner |

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
| `post-builder` | `post-builder.ts` | Caption-scoring, mønster-deteksjon (spørsmål, CTA, emoji, lengde, hashtags, tall), Native-prompt-generering, organiske idé-maler, Mailchimp subject-line-mønstre. Ren mønster-basert — ingen LLM-kall |

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

## Google Ads — strategiske funn (per 20. april 2026)

### Kampanjestruktur (etter opprydding 20. april)
| Kampanje | Type | Klikk (90d) | Kostnad | Ekte kjøp | Kjøpsverdi | ROAS | Status |
|---|---|---:|---:|---:|---:|---:|---|
| Fosen Tools - General | Performance Max | 2003 | 9 801 NOK | 8 | 76 703 NOK | **7,83x** | Aktiv m/ brand exclusions |
| Produktkampanje - Bransjer | Search | 699 | 7 742 NOK | 0 (1 form_submit) | 0 NOK | 0x | Aktiv m/ negatives — under observasjon |
| Brand - Fosen Tools | Search (NY 20. april) | 0 | 0 NOK | — | — | — | Under Google-godkjenning |

### Bransjer-kampanjen handler faktisk om våpenskap
Til tross for navnet "Bransjer" går **98,5% av trafikken** til ad-group "Politi" (Våpenskap). Ingen ad-groups for elbil/offshore/bilverksted/luftfart fungerer reelt. Broad-match `Våpenskap` har brukt 5 802 NOK på 544 klikk uten én lead. Strategien fra Fyr (tidligere byrå) med `[våpenskap]` EXACT-negativ + broad-match er delvis riktig, men listen var ikke oppdatert med konkurrent- og forbruker-varianter — det er fikset nå.

### Pmax brand-kannibalisering
- **66,8% av Pmax-klikk** er pure brand-søk ("fosen tools" — 1124 klikk, 6 549 NOK)
- ~5–10% er konkurrent-brands (nå blokkert via delt liste)
- 18% er "(other)"-bucket (aggregerte småvolum-søk — fortsatt uløst blackbox)
- ~15–20% er ekte generiske søk
- **Brand exclusions slått på 20. april** — frigjør anslagsvis 6 500 kr/90d

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

## Vercel-deploy (på pause per 21. april 2026)

Vercel-prosjektet `fosen-tools-analytics` er **slettet** etter sikkerhetshendelse hos Vercel. Appen kjører kun lokalt via `npm run dev` inntil videre. `.vercel/`-mappen er fjernet fra repoet.

**Konsekvenser av pausen:**
- Ingen auto-deploy fra `main` — endringer vises kun lokalt
- Cron-jobber (sync) kjører ikke — må trigges manuelt via `POST /api/sync` når ønsket
- Signed URLs for Supabase Storage (weekly-reports) fungerer fortsatt lokalt

**Ved reaktivering senere:**
1. `vercel link` i prosjekt-roten
2. Re-importer alle env-variabler via `vercel env add` eller dashboard
3. Verifiser at alle secrets er roterte (spesielt `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_SECRET_KEY`, `META_ACCESS_TOKEN`, `MAILCHIMP_API_KEY`, `GOOGLE_ADS_REFRESH_TOKEN`)
4. Repoet må fortsatt være public på Hobby-plan

**Historikk:** Tidligere under `fosentoolsgits-projects` med auto-deploy fra `main`.

---

## Produsent-sider (fosen-tools.no) — SEO-template

Multicase-CMS-et tillater ikke å endre `<title>` eller `<meta description>` per side — alle produsent-sider får default template `{Merke} - Fosen Tools AS`. Vi løser det ved å injecte HTML-blokker + inline-script via webshop-admin.

**Pelicase er referanse-implementasjonen.** Alle andre produsenter skal bygges likt.

### Workflow når bruker ber om produsent-side

1. **Spør alltid først:** "Bilde- eller video-hero?" Vent på svar før du genererer.
2. Generer alle 5 blokker i rekkefølge (HERO → INTRO → KATEGORIGRID → FAQ → KONTAKT-CTA).
3. JSON-LD-script (Brand + BreadcrumbList + FAQPage) legges inn i HERO-scriptet.
4. Forklar avslutningsvis hvilke filer bruker må laste opp (banner/video/bilde).

### Sidetyper og meta-redigering

| Sidetype | Eksempler | Meta-tittel/beskrivelse | JSON-LD |
|---|---|---|---|
| **Produsent-side** (`pagetype-ProductListing`) | /pelicase, /stahlwille, /wera | **Kan IKKE redigeres** — må overskrives via script | Må injectes via script |
| **Custom-side** (`pagetype-Custom`) | /hdfi, /aviation, /bransjer/forsvaret | **Kan redigeres direkte** i Multicase-admin | Må fortsatt injectes via script |

**Regel:** Produsent-sider trenger FULL script (title + meta + OG + JSON-LD). Custom-sider trenger BARE JSON-LD-scriptet — bruker setter title/meta selv i CMS.

Når bruker ber om Custom-side (HDFI, Aviation, bransjer), gi kun JSON-LD-blokk med Product/Organization + BreadcrumbList + FAQPage.

### Blokker og plassering

| # | Område i Multicase | Blokk | Hva den gjør |
|---|---|---|---|
| 1 | SlideshowTop | HERO | Banner (bilde eller video) + H1 + script som overskriver title/meta/OG + JSON-LD |
| 2 | SlideshowTop | INTRO | `<section class="ftseo">` med "Om merket"-tekst (3 avsnitt, 200-300 ord) |
| 3 | SlideshowTop | KATEGORIGRID | Klikkbare filter-chips som preloder produktfilter |
| 4 | ProductListBottom | FAQ | `<section class="ftseo">` med 5 `<details>`-spørsmål |
| 5 | ProductListBottom | KONTAKT-CTA | Knapp + telefon + e-post |

### H1-struktur (kritisk for SEO)

**Regel:** `{Merke} — {hovedprodukt/kjennetegn} {årsangivelse/opprinnelse}`. Merkenavnet MÅ stå først siden det er hovednøkkelordet.

Eksempler:
- Pelicase — vanntette beskyttelseskasser
- Stahlwille — tyske momentnøkler og fastnøkler siden 1862
- Snap-on — amerikanske premium-verktøy med livstidsgaranti
- HDFI — skumminnlegg for verktøykontroll og FOD-sikring

### Klasser å bruke (matcher eksisterende CSS)

- `ft-hero-scaled` — banner-bilde-hero (statisk)
- `ft-hero--husqvarna` + `ft-frame` + `ratio-169` — video-hero (Husqvarna/HEUER-stil)
- `ftseo` + `ftseo-inner` — tekst-seksjoner (intro + FAQ)
- `ftseo-heading` — H2 i tekst-seksjoner
- `ftseo-faq` — FAQ-container
- `ft-catgrid ft-catgrid--text` — kategorigrid uten bilder (produsent-sider)
- `ft-catgrid` (uten `--text`) — kategorigrid med bilder (produktkategorier/Maskintilbehør-subnavigasjon)
- `ft-contact-cta`, `ft-contact-cta__inner`, `ft-contact-cta__btn`, `ft-contact-cta__meta`

**FAQ-struktur (matcher Pelicase eksakt):**
```html
<section class="ftseo">
<div class="ftseo-inner">
<h2 class="ftseo-heading">Ofte stilte sp&oslash;rsm&aring;l</h2>
<div class="ftseo-faq">
<details><summary>Sp&oslash;rsm&aring;lstekst? <span class="arrow">▶</span></summary>
<p class="faq-answer">Svartekst med <strong>uthevinger</strong> og konkrete fakta.</p>
</details>
</div>
</div>
</section>
```
- **Arrow-pil:** `<span class="arrow">▶</span>` MÅ inkluderes inline i `<summary>` — site-CSS-en legger ikke til pil automatisk
- **Svar-klasse:** bruk `<p class="faq-answer">` (ikke bare `<p>`) for riktig spacing og styling
- **HTML-entiteter:** bruk `&oslash;` (ø), `&aring;` (å), `&aelig;` (æ), `&mdash;` (—), `&nbsp;` (mellomrom som ikke brekker) i tekst — Multicase-konvensjon

**CTA-struktur (matcher Pelicase eksakt):**
```html
<section class="ft-contact-cta">
<div class="ft-contact-cta__inner"><a aria-label="Gå til kontakt oss" class="nav-btn explore icon-button btn-accent btn-large has-icon ft-contact-cta__btn" href="https://fosen-tools.no/kundesenter/kontakt-oss"><span>Kontakt oss</span> <svg aria-hidden="true" class="icon light" fill="none" height="24" viewbox="0 0 24 24" width="24"> <path d="M16.4133 6L15.5553 6.92298L19.6739 11.3473H2V12.6527H19.6739L15.5541 17.077L16.4145 18L22 12L16.4145 6H16.4133Z" fill="currentColor"></path> </svg> </a>
<div class="ft-contact-cta__meta"><a href="tel:+4772515120">+47 72 51 51 20</a> <span class="ft-contact-cta__sep">|</span> <a href="mailto:post@fosen-tools.no">post@fosen-tools.no</a></div>
</div>
</section>
```
- **Knapp-klasser:** full stack `nav-btn explore icon-button btn-accent btn-large has-icon ft-contact-cta__btn` (IKKE bare `ft-contact-cta__btn`)
- **Knapp-tekst:** wrap i `<span>Kontakt oss</span>` + inkluder SVG-pil etter spanen
- **Separator:** `<span class="ft-contact-cta__sep">|</span>` mellom tlf og e-post i meta-blokken

**To varianter av kategorigrid:**

*A) Med bilder (for produktkategori-navigasjon, f.eks. /produkter eller /produkter/maskintilbehør):*
```html
<section aria-label="..." class="ft-catgrid">
<ul class="ft-catgrid__list">
  <li class="ft-catgrid__cell"><a class="ft-catgrid__item" href="..."><img alt="..." loading="lazy" src="..." /><span class="ft-catgrid__label">...</span></a></li>
</ul>
</section>
```
Bilder ligger i `/userfiles/image/menuicons/` eller `/userfiles/image/Kategoribilder/{Kategori}/`.

*B) Uten bilder (for produsent-sider som Pelicase/Stahlwille/Wera) — matcher Wera eksakt:*
```html
<section aria-label="{Merke}-kategorier" class="ft-catgrid ft-catgrid--text">
<ul class="ft-catgrid__list">
  <li class="ft-catgrid__cell"><a class="ft-catgrid__item" href="/{merke-slug}" onclick="mcWeb.ajaxRenderEngine.addValueToQueryString(this,'24¤1','24¤1_{Verdi}'); return false;"><span class="ft-catgrid__label">{Label}</span> </a></li>
</ul>
</section>
```
Viktige detaljer:
- **Attribute-rekkefølge:** `aria-label` FØR `class` på `<section>`
- **`href="/{merke-slug}"`** — peker til produsent-siden (IKKE `href="#"`)
- **Full onclick-path:** `mcWeb.ajaxRenderEngine.addValueToQueryString(...)` — IKKE bare `addValueToQueryString(...)`
- **Avsluttende `; return false;`** i onclick (hindrer default link-nav)
- **Mellomrom før `</a>`** — ` </a>` (matcher Wera-formatering)

### Banner-filer

**Bilde (hero-type A):**
- Lagres i `/userfiles/image/Bannere/` eller `/userfiles/image/Bannere%20-%20Merkevarer/` (nyere konvensjon)
- Filnavn: `Banner {Merkenavn}.jpg` eller `{Merkenavn}-Banner.jpg` (mellomrom = `%20` i URL)
- Mål: 10000×2500 px

**Riktig HERO-struktur (matcher Hellberg/Pelicase eksakt):**
```html
<section class="ft-hero-scaled"><picture> <source srcset="/userfiles/image/Bannere/{Merke}.jpg" type="image/webp" /> <img alt="{Merke} banner" decoding="async" loading="eager" src="/userfiles/image/Bannere/{Merke}.jpg" style="width: 10000px; height: 2500px; " /> </picture>
<h1>{Merke} &mdash; {produkt/kjennetegn} siden {årstall}</h1>
</section>
```
- **IKKE** bruk `<div class="ft-hero-scaled" style="background-image:url(...)">` — den gamle måten med CSS-background-image er ikke riktig.
- Bruk alltid `<section>` + `<picture>` + `<source>` (for webp) + `<img>` (fallback) + `<h1>`.
- `decoding="async"` og `loading="eager"` for LCP-optimalisering.

**Video (hero-type B):**
- Lagres i `/userfiles/file/`
- Filnavn: `{Merke}-1.mp4`, `{Merke}-2.mp4` osv.
- Format: mp4, 16:9, autoplay + loop + muted + playsinline
- Ved flere videoer brukes slide-carousel (se HEUER som referanse)

### Script-blokk (i HERO)

Alltid inkluder:
1. `document.title` oppdatering
2. `meta[name="description"]`
3. `og:title`, `og:description`, `og:image`, `og:type`
4. `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
5. **JSON-LD: Brand + BreadcrumbList + FAQPage** (inkluderes i samme script)

### JSON-LD tre schemas

**Brand** — gir knowledge-panel-stil i SERP:
```json
{"@context":"https://schema.org","@type":"Brand","name":"{Merke}","description":"{meta-desc}","logo":"{banner-URL}","url":"https://fosen-tools.no/{slug}"}
```

**BreadcrumbList** — viser brødsmule direkte i SERP under tittel:
```json
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Fosen Tools","item":"https://fosen-tools.no/"},
  {"@type":"ListItem","position":2,"name":"{Merke}","item":"https://fosen-tools.no/{slug}"}
]}
```

**FAQPage** — kan gi store rich snippets med utvidbar FAQ under SERP-oppføring. Må matche HTML-FAQen eksakt:
```json
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {"@type":"Question","name":"{spørsmål 1}","acceptedAnswer":{"@type":"Answer","text":"{svar 1}"}}
]}
```

### Kategorigrid filter-syntaks

`addValueToQueryString(this,'{attribute_id}','{attribute_id}_{value}')` — attribute_id er ofte `24¤1` (Kategori). Verifiser faktiske filter-verdier ved å inspisere eksisterende side i venstre filter-kolonne. Alternativt kan CTA bruke `?Filter=24%C2%A41:24%C2%A41_{value}` direkte.

**Viktig encoding-regler for filter-verdier:**
- Norwegian bokstaver (æ, ø, å) brukes **direkte**, IKKE URL-encoded. Eksempel: `24¤1_Skrallenøkler` (ikke `24¤1_Skralleh%C3%B8kler`)
- Skråstrek (`/`) blir til `_47_`. Eksempel: `24¤1_VDE_47_1000V` = VDE / 1000V
- Mellomrom blir til `_` (underscore)
- Parentes, tall, bindestrek fungerer som normalt
- Verifiser alltid mot faktiske filter-lenker i venstre kolonne når du bygger en ny side

**Kategorigrid-labels:**
- IKKE inkluder produkt-antall i parentes (f.eks. skriv `Stavlykt` — IKKE `Stavlykt (11)`). Antall endrer seg når sortimentet endres og gir raskt utdatert innhold.
- Sorter celler etter produkt-antall (størst først), men vis bare kategorinavnet.

### Tone og språk per merkeopprinnelse

- **Tyske merker** (Wera, Knipex, Stahlwille, Gedore, Brockhaus Heuer): "tysk presisjon", DIN-sertifisering, produsert i hjemlandet, "siden 18xx"
- **Sveitsiske** (PB Swiss Tools, Lista AG): "sveitsisk håndverk", produksjon i Wasen/Erlinsbach
- **Amerikanske** (Snap-on, Leatherman): "livstidsgaranti", servicenettverk, premium-kvalitet
- **Japanske** (Mitutoyo): "presisjonsmåling", kalibreringssertifikat
- **Skandinaviske** (Viking Arm, Morakniv, Hellberg): opprinnelsesår, håndverkstradisjon
- **Egne merker** (Fosen Tools, Fosen Tools Custom, HDFI): 25 år, CADLAB, skreddersøm, Forsvaret-referanser, FOD-sikring, HDFI-integrasjon

### FAQ-mønstre (5 spørsmål pr side)

1. **Produktutvalg** — "Hvilken {serie/modell} skal jeg velge?"
2. **Kvalitet/sertifisering** — "Er de virkelig vanntette/kalibrerte/DIN-sertifiserte?"
3. **Bruksområde** — "Passer {merke} til {målgruppe}?" (gjerne luftfart/FOD/forsvar-vinkel)
4. **Sammenligning** — "Hva skiller {merke} fra {konkurrent}?"
5. **Garanti/service** — "Hvilken garanti har {merke}?"

Svarene (200-400 tegn) skal flette inn produktnumre + Fosen Tools-referanser (CADLAB, HDFI, Brekstad-lager).

### Tekst-regler for INTRO og FAQ

- **IKKE inkluder konkrete kategori-tellinger eller produkt-tall** i INTRO-tekst eller FAQ-svar (f.eks. "6 skrustikker", "17 trappestiger", "26 HEUER-artikler på lager"). Kategori-filteringen i Multicase er ikke alltid komplett — produkter kan mangle filter-tagging eller ligge på flere kategorier samtidig — så tallene blir feil eller endres uforutsigbart. Beskriv produktområdene generelt ("skrustikker i ulike størrelser", "et utvalg av sortimentet").
- **OK med tall i kategorigrid-labels?** Nei — kategorigrid skal også være uten produkt-antall i parentes (allerede dokumentert lenger oppe).
- **Modellnavn er OK** når de er stabile (f.eks. "Standard, Front Modular, Profi" for HEUER) — så lenge de ikke binder seg til antall.

### Status per 29. april 2026

- **Ferdig (full 5-blokk-struktur + JSON-LD):** Pelicase, Stahlwille (video-hero), Fosen Tools, Fosen Tools Custom, Wera, Leatherman, Mitutoyo (4-blokk, ingen kategorigrid), Ledlenser, Mora of Sweden (4-blokk, ingen kategorigrid), Hellberg (egen tilpasset struktur med produkt-carousels + FAQ + CTA + JSON-LD), Snap-on, FACOM (video-hero med 2-slide carousel), Knipex, PB Swiss Tools, **KC Tools, Gedore, Zarges, Brockhaus HEUER (video-hero), Milwaukee, Fluke, Rennsteig, Bahco, Gigant, Solid Gear (4-blokk, ingen kategorigrid), Viking Arm (4-blokk, ingen kategorigrid — kun 3 produkter), Lista AG (full 5-blokk, 26 produkter), Bondhus (4-blokk, ingen kategorigrid — 6 produkter), Hultafors (4-blokk, ingen kategorigrid — 28 produkter), Husqvarna (video-hero med 3-slide carousel + META + JSON-LD som separat blokk), Sumake (4-blokk, ingen kategorigrid — 76 produkter)** — sistnevnte 16 publisert 29. april, alle indeksering forespurt i GSC samme dag.
- **Custom-side ferdig med JSON-LD + FAQ (bruker setter meta selv):** HDFI — kjører på egen side-struktur (`ft-section`, `ft-wrap`) ikke produsent-template. Har fortsatt suggested H1-endring til "HDFI — verktøykontroll med gravert silhuett" som bruker kan vurdere.
- **Kun hero-blokk publisert (trenger fortsatt intro + kategorigrid + FAQ + CTA + JSON-LD):** (ingen — alle hero-only sider er nå komplette)
- **Anbefalt neste prioritet:** Alle hovedmerker er nå dekket. Naturlige neste arbeidsstrømmer: (1) unikifisere kannibaliserende underkategori-URLer — pipesett (3 duplikate URLer), deretter samme pattern på skraller/sekskant/tolvkant/forlengere/universalledd/overganger/unbrako/torx/holder/auto/koffert; (2) verifisere SEO-fall på `leatherman` (-20) og `pipesett` (-18) som har stått åpent siden 20. april; (3) rydde "merke-ukjent" (175 produkter uten merke-tagging).
- **Default-struktur:** 4-blokk (HERO + INTRO + FAQ + CTA + JSON-LD). Kategorigrid genereres KUN ved eksplisitt forespørsel — filter-verdiene må verifiseres manuelt mot Multicase venstre-kolonne, og brukeren vil ikke at dette gjøres uten bekreftelse.
- **Hoppes over som lav-prioritet:** Karlstad Redskap, Red Rooster (avklart 29. april).

### Stor SEO-dag 29. april 2026

**10 produsent-sider bygget på én dag:** KC Tools, Gedore, Zarges, Brockhaus HEUER, Milwaukee, Fluke, Rennsteig, Bahco, Gigant, Solid Gear. Alle har full 5-blokk-struktur (Solid Gear og Brockhaus HEUER med tilpasninger), og indeksering ble forespurt på alle via Google Search Console URL-inspeksjon.

**Tonal/strukturelle nyheter denne dagen:**
- KC Tools, Bahco: skandinavisk/svensk håndverkstradisjon med spesielt fokus på "oppfinneren" (Bahco = JP Johansson, 1892-skiftenøkkelen)
- Brockhaus HEUER: bevart eksisterende video-hero, lagt til separat META + JSON-LD-blokk
- Gigant: "Würth-gruppen"-tilknytning som trygghetssignal i INTRO
- Solid Gear: 4-blokk uten kategorigrid (samme mønster som Mitutoyo, Mora)
- Milwaukee: dypdykket i M12/M18/MX FUEL-økosystem som SEO-vinkel

### Stor SEO-økt 24.–25. april 2026

**9 produsent-sider bygget på 1,5 dager:** Leatherman, Mitutoyo, Ledlenser, Mora of Sweden, Hellberg, Snap-on, FACOM, Knipex, PB Swiss Tools.

**Mønstre etablert / låst inn i CLAUDE.md gjennom denne økten:**
- HERO-struktur: `<section class="ft-hero-scaled">` + `<picture>` + `<source>` + `<img>` + `<h1>` (IKKE div med background-image)
- FAQ-struktur: `<span class="arrow">▶</span>` inline i summary + `<p class="faq-answer">` for svar
- CTA-struktur: full klassestakk `nav-btn explore icon-button btn-accent btn-large has-icon ft-contact-cta__btn` + SVG-pil + `<span class="ft-contact-cta__sep">|</span>`
- Kategorigrid-struktur: `aria-label` FØR `class`, `href="/{merke-slug}"`, full onclick `mcWeb.ajaxRenderEngine.addValueToQueryString(...)`, avsluttes med `; return false;` + mellomrom før `</a>`
- Kategorigrid-labels: IKKE inkluder produkt-antall i parentes (utdateres raskt). Sorter etter produkt-antall (størst først), vis bare kategorinavn
- HTML-entiteter (`&oslash;`, `&aring;`, `&aelig;`, `&mdash;`, `&nbsp;`) i tekst — Multicase-konvensjon
- Banner-konvensjon nyere: `/userfiles/image/Bannere%20-%20Merkevarer/{Merke}-Banner.jpg` (ny sti) eller `/userfiles/image/Bannere/{Merke}.jpg` (gammel sti) — begge fungerer
- Tone per merkeopprinnelse fulgt: tysk = "DIN-sertifisert presisjon", sveitsisk = "håndinspeksjon Wasen", amerikansk = "livstidsgaranti", fransk = "The Art of Precision", skandinavisk = "håndverkstradisjon"

**Sitemap-funn (sendt til Multicase 24. april):** Alle 229 topp-nivå-paths (inkl. produsent-sider) mangler i sitemap.xml fordi de ligger under skjult avdeling. Multicase svarte 24. april: ingen self-service for sitemap, men 301-redirect-tilgang er tilgjengelig som self-service. Venter fortsatt på avklaring om UI-konsekvens ved å gjøre avdelingen synlig + aktivering av redirect-tilgang.

### Nye kategorier (22.–23. april)

- **Slangeklemmer** lagt til som **ny underkategori** under `/produkter/maskintilbehør/slangeklemmer`. 11 ABA DIN 3017 A4/W5-produkter som én master-variant med størrelses-varianter. Gruppenivå 3: `Skrueklemmer`. Kategorigrid for Maskintilbehør oppdatert med Slangeklemmer + Polering.
- **Polering** var allerede i menyen, men manglet i Maskintilbehør-kategorigrid — nå lagt til.
- Verifisert at Wera-filter-verdier bruker Norwegian-char direkte (`Skrallenøkler`) og `/` → `_47_` (`VDE_47_1000V`).

---

## Kategori-sider (`/produkter/*`) — levende catgrid

Alle kategori-sider på `/produkter/*` skal ha en **levende ft-catgrid** som dynamisk leser `.ProductMenu` og bygger kategori-grid med bilder. Lim inn dette scriptet som **én publisering** mellom INTRO-blokk og FAQ-blokk på hver kategori-side. Scriptet er **generisk** — funker både på toppnivå-katalogen (`/produkter`) og på alle under-kategorier (`/produkter/momentverktøy`, `/produkter/tenger` osv.) automatisk.

### To moduser

Scriptet velger modus dynamisk basert på menystrukturen:

**Modus A — Toppnivå (`/produkter`):** `.Level1Selected` mangler, så scriptet bygger fra alle `.Level1`-elementer (alle hovedkategorier). Bilder fra `/userfiles/image/menuicons/{slug}.png`.

**Modus B — Sub-kategori (`/produkter/{kategori}`):** `.Level1Selected` finnes, så scriptet bygger fra `.Level2`-søsken (under-kategoriene av valgt). Bilder fra `/userfiles/image/Kategoribilder/{Hovedkategori-label}/{slug}.png`.

### Hvordan det virker

1. Sjekker om `.Level1Selected` finnes i `.ProductMenu` for å avgjøre modus
2. Bygger items-liste (Level1 alle, eller Level2-søsken)
3. Bygger først tekst-catgrid via `innerHTML` (Multicase godkjenner `<span>`-elementer)
4. Injiserer deretter `<img>`-elementer via `document.createElement` og `insertBefore` (Multicase strikker `<img>`-attributter i raw HTML, men ikke det JavaScript gjør i etterkant)
5. `onerror` settes via JS-event-listener — hvis bildefil mangler, skjules `<img>`-elementet og kun tekst vises
6. MutationObserver + polling som fallback siden ProductMenu kan lastes via AJAX

### Bilde-konvensjoner

| Sidetype | Mappe | Eksempel |
|---|---|---|
| Toppnivå `/produkter` | `/userfiles/image/menuicons/` | `/userfiles/image/menuicons/tenger.png` |
| Sub-kategori `/produkter/{kategori}` | `/userfiles/image/Kategoribilder/{Hovedkategori}/` | `/userfiles/image/Kategoribilder/Momentverktøy/momentnøkkel.png` |

**Filnavn:** slug fra siste segment i href, lowercase med norske bokstaver bevart, `.png`-extension. Multicase er case-insensitive på filnavn (Windows IIS), men hold lowercase som konvensjon.

### Script (lim inn som publisering mellom INTRO og FAQ på hver kategori-side, inkludert `/produkter`-toppsiden)

```html
<section aria-label="Kategorier" class="ft-catgrid ft-catgrid--text">
<ul class="ft-catgrid__list" id="ft-auto-catgrid"></ul>
</section>
<script>
(function() {
  var built = false;
  function build() {
    if (built) return true;
    try {
      var menu = document.querySelector('.ProductMenu');
      var ul = document.getElementById('ft-auto-catgrid');
      if (!menu || !ul) return false;

      var items = [];
      var folder;
      var selected = menu.querySelector('.Level1Selected');

      if (selected) {
        // SUB-KATEGORI: viser Level2-søsken under Level1Selected
        var selA = selected.querySelector('a');
        if (!selA) return false;
        var parentLabel = selA.textContent.trim();
        folder = '/userfiles/image/Kategoribilder/' + encodeURIComponent(parentLabel);

        var sib = selected.nextElementSibling;
        while (sib) {
          if (sib.classList.contains('Level2')) {
            var a = sib.querySelector('a');
            if (a) {
              var href = a.getAttribute('href') || '';
              var slug = href.split('/').filter(Boolean).pop() || '';
              try { slug = decodeURIComponent(slug); } catch (e) {}
              items.push({ href: href, label: a.textContent.trim(), slug: slug });
            }
          } else if (sib.classList.contains('Level1') || sib.classList.contains('Level1Selected')) {
            break;
          }
          sib = sib.nextElementSibling;
        }
      } else {
        // TOPPNIVÅ (/produkter): viser alle Level1-elementer
        folder = '/userfiles/image/menuicons';
        var lis = menu.querySelectorAll('li');
        lis.forEach(function(li) {
          if (!li.classList.contains('Level1')) return;
          var a = li.querySelector('a');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var slug = href.split('/').filter(Boolean).pop() || '';
          try { slug = decodeURIComponent(slug); } catch (e) {}
          items.push({ href: href, label: a.textContent.trim(), slug: slug });
        });
      }

      if (items.length === 0) return false;

      ul.innerHTML = items.map(function(item) {
        return '<li class="ft-catgrid__cell"><a class="ft-catgrid__item" href="' + item.href + '"><span class="ft-catgrid__label">' + item.label + '</span></a></li>';
      }).join('');

      var cells = ul.querySelectorAll('.ft-catgrid__item');
      items.forEach(function(item, i) {
        var anchor = cells[i];
        if (!anchor) return;
        var img = document.createElement('img');
        img.alt = item.label;
        img.loading = 'lazy';
        img.style.maxWidth = '80px';
        img.style.maxHeight = '80px';
        img.style.display = 'block';
        img.style.margin = '0 auto 8px';
        img.onerror = function() { img.style.display = 'none'; };
        img.src = folder + '/' + encodeURIComponent(item.slug) + '.png';
        anchor.insertBefore(img, anchor.firstChild);
      });

      built = true;
      return true;
    } catch (e) {
      console.error('FT catgrid:', e);
      return false;
    }
  }

  if (build()) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  var n = 0;
  var poll = setInterval(function() { n++; if (build() || n >= 50) clearInterval(poll); }, 200);
  if (typeof MutationObserver !== 'undefined') {
    var obs = new MutationObserver(function() { if (build()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() { obs.disconnect(); }, 12000);
  }
})();
</script>
```

### Bekreftet fungerer på

- `/produkter/momentverktøy` (verifisert 7. mai 2026 — sub-kategori-modus, 4 underkategorier med bilder)
- `/produkter` (toppnivå-modus, 39 hovedkategorier — krever bilder lastet opp i `/userfiles/image/menuicons/`)

### Hvorfor DOM-API for bilder (ikke innerHTML)

Multicase strikker `<img>`-attributter (sannsynligvis XSS-beskyttelse) når raw HTML med `<img src=... onerror=...>` limes inn i publiseringsfelt. Hele cellen kollapser eller blir blank. Løsningen er å bygge tekst-cellene først via `innerHTML` (som Multicase godkjenner), så injisere `<img>`-elementer via `document.createElement` etter at DOM er klar — Multicase ser ikke disse fordi de er JS-genererte runtime, ikke i den lagrede publiseringen.

### Oppload av bilder

Last opp bilder via Multicase admin → Filhåndtering → `/userfiles/image/Kategoribilder/{Hovedkategori}/`. Multicase er case-insensitive på filnavn (Windows IIS), men hold lowercase som konvensjon. Hvis bildet for en underkategori mangler, vises kun tekst i den cellen — ikke ødelagt layout.

### Når URL endres på en underkategori

Hvis du endrer slug på en underkategori (f.eks. `momentnøkler` → `momentnøkkel`), trenger du å:
1. Bekreft alle 60+ redirects som Multicase auto-genererer for alle land-prefiks
2. Last opp ny bildefil med ny slug, eller omdøp eksisterende fil
3. Scriptet plukker automatisk opp ny slug fra menyen — ingen endring i scriptet

---

## Kjente begrensninger og ventende ting

### Venter på ekstern godkjenning
- **Google Ads Keyword Planner:** Developer token er "Explorer"-nivå. Søkt om Basic Access (15. april). `KeywordPlannerService` aktiveres automatisk når Google godkjenner — graceful degradation i mellomtiden.
- **LinkedIn:** Venter på Community Management API-godkjenning
- **Google Calendar:** Venter på Workspace admin-tilgang
- **Multicase — svar mottatt 29. april:**
  - **301-redirect-modul:** Automatisert via dialog når URL endres (f.eks. `/snap-on` → `/snapon`). Trinn: endre URL → dialog spør om redirect → bekreft → administreres via redirect-grensesnitt. Pris kun for modul, ingen ekstra config-tid. **Status: Trolig ikke aktivert ennå** — Kjetil beskrev funksjonaliteten, ikke at den er på. Verifiseres før URL-endrings-arbeid.
  - **CSS-klasse per menypunkt — løser sitemap-saken:** Hvert menypunkt kan få egen CSS-klasse i admin (Avansert → "Css klasse"). Egen CSS kan `display: none`-skjule punktet visuelt. **Siden forblir tilgjengelig på URL og inkluderes i sitemap.** Dette er "mellomtingen" vi spurte om — skjult i meny, synlig i sitemap. **Implikasjon:** Vi kan nå gjøre den skjulte avdelingen synlig (alle 229 topp-nivå-paths inkl. produsent-sider havner i sitemap) UTEN å påvirke meny-strukturen — hver enkelt side vi ikke vil ha i meny kan CSS-skjules individuelt.

### SEO-oppgaver å gjøre
- **Pipesett-kannibalisering — løst 29. april 2026:**
  - `/produkter/piper-og-skraller/pipesett` (primær — har allerede unik introtekst + meta, fortsatt aktiv)
  - `/produkter/verktøykoffert/pipesett` → **omdefinert som HDFI-landingsside** (29. april). Vinkling: Pipesett i koffert med skreddersydd HDFI fra CADLAB. Målgruppe: Forsvaret, aviation, offshore, kvalitetssystem-kunder (ISO 9001 / AS 9100). Brukeren legger inn HDFI-pipesett-produkter her over tid. INTRO + FAQ + inline JSON-LD + CTA generert med distinkt vinkling fra primær (CADLAB-skreddersøm + FOD-sikring + Fosen Tools-standarden hos Forsvaret). CTA-lenke til primær for brukere som vil ha generell pipesett.
  - `/produkter/verktøysett/koffert/pipesett` → **fjernet** (29. april). Var tom URL uten distinkt nisje-vinkling.
  - **Læring 1:** Sjekk alltid produktantall i Multicase-admin før unikifiserings-arbeid startes. Tom URL har 3 mulige behandlinger: (1) fjern URL helt, (2) skjul + noindex, (3) 301-redirect, (4) omdefiner som målrettet landingsside hvis Fosen Tools har en distinkt nisje-vinkling. HDFI er den åpenbare nisje-vinklingen for verktøyrelaterte URL-er siden CADLAB-produksjonen er konkurransefortrinn ingen andre forhandlere har.
  - **Læring 2:** Multicase HTML-rendererer kan strippe `document.createElement` JSON-LD — bruk **inline `<script type="application/ld+json">`** i stedet for IIFE-injection for landingssider. IIFE-script er fortsatt OK for produsent-sider der vi også overstyrer title/meta.
  - **Læring 3:** For sider der brukeren har CMS-tilgang til title/meta/URL (alle ikke-produsent-sider), trenger scriptet KUN JSON-LD — ikke title/meta/OG-overstyring.
  - Bakgrunn: Multicase støtter ikke canonical-tags, så omdefiner / unikifisering / skjuling / fjerning er de eneste SEO-verktøyene mot kannibalisering. Samme tilnærming rulles ut på `skraller`, `sekskant`, `tolvkant`, `forlengere`, `universalledd`, `overganger`, `unbrako`, `torx`, `holder`, `auto`, `koffert` (alle med 4-5 duplikate URLer — noen kan omdefineres til HDFI-spesifikke landingssider, andre fjernes/skjules).
- ~~**Sett opp 301-redirect `/snap-on → /snapon`**~~ **Fullført 6. mai** (lagt inn via Multicase URL Redirect-modul, verifisert live).
- **Rydde "merke-ukjent"** (175 produkter uten merke-tagging — Ridgid, Protekt, Schneider m.fl.).

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
10. **GA4 kan returnere duplikate rader** for samme dato (malformed date-dimensjoner) — sync-pipelinen dedupliserer på conflict-key før upsert i alle GA4-tabeller (analytics_metrics, platform_posts, search_keywords, geo_data, traffic_sources, ad_campaigns)
11. **Supabase PostgrestError er IKKE en Error-instans** — sync-utils error handler pakker ut `{message, details, hint, code}` for å gi meningsfulle feilmeldinger i stedet for "Unknown error"
12. **HTML-entiteter blåser opp tegn-tellinger** — SEO-analyzer dekoder `&#248;` (6 tegn) til `ø` (1 tegn) før lengde-validering
13. **Attribusjon-verdi er kun sporbar for Paid Search/Cross-network** — organiske kanaler (Direct, Organic Search, Email, Social) viser sesjoner + konverteringer men ingen verdi, fordi GA4 "conversions" inkluderer alle events (ikke bare kjøp)
14. **Multicase content-cloaking via User-Agent** — fosen-tools.no serverer JSON-LD KUN til crawlers (Googlebot UA), ikke til vanlige browsere. `curl -A "Mozilla/5.0"` returnerer 0 `application/ld+json` på alle sider, mens `curl -A "Googlebot/2.1"` returnerer 3-15 schemas. Dette er en feature, ikke en bug — vanlige brukere får slankere DOM, søkemotorer får full SEO-data. **Implikasjon for verifikasjon:** alle JSON-LD-verifikasjons-scripts MÅ bruke Googlebot User-Agent, ellers får man falske negative resultater. Bekreftet 30. april 2026 etter at en Mozilla-basert verifikasjon viste 0/47 sider og en Googlebot-basert verifikasjon viste 47/47 sider med korrekt schema.

---

## Fosen Tools — selskapskontekst (lest fra PDFer i `docs/produktinfo/`)

- **25 år i 2026** (etablert 2001), del av **familiekonsern siden 1926 = 100 år med verdiskaping**
- 4. generasjon aktiv, Gaselle-bedrift
- Adresse: Industrigata 1, **7130 Brekstad i Ørland kommune** (ikke Rissa)
- Sekundær lokasjon: Flatåsen, Trondheim
- Telefon: +47 72 51 51 20 · E-post: post@fosen-tools.no
- **"Fosen Tools standard"** referert av Forsvaret — sterkt B2B-signal
- Produkter: HDFI (High Density Foam Inserts, egen produksjon), FT Systemvegg, Weapon Storage (Politi/Forsvar/kriminalomsorg), verktøyvogner, pelicase, **mobilhotell**
- **Produkter vi IKKE fører:** FG-godkjente våpenskap. Søketermer som «FG-godkjent våpenskap», «godkjent våpenskap» o.l. er negative-kandidater i Google Ads, ikke kjøpeklare leads. Mobilhotell selger vi derimot — disse termene skal IKKE blokkeres.
- **40+ merker:** Wera, Knipex, Snap-on, Stahlwille, Rennsteig, Facom, Lista, PB Swiss Tools, Ullman, Sumake, Gedore, Brockhaus Heuer, Irega, KC Tools, OSCA, Opticase, Rivit, Vogel, Meclube, The Bone, Milwaukee, Hultafors, Emhart, Leatherman, Moraknif, Stanley, Gigant, Gühring, Solid Gear, LED Lenser, Snickers Workwear, Fluke, Bahco, Proto, Red Rooster, Karlstad Redskap, Brusletto, Bondhus, Husqvarna, Zarges
- Målgrupper: Forsvar, industri, bygg/anlegg, mekanisk verksted, maritim, flyindustri (aviation), beredskap, skoler, helse, politi
- Nettside-meny: PRODUKTER, BRANSJER, AVIATION, REFERANSER
- Bærekraft: 100% selvforsynt fornybar energi (solcellepark 2023), elektriske firmakjøretøy, Miljøfyrtårn-sertifisert, Grønt Punkt Norge, godkjent lærebedrift, 7,94 tonn CO₂-utslipp 2025
- Helikopterlandingsplass ved anlegget (18m diameter)
- Egen CADLAB (tegnings-/utviklingsavdeling)

---

## Brosjyre-editor (bygget 27. april 2026)

WYSIWYG kampanje-brosjyre-bygger på `/brosjyre`. Fullskjerm-overlay som dekker dashbord-chrome — tilbake-til-dashbord-knapp øverst venstre.

### Filstruktur
```
src/components/brosjyre/
├── types.ts            # PageObject (discriminated union), BrochureDoc, Product, BrandTokens
├── store.ts            # useEditorStore-hook, undo/redo (60), localStorage-persistens
├── object-renderer.tsx # Alle 10 objekt-renderere + InlineSvg + ProductImage
├── templates.ts        # 9 maler (forsider, grid-4, grid-6, hero, compare, bransje, bakside)
├── canvas.tsx          # WYSIWYG-canvas med drag/resize/snap/smart-guides
├── panels.tsx          # Venstre (sidetre/bibliotek/maler/assets) + høyre (egenskaper/brand/dokument)
├── editor.tsx          # App-shell, toolbar, snarveier, print-rendering
├── editor.css          # Scoped under .brosjyre-editor + Roboto/Roboto Mono/Playfair via @import
└── export-pdf.ts       # PDF-eksport via modern-screenshot + jsPDF
```

Routen: `src/app/(dashboard)/brosjyre/page.tsx` (bruker `dynamic` import med `ssr: false` siden editoren bruker DOM-API-er som FileReader/window.print/drag-drop).

### Datamodell
- `BrochureDoc { id, title, paper, tokens, pages[], assets[] }`
- `Page { id, paper, w, h, bg, objects[] }`
- `PageObject` er discriminated union på `type`-feltet (productCard, priceBlock, badge, text, banner, image, shape, contact, footer, gallery)
- `Product { source_url, name, manufacturer, manufacturer_logo_url, image_url, image_placeholder, price_before, price_now, discount_pct, in_stock, category, bullets[] }`
- `BrandTokens` — fargepalett + font-stacks + mva-sats. Brukes som CSS-vars (`--ft-red`, `--heading-stack`)

### LocalStorage-persistens
- Nøkkel: `ft-brosjyre-doc-v1`
- Auto-save på alle endringer (via useEffect på doc)
- Henter forrige sesjon ved sidelasting
- **Begrensning:** kun ÉN brosjyre lagret om gangen — overskrives ved hvert lagrings-event. Multi-doc save står på TODO-lista.

### Komponenter (objekt-typer)
| Type | Beskrivelse |
|---|---|
| productCard | 4 varianter: compact (60×70 mm, 6-grid), standard (90×110 mm), hero (180×240 mm fullside), compare (170×90 mm horisontal). Felter: bilde, navn, produsent-logo eller -tekst, pris-før, pris-nå, rabatt-burst, USP-bullets, lager-prikk |
| comboCard | **(NY 8. mai)** 140×100 mm — 2 produkter side-om-side med `+`-separator, header-badge (default «KOMBI-PRIS»), samlet pris-blokk nederst med auto-utregnet spar-stempel (sum av enkeltpriser − kombi-pris). Brukes for pakke-tilbud (f.eks. K1 PACE-sag + batteripakke = 10% pakkerabatt) |
| priceBlock | Selvstendig pris-blokk. **Single-span** rendring (hele "16 990,-" i én span samme størrelse) for å unngå baseline-mismatch i kanvas-rasterizing. Vertikal rød 4px-stripe + FØR-pris med `text-decoration: line-through` + Eks. mva + SPAR-pill. |
| badge | Burst-shape: star, circle, ribbon, diagonal, stamp. Star og ribbon rendres som **inline SVG polygon** (ikke clip-path) — html2canvas-arven støttet ikke clip-path. |
| text | h1-h5 + body presets, fluid sizing, color/weight/italic. |
| banner | Kampanje-banner: straight, diagonal, double. |
| image | Plain bilde. Støtter `tint: "white"\|"dark"\|null` for å gjøre logoer hvite på mørke bakgrunner via `filter: brightness(0) invert(1)`. SVG-bilder rendres inline via `InlineSvg`-komponenten (fetcher SVG-tekst, injiserer som DOM via `dangerouslySetInnerHTML`). |
| shape | Rect/circle/diamond med fill, stroke, radius. |
| contact | Fosen Tools-kontaktblokk med Miljøfyrtårn-toggle. |
| footer | Auto-sidetall. |
| gallery | 3-kol auto-fyll med kompakte produktkort. |

### Maler (9 stk i `templates.ts`)
- Forsider: cover-classic, cover-bold, cover-photo
- 6-grid produktside
- 4-grid produktside
- 2-grid sammenligning
- 1-produkt hero
- Bransje-spread (Forsvar, Aviation)
- Bakside m/ kontakt-CTA

### PDF-eksport — `modern-screenshot` + jsPDF
**KRITISK:** Vi bruker `modern-screenshot` (NOT html2canvas) som rendrer DOM via SVG `<foreignObject>`. Browseren rendrer alt med sin egen engine → tekst-baseline matcher editor-preview eksakt. html2canvas hadde dokumenterte baseline-bugs som drev all tekst nedover med ~1-3px (særlig med Roboto + tight letter-spacing).

Pipeline (`exportBrochureToPdf` i `export-pdf.ts`):
1. Vis print-root (`display: block`, `position: fixed`, `left: -100000px` så det er off-screen)
2. Bytt ut Azure-Blob-URL-er med proxy-URL-er (`/api/brosjyre/image-proxy?url=`) på alle `<img>` og `background-image`
3. Vent på `document.fonts.ready` + alle `<img>` (load events) + alle inline-SVG-er (`data-inline-svg="ready"`)
4. Force reflow + dobbel `requestAnimationFrame`
5. Per side: `domToCanvas(pageEl, { scale: 3, backgroundColor })` → multi-page jsPDF (A4, 3mm bleed via crop-marks-toggle)
6. `pdf.save("Fosen-Tools-Sommersalg-2026.pdf")` triggerer nedlasting til Downloads

Image-proxy (`/api/brosjyre/image-proxy/route.ts`): whitelistet til `mc10256fosentools.blob.core.windows.net` + `fosen-tools.no`. Setter `Access-Control-Allow-Origin: *` og 1h cache. Lar oss lese pixlene på canvas siden Azure Blob ikke setter CORS-headers selv.

### Branding-assets
| Fil | Bruk |
|---|---|
| `public/brosjyre/Fosen-Tools_white.svg` | Hvit wordmark, 11:1 aspekt. Ren SVG (2,7 kB). Brukes på forside (80×8 mm) og bakside (120×12 mm) av sommersalg-preset. Inline-rendert for skarp PDF-eksport. |
| `public/brosjyre/fosentools_logo_ny.png` | Original PNG-logo (transparent, mørk). Beholdt for kompatibilitet, brukes ikke i preset lenger. |
| `public/brosjyre/fosentools_logo_ny2.png` | Ny rød-boks PNG-logo (113 kB). Beholdt for evt. fremtidig bruk. |

### Sommersalg-preset (`public/brosjyre/presets/sommersalg-2026.json`)
Auto-generert ferdig brosjyre med 6 mest-klikkede produkter fra Mailchimp siste 60 dager + ekte priser scrapet fra fosen-tools.no. Klikkes inn fra Dokument-tab → "☀️ Sommersalg 2026 — 6 toppselgere".

5 sider:
1. Forside — orange + mørk bunn, "SOMMERSALG 2026" + "−44 %", FT-logo top-right
2. Topp-deal hero — Facom verktøyvogn 16 990 kr (42% rabatt)
3. 4-grid mest populært — Facom-koffert, Facom-vogn, Rivit-tang, Milwaukee-pistol
4. Sammenlign-side — Rennsteig-sentreringskjørner
5. Bakside — Industrigata 1 Brekstad + kontakt + FT-logo top-left

Tokens-overstyring: `red: #ff6b00`, `bgPage: #fff8f0` (sommer-orange-palett).

### Produkt-scraping (terminal-only foreløpig)
Python-script `/tmp/scrape_products.py` (ikke committet) plukker fra fosen-tools.no produktsider:
- JSON-LD `<script type="application/ld+json">` med `@type: "Product"` eller `"ProductGroup"` (brace-balansert ekstraksjon siden noen sider har JSON-LD inline utenfor script-tagger)
- `data-oldprice="..."` attribute fra DOM (HTML-decoded) for ekte før-pris
- `<img class="ProducerLogoImage" src="...">` for produsent-logo URL
- `<div class="product-description tab-pane active" id="description">` for bullets — splittes i setninger, filtreres for ALL-CAPS-tittel-fragmenter, dedup, max 4 punkter à 72 tegn
- Build-script `/tmp/build_brochure.py` bygger BrochureDoc JSON med riktig layout per side

**Neste steg (TODO):** port disse til en API-rute `/api/brosjyre/scrape-product?url=` så «Hent fra URL»-knappen i Bilder-tab faktisk virker.

### Kjente quirks (brosjyre)
- **html2canvas droppet** — brukte den i en time, viste seg å drive all tekst nedover. Erstattet med `modern-screenshot` som via SVG foreignObject lar nettleseren rendre alt nativt.
- **`foreignObjectRendering: true` i html2canvas direkte ga sort PDF** — fordi cross-origin Google Fonts CSS blir blokkert av browser-security i foreignObject. modern-screenshot inliner CSS-en internt så dette ikke er problem.
- **Inline SVG nødvendig** — eksterne `<img src=".svg">` rendrer upålitelig i kanvas-baserte løsninger. `InlineSvg`-komponent fetcher SVG-tekst og injiserer som DOM med `dangerouslySetInnerHTML`. Cache via `Map` så samme SVG ikke fetches flere ganger.
- **Pris i én span** — `formatNOK(priceNow)` (f.eks. "16 990,-") rendres i ÉN span samme fontstørrelse. Tidligere splittet i to spans (tall + ",-" smaller) ga baseline-issues i alle kanvas-baserte rendere.
- **CSS clip-path polygon** ikke pålitelig i kanvas → brukt SVG `<polygon>` for star + ribbon burst i stedet.
- **Roboto via @import** — Google Fonts cross-origin. Loader greit i editor men foreignObjectRendering (i html2canvas) blokkerer cross-origin CSS. modern-screenshot håndterer dette automatisk ved å hente og inline CSS-en.
- **Logo-tint** — `tint: "white"` bruker `filter: brightness(0) invert(1)`. Kun nyttig for mørke logoer på mørke bakgrunner. Vår nye Fosen Tools SVG er allerede hvit, så tint settes til `null` i preset.

---

## Prosjekt-tidslinje (10. april → 30. april 2026)

Kronologisk oversikt over hva som ble bygget når. Detaljerte sesjons-sammendrag for de største dagene følger under denne tabellen.

| Dato | Hovedaktivitet |
|---|---|
| 10. apr | Initial setup — Next.js 16 + Supabase + GA4 + Meta + verdenskart + custom date picker |
| 13. apr | Mailchimp-integrasjon, Search Console-keywords, GA4 table-fix, logo |
| 14. apr | Tag-system på tvers av søkeord/posts/kampanjer, søkeords-generator (Excel), smart sync-route, daglig sync-script, første Vercel-deploy |
| 15. apr | **Stor dag**: Google Ads direkte API (kampanjer + keywords + search terms + Pmax insights + conversions), anomali-varsling-system med 5 sjekker, Mailchimp utvidet (4 nye tabeller: links/locations/growth/daily), Instagram-stub, attribusjon-side, søkeords-intelligens med auto-apply negative keywords, ukentlige rapporter |
| 16. apr | Cross-platform kundereise (Sankey-diagram), Innsikt-seksjon med 4 strategiske sider (ukesrapport / innhold-roi / geo / budsjett), SEO-muligheter (5 kategorier), Kampanjekalender, SEO-analyse per side med HTML-fetch |
| 17. apr | SEO-analyse dekoder HTML-entiteter, dedup-fix i sync-pipeline |
| 19. apr | Vekstmuligheter-side med Keyword Planner-krysskobling, norsk språk-kode (1013) |
| 20. apr | **Stor opprydding**: Google Ads negative keywords + Pmax brand exclusions + ny Brand Search-kampanje (~6 500 kr/90d besparelse), sidebar omorganisering 18→12, `/mandagsmote`, `/innleggsbygger/sosiale`, `/innleggsbygger/nyhetsbrev`, LinkedIn health-sjekk, Google Ads negatives-oversikt, indekseringshelse-side |
| 21. apr | Vercel-pause etter sikkerhetshendelse hos Vercel — appen kjører kun lokalt fra dette punktet |
| 22.–23. apr | Slangeklemmer + Polering lagt til som nye produktkategorier |
| 24.–25. apr | **9 produsent-sider**: Leatherman, Mitutoyo, Ledlenser, Mora of Sweden, Hellberg, Snap-on, FACOM, Knipex, PB Swiss Tools — etablerer HERO/INTRO/FAQ/CTA-mønsteret |
| 27. apr | Mandagsmøte-utvidelser (3 nye API-er + 3 seksjoner med trafikklys-validering), brosjyre-editor v1 (10 objekt-typer, 9 maler, PDF via modern-screenshot), Sommersalg-preset med ekte produktdata |
| 28. apr | Brosjyre-editor produktiv ende-til-ende: live URL-import, multi-doc save (migrasjon `009`), foreslåtte produkter (GA4+Mailchimp), Storage-bucket (migrasjon `010`), produsent-mal med kampanje-forside, GA4 sync-grense 50→500 (4→49 produsenter med produktsider), anomali-threshold hevet for plattform-spikes |
| 29. apr | **Stor SEO-dag**: 6 nye produsent-sider (Viking Arm, Lista AG, Bondhus, Hultafors, Sumake, Husqvarna), pipesett-kannibalisering ryddet, 7 produsent-sider konvertert fra dynamisk til inline JSON-LD, `/manufacturers/`-kannibalisering identifisert som hoved-årsak til SEO-fall |
| 30. apr | **Stor data + SEO-dag**: GTM-migrering ferdig (48 entries → inline JSON-LD, **GTM-container fra ~80% → ~9%**), 4 strukturelle schema-fixer, JSON-LD verifisert 47/47 live (Multicase content-cloaking discovery), første påvirknings-analyse siden 10. april, datadrevet caption-mal lagret i memory, Pelicase 1535-Forsvaret-innlegg klart for publisering 1.-2. mai |
| 5. mai | **Mandags-økt — Google Ads opprydding**: Pmax brand-exclusions verifisert (klikk -73% w/w, men kost bare -8% pga budsjett-cap på 50 kr/dag — Google omfordeler til dyrere generisk trafikk, CPC tredoblet 3,7→12,7 kr); **Bransjer-kampanjen pauset** etter 0 kjøp på 90d/7 742 kr (audit-entry #1, re-evaluering 5. juni); **Brand Search-budsjett økt 30 → 50 kr/dag** (audit-entry #2, netto −26 kr/dag totalt); 2 META-varsler resolved som post-outlier-varians; GSC re-indekseringsliste generert (`docs/seo/gsc-reindex-list-2026-05-05.md`, 43 URLer prioritert i 4-dagers plan). Pelicase 1535-FB leverte 140 reach + 129 klikk 1. mai. |
| 6. mai | **Multicase redirect-modul aktivert** (Verktøy → URL redirect, 301/302-støtte + chain-cleanup, ingen wildcard). **107 redirects totalt lagt inn og verifisert live på én dag** for å løse system-bred kannibalisering identifisert 29. april. **Runde 1 (31):** 30 stk `/manufacturers/{slug}` → `/{slug}` for ferdige produsent-sider, + `/snap-on` → `/snapon` (var broken 302 til forsiden). **Runde 2 (76 → 74 live, 2 hoppet over):** Etter at brukeren delte ProductMenu-HTML (autoritativ liste over alle 53 merker), utvidet til 22 nye `/manufacturers/{slug}` for merker uten ferdig produsent-side (aok-by-kc-tools, apex-tools, boehm, bosch-tilbehør, brusletto, emhart-teknologies, geilo-verktøy, gühring, handi, karlstad-redskap, meclube, opticase, osca, red-rooster, scell-it, snickers, stanley-pmi, the-bone, ullman-devices, vogel-germany, völkel, zweibrüder), + 52 stk `/categories/{slug}` → `/{slug}` for alle merker (ScrewGrab er unntatt — bruker `/produsent/screw-grab` som primær). **Verifisert 6. mai: sitemap har 4689 URLer, alle produkt-URLer; ingen `/merkevare/*`, `/manufacturers/*` eller topp-nivå produsent-paths.** Sitemap-fix henger fortsatt på Multicase. **GSC re-indeksering:** Dag 1 (4 URLer fra Tier 1) ferdig 5. mai. Dag 2 (12 URLer): 9 ferdig 6. mai (kvote brukt opp); fosen-tools-custom, zarges, fluke flyttet til Dag 3 (7. mai). Arbeidslister generert som lokale HTML-filer i `/tmp/redirects-*` og `/tmp/gsc-dag*` med kopi-knapper og localStorage-progress (mønster fra 30. april). **Runde 3 (11):** 10 underkategori-aliaser (skraller, sekskant, tolvkant, forlengere, universalledd, overganger, holder, koffert, auto + test-rad) + spesialiserte filter-URLer for unbrako/torx → `/produkter/skrutrekkere?Filter=11¤1:11¤1_Sekskant`. **Møte med Trakk.ai 09:30 → besluttet å bygge selv:** SEO-innhold prompt-bygger bygget på 7 timer (URL-analyse + GSC-integrasjon + auto-konkurrent-finning via Serper.dev + UI med 3 steg). Siden brukeren bruker Claude Code lokalt (gratis), konvertert fra direkte API-call til prompt-bygger som brukeren limer inn til meg → JSON-svar med 6 separate publiserings-blokker (meta_title, meta_description, intro_block, faq_block, contact_cta_block, json_ld_script). Steg 3 i UI parser JSON og viser hver blokk med kopi-knapp + plassering-instruks. Bekreftet med "leatherman" og "momentverktøy"-tester. **PowerPoint til Erik (Åfjord Regnskap-presentasjon 7. mai):** 10 slides, fokus på "AI i hverdagen" + kostnadssammenligning (Fyr ~180k/år, Trakk 42k/år, brosjyre-design 5-10k/brosjyre, total estimert ~220k+/år besparelse). |
| 7. mai | **Levende ft-catgrid-system bygget** for alle `/produkter/*`-sider. Dynamisk JS-script som leser `.ProductMenu` i DOM, finner `Level1Selected` og bygger ft-catgrid med bilder. **Dual-mode:** toppnivå `/produkter` viser alle Level1 fra `/userfiles/image/menuicons/{slug}.png`, sub-kategori-sider viser Level2-søsken fra `/userfiles/image/Kategoribilder/{Hovedkategori}/{slug}.png`. **Multicase-strikking-quirk oppdaget:** `<img>`-attributter blir strikket fra raw HTML i publiseringsfelt (sannsynligvis XSS-beskyttelse) → løsning er å bygge tekst-celle først via `innerHTML`, deretter injisere `<img>`-elementer via `document.createElement` etter at DOM er klar. MutationObserver + polling som fallback siden ProductMenu kan lastes via AJAX. Verifisert virker på `/produkter/momentverktøy` (sub-modus, 4 underkategorier) og `/produkter` (toppnivå, 39 hovedkategorier). **URL-endring:** `/produkter/momentverktøy/momentnøkler` → `/produkter/momentverktøy/momentnøkkel` (entall, hører bedre til kategori-side med ett produkt-type) + 60+ land-prefiks-redirects bekreftet via Multicase' auto-redirect-modul. **SCSS for megameny oppdatert:** filnavn endret til URL-slug-konvensjon (`momentverktøy.png` ikke `moment.png`) så samme bilder kan brukes i både megameny og catgrid. **Identifisert 5 manglende CSS-klasser i megameny** (Arbeidsklær, Batterier, Verktøy for elbil, Verneutstyr, Tvinger) — må legges til via Avansert→Css klasse i Multicase admin. **Manglende ikoner:** `verktøy-elbil.png` og `verneutstyr1.png` ikke lastet opp (men `verktøy-for-elbil.png` finnes med feil navn). |
| 8. mai | **Stor dag — Pmax-fix, Vercel-reaktivering, brosjyre-features, kampanje-leveranser.** Detaljert sesjons-sammendrag nedenfor. Hovedpunkter: Pmax brand-exclusions diagnostisert + 4 negative keywords lagt inn (forventer 5-15% brand-andel mot dagens 66,7%); CenterContentArticleSearch-sonen på `/search` skjult via SCSS (rotnet med Wera→Zweibrüder-mismatch); CNC-terminologi-regel låst inn («CNC-maskinert», ikke «CNC-frest»); Skreddersydd-definisjon-innlegg + Kraftpipe-sett TESS VEST-innlegg publisert med UTM-tracking; **Vercel reaktivert** etter 3 ukers pause (Erik + Torstein lagt til som brukere, daglig auto-sync via cron kl 7 norsk, GitHub-repo recovered); ny **comboCard**-objekt-type i brosjyre-editoren; **Husqvarna Vårkampanje 2026** brosjyre bygget (8 sider, 36 produkter scrapet, kombi-pris på K1 PACE-pakke). |

---

## Siste sesjons-sammendrag (27. april 2026 — lang økt)

### Mandagsmøte-utvidelser
- 3 nye API-endepunkter: `/api/insights/weekly-validation`, `/api/insights/conversions-week`, `/api/insights/mailchimp-latest`
- 3 nye seksjoner på `/mandagsmote`:
  - **Konverteringer siste 7d** (etter hero) — kjøp, kjøpsverdi, ROAS, leads m/ uke-i-uke delta + kost-per-lead
  - **Validering av forrige uke** (etter trafikklys) — 3 kort med trafikklys-bordere for Pmax/Brand Search/Bransjer som auto-genererer historikk-tekst per kampanje («Brand-andel falt fra 66,8% til 12,4% — brand exclusions virker»)
  - **Mailchimp siste kampanje** (etter topp innlegg) — emnelinje, åpningsrate vs snitt, klikkrate, avmeldinger, mest klikket lenke
- **Preview-lenker på topp innlegg** — `ExternalLink`-ikon ved siden av hvert innlegg, åpner Facebook-permalink/Mailchimp-rapport i ny fane
- Også lagt til `post_url` på `/api/insights/content-roi` så lenkene faktisk virker

### Negative søkeord-arbeid
- **Lagt til på Bransjer-kampanjen (kampanje-nivå PHRASE):** `fg godkjent våpenskap`, `godkjent våpenskap` (FG-godkjent fører vi ikke), `raufoss premium 16`, `psso våpenskap`, `osjord våpenskap`
- **Lagt til på delt liste «Konkurrent-brands» (PHRASE):** `www dewalt no`
- **4 stale anomalier resolved** via Supabase REST PATCH (idg tools, luna tools, kz tools, festool norge — alle allerede i delt liste fra forrige uke)
- Brand Search-kampanjen `Brand - Fosen Tools` har fått første klikk

### CLAUDE.md-oppdatering
- Lagt til linje under "selskapskontekst": **"Vi fører IKKE FG-godkjente våpenskap, men VI fører mobilhotell."** Sikrer at fremtidige analyse-økter ikke blokkerer mobilhotell som irrelevant og ikke ignorerer FG-godkjent som negativ-kandidat.

### Brosjyre-editor — full migrering fra Claude Design
- Bygget Claude Design-output (~2 450 linjer JSX) til Next.js TypeScript modul (`src/components/brosjyre/`)
- Konvertert fra `window.X = ...` globals til ES modules
- Type-annotert hele dokument-modellen (discriminated union for PageObject)
- Plassert som fullscreen-overlay på `/brosjyre`
- Lagt til sidebar-link under "Innhold"-seksjonen
- localStorage auto-save (key: `ft-brosjyre-doc-v1`)
- 9 maler + 10 objekt-typer + brand-tokens + 4 sesong-paletter

### Sommersalg-preset
- Scrapet 6 mest-klikkede produkter fra fosen-tools.no via JSON-LD ProductGroup
- Henter ekte før-pris fra `data-oldprice` HTML-attribute
- Henter produsent-logoer fra `<img class="ProducerLogoImage">`
- Henter produktbeskrivelse fra `<div class="product-description">` → splittes til bullets
- Bygget 5-siders preset med sommer-orange palette (`#ff6b00`)
- Klikkbart fra Dokument-tab i editor-en

### PDF-eksport-iterasjon
- Startet med `window.print()` → byttet til `html2canvas + jsPDF` for auto-nedlasting
- Image proxy (`/api/brosjyre/image-proxy`) for CORS-safe Azure Blob-bilder
- `text-shadow` fjernet (html2canvas-uvennlig)
- Roboto-fonter lastet via `@import` i editor.css + `document.fonts.ready` await før kanvas-rasterisering
- `clip-path` polygons konvertert til SVG `<polygon>` for star + ribbon burst
- `<img>` baserte SVG erstattet med inline SVG via `InlineSvg`-komponent (fetcher + injiserer som DOM)
- Pris-blokk skrevet om for kompakt block-layout uten flexbox/gap (de hadde dokumenterte issues i kanvas-rendering)
- Pris i ÉN span samme størrelse for å unngå baseline-shift mellom mixed-size inline elements
- Forsøkt `foreignObjectRendering: true` i html2canvas — gjorde hele PDF sort pga cross-origin Google Fonts blokkert
- **Endelig løsning: byttet til `modern-screenshot`** — bruker SVG foreignObject internt + inliner CSS automatisk → tekst-baseline matcher editor-preview eksakt

### Tomorrow's TODO (28. april+)
1. ~~**Live URL-import**~~ **Fullført 28. april.** `/api/brosjyre/scrape-product?url=` parser JSON-LD Product/ProductGroup + `data-oldprice` + `.ProducerLogoImage` + `#description` → returnerer ferdig `Product`-struct. AssetsTab har funksjonell input + preview-kort (draggable + «Sett inn på siden»-knapp).
2. ~~**Multi-document save**~~ **Fullført 28. april.** Migrasjon `009_brochures.sql` (RLS owner-only + auto `updated_at`-trigger). 4 API-ruter (`list`, `save`, `[id]` GET/DELETE). Editor-store har `currentBrochureId`, debounced auto-save (4s), «Lagre»+«Ny»-knapper i toolbar med save-status-indikator, og «Mine brosjyrer»-liste i Dokument-tab med last-inn/slett-handlinger. **Krever:** kjøre migrasjonen i Supabase SQL editor før funksjonen virker — appen vil få 500/RLS-feil til tabellen er opprettet.
3. ~~**Auto-foreslå produkter fra dataene**~~ **Fullført 28. april.** `/api/brosjyre/suggest-products?days=60&limit=12` rangerer på faktiske side-besøk fra GA4 (`platform_posts`, vektet 2x) + Mailchimp-klikk siste N dager. Aggregerer per produkt-key (`{slug}/{id}`) så samme URL med/uten seo-suffix telles én gang. Score = `ga4_views * 2 + mailchimp_clicks`. AssetsTab har «Foreslåtte produkter»-seksjon med Hent-knapp og «+ Sett inn»-knapp per forslag (scraper + legger på canvas). Tidligere versjon brukte kun Mailchimp-klikk og foreslo bare produkter sendt i nyhetsbrev — byttet 28. april etter brukerens påpekning av at det skulle være faktiske topp-besøkte sider.

### Neste TODO
1. ~~**brochure_assets Storage-bucket**~~ **Fullført 28. april.** Privat bucket via migrasjon `010_brochure_assets.sql` med path-basert RLS. `POST /api/brosjyre/upload-asset` håndterer FormData-upload (10 MB-grense, kun `image/*`). `Asset`-typen utvidet med `storage_path` + `public_url` (legacy `dataUrl` beholdt). AssetsTab-upload bytter fra FileReader til API-call. Image-proxy + export-pdf-whitelist utvidet med Supabase-host så PDF-eksport rendrer Storage-bilder.
2. ~~**Produsent-brosjyremaler**~~ **Fullført 28. april.** `GET /api/brosjyre/manufacturers` aggregerer per-merke fra GA4 `platform_posts` (vektet 2x) + Mailchimp `mailchimp_campaign_links`. `POST /api/brosjyre/generate-from-manufacturer` tar `{slug, count, only_in_stock?}`, scraper top-N produkter parallelt og bygger ferdig BrochureDoc med kampanje-forside + 4-grid/6-grid content-sider + bakside. DocumentTab har dropdown + antall-input + «Kun lagerførte produkter»-checkbox + Generér-knapp. Scrape-logikken ligger som delt service `src/lib/services/scrape-product.ts`. **Lager-filter:** Når på (default) scrapes en større pool (count*3, max 36), filtrerer ut produkter der `in_stock !== true` basert på JSON-LD `offers.availability`. Returnerer `meta.out_of_stock_skipped` så UI viser advarsel hvis flere enn ønsket var utsolgt. **Kampanje-forside (28. april):** rød full-bleed bakgrunn, hvit «MEST KJØPT FRA»-overskrift, hvit logo-card sentralt (håndterer alle merkelogo-farger), gul KAMPANJE-burst rotert -12°, auto-generert periode (`KAMPANJE APRIL – MAI 2026`), stort telefonnummer som CTA, mørkt blått kontakt-bånd nederst. Brukeren skal slippe å redigere forsiden manuelt — kjenner igjen seg selv på tvers av produsenter.
3. **Verifiser SEO-fall** på `leatherman` (-20 plasser) og `pipesett` (-18 plasser) — fortsatt åpent fra 20. april-økten.
4. ~~**Øk GA4 toppost-sync-grense**~~ **Fullført 28. april.** Sync-grensen for `platform_posts` er nå **platform-spesifikk** i [sync-utils.ts:101](src/app/api/sync/sync-utils.ts#L101): GA4 = 500, Meta/Mailchimp = 50. Etter første re-sync: 49 produsenter med produktsider (var 4), inkl. Milwaukee 41p, Fosen-Tools-Custom 29p, Snap-on 19p, Facom 15p, PB Swiss Tools 15p, Wera 8p, KC Tools 7p, Knipex 3p, Bahco 4p, Hultafors 3p, Husqvarna 3p, Pelicase 2p, Leatherman 1p osv. Produsent-malen funker nå for nesten alle hovedmerker.
5. **Sharing av brosjyrer mellom brukere** — i dag er `brochures.user_id` owner-only via RLS. For å dele med kollegaer: legg til `shared_with`-array eller egne `brochure_shares`-tabell + signed URLs.

### Verifiser at Vercel-pause er fortsatt OK
Per CLAUDE.md status: prosjektet er slettet fra Vercel etter sikkerhetshendelse 21. april. Kjører kun lokalt. Crons (sync) trigges manuelt via `POST /api/sync` med Bearer token. Brosjyre-editoren krever ingen ekstern infrastruktur (alt klient-side + image-proxy som API-rute).

---

## Siste sesjons-sammendrag (28. april 2026 — lang økt)

Tema: gjøre brosjyre-editoren produktiv ende-til-ende. Alle TODO-er fra 27. april + de fra «Neste TODO»-lista landet, pluss bruker-drevet polering.

### Bygget i kronologisk rekkefølge
1. **Live URL-import** (`/api/brosjyre/scrape-product`) + AssetsTab «Hent fra URL» med preview-kort
2. **Multi-document save** — migrasjon `009_brochures.sql` + 4 ruter (`list`, `save`, `[id]` GET/DELETE) + store-integrasjon med `currentBrochureId`, debounced auto-save (4s), «Lagre»+«Ny»-knapper, og «Mine brosjyrer»-liste i Dokument-tab
3. **Foreslåtte produkter** (`/api/brosjyre/suggest-products`) — først Mailchimp-only, byttet til GA4 + Mailchimp etter bruker-tilbakemelding om at lista måtte være topp-besøkte sider, ikke topp-klikkede nyhetsbrev-lenker
4. **Storage-bucket** `brochure_assets` (migrasjon `010_brochure_assets.sql`) + `POST /api/brosjyre/upload-asset` — opplastede bilder ligger nå i Supabase Storage i stedet for som base64 i jsonb. `Asset`-typen utvidet med `storage_path` + `public_url`, image-proxy + export-pdf-whitelist utvidet med Supabase-host
5. **Produsent-brosjyremal** — `/api/brosjyre/manufacturers` (aggregering per slug fra GA4 + Mailchimp) + `/api/brosjyre/generate-from-manufacturer` som bygger ferdig BrochureDoc. Scrape-logikken refaktorert ut til `src/lib/services/scrape-product.ts` så generate-ruten kan importere `scrapeProductByUrl()` direkte og kjøre `Promise.allSettled`
6. **GA4 sync-grense økt** fra 50 → 500 toppost (platform-spesifikk i [sync-utils.ts:101](src/app/api/sync/sync-utils.ts#L101)). Etter første re-sync: 4 produsenter med produktsider → **49 produsenter** (Milwaukee 41p, Snap-on 19p, Facom 15p, PB Swiss Tools 15p, Wera 8p, KC Tools 7p, etc.)
7. **«Kun lagerførte produkter»-filter** på generate-from-manufacturer + checkbox i DocumentTab. Filtrerer på JSON-LD `offers.availability` etter scraping. Større scrape-pool (`count*3`, max 36) når på. Verifisert: 11/15 Milwaukee på lager, 4 utsolgt — den GA4-toppen (muttertrekker M12, 129 views) er faktisk utsolgt så filteret er svært nyttig
8. **Kampanje-forside redesign** — rød full-bleed, «MEST KJØPT FRA», hvit logo-card, gul KAMPANJE-burst, auto-periode (`KAMPANJE APRIL – MAI 2026`), prominent telefonnummer som CTA. Skal kjenne seg igjen på tvers av produsenter uten manuell redigering

### Migrasjoner som er kjørt
- `009_brochures.sql` — `brochures`-tabell + RLS owner-only + auto `updated_at`-trigger (verifisert via Node-script som testet insert/update/delete + trigger)
- `010_brochure_assets.sql` — Storage-bucket `brochure_assets` + 4 RLS-policies (insert/select/update/delete) basert på `auth.uid()::text = (storage.foldername(name))[1]`

### Verifisering
- TypeScript + ESLint: rene på alle nye/endrede filer
- Alle nye endepunkter mounter (returnerer 401 uten auth)
- Suggest-products mot ekte data: nye topp 12 dominert av Milwaukee muttertrekker (129 views), Facom verktøykoffert (56 views + 22 klikk), Fosen-Tools-Custom verktøyvogner — Mailchimp-only Facom-URLer faller til bunnen siden 0 GA4-views
- Brochures-tabellen ende-til-ende verifisert med eksplisitt insert/update/delete-test
- Kampanje-forside visuelt verifisert i Chrome — Wera-eksempel med grønn logo på hvit card mot rød bakgrunn, KAMPANJE-burst, auto-periode, alt rendrer korrekt

### Siste sesjon — kjente begrensninger
- GA4-sync må trigges manuelt for å oppdatere produsent-listen med flere produktsider (`POST /api/sync/ga4` med Bearer token). Cronen er pauset siden Vercel-pausen 21. april
- Storage-uploads krever at migrasjon `010_brochure_assets.sql` er kjørt før «+ Last opp bilder»-knappen virker — gir 500-feil ellers
- Multi-doc save krever migrasjon `009_brochures.sql`
- `merke-ukjent`, `spesial`, `bag`, `skrape` osv. dukker opp i produsent-lista fra GA4 — disse er false positives fra path-pattern. Kan fjernes med utvidet stoplist senere

### Mandag 5. mai (sjekkliste fra forrige uke)
- Brand Search-kampanjen `Brand - Fosen Tools` — godkjent? Klikk?
- Pmax `brand_share_pct` falt fra 66,8%? (target: 5–15% etter brand exclusions)
- LinkedIn Community Management API — godkjenning?
- SEO-fall på `leatherman` (-20) og `pipesett` (-18) — **diagnose ferdig 29. april (se nedenfor)**

---

## Siste sesjons-sammendrag (29. april 2026 — lang økt)

### Bygget i kronologisk rekkefølge
1. **5 nye produsent-sider:** Viking Arm, Lista AG, Bondhus, Hultafors, Sumake — alle med 4-blokk-struktur (HERO + INTRO + FAQ + CTA + JSON-LD), ingen kategorigrid (per regel etablert denne dagen). Alle laget mens brukeren la inn banner-bilder parallelt.
2. **Husqvarna produsent-side** — bygget rundt brukerens eksisterende video-hero (3-slide carousel: Diamantblader → K1 PACE → PACE batterisystem). Lagt til separat META + JSON-LD-blokk + INTRO + FAQ + CTA. Mønster: bevart eksisterende video-hero, lagt til alt annet rundt.
3. **Pipesett-kannibalisering ryddet:** primær (`/produkter/piper-og-skraller/pipesett`) hadde allerede unik introtekst. URL 2 (`/produkter/verktøykoffert/pipesett`) omdefinert som **HDFI-landingsside** med distinkt vinkling (CADLAB-skreddersøm, FOD-sikring, Forsvaret-bruk). URL 3 (`/produkter/verktøysett/koffert/pipesett`) **fjernet** — var tom uten distinkt vinkling.
4. **Pipesett-primær fikk inline JSON-LD** — `/produkter/piper-og-skraller/pipesett` hadde 0 JSON-LD; lagt til BreadcrumbList + FAQPage som inline `<script type="application/ld+json">`-tags som matcher 1:1 med synlig FAQ på siden.
5. **Konvertert 7 produsent-sider fra dynamisk til inline JSON-LD:** Leatherman, Viking Arm, Lista AG, Bondhus, Hultafors, Husqvarna, Sumake. Tittel/meta-overstyring beholdt som JS-script (nødvendig på produsent-sider), men JSON-LD flyttet ut til inline `<script type="application/ld+json">`. Mer pålitelig for Googlebot enn `document.createElement`-injection.

### SEO-fall-diagnose (29. april) — leatherman og pipesett
**Smoking gun: `/manufacturers/{merke}` system-bred kannibalisering.** Multicase eksponerer en automatisk URL-tvilling for ALLE produsenter:
- /manufacturers/leatherman, /manufacturers/wera, /manufacturers/hellberg (32 imps april!), /manufacturers/milwaukee, /manufacturers/zarges, /manufacturers/bahco, m.fl. — minst 15+ /manufacturers/* URLer er indeksert i april 2026.
- Hver av dem har default-tittel ("Leatherman - Fosen Tools AS"), default-meta ("Leatherman"), og **canonical pekende til seg selv** (ikke til primær /{merke}).
- Resultat: Google ser to nesten-identiske produsent-sider per merke → splitter SEO-autoritet → posisjonsfall.

**Faktiske tall fra Google Search Console (april 2026):**
- /leatherman: pos **18.9**, 70 visninger, **0 klikk** (fall fra ~pos 8 i mid-mars = ~10 plassers fall)
- /produkter/piper-og-skraller/pipesett: pos **13.6**, 441 visninger, **0 klikk** (fall fra ~pos 10.8 = ~3 plassers fall)
- CLAUDE.md hadde dokumentert -20 og -18 — faktiske tall var ~-10 og ~-3 (deler av "fallet" var noisy data).

**Spørsmål sendt til Multicase 29. april:**
1. Aktivering av 301-redirect-modul (priset)
2. Sitemap-fix: kan brukeren selv aktivere produsent-sider i admin?
3. /manufacturers/-kannibalisering: støtter redirect-modulen wildcard-regler (`/manufacturers/(.*) → /$1`), eller kan canonical-tag settes system-bredt?

### Multicase-svar mottatt 29. april
- **CSS-klasse per menypunkt:** Hvert menypunkt kan få egen CSS-klasse (Avansert → "Css klasse"-felt). Egen CSS kan `display: none`-skjule punktet, mens siden forblir aksesserbar og **inkluderes i sitemap**. Dette er "mellomtingen" vi ville ha — skjult i meny, synlig i sitemap.
- **301-redirect-modul:** Beskrivelse mottatt — automatisert dialog ved URL-endring, kun modul-pris, ingen ekstra config-tid. Status: trolig ikke aktivert ennå. Erik (FT) godkjente å kjøre på "om det betaler seg selv".
- **Pågående:** wildcard-spørsmål for /manufacturers/-redirects + selv-aktivering av produsent-sider i admin.

### Memory-regler etablert 29. april (lagret i memory/)
1. **Ikke generér kategorigrid uten å spørre** — produsent-sider default til 4-blokk; kategorigrid kun ved eksplisitt forespørsel. Filter-verdier i Multicase må verifiseres manuelt.
2. **INTRO uten Fosen Tools-paragraf** — produsent-sider INTRO stopper etter 2 paragrafer; ikke "Hos Fosen Tools fører vi..."-avslutning. Aldri `\u00xx`-escape i HTML-body.
3. **Sjekk produktantall før URL-unikifisering** — tomme URLer skal skjules/fjernes/omdefineres som landingsside, ikke unikifiseres med generisk innhold.
4. **Hopp over title/meta-script når brukeren kan redigere selv** — kun JSON-LD i script for ikke-produsent-sider; brukeren setter title/meta/URL i CMS direkte.
5. **HDFI-terminologi** — referer alltid til Fosen Tools' HDFI som "HDFI" alene; ikke "HDFI-skuminnlegg" eller "HDFI-skum".

### Første gjøremål 30. april
1. **Konvertere resterende 23 produsent-sider** fra dynamisk til inline JSON-LD: Pelicase, Stahlwille, Fosen Tools, Fosen Tools Custom, Wera, Mitutoyo, Ledlenser, Mora of Sweden, Hellberg, Snap-on, FACOM, Knipex, PB Swiss Tools, KC Tools, Gedore, Zarges, Brockhaus HEUER, Milwaukee, Fluke, Rennsteig, Bahco, Gigant, Solid Gear. Brukeren limer eksisterende script i chat → konverterer til drop-in.
2. Følge opp Multicase-svar på (a) selv-aktivering av produsent-sider, (b) wildcard-redirect-støtte for `/manufacturers/`, (c) modul-pris-bekreftelse.
3. Når Multicase-svar mottatt: implementere sitemap-fix (CSS-klasse-trick + gjøre skjult avdeling synlig).
4. Etterpå: be om re-indeksering i GSC for /leatherman og pipesett-primær (og resten av sidene som ble JSON-LD-konvertert) når GSC URL-inspect-quote er oppe igjen.

### Verifisering
- /leatherman publisert med inline JSON-LD: brukeren skal teste i [Google Rich Results Test](https://search.google.com/test/rich-results) — forventer 3 typer godkjent (Brand, Breadcrumbs, FAQs).
- Etter 1-2 uker: sjekk i GSC at /leatherman har gjenvunnet SEO-autoritet (mål: pos < 10 igjen).

---

## Siste sesjons-sammendrag (20. april 2026 — lang økt)

### Nylig bygget
- **`/mandagsmote`-siden** — ny hovedside for ukentlig møte. Aggregerer 8 API-er i parallell via `use-mandagsmote`-hook. Hero-KPI siste 7d, trafikklys per plattform 14d, auto-generert handlingsliste, aktive varsler med konkurrent-søk-chips, topp innlegg, SEO stigere/fallere, vekstmuligheter, quick-lenker. Har Oppdater + Skriv ut-knapp for møte-bruk. Plassert øverst i sidebaren som daglig-item.
- **`/innleggsbygger/sosiale` + `/innleggsbygger/nyhetsbrev`** — to bygger-sider med mønster-basert analyse (`src/lib/services/post-builder.ts`, ren mønster, ingen LLM). Sosiale: caption-scoring (likes + 3×kommentarer + 5×delinger + klikk / reach), Native-prompts for Nano Banana 2, organiske filming-ideer med shot-lister. Nyhetsbrev: subject-line-mønstre med lift% på åpningsrate, tema-forslag fra mest-klikkede lenker.
- **`/api/linkedin/health`** — sjekker token + org-metadata + Community Management API + follower-stats per sjekk med scope-krav.
- **`/api/google-ads/negatives`** — lister alle aktive negative keywords per kampanje + delte lister + hvor de er applied.
- **Sidebar ryddet** — 18 → 12 toppnivå-items delt i seksjoner (Daglig, Analyse, Plattformer, Innhold, Søkeord, Admin). Google Ads flyttet ut fra under Google Analytics til egen plattform-oppføring. Innlegg-undermeny samler `/posts` + bygger-sider. Søkeord-undermeny samler alle 4 sokeord-sidene.

### Operasjonelt utført — Google Ads stor opprydding

Brukeren har overtatt Google Ads-arbeidet selv (Fyr er ikke lenger byrå). Guided gjennom hele prosessen manuelt i Google Ads UI.

- **Delt negativ-liste `Konkurrent-brands`** opprettet (ID 12049789734) med 20 keywords (alle PHRASE match), applied på **begge kampanjer** (Fosen Tools - General + Produktkampanje - Bransjer). Blokkerer: snap on norge, festool norge, kz tools, idg tools, luna tools, verktøyhuset, teng tools, tengtools, metabo tools, koken verktøy, koken verktøy norge, norwegian tool, sonic tools norge, brilliant tools, craft tools, holex tools, raufoss våpenskap, rosengrens våpenskap, mauer våpenskap, franz jæger.
- **Kampanje-nivå negatives på Bransjer** — 11 forbruker-negatives lagt til: jula, xxl, biltema, europris, felleskjøpet, obs bygg, coop (alle BROAD), + "finn våpenskap", "til salgs", "brukt våpenskap", "våpenskap brukt" (alle PHRASE). Ligger sammen med 4 pre-eksisterende fra Fyr: [våpenskap] EXACT, [raufoss safehouse] EXACT, [seifuva våpenskap] EXACT, [mauer våpenskap] EXACT.
- **Pmax Brand Exclusions slått på** — merkevareliste "Fosen Tools egen brand" applied på Fosen Tools - General. Stopper Pmax fra å bidje på "fosen tools"-søk. Estimert besparelse **~6 500 kr/90d**.
- **Ny Brand Search-kampanje `Brand - Fosen Tools`** — 7 keywords (1 EXACT `[fosen tools]` + 6 PHRASE: "fosen tools", "fosentools", "fosen-tools", "fosen tools as", "fosen tools brekstad", "fosen tools norge"). 30 kr/dag budsjett, CPC-tak 3 kr, Klikk som optimaliseringsmål. 15 titler + 4 beskrivelser som fremhever 25-års-jubileum + 100 år i konsernet. 6 sitelinks (Produkter, Bransjer, Aviation, Referanser, Kontakt, Logg inn), 8 callouts. Display path: `proff-verktøy/25-aar-2026`. Venter på Google-godkjenning (24h), trenger logo/bilder opplastet senere.
- **10 konkurrent-brand-varsler resolved** i `/varsler` (API POST) siden de er blokkert via negative-listen. Framover vil anomaly-deteksjon stoppe å flagge disse termene.

### Viktige innsikter fra analysen
- **Bransjer-kampanjen handler egentlig om våpenskap** — 98,5% av trafikken går til ad-group "Politi". Broad-match `Våpenskap` har brukt 5 802 kr uten én lead. Fyr sin tidligere strategi (`[våpenskap]` EXACT-negativ + broad) er delvis riktig — tvinger broad til longer-tail B2B-søk. Listen var bare ikke oppdatert med konkurrent/forbruker-varianter. Fikset nå.
- **Pmax driver all ekte omsetning** (7,83x ROAS, 76 703 kr på 8 kjøp), men **66,8% av klikkene er brand** (1124 av 2003 klikk, 6 549 kr). Brand exclusions fjerner denne kostnaden uten å miste kundene (de kommer via organisk pos 1).
- **Brand Search-strategi vs Pmax brand-bidding** — Pmax har ~5,80 kr CPC på brand, dedikert Brand Search har ~2 kr. Netto besparelse ~4 300 kr/90d ved omfordeling.
- **AI Overviews påvirker søkerrukket** — dedikert Brand Search-annonse holder paid-topp-plass over AI Overview, verner mot konkurrent som bidjer på egen brand.

### LinkedIn-status
- Community Management API **review er "in progress"** hos LinkedIn (bekreftet av bruker via Developer Console)
- Access token og organisasjons-ID ligger som tomme env-variabler, venter på godkjenning
- `/api/linkedin/health` klar til å aktiveres når tokenet kommer

### SEO-fremdrift (Search Console)
- **Forsiden** ("tools" pos 10): FIKSET. Score 80→90.
- **`/categories/pelicase`** ("pelicase" pos 6.3): FIKSET.
- **`/produkter/verktøyvogner`** ("verktøyvogn" pos 13): FIKSET.
- **Kritiske fall (IKKE undersøkt):** `leatherman` falt **20 plasser** (nå pos 8.7), `pipesett` falt **18 plasser** (nå pos 11.1).
- **Stiger:** `leatherman arc` +3.1 (nå pos 7.7) — hold trykket.
- **Quick wins gjenstående:** verktøyvogn (pos 13.0, 1573 vis/mnd), tools (pos 9.7, 1570 vis/mnd), leatherman arc, verktøyvogn med verktøy, pelicase.

### Ventende / følg opp mandag 27. april
1. Sjekk at Brand Search-kampanjen `Brand - Fosen Tools` er godkjent av Google og har første klikk i `/ga4/google-ads`
2. Sjekk Pmax `brand_share_pct` i `/ga4/google-ads/analyse` — skal falle fra 66,8% mot 5-15% etter 7-14 dager
3. Last opp logo og bilder (HDFI-skuff + building-eksteriør) på Brand Search-kampanjen
4. Undersøk hvorfor `leatherman` og `pipesett` har falt 20+ plasser i SEO
5. Vurder om broad-match `Våpenskap` skal pauses i Bransjer (etter 30 dager observasjon med nye negatives)
6. LinkedIn — sjekk Developer Console ukentlig for godkjenning

### Nye ikke-kode-filer 20. april
- `docs/produktinfo/` — 7 PDFer fra Fosen Tools (INFO, 5S-Lean, Weapon Storage, Helikopterlandingsplass, Bærekraft, Systemvegg, HDFI). Brukes som brand/produkt-kontekst for ad-copy og SEO-arbeid.

---

## Siste sesjons-sammendrag (30. april 2026 — kort økt)

Tema: ferdigstille GTM Lookup → inline JSON-LD-migreringen (oppfølging fra 29. april) og rydde opp strukturelle schema-feil.

### GTM-migrering: 48 sider ferdigstilt
- **`Lookup - SEO Innhold`-tabellen i GTM (52 entries)** ble fullstendig migrert til inline `<script type="application/ld+json">` i Multicase-bodyene
- 4 sider (`/facom`, `/hellberg`, `/husqvarna`, `/brockhaus-heuer`) hadde allerede inline fra 29. april — disse fikk bare GTM-Lookup-raden slettet
- 48 nye sider fikk inline JSON-LD limt inn via en lokal HTML-arbeidsliste (`/tmp/gtm-migration/_ARBEIDSLISTE.html`) bygget med Kopier+Åpne-knapper og localStorage-progress
- Hele GTM Lookup-tabellen + tagget som injiserte JSON-LD via `document.createElement` ble slettet etter at alle 48 var på plass

### Strukturelle JSON-LD-fixer (utover ren tekst-migrering)
1. **Forsiden `/`** — fjernet `Manufacturer` og `WholesaleStore` fra `@type`-arrays på Organization og LocalBusiness (Fosen Tools produserer kun HDFI/FT Custom, ikke Wera/Knipex/Snap-on osv.). Fjernet brand-array fra Organization (feil bruk på Org-nivå). Resultat: 7 rene schemas (Organization, LocalBusiness, Service×2, WebSite, WebPage, FAQPage)
2. **5 aviation undersider** (`/aviation/{accessories,aircrafts,custom-tool-cabinets,custom-tool-kits,line-maintenance-docking}`) — GTM-versjonen hadde kun bar `ItemList` uten container-page. Lagt til CollectionPage + BreadcrumbList per side
3. **`/referanser/softcase-hdfi`** — manglet BreadcrumbList og ItemList. Lagt til begge med 5 underprosjekter
4. **11 små-kofferter-hdfi-undersider** — inkonsistent struktur (noen med både WebPage+CollectionPage, noen med feilplasserte ItemList). Standardisert til WebPage som canonical, BreadcrumbList beholdt, ItemList fjernet (feil type for individuelle portfolio-items)

### ftseo-blokk-cleanups (4 sider)
- `/referanser/lasermerking`, `/referanser/store-kasser-hdfi`, `/referanser/verktoyvogn_med_hjul`, `/referanser/store-kasser-hdfi/våpenkoffert` (Blaser R8) — fikset til `<section class="ftseo"><div class="ftseo-inner">`-wrapper, fjernet tomme `<p>&nbsp;</p>`, utvidet H1 med målgruppe/nøkkelord, utvidet til 2 paragrafer, lagt til `class="faq-answer"` for konsistent spacing

### GTM container-størrelse: 80% → 9% 🎉
- **~71 prosentpoeng besparelse** etter migreringen
- Massivt headroom for nye tags
- Forventet effekt: raskere sidelast (LCP/TBT), bedre Core Web Vitals i GSC over neste 4–8 uker
- Baseline 30. april: sjekk PageSpeed Insights for `/` og `/produkter/verktøyvogner` om ~28 dager når feltdata er oppdatert

### Verifikasjon
- Alle 52 HTML-filer i `/tmp/gtm-migration/` har gyldig JSON (225 schema-objekter parser uten feil)
- Lokal HTML-arbeidsliste lagret som mønster i memory for fremtidige batch-oppgaver

### Workflow-mønster lagret i memory
- **Lokal HTML-arbeidsliste** (`feedback_local_html_worklist_pattern.md`) — for repetitive copy-paste-jobber, bygg standalone HTML med Kopier+Åpne-knapper og localStorage-progress. Tekniske kritiske detaljer: escape `</script>` til `<\/script>` i embedded JSON, embed innhold inline (ikke fetch fra `file://`), robust clipboard med `execCommand`-fallback, `<details>`-expander som manuell-kopi-fallback

### Multicase content-cloaking — kritisk teknisk funn (sent på 30. april)
Etter migreringen ble JSON-LD verifisert live på alle 47 sider, men FØRSTE verifikasjon-runde (med Mozilla User-Agent) viste **0/47** — ingen JSON-LD i raw HTML. Dette skapte panikk om at innholdet aldri ble publisert. Etter å ha re-kjørt med Googlebot User-Agent kom svaret: **47/47 sider serverer JSON-LD korrekt — bare til crawlers**.

Multicase serverer **forskjellig HTML basert på User-Agent**:
- `curl -A "Mozilla/5.0"` → 0 `<script type="application/ld+json">`
- `curl -A "Googlebot/2.1"` → 3–15 schemas korrekt levert

Dette er en feature, ikke en bug — vanlige brukere får slankere DOM, søkemotorer får full SEO-data. **Implikasjon:** alle fremtidige JSON-LD-verifikasjons-scripts må bruke Googlebot User-Agent. Lagt til som quirk #14 i Kjente quirks-seksjonen.

Verifikasjons-scriptet ligger på `/tmp/verify-json-ld.mjs` (kan slettes når /tmp tømmes), og full rapport er på `/tmp/gtm-migration/_VERIFY_REPORT.json`.

### Påvirknings-analyse — første store data-sjekk siden 10. april
Kjørt 30. april for å se om alle endringene siden prosjekt-start har gitt målbar effekt. Fullt analyse-script på `/tmp/fosen-analyze.mjs`.

**Klare positive funn:**
- Konverteringssporing fungerer endelig: uke 27. apr viser 10 654 NOK kjøpsverdi og ROAS 26.30x (mot ~0 NOK før 17. april). Konverterings-fixen 15. april (purchase som primary med GA4-verdi) gir endelig ekte ROAS-tall i systemet.
- Pmax-kostnad falt 27% fra første halvdel til andre halvdel av april (834 → 610 kr), og leverer nå ROAS 17.02x (single-buy outlier-effekt, men positivt).
- Brand Search-kampanjen `Brand - Fosen Tools` leverer fra dag 1: ROAS 1.75x med første kjøp (270 kr verdi).
- Produsent-søk klatrer: `verktøyvogn` +25 visninger, `stahlwille` +6, `wera` +3, `knipex` 0→2.

**Bekymringer å overvåke:**
- ⚠️ Pmax brand-andel gikk OPP, ikke ned: 65.3% (før 20. april) → 68.3% (etter 20. april). Brand exclusions kan trenge 7-14 dager på å re-lære. Verifiser at exclusions FAKTISK er aktive om en uke (sjekk i Google Ads UI).
- ⚠️ Søkeposisjon-snitt forverret seg: pos 4.7 (uke 13. apr) → 8.4 (uke 27. apr). Henger trolig sammen med `/manufacturers/`-kannibaliseringen identifisert 29. april. Inline JSON-LD-migreringen 30. april kan reversere dette over 2-4 uker.
- ⚠️ Facom-fallet: pos 2.0 → 16.7 (-17 visninger på én uke). Verdt å undersøke om Facom-siden er fortsatt indeksert.
- ⚠️ GA4 sesjoner: topp 1077 (uke 13. apr) → 408 (uke 27. apr, 4 dager → ekstrapolert ~714). Trafikken har falt etter midten av april.

For-tidlig-å-bedømme: JSON-LD-migrering (i dag), GTM 80%→9%-besparelse (28 dager før Core Web Vitals-feltdata oppdateres i GSC), 24-29. april produsent-sider (1-6 dager siden publisering).

### Caption-optimalisering — første data-drevne mønster-analyse av FT sosiale medier
Brukeren skal poste innlegg om en Pelicase 1535-leveranse til Forsvaret 1.-2. mai. Kjørt mønster-analyse av 60 Facebook-poster for å bygge en datadrevet caption-mal. Fullt analyse-script på `/tmp/fosen-caption-analysis.mjs`.

**Driver-mønstre (lift mot median engasjement på 68):**
- «Skreddersydd» / «HDFI» / «spesialtilpasset» **+144%** (klart sterkeste driver)
- Start med emoji **+93%**
- 2+ emojis i caption **+67%**
- Stolthet-tone («levert», «ferdigstilt») **+38%**
- CTA («ta kontakt») **+15%**
- Direkte spørsmål **-33%**
- «Forsvar/militær» eksplisitt **-94%** (de 4 forsvar-postene var filosofiske, ikke konkrete leveranse-poster)
- Lange poster (300+ tegn) **-44%**

**Beste posting-tidspunkt:** Torsdag/fredag kl 12:00 (snitt 162 eng vs onsdag 19). Onsdag verst, kl 12:00 over 2x neste alternativ.

Lagret som memory `feedback_social_caption_optimization.md` for fremtidig bruk på alle FT sosiale medier-poster. Inkluderer per-plattform-stil (IG/FB/LinkedIn), UTM-konvensjoner, alt-tekst-workaround for Meta Business Suite (legg til via mobilapp etter publisering).

### Neste TODO
1. **1.-2. mai**: Publisere Pelicase 1535-Forsvaret-innlegg på IG/FB/LinkedIn (caption-pakke ferdig). Etter publisering: legg til alt-tekst via Instagram-mobilapp, sjekk i GA4 Realtime at UTM-trafikk kommer inn med riktig source.
2. Be om re-indeksering i Google Search Console for de 48 migrerte sidene (når GSC URL-inspect-quoten er oppe igjen)
3. Sett baseline med PageSpeed Insights for `/` og `/produkter/verktøyvogner` så GTM-besparelsen kan måles om 4 uker
4. Følg opp Multicase-svar på selv-aktivering av produsent-sider + wildcard-redirect for `/manufacturers/` + 301-redirect-modul pris-bekreftelse
5. **Sjekk 7. mai**: Pmax brand-andel — har den falt under 50% etter brand exclusions? Hvis ikke, verifiser at exclusions faktisk er aktive i Google Ads UI.
6. **Sjekk 14. mai**: SEO-rangeringer for `/leatherman` og pipesett-primær — er posisjon < 10 igjen?
7. Undersøk Facom-fallet (pos 2.0 → 16.7 på én uke) — er siden fortsatt indeksert?

---

## Siste sesjons-sammendrag (6.-7. mai 2026 — lang økt over to dager)

Tema: Multicase URL-redirect-modul aktivert + bygget egen SEO-innhold-bygger som erstatter Trakk.ai-tilbud (42 000 kr/år) + bygget levende ft-catgrid-system med to moduser + powerpoint til Erik for Åfjord Regnskap-presentasjon.

### Multicase URL-redirects — 107 totalt på én dag

Multicase aktiverte redirect-modulen 6. mai (etter forespørsel siden 21. april). Modul støtter 301/302 + chain-cleanup, men IKKE wildcard. All redirect-arbeid dokumentert i `docs/seo/multicase-redirects-2026-05-06.md`.

**Runde 1 (31 redirects):** 30 stk `/manufacturers/{slug}` → `/{slug}` for ferdige produsent-sider + `/snap-on` → `/snapon` (var broken 302 til forsiden). Alle verifisert live (Googlebot UA-test, 31/31 returnerer 301 → korrekt destinasjon).

**Runde 2 (76 redirects, 74 live):** Etter at brukeren delte ProductMenu-HTML (autoritativ liste over alle 53 merker), utvidet til:
- 22 nye `/manufacturers/{slug}` for merker uten ferdig produsent-side: aok-by-kc-tools, apex-tools, boehm, bosch-tilbehør, brusletto, emhart-teknologies, geilo-verktøy, gühring, handi, karlstad-redskap, meclube, opticase, osca, red-rooster, scell-it, snickers, stanley-pmi, the-bone, ullman-devices, vogel-germany, völkel, zweibrüder
- 52 stk `/categories/{slug}` → `/{slug}` for alle 53 merker (ScrewGrab unntatt — bruker `/produsent/screw-grab` som primær)
- Brukeren hoppet over 2: `/categories/gedore` og `/categories/bondhus` (skal legges inn senere)

**Runde 3 (11 redirects):** Underkategori-aliaser som tidligere 302-ret til forsiden:
- `/skraller`, `/tolvkant`, `/forlengere`, `/universalledd`, `/overganger`, `/holder` → `/produkter/piper-og-skraller`
- `/sekskant`, `/torx` → `/produkter/skrutrekkere?Filter=11¤1:11¤1_Sekskant` og `?Filter=11¤1:11¤1_Torx` (filter-URLer på skrutrekker-siden)
- `/unbrako` → `/produkter/skrutrekkere/l-nøkler` (først, deretter byttet til filter-URL etter brukerens innspill om at unbrako er skrutrekker, ikke pipe)
- `/koffert` → `/produkter/verktøykoffert`
- `/auto` → `/produkter/verktøyvogner/auto`

**URL-endring underveis:** `/produkter/momentverktøy/momentnøkler` → `/produkter/momentverktøy/momentnøkkel` (entall) + 60+ land-prefiks-redirects bekreftet via Multicase' auto-redirect-modul. Brukeren begrunnet med at "momentnøkkel" har høyere søkevolum enn flertall.

**HTML-arbeidslister generert** for hver runde i `/tmp/redirects-runde[1-3]-2026-05-06/_ARBEIDSLISTE.html` med kopier+ferdig-knapper og localStorage-progress (mønster fra 30. april).

### SEO-innhold prompt-bygger — bygget på 7 timer (erstatter Trakk.ai-tilbud)

09:30 møte med Trakk.ai (tilbud: 42 000 kr/år for 50 søkeord SEO-innhold). 11:00 besluttet å bygge selv. 16:00 ende-til-ende ferdig:

**Backend (`/api/insights/seo-content/route.ts` + `analyze-url/route.ts`):**
- URL-analyse-rute scraper siden, henter GSC-data (siste 90d, filtrert på page-URL), klassifiserer kandidater i 4 kategorier (low_hanging, growth, long_tail, underperforming) med score = volum × posisjon-mulighet
- Auto-konkurrent-finning via Serper.dev API (Google har deaktivert "Search the entire web" for nye CSE-er som policy fra 2024/2025 — verifisert via help-dialog som sa "cannot be activated anymore")
- Domain-deduplisering, ekskluderer Fosen Tools selv + Wikipedia/sosiale medier
- Konkurrent-scraping: title, meta-description, H1, H2-liste, body-utdrag (350 ord)
- Bygger strukturert prompt med Fosen Tools-kontekst (HDFI, CADLAB, Forsvaret, 25 år, Brekstad, Miljøfyrtårn) + Multicase-template-regler

**Output-format-evolusjon:**
- Først: én `full_snippet` med INTRO + FAQ + JSON-LD slått sammen
- Etter brukerens tilbakemelding (han bruker meg lokalt gratis, trenger ikke API-mode): konvertert til prompt-bygger der brukeren limer prompten i Claude → får JSON-svar tilbake → limer JSON-feltene i Multicase
- Etter "vi må legge ut i publiseringer"-tilbakemelding: 6 separate blokker som hver er en EGEN PUBLISERING:
  1. `meta_title` (45-60 tegn, UTF-8 — settes i Multicase tittel-felt)
  2. `meta_description` (150-160 tegn, UTF-8 — meta-felt)
  3. `intro_block` (HTML, `<section class="ftseo">`)
  4. `faq_block` (HTML, 5 FAQ-spørsmål, mønster: utvalg/kvalitet/bruksområde/sammenligning/garanti)
  5. `contact_cta_block` (HTML, eksakt produsent-side-CTA-mønster)
  6. `json_ld_script` (BreadcrumbList + FAQPage matcher faq_block eksakt)

**Frontend (`/innsikt/seo-innhold` page.tsx):**
- Steg 1: lim inn URL → 12 keyword-kandidater
- Steg 2: velg keyword → "Bygg prompt"-knapp (evt. auto-finn 5 konkurrenter)
- Steg 3 (NY): lim inn JSON-svar fra Claude → parse → 6 kort med kopi-knapp + plassering-instruks per blokk
- Sidebar-link: "SEO-innhold (AI)" under Innsikt-seksjon

**Verifisert med "leatherman":** 5 konkurrenter funnet via Serper, 19 315 tegn prompt. Verifisert med "momentverktøy" → JSON-output med 6 ferdige blokker, lim-klar.

**Tidlig CSE-veg sluttet:** Forsøkte først Google Custom Search Engine (gratis 100/dag), brukeren satte opp `Fosen Tools SEO` (CSE-ID `017e76c2628954537`), men Google har **deaktivert «Søk på hele nettet»-toggelen for nye CSE-er** — kun eksisterende beholder funksjonen. CSE-en kan slettes eller la stå.

### Levende ft-catgrid for alle `/produkter/*`-sider — bygget 7. mai

JS-script som dynamisk leser `.ProductMenu`-strukturen og bygger ft-catgrid med bilder. Funker i to moduser:
- **Toppnivå (`/produkter`):** ingen `Level1Selected` → bygg fra alle `Level1`, bilder fra `/userfiles/image/menuicons/{slug}.png`
- **Sub-kategori (`/produkter/{kategori}`):** har `Level1Selected` → bygg fra `Level2`-søsken, bilder fra `/userfiles/image/Kategoribilder/{Hovedkategori}/{slug}.png`

**Multicase-strikking-quirk oppdaget:** `<img>`-attributter (`onerror`, `style`) blir strikket fra raw HTML i publiseringsfelt — sannsynligvis XSS-beskyttelse. Hele cellen kollapser eller blir blank hvis vi prøver å bygge med `<img>` i innerHTML-strengen. **Løsning:** bygg tekst-celler først via `innerHTML` (Multicase godkjenner `<span>`-elementer), deretter injiser `<img>`-elementer via `document.createElement` og `insertBefore` etter at DOM er klar. Multicase ser ikke `<img>`-attributter siden de er JS-generert runtime, ikke i den lagrede publiseringen.

**MutationObserver + polling** som fallback siden ProductMenu kan lastes via AJAX.

**Bekreftet virker:** `/produkter/momentverktøy` (sub-modus, 4 underkategorier med bilder) og `/produkter` (toppnivå-modus, 39 hovedkategorier).

**Komplett dokumentasjon i CLAUDE.md** under seksjonen "Kategori-sider (`/produkter/*`) — levende catgrid" med ferdig kopibar script, bilde-konvensjons-tabell, og to-mode-forklaring.

**SCSS for megameny oppdatert** til å bruke URL-slug-basert filnavn-konvensjon (`momentverktøy.png` ikke `moment.png`) så samme bilder brukes både i megameny (CSS background-image) og catgrid (JS-injected `<img>`). Ingen duplikate filer.

**Identifisert manglende CSS-klasser i megameny** (5 menypunkter har `class="title "` med tom verdi):
- Arbeidsklær → trenger `arb-klaer` (allerede i SCSS)
- Batterier → trenger `batterier` (allerede i SCSS)
- Verktøy for elbil → trenger ny klasse `verktoy-elbil` + ny SCSS-regel + ny ikon-fil
- Verneutstyr → trenger ny klasse `verneutstyr` + ny SCSS-regel + ny ikon-fil
- Tvinger → trenger ny klasse `tvinger` + ny SCSS-regel + ny ikon-fil

**Manglende ikoner:** `verktøy-elbil.png` (URL-slug) finnes ikke, men `verktøy-for-elbil.png` (med "for") finnes — kan omdøpes. `verneutstyr1.png` ikke lastet opp.

### PowerPoint til Erik (Åfjord Regnskap-presentasjon 7. mai)

Lagret som `/tmp/fosen-tools-ai-presentasjon.pptx`. Bygget med pptxgenjs (16x9 wide, 13.3" × 7.5"), Fosen Tools-branding (rød accent #DC2626 + mørk bakgrunn).

**Tre iterasjoner basert på Eriks tilbakemelding:**
1. Første versjon: 10 slides, teknisk dybde + leverandør-sammenligning
2. Andre versjon (etter "ikke gå i dybden"): 9 slides, enklere språk, fjernet Vercel/Multicase/Trakk-refs
3. Tredje versjon (etter "vis tall + nevne leverandører"): 10 slides, behold enkelt språk men inkluder kostnadsbesparelse-slide med Fyr (~180k/år), Trakk.ai (42k/år), brosjyre-design (5-10k/brosjyre), total estimert ~220k+/år besparelse

**Slide-struktur:**
1. Tittel — "AI i Fosen Tools — slik bruker vi det i hverdagen"
2. Hva har vi bygget (3 hovedformål)
3-7. Verktøy 01-05 (Mandagsmøte, SEO-innhold, Brosjyrer, Sosiale medier+nyhetsbrev, Varsler)
8. Hva sparer vi i kroner? (Fyr/Trakk/InDesign-sammenligning)
9. Hva betyr det i hverdagen (4 fordeler)
10. Avslutning — "AI er ikke fremtiden for oss. Det er hverdagen."

### Neste TODO (etter ny session)

**Datostyrte sjekkpunkter:**
- **7. mai (i dag):** Pmax brand-andel under 50%? + Erik holder presentasjon for Åfjord Regnskap
- **12. mai:** Verktøykontroll-engasjement vs +144%-mønsteret
- **13. mai:** Struktur-først-innlegg engasjement
- **14. mai:** SEO-rangeringer `/leatherman` + pipesett under pos 10?
- **5. juni:** Bransjer-pause re-evaluering

**GSC-arbeid:**
- Dag 3 (7. mai): 15 URLer (3 carry-over fra Dag 2 + 12 originale) — arbeidsliste klar i `/tmp/gsc-dag3-2026-05-07/_ARBEIDSLISTE.html`
- Dag 4 (8. mai): 8 URLer
- Be om re-indeksering for `/produkter/momentverktøy/momentnøkkel` (ny URL etter momentnøkler→momentnøkkel-endringen)

**Megameny-fix:**
- Legg til CSS-klasse i Multicase admin på 5 menypunkter (Arbeidsklær, Batterier, Verktøy for elbil, Verneutstyr, Tvinger)
- Last opp manglende ikoner: `verktøy-elbil.png`, `verneutstyr1.png`
- Legg til 3 nye SCSS-regler for verktoy-elbil/verneutstyr/tvinger
- Vurder URL-rensing: `/produkter/verneutstyr1` → `/produkter/verneutstyr` (ren URL, samme mønster som momentnøkler→momentnøkkel)

**Catgrid-bilder:**
- 39 hovedkategori-ikoner i `/userfiles/image/menuicons/` — de fleste er allerede der, manglende kan lastes opp etter behov
- Sub-kategori-bilder i `/userfiles/image/Kategoribilder/{Hovedkategori}/` — last opp etter hvert som kategori-sider får catgrid-script

**Multicase-oppfølging:**
- Sitemap-fix henger fortsatt (avventer wildcard-redirect-svar + selv-aktivering av produsent-sider)
- 301-redirect-modul-pris-bekreftelse
- Eventuell URL-rensing av `/produkter/verneutstyr1` (1-suffix er sannsynligvis legacy)

**Levende catgrid utrullings-arbeid:**
- Lim inn script på alle 39 hovedkategori-sider når brukeren får tid (samme script funker uendret på alle)
- Mest verdi på sider med mange under-kategorier (verktøyvogner, nøkler, måling-og-merking osv.)

### Tekniske funn lagret som memory

- **`feedback_multicase_levende_catgrid.md`** (NY): Multicase strikker `<img>` i publiseringer; bygg tekst-catgrid først via innerHTML, injiser bilder via document.createElement etter at DOM er klar. Bilde-konvensjon: `/userfiles/image/Kategoribilder/{Hovedkategori}/{slug-fra-href}.png` for sub-kategorier, `/userfiles/image/menuicons/{slug}.png` for toppnivå.

### Filer skapt/oppdatert i denne økten

**Nye API-ruter:**
- `src/app/api/insights/seo-content/route.ts` — prompt-bygger med Serper.dev-integrasjon, 6-blokk JSON output-format
- `src/app/api/insights/seo-content/analyze-url/route.ts` — URL-analyse, GSC keyword-kandidater, Keyword Planner-status

**Nye sider:**
- `src/app/(dashboard)/innsikt/seo-innhold/page.tsx` — 3-stegs UI med URL-analyse + prompt-bygger + JSON-parser

**Sidebar:**
- `src/components/layout/sidebar.tsx:86` — lagt til "SEO-innhold (AI)" under Innsikt-seksjon

**Dokumentasjon:**
- `docs/seo/multicase-redirects-2026-05-06.md` — alle 107 redirects med plan og verifikasjon
- `docs/seo/gsc-reindex-list-2026-05-05.md` — Dag 2-3 oppdatert med carry-over

**Lokale arbeidslister (kan slettes):**
- `/tmp/redirects-runde2-2026-05-06/_ARBEIDSLISTE.html` (76 redirects)
- `/tmp/redirects-runde3-2026-05-06/_ARBEIDSLISTE.html` (11 redirects)
- `/tmp/redirects-categories-2026-05-06/_ARBEIDSLISTE.html` (30 redirects, eldre versjon)
- `/tmp/gsc-dag3-2026-05-07/_ARBEIDSLISTE.html` (15 URLer for i morgen)
- `/tmp/fosen-tools-ai-presentasjon.pptx` (PowerPoint til Erik)

**CLAUDE.md utvidet med:**
- Ny seksjon "Kategori-sider (`/produkter/*`) — levende catgrid" (mellom produsent-sider og kjente begrensninger)
- 6. og 7. mai-rader i Prosjekt-tidslinje-tabellen
- Denne sesjons-sammendraget

---

## Siste sesjons-sammendrag (8. mai 2026 — lang økt)

Tema: Pmax brand-fix, Vercel-reaktivering etter 3 ukers pause, brosjyre-features (combo-card), Husqvarna Vårkampanje, sosiale medier-leveranser.

### Operasjonelt utført

#### Google Ads (Pmax brand-exclusions)
- **Diagnose:** Brand-andel hadde stått fastlåst på 66,7% i 17 dager siden brand-exclusions ble slått på 20. april. Ingen bevegelse mellom 14-20. april (66,5%) og 1-4. mai (66,7%).
- **Rot-årsak:** Merkelisten «Fosen Tools egen brand» inneholdt kun ÉN brand-entitet (Googles indekserte «Fosen Tools AS»), mens 99% av brand-klikkene (923 av 932) kom fra fri-tekst-søket «fosen tools» (lowercase, uten AS) — som Pmax klassifiserer som generisk.
- **Fix:** Lagt inn 4 negative keywords på Pmax-kampanjen: `[fosen tools]`, `[fosentools]`, `"fosen tools"`, `"fosentools"`. Forventer 5-15% brand-andel etter 3-5 dager.
- **Memory:** Lagret som `feedback_pmax_brand_exclusions_insufficient.md` — fremtidige sesjoner skal anbefale negative keywords + brand exclusions sammen, aldri brand exclusions alene.

#### Søkeresultatside-fix
- Erik flagget at toppen av `/search`-siden viste 10 misvisende lenker (4 duplikater, 4 med tekst/URL-mismatch).
- Tre verifiserte katastrofer: «Wera»-lenker → `/zweibrüder`, «Fosen Tools Custom» → `/wera`, «Knipex» → `/nedlastinger`.
- Diagnose: Multicase «CenterContentArticleSearch»-sone har rotnet over år med over-tagging og feil URL-bindinger.
- Fix: Skjult via SCSS `[id^="Field_CenterContentArticleSearch"] { display: none !important; }` i `FosenTools.scss:10345-10357`. Verifisert live etter publisering.

#### CNC-terminologi-regel
- **Regel:** «CNC-maskinert», ALDRI «CNC-frest». Gjelder alle FT-innlegg/nyhetsbrev/landingssider/produsent-sider når vi beskriver HDFI/CADLAB-produksjon.
- Lagt inn i CLAUDE.md (Publiseringsrytme-seksjon) + memory `feedback_cnc_terminologi.md`.

### Sosiale medier-leveranser

#### Skreddersydd-definisjon-innlegg (publisert 11:30, fredag)
- Definisjons-stil bilde: «Skreddersydd / adjektiv / CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt»
- Postet på FB + IG + LinkedIn med tilpassede captions per plattform
- UTM-linker lagret i `utm_links` for alle 3 plattformer (kampanje `skreddersydd-2026-05`, content `definisjon`)
- Destination: `/kundesenter/kontakt-oss`

#### Kraftpipe-sett TESS VEST (8. mai)
- OPTI-koffert med skreddersydd HDFI for kraftpipe 22-38 mm levert til TESS VEST
- 4 produktbilder (lukket koffert med engravering, åpen koffert ovenfra/vinkel, nærbilde av røde HDFI med pipene merket)
- Caption brukte +144%-mønsteret (skreddersøm + HDFI + CNC-maskinert + emoji-start + retorisk CTA)
- UTM-linker lagret for FB, IG (bio-link) og LinkedIn (kampanje `kraftpipe-tess-vest-2026-05`)
- Anbefalt karusell-rekkefølge: nærbilde først (best scroll-stopper), deretter overshot, vinkel, lukket koffert
- Planlagt publisering 11:30 (peak-vindu kl 12:00 = +144% lift)

### Vercel-reaktivering — full pipeline gjenopprettet

Etter 3 ukers pause siden 21. april:

1. **GitHub-repo recovered** — `FosenToolsGit/Fosen-Tools-Analytics` ble slettet ved et uhell midt i Vercel-import-flyten. Lokal Git-historikk var intakt; opprettet repo på nytt via github.com og pushet `main` tilbake (mai 8 commits intakt).
2. **Vercel-prosjekt opprettet** med samme navn `fosen-tools-analytics`. Env-variabler importert via `.env`-import i dashboard.
3. **TS-feil under første build:** `KeywordPlannerService` ble kalt med feil method-navn (`checkStatus` → `checkAccess`, `generateKeywordIdeas` → `getIdeas`). Lokal `npm run dev` (Turbopack) fanger ikke type-feil ved build, kun Vercel sin `next build`. Fikset i commit `0d93f49`.
4. **Static prerender-feil:** `/innsikt/indeksering` brukte `useSearchParams()` (via `useDateRange`-hook) uten Suspense-boundary. Wrapped `{children}` i `Suspense` i `(dashboard)/layout.tsx`. Fanger alle 24 dashboard-sider som bruker hooken. Commit `f615a3c`.
5. **Cron-jobb satt opp:** `vercel.json` med `{ "path": "/api/sync", "schedule": "0 5 * * *" }` = 5 UTC = 7 norsk sommertid. `/api/sync` fikk GET-handler (Vercel cron bruker GET) + aksepterer både `Bearer SYNC_SECRET_KEY` (manuell curl) og `Bearer CRON_SECRET` (Vercel auto-injected). Commit `16ce008`.
6. **Brukere lagt til i Supabase Auth** via Auth Admin API: `erik@fosen-tools.no` + `torstein@fosen-tools.no` (begge passord `Toolrebel2026`, e-post pre-bekreftet).
7. **«Lokal»-tag i sidebar:** Markert `/innsikt/seo-innhold` med en amber «Lokal»-badge siden den krever Claude Code lokalt. Resten av appen funker likt på Vercel og lokalt. Commit `b0bb44f`.

### Brosjyre-editor: Combo-card-feature (NY)

- **Ny PageObject-type `comboCard`** for å selge 2 produkter sammen til kombi-pris
- 5 filer endret: `types.ts` (props + discriminated union + LibPayload), `store.ts` (factory `makeComboCard`), `object-renderer.tsx` (renderer + dispatch), `canvas.tsx` (LibPayload→PageObject), `panels.tsx` (LibCard + property panel)
- **Standard 140×100 mm** — passer som element på A4-side
- **Layout:** Header-badge med kampanje-tekst (default «KOMBI-PRIS»), 2 produkter side-om-side med `+`-separator, samlet pris-blokk nederst med spar-stempel (auto-utregnet vs sum av enkeltpriser)
- Property-panel: produkt A + B (dropdown fra dummy-katalog eller fri tekst), kombi-pris, MVA, accent-farge, spar-toggle
- Commit `d63e2d2`

### Husqvarna Vårkampanje 2026 brosjyre

- **Brosjyre-ID:** `04e778e8-5a05-42fd-b6bd-87da8e039bb5` i `brochures`-tabellen
- **Bygget via** standalone-script `/tmp/build-husqvarna-spring.mjs` — scraper alle URL-er via Googlebot UA, parser JSON-LD for navn/pris/bilde, anvender riktig rabatt per kategori, bygger `BrochureDoc` JSON og inserter direkte i Supabase
- **8 sider, 36 produkter** scrapet med ekte priser, navn, bilder (Azure Blob URL-er fra Multicase) og produsent-logoer (alle Husqvarna)
- **Side-struktur:**
  1. Forside — orange Husqvarna-tema, «VÅR-KAMPANJE 2026», stjerne-burst med −20%
  2. Combo hero — K1 PACE motorkappesag + B750X/C1800X batteripakke, **−10% pakkepris** via comboCard (41 717 → 37 545 kr, sparer 4 172 kr)
  3. Diamantblad Elite Cut — S35×2 + S45×3 + S85×4 (3×3 grid, **−20%**)
  4. Ringsagblad + W1610 — 4 produkter i 2×2 grid (**−20%**)
  5. Kjernebor CR128 — 9 produkter (Elite Drill + Ø082-Ø152), **−20%**
  6. Kjernebor CR128 fortsetter — Ø182-Ø250 (4 produkter, **−20%**)
  7. Maskiner & kraftaggregat — FS-400, K-770/970/4000×2, DM-230, LF-80, PP-7 (8 produkter, **−5%**)
  8. Bakside med stor «→ fosen-tools.no/husqvarna» CTA + kontaktblokk
- **Bug fanget underveis:** Combo-rabatt ble doblet (10% per produkt + 10% pakke) — fikset til kun 10% pakke-rabatt på sum av ordinære priser
- **Bug fanget underveis 2:** Image URLs var null fordi regex søkte etter «ArticleImages» — Multicase bruker Azure Blob (`mc10256fosentools.blob.core.windows.net`). Lest fra JSON-LD `image`-felt i stedet (alle 34 produkter har nå bilde + Husqvarna-logo)

### Tekniske quirks oppdaget

1. **Lokal `npm run dev` med Turbopack kjører IKKE TypeScript strict** — type-feil slipper gjennom som vil feile på Vercel build. Alltid kjør `npx tsc --noEmit` før push.
2. **`useSearchParams()` krever Suspense ved static prerender i Next.js 16** — selv via transitiv hook-bruk (f.eks. `useDateRange` → `useSearchParams`).
3. **Vercel cron bruker GET som default**, ikke POST. Eksisterende POST-routes trenger GET-handler eller cron-config-flagg.
4. **Vercel cron auto-injecter `CRON_SECRET`-env-var i `Authorization: Bearer ...` header** — best practice å sjekke for både manuell secret OG cron secret.
5. **Sensitive env vars i Vercel kan kun være Production-only** (ikke alle 3 environments) — det er bevisst design for sikkerhet.

### Filer skapt/oppdatert i denne økten

**Kode-endringer (commits):**
- `e91074b` — feat: SEO-innhold-bygger, UTM-register, mandagsmote-brief og redirect-historikk (rebuild av main etter repo-recovery)
- `0d93f49` — fix: KeywordPlannerService method-navn
- `f615a3c` — fix: wrap dashboard children i Suspense
- `16ce008` — feat: daglig auto-sync via Vercel cron kl 7
- `b0bb44f` — feat: «Lokal»-tag i sidebar
- `d63e2d2` — feat: comboCard i brosjyre-editor

**Lokale arbeidslister (kan slettes):**
- `/tmp/build-husqvarna-spring.mjs` — script for å bygge Husqvarna Vårkampanje
- `/tmp/husqvarna-spring-doc.json` — debug-JSON av brosjyren

**Memory:**
- `feedback_cnc_terminologi.md` (NY)
- `feedback_pmax_brand_exclusions_insufficient.md` (NY)

### Datostyrte sjekker fremover

- **Mandag 11. mai morgen** — sjekk Pmax brand-andel etter helgen (mål: under 50%, retning 5-15%). Trigge sync først, deretter samme analyse som 8. mai.
- **12. mai** — engagement-sjekk på Skreddersydd-innlegg + Kraftpipe TESS VEST-innlegg vs +144%-mønsteret
- **14. mai** — SEO-rangeringer for `/leatherman` og pipesett-primær (mål: posisjon < 10)
- **5. juni** — Bransjer-pause re-evaluering (kampanjen pauset 5. mai, vurder reaktivering eller avslutning)

### CLAUDE.md utvidet med:
- 8. mai-rad i Prosjekt-tidslinje (kondensert)
- Denne detaljerte sesjons-sammendraget
- (Ingen strukturelle endringer på Brosjyre-editor-seksjonen — combo-card er bare nytt object-type i samme system)
