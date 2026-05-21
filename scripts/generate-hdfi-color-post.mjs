/**
 * Generer HDFI farge-vinkling caption + lagre som draft i social_drafts
 * så den vises i Innholdsmotor Kø-tab.
 *
 * Tema: 6 standardfarger + skreddersydd på forespørsel + ESD/brannhemmende.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const brief = `
=== FOSEN TOOLS BRAND ===
- "CNC-maskinert" — ALDRI "CNC-frest"
- HDFI nevnes som "HDFI" alene
- Tone: nøktern stolthet, ikke salgs-jubel
- ALDRI antall-som-feature, ALDRI spørsmål-åpning, ALDRI eksplisitt "Forsvaret"
- "Skreddersydd" + "HDFI" + "CNC-maskinert" + "CADLAB" → +144% engagement
- Emoji-start → +93%

=== TEMA: 6 STANDARDFARGER PÅ HDFI ===
HDFI leveres med to-farget plastplate i topp. 6 standardfarger:
1. Rød / Hvit
2. Svart / Hvit
3. Hvit / Svart
4. Blå / Hvit
5. Gul / Svart
6. Lyse Grå / Svart

Andre overflater/farger på forespørsel. ESD-kompatible og brannhemmende også tilgjengelig.

Bruk farge for:
- Visuell zoning av verksted (gul=sikkerhet, rød=FOD-kritisk, blå=kvalitet)
- Bedrifts-branding (kunders egen farge)
- 5S/Lean visuell kontroll

=== ARCHETYPE: STATEMENT ===
Punchy fargevalg-vinkling. Kort, kraftig. Vise at HDFI = tilpassbar, ikke generisk.

=== PLATTFORMER ===
- FACEBOOK: 150-250 tegn, emoji-start, +144%-drivers, ingen lenke
- INSTAGRAM: 150-280 tegn, 2+ emojis, ingen lenke. Hashtags separat.
- LINKEDIN: 400-700 tegn, fagspråk, nevn 5S/Lean/visual management

Lag tre captions for HDFI-fargevalg-tema. Publisering fredag 21. mai 2026 kl 11:30.
Returner KUN JSON i schema.
`.trim();

const schema = {
  type: Type.OBJECT,
  properties: {
    caption_facebook: { type: Type.STRING },
    caption_instagram: { type: Type.STRING },
    hashtags_instagram: { type: Type.STRING, description: "10-15 hashtags adskilt med mellomrom, uten #-prefiks" },
    caption_linkedin: { type: Type.STRING },
    image_concept: { type: Type.STRING, description: "Bilde-konsept: 6 fargevarianter HDFI vist side-om-side eller fanned ut. Ingen mennesker. FT-rød + brand-palett." },
    title: { type: Type.STRING, description: "Intern arbeidstittel for draften (norsk, kort)" },
  },
  required: ["caption_facebook", "caption_instagram", "hashtags_instagram", "caption_linkedin", "image_concept", "title"],
  propertyOrdering: ["title", "caption_facebook", "caption_instagram", "hashtags_instagram", "caption_linkedin", "image_concept"],
};

console.log("Genererer farge-vinkling via Gemini 2.5 Flash…\n");

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-lite",
  contents: [{ role: "user", parts: [{ text: brief }] }],
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
console.log("\n--- 1. KOMMENTAR ---");
const tags = result.hashtags_instagram.split(/\s+/).map(t => t.startsWith("#") ? t : "#" + t).join(" ");
console.log(tags);

console.log("\n" + "=".repeat(70));
console.log("💼 LINKEDIN (" + result.caption_linkedin.length + " tegn)");
console.log("=".repeat(70));
console.log(result.caption_linkedin);

console.log("\n" + "=".repeat(70));
console.log("🎨 BILDE-KONSEPT");
console.log("=".repeat(70));
console.log(result.image_concept);

// Lagre i social_drafts
console.log("\n\nLagrer som draft i social_drafts…");
const { data, error } = await supabase
  .from("social_drafts")
  .insert({
    topic_kind: "produktlansering",
    archetype: "statement",
    title: result.title,
    source_url: "https://fosen-tools.no/hdfi",
    source_data: {
      page_title: "HDFI — FOD-sikring for luftfart og forsvar | Fosen Tools",
      standard_colors: [
        "Rød / Hvit", "Svart / Hvit", "Hvit / Svart",
        "Blå / Hvit", "Gul / Svart", "Lyse Grå / Svart",
      ],
      extras: ["ESD-kompatibel på forespørsel", "Brannhemmende på forespørsel", "Andre farger på forespørsel"],
    },
    brief: "HDFI farge-vinkling: 6 standardfarger + skreddersydd på forespørsel. Statement-archetype.",
    captions: {
      facebook: result.caption_facebook,
      instagram: result.caption_instagram,
      instagram_hashtags: tags,
      linkedin: result.caption_linkedin,
    },
    status: "draft",
    model_used: "gemini-2.5-flash-lite",
    generation_cost: 0.0008,
  })
  .select("id")
  .single();

if (error) {
  console.error("DB-feil:", error);
  process.exit(1);
}

console.log(`\n✅ Lagret som draft id=${data.id}`);
console.log(`   Åpne i Innholdsmotor: http://localhost:3001/innholdsmotor (Kø-tab)`);

// UTM-linker
console.log("\n" + "=".repeat(70));
console.log("🔗 UTM-LINKER");
console.log("=".repeat(70));
console.log("Facebook:  https://fosen-tools.no/hdfi?utm_source=facebook&utm_medium=social&utm_campaign=hdfi-farger-2026-05-21&utm_content=color-options");
console.log("Instagram: https://fosen-tools.no/hdfi?utm_source=instagram&utm_medium=social&utm_campaign=hdfi-farger-2026-05-21&utm_content=color-options");
console.log("LinkedIn:  https://fosen-tools.no/hdfi?utm_source=linkedin&utm_medium=social&utm_campaign=hdfi-farger-2026-05-21&utm_content=color-options");

const usage = response.usageMetadata;
console.log(`\n📊 Tokens: prompt=${usage.promptTokenCount}, output=${usage.candidatesTokenCount ?? "?"}`);
