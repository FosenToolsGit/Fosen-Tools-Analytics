/**
 * Standalone caption-generator som replikerer Innholdsmotor sertifikat-archetype
 * for HDFI trust-signal-innlegg 21. mai 2026, kl 11:30 publishing.
 *
 * Bruker direkte Gemini 2.5 Flash med structured output. Ingen Supabase/server-server.
 */

import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("GEMINI_API_KEY mangler"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey });

// HDFI-side innhold (allerede ekstrahert tidligere)
const hdfiContext = `
KILDESIDE: https://fosen-tools.no/hdfi
TITLE: HDFI — FOD-sikring for luftfart og forsvar | Fosen Tools

INTRO: Skreddersydde HDFI (High Density Foam Insert) løsninger som gir effektiv organisering og tydelig visuell kontroll av verktøy og utstyr – tilpasset Lean-vedlikehold og 5S-prinsippene.

PRODUKT: HDFI er Fosen Tools egne skumminnlegg med gravert verktøysilhuett, to-farget plastplate i topp, og null-absorberende, løsemiddelbestandig skum. Hvert verktøy får eksakt tilpasset posisjon inkl. gripefelt.

FOD-SIKRING: HDFI er utviklet for å forebygge FOD (Foreign Object Damage) ved å redusere risiko og styrke sikkerheten. Standard del av FT Custom-leveranser til forsvar og luftfart.

CADLAB: I FT sin CADLAB (tegning- og utviklingsavdeling) får hver kunde et 3D-forslag før produksjonen starter. Typisk leveringstid 2-4 uker for standard, lengre for komplekse.

PRODUKSJON: CAD-designet og CNC-maskinert (IKKE "CNC-frest" — vi bruker "CNC-maskinert") med ekstrem presisjon. Egen produksjon siden 2004 — 22 år. Norsk produksjon med 100% fornybar energi.

KUNDER: Forhandlere, distributører, offshore, industri, forsvarssektor, luftfart.

NØKKELEGENSKAPER:
- CAD-designet og CNC-maskinert for perfekt passform
- To-farget plastplate i topp for ekstra holdbarhet
- Null-absorberende, løsemiddelbestandig skum
- Mulighet for lasermerking av verktøy/produkter
- Silhuett rundt hvert produkt for økt synlighet
- Detaljert gravering (logo/tekst/art.nr)
- Forenklet lagerstyring og verktøytelling i kritiske arbeidssituasjoner
- Standardisering av verksted- og avdelingsområder
- Satslister av produktinnhold tilgjengelig
- Norsk produksjon (100% fornybar energi)
- ESD-kompatible og brannhemmende innlegg tilgjengelig på forespørsel

KONTAKT: post@fosen-tools.no · +47 72 51 51 20 · Industrigata 1, 7130 Brekstad
`.trim();

const ftBrandRules = `
=== FOSEN TOOLS BRAND-STEMME ===
- Tone: Nøktern stolthet, fagspesifikt, ingen overskudd-jubel
- Eriks doktrine: "riktig verktøy for hverdagen" — ALDRI antall som feature
- ALDRI bruk "FG-godkjent våpenskap" (vi fører ikke det)
- ALDRI bruk "tom skuff"-mantra eller "antall skuffer som feature"
- ALDRI bruk spørsmål-åpning ("Hva er...", "Hvorfor...")
- ALWAYS bruk "CNC-maskinert" — ALDRI "CNC-frest"
- HDFI nevnes alene som "HDFI" (ikke "HDFI-skuminnlegg" eller "HDFI-skum")
- Brekstad er hovedlokasjon (Industrigata 1, 7130 Brekstad i Ørland)

=== ENGAGEMENT-DRIVERS (DATA-VERIFISERT) ===
- "skreddersydd" / "HDFI" / "CNC-maskinert" / "CADLAB" → +144% lift
- Start med emoji → +93% lift
- 2+ emojis → +67% lift
- Stolthet-tone ("levert", "ferdigstilt") → +38% lift
- CTA ("ta kontakt") → +15% lift
- Direkte spørsmål → -33%
- Eksplisitt "forsvar/militær" → -94% (filosofisk distance)
- 300+ tegn på Facebook → -44%

=== ARCHETYPE: SERTIFIKAT ===
Trust-signal-formatet. Fokus på 22 års produksjon, FOD-sikring, CADLAB, norsk produksjon.
Inkluder konkrete trust-signaler (22 år, 100% fornybar energi, CADLAB, sporbarhet).
IKKE bruk eksplisitt "Forsvaret" som hovedfokus (filosofisk distance gir -94%).
Bruk i stedet "luftfart, offshore, industri" som målgruppe-array.

=== PLATTFORM-SPESIFIKKE REGLER ===

FACEBOOK (caption_facebook):
- 100-250 tegn IDEELT (max 280)
- Start med emoji (helst 🎯 eller ✅ eller 🛠️)
- +144%-mønster: nevn "HDFI", "skreddersydd", "CNC-maskinert", eller "CADLAB"
- Stolthet-tone, ingen spørsmål
- Avslutt med kort CTA og lenke (lenken settes inn av brukeren)

INSTAGRAM (caption_instagram + hashtags_instagram):
- Visuelt fokus, 150-300 tegn
- 2+ emojis OK
- Mer punchy enn FB
- Hashtags som EGET FELT — leveres til 1. kommentar etter publisering
- Ingen lenke i caption (Instagram gjør lenker uklikkbare)

LINKEDIN (caption_linkedin):
- 400-700 tegn
- Fagspråk, ikke for personlig
- Nevn ISO 9001 / AS 9100 / FOD som relevante standarder
- Avslutt med konkret CTA + lenke (settes inn av bruker)

=== KILDESIDE ===
${hdfiContext}

=== OPPGAVE ===
Lag tre captions for HDFI trust-signal-innlegg (sertifikat-archetype) for Fosen Tools.
Tema: 22 års HDFI-produksjon, CADLAB, FOD-sikring, norsk produksjon, sertifisert kvalitet.
Publiseres kl 11:30 fredag 21. mai 2026 — peak-vindu er 12:00 tor/fre.

Returner KUN JSON i schema som angitt.
`.trim();

const schema = {
  type: Type.OBJECT,
  properties: {
    caption_facebook: { type: Type.STRING, description: "Facebook-caption 100-250 tegn, emoji-start, +144%-mønster, ingen lenke (legges til av bruker)" },
    caption_instagram: { type: Type.STRING, description: "Instagram-caption 150-300 tegn, 2+ emojis, ingen lenke" },
    hashtags_instagram: { type: Type.STRING, description: "10-15 hashtags adskilt med mellomrom, til 1. kommentar (uten #-prefiks i listen, jeg legger det til)" },
    caption_linkedin: { type: Type.STRING, description: "LinkedIn-caption 400-700 tegn, fagspråk, nevner ISO/AS9100/FOD, ingen lenke" },
    image_concept: { type: Type.STRING, description: "Kort beskrivelse av hvilket bilde-konsept som passer (1-2 setninger). Ingen AI-mennesker, ingen militær imagery, kun FT-rød palett." },
  },
  required: ["caption_facebook", "caption_instagram", "hashtags_instagram", "caption_linkedin", "image_concept"],
  propertyOrdering: ["caption_facebook", "caption_instagram", "hashtags_instagram", "caption_linkedin", "image_concept"],
};

console.log("Genererer via Gemini 2.5 Flash…\n");

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [{ role: "user", parts: [{ text: ftBrandRules }] }],
  config: {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0.85,
  },
});

const result = JSON.parse(response.text);

console.log("=".repeat(70));
console.log("📘 FACEBOOK (" + result.caption_facebook.length + " tegn)");
console.log("=".repeat(70));
console.log(result.caption_facebook);

console.log("\n" + "=".repeat(70));
console.log("📸 INSTAGRAM (" + result.caption_instagram.length + " tegn)");
console.log("=".repeat(70));
console.log(result.caption_instagram);

console.log("\n--- 1. KOMMENTAR (hashtags) ---");
const tags = result.hashtags_instagram.split(/\s+/).map((t) => t.startsWith("#") ? t : "#" + t).join(" ");
console.log(tags);

console.log("\n" + "=".repeat(70));
console.log("💼 LINKEDIN (" + result.caption_linkedin.length + " tegn)");
console.log("=".repeat(70));
console.log(result.caption_linkedin);

console.log("\n" + "=".repeat(70));
console.log("🎨 BILDE-KONSEPT");
console.log("=".repeat(70));
console.log(result.image_concept);

console.log("\n" + "=".repeat(70));
console.log("🔗 UTM-LINKER (kopier-klar)");
console.log("=".repeat(70));
console.log("Facebook:  https://fosen-tools.no/hdfi?utm_source=facebook&utm_medium=social&utm_campaign=hdfi-trust-2026-05-21&utm_content=trust-signal");
console.log("Instagram: https://fosen-tools.no/hdfi?utm_source=instagram&utm_medium=social&utm_campaign=hdfi-trust-2026-05-21&utm_content=trust-signal");
console.log("LinkedIn:  https://fosen-tools.no/hdfi?utm_source=linkedin&utm_medium=social&utm_campaign=hdfi-trust-2026-05-21&utm_content=trust-signal");

// Token usage
const usage = response.usageMetadata;
if (usage) {
  console.log("\n" + "=".repeat(70));
  console.log("📊 Gemini usage");
  console.log("=".repeat(70));
  console.log(`Prompt tokens:    ${usage.promptTokenCount}`);
  console.log(`Output tokens:    ${usage.candidatesTokenCount ?? usage.candidatesTokensCount}`);
}
