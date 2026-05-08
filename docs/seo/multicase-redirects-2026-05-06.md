# Multicase URL-redirects — 6. mai 2026

> **✅ Status 6. mai 2026: Alle 31 redirects lagt inn og verifisert live (301 → korrekt destinasjon på alle, Googlebot UA-test).**

Multicase aktiverte redirect-modulen 6. mai. Tilgang: **Verktøy → URL redirect** i webshop-admin (innlogget som administrator).

**Wildcard ikke støttet** — hver redirect må legges inn manuelt, én og én. Bruk **Permanent (301)**.

**Viktig advarsel fra Multicase:** «Det må ikke finnes en side med samme navn som (Fra Url) input feltet.» Hvis du får feilmeldingen *«Fra URL finnes fra før»* og URL-en ikke er i listevisningen, må du sjekke om det finnes et menypunkt i shoppen med samme URL — du kan ikke ha en redirect fra en URL når det også finnes en node med samme URL.

---

## ⚠️ Test FØRST før du legger inn alle 31

Begynn med **én** for å verifisere at systemet aksepterer `/manufacturers/{slug}` som "Fra URL":

| Fra Url | Til Url | Type |
|---|---|---|
| `/manufacturers/leatherman` | `/leatherman` | Permanent (301) |

Hvis denne legges inn uten feil → fortsett med resten. Hvis du får *«Fra URL finnes fra før»* — stopp og rapporter, så må vi tenke om.

---

## TIER A — `/manufacturers/*` kannibalisering (30 redirects)

Bakgrunn: Multicase auto-genererer `/manufacturers/{slug}` for alle produsenter. Disse er nesten-duplikater av `/{slug}`-sidene vi har bygget opp, har default-tittel + canonical pekende til seg selv → splitter SEO-autoritet. Verifisert 6. mai at alle 30 returnerer 200 (Googlebot UA).

Alle skal være **Permanent (301)**.

| # | Fra Url | Til Url |
|---:|---|---|
| 1 | `/manufacturers/leatherman` | `/leatherman` |
| 2 | `/manufacturers/hellberg` | `/hellberg` |
| 3 | `/manufacturers/wera` | `/wera` |
| 4 | `/manufacturers/pelicase` | `/pelicase` |
| 5 | `/manufacturers/stahlwille` | `/stahlwille` |
| 6 | `/manufacturers/milwaukee` | `/milwaukee` |
| 7 | `/manufacturers/snapon` | `/snapon` |
| 8 | `/manufacturers/facom` | `/facom` |
| 9 | `/manufacturers/knipex` | `/knipex` |
| 10 | `/manufacturers/pb-swiss-tools` | `/pb-swiss-tools` |
| 11 | `/manufacturers/mitutoyo` | `/mitutoyo` |
| 12 | `/manufacturers/ledlenser` | `/ledlenser` |
| 13 | `/manufacturers/mora-of-sweden` | `/mora-of-sweden` |
| 14 | `/manufacturers/fosen-tools` | `/fosen-tools` |
| 15 | `/manufacturers/fosen-tools-custom` | `/fosen-tools-custom` |
| 16 | `/manufacturers/kc-tools` | `/kc-tools` |
| 17 | `/manufacturers/gedore` | `/gedore` |
| 18 | `/manufacturers/zarges` | `/zarges` |
| 19 | `/manufacturers/brockhaus-heuer` | `/brockhaus-heuer` |
| 20 | `/manufacturers/fluke` | `/fluke` |
| 21 | `/manufacturers/rennsteig` | `/rennsteig` |
| 22 | `/manufacturers/bahco` | `/bahco` |
| 23 | `/manufacturers/gigant` | `/gigant` |
| 24 | `/manufacturers/solid-gear` | `/solid-gear` |
| 25 | `/manufacturers/viking-arm` | `/viking-arm` |
| 26 | `/manufacturers/lista-ag` | `/lista-ag` |
| 27 | `/manufacturers/bondhus` | `/bondhus` |
| 28 | `/manufacturers/hultafors` | `/hultafors` |
| 29 | `/manufacturers/husqvarna` | `/husqvarna` |
| 30 | `/manufacturers/sumake` | `/sumake` |

---

## TIER B — `/snap-on` er broken (1 redirect)

Verifisert 6. mai: `/snap-on` returnerer **302 til forsiden** (ikke til Snap-on-siden). Det er negativt for SEO og UX. Hovedinnholdet ligger på `/snapon`.

| Fra Url | Til Url | Type |
|---|---|---|
| `/snap-on` | `/snapon` | Permanent (301) |

---

## Etter alle er lagt inn

1. Kjør **«Automatisk fiks alle kjeder rekursivt»** i admin (toppknapp på URL Redirect-siden) — fanger kjeder som `/snap-on` → `/snapon` (gammel 302 må kanskje slettes først hvis den blokkerer)
2. Be om re-indeksering i GSC for primær-URL-er som tidligere var rammet av kannibalisering: `/leatherman`, `/hellberg`, `/wera`, `/snapon` (de 4 med høyest /manufacturers/-imps i april)
3. Følg opp i GSC i 2-4 uker: posisjon for "leatherman", "hellberg", "wera", "snap-on" — forventet stigning fra at autoritets-splittingen forsvinner

---

## Sitemap-status (separat spor)

`/merkevare/{slug}` finnes **ikke** i sitemap (verifisert 6. mai mot https://fosen-tools.no/sitemap.xml — 4689 URLer, kun produkt-URLer). Topp-nivå produsent-sider mangler fortsatt.

Multicase har ikke svart på utdypet sitemap-spørsmål ennå (svar 29. april var CSS-klasse-trick på skjult avdeling — gjør side aksesserbar og sitemap-inkludert mens den er CSS-skjult i meny). Følges opp separat.
