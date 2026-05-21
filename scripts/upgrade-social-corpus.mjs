/**
 * Upgrade social_corpus med kunnskap som mangler per 21. mai 2026.
 *
 * Endringer:
 * 1. HDFI-product utvidet med 6 standardfarger + ESD + brannhemmende + zoning
 * 2. visual_rules klargjort: blå er forbudt som GRAFISK aksent, men OK på HDFI-produkt
 * 3. FT-company utvidet med konkret kunde- og bransjelisting
 * 4. Ny archetype: produkt_variant (vise 6 farger / 3 størrelser / modeller)
 * 5. Ny topic_template: produkt_variant
 * 6. CADLAB-entry utvidet med 3D-forslag-prosess + ledetid
 *
 * Idempotent: bruker UPSERT på (kind, slug).
 */

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const entries = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. HDFI utvidet med fargeinformasjon
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "product",
    slug: "hdfi",
    title: "HDFI",
    content: `**HDFI** (High Density Foam Inserts) — Fosen Tools egne CAD-tegnede og CNC-maskinerte skuminnlegg.

**Hva det er:**
- Skreddersydd løsning som passer eksakt til kofferter, skuffer, vogner
- Hver utskjæring tegnet i CADLAB etter kundens spesifikke verktøy
- CNC-maskinert (ALDRI «CNC-frest») for nøyaktige toleranser
- Null-absorberende, løsemiddelbestandig skum i bunn (vanligvis svart)
- Tofarget plastplate i topp med gravert verktøysilhuett — der gravering skjer for maksimal slitestyrke
- Posisjons-gravering med art.nr / tekst / kundens logo i plastplaten

**Standardfarger på plastplate (topp/gravering):**
1. Rød / Hvit (FT-rød #B21F24 top, hvit gravering)
2. Svart / Hvit
3. Hvit / Svart
4. Blå / Hvit (deep navy #1B4C85)
5. Gul / Svart (industrial yellow #F2E546)
6. Lyse Grå / Svart

**Andre farger på forespørsel** (bedrifts-branding, kunde-egne farger).

**Spesialvarianter:**
- ESD-kompatibel (elektronikk-produksjon, anti-statisk)
- Brannhemmende (brann-sensitive miljøer, offshore, aviation)

**Bruksområder:**
- FOD-sikring (Foreign Object Debris) — særlig kritisk i aviation/Forsvaret
- Verktøykontroll i kvalitetssystemer (ISO 9001, AS 9100)
- Sporbarhet og «verktøy på plass» visualisering
- Beredskap (Politi, brann, helse, kriminalomsorg)

**Fargekoding som visuell styring (5S/Lean):**
- Rød = FOD-kritiske posisjoner
- Gul = sikkerhetsutstyr
- Blå = kvalitetskontroll
- Eller kunde-egen brand-farge for konsistent identitet

**Aldri:**
- Kall det «skuminnlegg», «HDFI-skum», «plastplate» — det er HDFI alene
- AI-generér det fotorealistisk (det er hva Native feilet på 11 ganger)
- Forveksle CNC-maskinering med «CNC-fresing»

**Typiske leveranser:**
- Pelicase med skreddersydd HDFI
- OPTI-koffert med HDFI (eks. TESS VEST 8. mai 2026)
- Verktøyvogner med HDFI per skuff (Odde Elektronett 762-rekord)
- FTINDU2-skap med HDFI
- Custom-kofferter til Forsvaret, aviation, offshore`,
    metadata: {},
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Visual_rules klargjort: blå-fargen
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "visual_rules",
    slug: "forbud",
    title: "KRITISK: visuelle forbud",
    content: `**Forbudte AI-bilde-motiv (lærdom fra 11 Native-avvisninger):**

1. **AI-genererte HDFI** — fotorealistisk skum/innlegg er IKKE GREIT. Vi bruker ekte foto av leveranser.
2. **AI-spokesmodel** — «tenkende mann ved tre-bord», «AI-mann i hettegenser», «konsulent-setting» — ALDRI fake mennesker.
3. **Tomme skuffer** — passer ikke Eriks doktrine («tom skuff»-mantraet er forbudt).
4. **Blanke røde rektangler** — abstrakte CAD-skisser i stedet for produkt-data.
5. **Cartoon/blomster/dekorativ støy** — HDFI som blomst, cartoon-mennesker, dekorative ikoner.
6. **Blå/grønn/oransje som GRAFISK AKSENT** — palett-fargene i type-grafikk og bakgrunn er KUN FT-rød + FT-ink + hvit (+ gull kun på jubileumslogo).
7. **«6 ledige skuffer»** — antall-som-feature.
8. **Plastplate-vs-HDFI-terminologi** — vi sier ALDRI plastplate om HDFI.

**Unntak — blå farge er OK når:**
- Det er en av de 6 HDFI-standardfargene som vises som PRODUKT-EGENSKAP (Blå/Hvit plastplate som svarvariant)
- Det er kundens egen brand-farge i en HDFI-leveranse-foto

Dette gjelder produkt-VISNING, ikke design-aksent. Hvis bildet handler om «HDFI kommer i blå variant», er den blå plastplaten korrekt — så lenge layouten ellers holder seg til FT-paletten (rød/ink/hvit bakgrunn, hvit typografi).

**Tillatt:** Typografi, store tall, abstrakt geometri i FT-palett, jubileumslogo med gull-gradient, ekte produkt-foto (HDFI i sine faktiske farger inkl. blå/gul).

**KRITISK regel:** Hvis bildet skal vise produkt-varianter (f.eks. 6 HDFI-fargevarianter), MÅ de faktiske produkt-fargene være synlige — det er hele poenget med bildet. Layout/typografi rundt forblir FT-palett.`,
    metadata: {},
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. FT-company utvidet
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "company",
    slug: "fosen-tools-as",
    title: "Fosen Tools AS",
    content: `Fosen Tools AS er en 25-årig (i 2026, etablert 2001) leverandør av proff-verktøy, skreddersydde HDFI-skuminnlegg og verktøyløsninger. Del av familiekonsern siden 1926 = 100 år med verdiskaping, 4. generasjon aktiv, Gaselle-bedrift.

**Lokasjon:** Industrigata 1, 7130 Brekstad i Ørland kommune (IKKE Rissa). Sekundær: Flatåsen, Trondheim. Tlf +47 72 51 51 20, post@fosen-tools.no. Helikopterlandingsplass (18m diameter) ved anlegget. Åpningstider 07:00–15:00.

**Egne produkter (FT Custom):**
- HDFI (High Density Foam Inserts) — siden 2004, 22 år
- FT Systemvegg (modulær veggmontert verktøyløsning)
- Weapon Storage (våpenskap til Forsvar, Politi, kriminalomsorg)
- Mobilhotell (mobile lagringsløsninger)
- Skreddersydde verktøyvogner

**Egen CADLAB** (tegnings-/utviklingsavdeling) som CAD-tegner og CNC-maskinerer skreddersydde løsninger. Levert et 3D-forslag før produksjon. Typisk leveringstid 2-4 uker for standard, lengre for komplekse.

**Målgrupper:** Forsvaret, aviation (sivil/militær), offshore, mekanisk verksted, industri, bygg/anlegg, beredskap (politi/brann/helse), kriminalomsorg, skoler, og spesialiserte forhandlere.

**Konkrete kunde-eksempler (referansepoint):**
- Forsvaret (etabletert kunde — men «20 år til Forsvaret»-vinkling er overbrukt per mai 2026)
- Andøya Space (Husqvarna Automower-leveranse, 542 eng — uvanlig bruksområde, rakettlaunch-site)
- Alier Trondheim (HDFI-leveranse, 282 eng)
- TESS VEST (OPTI-koffert med kraftpipe-HDFI, 8. mai 2026)
- Odde Elektronett (FT-rekord 762 eng på FB)
- Lufttransport AS (Facom JET verktøyskap-leveranse, 16. mai 2026)

**40+ merker forhandles:** Wera, Knipex, Snap-on, Stahlwille, Rennsteig, Facom, Lista, PB Swiss Tools, Husqvarna, Milwaukee, Hultafors, Mora, Leatherman, Bahco, Gedore, Brockhaus Heuer, KC Tools, Mitutoyo, Ledlenser, Hellberg, Zarges, Fluke, Solid Gear, Snickers Workwear, Pelicase m.fl.

**«Fosen Tools standard»** referert av Forsvaret = sterkt B2B-signal — men IKKE bruk denne vinklingen som hovedhook, den er mettet. Bruk konkrete leveranser i stedet.

**Bærekraft:** 100% selvforsynt fornybar energi (solcellepark 2023), elektriske firmakjøretøy, Miljøfyrtårn-sertifisert, Grønt Punkt Norge, godkjent lærebedrift. CO₂-utslipp 7,94 tonn 2025.

**Vi fører IKKE FG-godkjente våpenskap** (privatmarked). Vi fører mobilhotell + våpenskap til Politi/Forsvar/kriminalomsorg.`,
    metadata: {},
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CADLAB utvidet
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "product",
    slug: "cadlab",
    title: "CADLAB",
    content: `**CADLAB** — Fosen Tools egen tegnings- og utviklingsavdeling.

**Hva de gjør:**
- CAD-tegner skreddersydde HDFI etter kundens verktøy
- Designer FT Custom-løsninger (Systemvegg, Weapon Storage, mobilhotell)
- Spesifiserer produksjon for CNC-maskinering
- Kvalitetskontrollerer mot kundens spec

**Kundeprosess (4 trinn):**
1. Kunde tar kontakt på post@fosen-tools.no eller +47 72 51 51 20
2. Vi kartlegger verktøyene, koffert/vogn-spec, evt. merking/logo
3. Du får 3D-forslag fra CADLAB
4. Produksjon (CNC-maskinering på Brekstad) — typisk 2-4 uker

**SEO-vinkel:** «CADLAB» som proper noun differensierer FT fra forhandlere som bare selger ferdige løsninger. Bruk det som distinkt FT-signatur.

**Bruk i caption:** «Tegnet i CADLAB», «CADLAB designet», «fra CADLAB til CNC», «3D-forslag fra CADLAB».`,
    metadata: {},
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. NY archetype: produkt_variant
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "archetype",
    slug: "produkt_variant",
    title: "Produkt-varianter (farger/størrelser/modeller)",
    content: `**Når:** Vi vil vise at et FT-produkt finnes i flere varianter — typisk:
- HDFI i 6 standardfarger
- Verktøykoffert i 3 størrelser
- Pelicase-varianter (Protector / Air / Storm)
- Skap-varianter (FTINDU1 / FTINDU2 / Systemvegg)

**Visuell layout:**
- Grid (typisk 2×3, 3×2, eller 3×1) med produkt-swatches/varianter
- Hver swatch viser variant tydelig (farge-prøve, miniatyr, etikett)
- KORT label per swatch (1-3 ord, f.eks. fargenavn)
- Hovedheadline øverst på siden (UPPERCASE, 5-8 ord)
- Wordmark nederst (composite-et server-side)

**Tone i tekst:**
- Headline må anker variasjonen («SEKS FARGER. ÉN STANDARD.», «FIRE STØRRELSER. SAMME PRESISJON.»)
- Body: hva varianter brukes til (zoning, branding, bruksområde)

**KRITISK:** Hvis temaet er HDFI-farger, MÅ de faktiske produkt-fargene være synlige som farge-prøver. Layout/typografi rundt forblir FT-palett (rød/ink/hvit bakgrunn). De produkt-spesifikke fargene er TILLATT inni swatch-grid-en — det er ikke design-aksent, det er produkt-fakta.

**Bakgrunn:** FT-ink #0F1115 med subtil rød radial glow (lar swatches stå frem), eller full FT-red bg hvis swatches er produkt-foto med eget bakgrunn.

**Eksempel-bruk:**
- HDFI: 6 fargevarianter
- Pelicase: 4 størrelser
- Verktøyvogn: 3 modeller`,
    metadata: { aspect_hint: "1:1" },
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. NY topic_template: produkt_variant
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "topic_template",
    slug: "produkt_variant",
    title: "Produkt-variant (farger/størrelser/modeller)",
    content: `**Når:** Vi vil vise at et FT-produkt finnes i flere varianter (HDFI 6 farger, Pelicase 4 størrelser, Skap 3 modeller).

**Anbefalt archetype:** produkt_variant (vise variantene visuelt). Statement går også hvis du heller vil ha typografi.

**Caption-mal (FB, 140-280 tegn):**
- 🎨 / 🛠️ emoji-opener
- Hovedpoeng: variasjonen ER produktet («6 farger», «4 størrelser», «3 modeller»)
- KORT begrunnelse: hvorfor variantene gir verdi (zoning, bruksområde, branding)
- CTA: «Ta kontakt» eller «3D-forslag fra CADLAB»

**Eksempel:**
> 🎨 6 standardfarger. HDFI tilpasset hvert miljø.
> Rød. Svart. Hvit. Blå. Gul. Lyse grå.
> Egne farger på forespørsel.
> Skreddersydd i CADLAB, CNC-maskinert i Brekstad.

**LinkedIn (400-700 tegn):**
- Fagspråk + bruksområde for hver variant (FOD-zoning, kvalitetssystem, bedrifts-branding)
- Nevn ISO 9001 / AS 9100 / 5S/Lean som kontekst
- Avslutt med 3D-forslag-CTA

**Instagram (150-300 tegn):**
- 2+ emojis OK
- Punchy
- «Link i bio» (Instagram lenker funker ikke i caption)
- Hashtags i 1. kommentar (#HDFI #FargeKoding #VisuellStyring #5S #LeanMaintenance #FosenTools)

**Input fra operatør:**
- Brief beskriver variant-typen (farger / størrelser / modeller)
- Antall varianter
- Bruksområde-vinkling

**Bilde-instruks for image-gen-LLM:**
- Bruk archetype=produkt_variant
- Image_body skal liste opp variantene KORT
- Image_headline = hovedpoenget (f.eks. «SEKS FARGER. ÉN STANDARD.»)`,
    metadata: {},
    active: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Ny rejected_pattern: fargevisning som mangler farger
  // ─────────────────────────────────────────────────────────────────────────
  {
    kind: "rejected_pattern",
    slug: "fargevisning-mangler-farger",
    title: "Fargevisning-post som ikke viser fargene",
    content: `**Avvist:** Et innlegg om «6 fargevarianter på HDFI» som viser kun en mono-rød verktøyvogn — uten å vise de faktiske 6 fargene.

**Eksempel:** Generert 21. mai 2026, Statement-archetype, bilde-output ble en blueprint-tegning av verktøyvogn på rød bakgrunn med headline «SEKS FARGER. ÉN STANDARD.» — men variantene var usynlige.

**Hvorfor:** Statement-archetype er KUN typografi-poster. Når temaet er FARGEVALG, MÅ bildet vise fargene faktisk. Bruk archetype=produkt_variant i stedet, eller utvid statement med visual_subject.

**Regel:** Hvis brief eller headline nevner farger/varianter/modeller, må bildet vise variasjonen — ellers underleverer det på det viktigste budskapet.`,
    metadata: {},
    active: true,
  },
];

(async () => {
  console.log(`Oppdaterer ${entries.length} corpus-entries…\n`);
  for (const e of entries) {
    const { error } = await supabase
      .from("social_corpus")
      .upsert(e, { onConflict: "kind,slug" });
    if (error) {
      console.error(`  ❌  ${e.kind}/${e.slug}: ${error.message}`);
    } else {
      console.log(`  ✓  ${e.kind}/${e.slug}  (${e.content.length} tegn)`);
    }
  }
  console.log("\nFerdig.");
})();
