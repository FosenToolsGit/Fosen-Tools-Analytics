# Prompt for neste sesjon

> Lim inn dette i starten av neste Claude-økt for å fortsette der vi slapp.
> CLAUDE.md + memory/MEMORY.md lastes automatisk så du har all kontekst.

---

## Status etter 8. mai-økten

Vi avsluttet en lang økt med fire hovedstrømmer ferdig:

1. **Pmax brand-fix:** 4 negative keywords lagt inn på `Fosen Tools - General` (`[fosen tools]`, `[fosentools]`, `"fosen tools"`, `"fosentools"`). Brand-andelen var 66,7% — mål er 5-15%. Brand-exclusions alene fungerte ikke fordi den indekserte brand-entiteten «Fosen Tools AS» ikke matchet fri-tekst-søket «fosen tools». Lagret som memory `feedback_pmax_brand_exclusions_insufficient.md`.

2. **Vercel reaktivert** etter 3 ukers pause:
   - Repo `FosenToolsGit/Fosen-Tools-Analytics` recovered (ble slettet ved et uhell, gjenopprettet via github.com)
   - Cron-jobb satt opp: daglig sync kl 7 norsk tid (5 UTC) via `vercel.json`
   - Erik (`erik@fosen-tools.no`) + Torstein (`torstein@fosen-tools.no`) lagt til i Supabase Auth (passord satt i konsollen — ikke dokumentert her; repoet er offentlig)
   - «Lokal»-tag i sidebar markerer `/innsikt/seo-innhold` siden den krever Claude Code lokalt

3. **Combo-card-feature** (ny PageObject-type i brosjyre-editor): 2 produkter med kombi-pris + auto-utregnet spar-stempel. Standard 140×100 mm.

4. **Husqvarna Vårkampanje 2026 brosjyre** (8 sider, 36 produkter, brosjyre-id `04e778e8-5a05-42fd-b6bd-87da8e039bb5`). Findes under «Mine brosjyrer» i editoren. Combo-pris på K1 PACE-pakke (-10%), 20% på diamantblad/ringsagblad/kjernebor, 5% på maskiner/kraftaggregat.

I tillegg: CenterContentArticleSearch-sonen på `/search` ble skjult via SCSS, CNC-terminologi-regel («CNC-maskinert», ikke «CNC-frest») låst inn, Skreddersydd-definisjon-innlegg + Kraftpipe-sett TESS VEST publisert med UTM-tracking.

## Dette skal sjekkes denne uken (datostyrt)

| Når | Hva |
|---|---|
| **Mandag 11. mai** | Pmax brand-andel etter helgen — er den under 50% nå? Mål: retning 5-15%. Trigge sync først (`curl -X POST $URL/api/sync -H "Authorization: Bearer $SYNC_SECRET_KEY"`), deretter samme analyse som 8. mai (sjekk `google_ads_search_terms` med `source=eq.pmax_insight`, beregn brand-share fra termer som matcher `/fosen[\s-]?tools|fosentools/i`). |
| **12. mai** | Engagement-sjekk på Skreddersydd-innlegg + Kraftpipe TESS VEST-innlegg vs +144%-mønsteret. Begge ble publisert torsdag/fredag kl 11:30 (peak-vindu). Sjekk likes + comments + shares + clicks i `platform_posts`. |
| **14. mai** | SEO-rangeringer for `/leatherman` og pipesett-primær (`/produkter/piper-og-skraller/pipesett`). Mål: posisjon < 10 (var 18.9 og 13.6 hhv. 30. april). |
| **5. juni** | Bransjer-pause re-evaluering (kampanjen pauset 5. mai pga 0 konverteringer på 90d/7 742 kr). |

## Hvis brukeren ikke har spesifikk forespørsel

Foreslå Pmax-sjekken først (mandag-økt) — det er den mest verdiskapende kontrollen vi har stående. Annet å foreslå:
- Verifisere at Vercel cron-jobben kjørte natt til mandag (sjekk `sync_logs` med `triggered_by='cron'`)
- Smoke-teste Vercel-deployen (kan Erik logge inn?)
- Husqvarna Vårkampanje — er den klar for utsendelse, eller trenger den manuell finpuss i editoren?

## Viktige referanser

- **CLAUDE.md** — full prosjekt-dokumentasjon, tidslinje, alle services, sider, API-ruter
- **memory/MEMORY.md** — feedback-regler (CNC, HDFI, Pmax brand-exclusions, kategori-tellinger, sosial caption-mønstre osv.)
- **Brosjyre-id** for Husqvarna Vårkampanje: `04e778e8-5a05-42fd-b6bd-87da8e039bb5`
- **Build-script** for Husqvarna-brosjyren (kan brukes som mal for fremtidige kampanjer): `/tmp/build-husqvarna-spring.mjs` (ikke committet, kan slettes når /tmp tømmes)
- **Auto-mode aktiv** — bruker forventer kontinuerlig autonom eksekvering

## Pågående ventespor

- Multicase: sitemap-fix (avventer wildcard-redirect-svar)
- LinkedIn Community Management API-godkjenning (venter siden april)
- Google Keyword Planner Basic Access-godkjenning (venter siden 15. april)
- Megameny-fix på fosen-tools.no: 5 menypunkter mangler CSS-klasser (Arbeidsklær, Batterier, Verktøy for elbil, Verneutstyr, Tvinger), 2 manglende ikoner

---

**Forslag til åpningsspørsmål:** *«Skal vi starte med Pmax-sjekken (helgens data ligger nå klar etter natt-sync) eller har du noe annet jeg skal prioritere?»*
