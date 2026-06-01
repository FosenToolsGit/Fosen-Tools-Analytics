/**
 * Oppdaterer midt-seksjonen på ALLE jubileum-utkast i `newsletter_wizard_drafts`
 * til den korrekte PROGRAM-teksten (10:00 — 15:00, PROFF kl 13, leverandører,
 * eventaktiviteter). Brukes hvis wizard-en har auto-lagret en gammel midt-seksjon
 * over den seedede teksten.
 *
 *   node --env-file=.env.local scripts/fix-jubileum-midt-section.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Mangler env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const correctMidt = {
  midtTitle: "PROGRAM 26. JUNI · 10:00 — 15:00",
  midtBody:
    "10:00 — Dørene åpner og messen starter\n" +
    "11:00 — 13:00 — Enkel servering\n" +
    "13:00 — PROFF presentasjon\n\n" +
    "På plass denne dagen: Milwaukee, Wera, Soudal, Picard/Halder og " +
    "Zweibrüder. I tillegg får vi besøk av Red Bull og Tesla Mobile Service.\n\n" +
    "✨ Eksklusive dagstilbud · 🎯 Konkurranser og aktiviteter · " +
    "🛠️ Faglig påfyll direkte fra ekspertene · 🎁 Goodiebag til de første",
  midtCtaText: "Meld meg på",
  midtCtaUrl:
    "https://fosen-tools.no/kundesenter/kontakt-oss?utm_source=mailchimp&utm_medium=email&utm_campaign=jubileum-2026-06-26&utm_content=midt-cta",
};

console.log("🔍 Henter jubileum-utkast...");

const { data: drafts, error: fetchErr } = await sb
  .from("newsletter_wizard_drafts")
  .select("id, title, wizard_state, updated_at")
  .or("title.ilike.%jubileum%,title.ilike.%STANDARD%,title.ilike.%25 år%,title.ilike.%feirer%")
  .order("updated_at", { ascending: false });

if (fetchErr) {
  console.error("❌ Hent feilet:", fetchErr);
  process.exit(1);
}

if (!drafts?.length) {
  console.log("Ingen jubileum-utkast funnet.");
  process.exit(0);
}

console.log(`📝 Fant ${drafts.length} utkast — oppdaterer midt-seksjon på alle...\n`);

for (const d of drafts) {
  const ws = d.wizard_state ?? {};
  const editContent = ws.editContent ?? {};
  const newEditContent = {
    ...editContent,
    ...correctMidt,
  };
  const preview = ws.preview ?? {};
  const newPreview = {
    ...preview,
    content: { ...(preview.content ?? {}), ...correctMidt },
  };
  const newWizardState = {
    ...ws,
    editContent: newEditContent,
    preview: newPreview,
    templateVariant: ws.templateVariant ?? "jubileum",
  };

  const { error: upErr } = await sb
    .from("newsletter_wizard_drafts")
    .update({ wizard_state: newWizardState })
    .eq("id", d.id);

  if (upErr) {
    console.error(`❌ ${d.id} (${d.title}):`, upErr.message);
  } else {
    console.log(`✅ ${d.id} — ${d.title}`);
  }
}

console.log("\n🎉 Ferdig. Last inn utkastet på nytt fra «Mine utkast» i nyhetsbrev-byggeren.");
