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

### Brosjyre-editor (ny 27. april)
- `/brosjyre` — Fullskjerm WYSIWYG editor for kampanje-brosjyrer (PDF-eksport). Fixed inset-0 z-50 overlay som dekker dashbord-layouten. 3-panel UI: sidetre + bibliotek + property-panel. 10 objekt-typer (productCard, priceBlock, badge, banner, gallery, contact, footer, text, image, shape), 9 ferdige maler, brand-tokens system, undo/redo (60 nivåer), PDF-eksport via `modern-screenshot` + jspdf med auto-nedlasting. Auto-save til localStorage. **Detaljer:** se egen seksjon nederst i denne filen.

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

- **Ferdig (full 5-blokk-struktur + JSON-LD):** Pelicase, Stahlwille (video-hero), Fosen Tools, Fosen Tools Custom, Wera, Leatherman, Mitutoyo (4-blokk, ingen kategorigrid), Ledlenser, Mora of Sweden (4-blokk, ingen kategorigrid), Hellberg (egen tilpasset struktur med produkt-carousels + FAQ + CTA + JSON-LD), Snap-on, FACOM (video-hero med 2-slide carousel), Knipex, PB Swiss Tools, **KC Tools, Gedore, Zarges, Brockhaus HEUER (video-hero), Milwaukee, Fluke, Rennsteig, Bahco, Gigant, Solid Gear (4-blokk, ingen kategorigrid)** — sistnevnte 10 publisert 29. april, alle indeksering forespurt i GSC samme dag.
- **Custom-side ferdig med JSON-LD + FAQ (bruker setter meta selv):** HDFI — kjører på egen side-struktur (`ft-section`, `ft-wrap`) ikke produsent-template. Har fortsatt suggested H1-endring til "HDFI — verktøykontroll med gravert silhuett" som bruker kan vurdere.
- **Kun hero-blokk publisert (trenger fortsatt intro + kategorigrid + FAQ + CTA + JSON-LD):** Viking Arm, Lista AG
- **Anbefalt neste prioritet:** Viking Arm (norsk oppfinnelse — stor SEO-verdi), Bondhus, Hultafors, Husqvarna, Sumake, og Lista AG. Vurder også å bytte til kategori-sider (`/produkter/verktøyvogner` har 57 sess/mnd uten SEO-arbeid, større trafikk-løft enn flere små produsenter).
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

## Kjente begrensninger og ventende ting

### Venter på ekstern godkjenning
- **Google Ads Keyword Planner:** Developer token er "Explorer"-nivå. Søkt om Basic Access (15. april). `KeywordPlannerService` aktiveres automatisk når Google godkjenner — graceful degradation i mellomtiden.
- **LinkedIn:** Venter på Community Management API-godkjenning
- **Google Calendar:** Venter på Workspace admin-tilgang
- **Multicase (sendt 24. april):** Avklare (1) UI-konsekvens ved å gjøre skjult avdeling synlig for sitemap, (2) om mellomting finnes (skjult i meny, synlig i sitemap), (3) aktivere self-service 301-redirect-tilgang.

### SEO-oppgaver å gjøre
- **Unikifisere pipesett-kategorisidene** (3 duplikate URLer kannibaliserer hverandre):
  - `/produkter/piper-og-skraller/pipesett` (primær — bygg unik introtekst + CTA-grid til underkategorier)
  - `/produkter/verktøykoffert/pipesett` (unik "pipesett levert i koffert"-vinkling + CTA til primær)
  - `/produkter/verktøysett/koffert/pipesett` (unik "komplette pipesett i verktøysett"-vinkling + CTA)
  - Bakgrunn: Multicase støtter ikke canonical-tags, så unikifisering er eneste SEO-verktøy mot kannibalisering. Samme tilnærming rulles deretter ut på `skraller`, `sekskant`, `tolvkant`, `forlengere`, `universalledd`, `overganger`, `unbrako`, `torx`, `holder`, `auto`, `koffert` (alle med 4-5 duplikate URLer).
- **Sett opp 301-redirect `/snap-on → /snapon`** (når redirect-tilgang aktiveres av Multicase).
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
- SEO-fall på `leatherman` (-20) og `pipesett` (-18) — fortsatt åpent

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
