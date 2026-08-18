#!/usr/bin/env node
/**
 * AI-synlighetssporing — månedlig løpende måling av AI-discoverability-planen
 * (docs/seo/ai-discoverability-plan-2026-05-24.md).
 *
 * Kjører de 7 retest-promptene mot Gemini med Google-søk-grounding (nærmest
 * det en ekte bruker får i AI-svar), trekker ut hvilke merkevarer som nevnes
 * og om/hvor Fosen Tools dukker opp, og logger alt til Supabase
 * (`ai_visibility_checks`, migrasjon 027). Sammenligner mot forrige kjøring.
 *
 *   node --env-file=.env.local scripts/ai-synlighet.mjs
 *
 * Kjøres månedlig (se datostyrte sjekker i memory) + før hver kvartals-retest
 * (24. august, 24. november). Kost: ~14 Gemini-kall per kjøring — øre-nivå.
 */
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const MODEL = "gemini-2.5-flash";

// De 4 baseline-promptene (24. mai 2026) + de 3 kvartals-promptene.
const PROMPTS = [
  "Beste leverandører av industri-verktøy i Trøndelag",
  "Hvem leverer verktøykontroll-løsninger til norsk luftfart?",
  "Norske leverandører av skreddersydde HDFI til Forsvaret",
  "Pelicase Norge leverandør",
  "Hva er HDFI?",
  "Norske leverandører av verktøykontroll",
  "Beste leverandør av skreddersydde verktøyløsninger Norge",
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function medRetry(fn, forsok = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      const status = e?.status ?? e?.error?.code;
      if (i >= forsok || ![429, 500, 503].includes(status)) throw e;
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
}

// 1) Selve spørsmålet, med søke-grounding — svaret en bruker ville fått.
async function sporGrounded(prompt) {
  const res = await medRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  }));
  const answer = res.text ?? "";
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c) => ({ title: c.web?.title ?? "", uri: c.web?.uri ?? "" }))
    .filter((s) => s.uri);
  return { answer, sources };
}

// 2) Strukturert uttrekk av merkevarer fra svaret (eget kall — JSON-modus og
// grounding kan ikke kombineres i samme request).
async function trekkUtMerker(prompt, answer) {
  const res = await medRetry(() => ai.models.generateContent({
    model: MODEL,
    contents:
      `Under er et AI-svar på spørsmålet «${prompt}». List alle firma-/merkenavn ` +
      `som nevnes, i den rekkefølgen de først forekommer. Returner KUN JSON: ` +
      `{"brands": ["..."]}. Ta med alle leverandører/forhandlere/produsenter, ` +
      `ikke produktkategorier.\n\nSVAR:\n${answer}`,
    config: { responseMimeType: "application/json" },
  }));
  try {
    const parsed = JSON.parse(res.text ?? "{}");
    return Array.isArray(parsed.brands) ? parsed.brands.map(String) : [];
  } catch { return []; }
}

const erFT = (navn) => /fosen[\s-]?tools/i.test(navn);

console.log(`AI-synlighet — ${PROMPTS.length} prompts mot ${MODEL} (grounded)\n`);

// Forrige kjøring, til sammenligning
const { data: forrigeRader } = await sb
  .from("ai_visibility_checks")
  .select("run_date,prompt,ft_mentioned,ft_rank")
  .order("run_date", { ascending: false })
  .limit(200);
const forrigeDato = forrigeRader?.[0]?.run_date;
const forrige = new Map(
  (forrigeRader ?? []).filter((r) => r.run_date === forrigeDato).map((r) => [r.prompt, r]),
);

const rader = [];
for (const prompt of PROMPTS) {
  const { answer, sources } = await sporGrounded(prompt);
  const brands = await trekkUtMerker(prompt, answer);
  const ftIdx = brands.findIndex(erFT);
  const ftMentioned = ftIdx >= 0 || /fosen[\s-]?tools/i.test(answer);
  const ftRank = ftIdx >= 0 ? ftIdx + 1 : null;

  rader.push({
    prompt, model: MODEL, grounded: true,
    ft_mentioned: ftMentioned, ft_rank: ftRank,
    brands_mentioned: brands, answer, sources,
  });

  const status = ftMentioned ? `✅ nevnt${ftRank ? ` (#${ftRank} av ${brands.length})` : ""}` : "❌ ikke nevnt";
  const prev = forrige.get(prompt);
  const endring = prev && prev.ft_mentioned !== ftMentioned
    ? (ftMentioned ? "  🔺 NY — var ikke nevnt sist" : "  🔻 MISTET — var nevnt sist")
    : "";
  console.log(`${status}${endring}  «${prompt}»`);
  if (brands.length) console.log(`   merker: ${brands.slice(0, 8).join(", ")}${brands.length > 8 ? " …" : ""}`);
  if (!ftMentioned && sources.length)
    console.log(`   kilder AI brukte (mention-gap-kandidater): ${sources.slice(0, 4).map((s) => s.title || s.uri).join(" · ")}`);
}

const { error } = await sb.from("ai_visibility_checks").insert(rader);
if (error) { console.error("\nSupabase-insert feilet:", error.message); process.exit(1); }

const antallNevnt = rader.filter((r) => r.ft_mentioned).length;
console.log(`\nFT nevnt i ${antallNevnt}/${PROMPTS.length} svar` +
  (forrigeDato ? ` (forrige kjøring ${forrigeDato}: ${[...forrige.values()].filter((r) => r.ft_mentioned).length}/${forrige.size})` : " (første kjøring — baseline satt)"));
console.log("Lagret i ai_visibility_checks. Suksess-mål 12 mnd: 4/7 topp-3 + «Hva er HDFI?» forklart med FT som referanse.");
