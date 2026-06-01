// Lokal render-test for milwaukee-okosystem-idéen (feature-mal).
import { renderInnlegg } from "../src/lib/services/innlegg/index.ts";
import { writeFileSync, mkdirSync } from "fs";

const data = {
  eyebrow: "BATTERIVERKTØY",
  kicker: "MILWAUKEE",
  headline: "200+ maskiner. Én batteripakke.",
  accent: "200+",
  subhead: "M18 og M12-økosystemet hos Fosen Tools",
  description:
    "Drill, sirkelsag, muttertrekker, kompressor, lykter og resten av Milwaukee-utvalget deler samme batteri og lader. Det er forskjellen mellom en samling verktøy og et arbeidssystem.",
  chapter: "Spotlight",
  cta: "fosen-tools.no/milwaukee",
  photo: "",
  // I direkte render-kall må vi bruke samme datastruktur som malen-koden venter:
  // bullets = string[], bulletsNum = [num, txt][] (tupler).
  // Innleggsmaler-UI gjør transformasjonen automatisk i toBuilderData().
  bullets: [
    "Samme batteri på over 200 maskiner",
    "M18 for de tunge jobbene, M12 for trange steder",
    "Hele økosystemet på lager hos oss",
    "Vi hjelper deg sette opp riktig pakke for jobben",
  ],
  bulletsNum: [
    ["01", "Samme batteri på 200+ maskiner"],
    ["02", "M18 for tunge jobber"],
    ["03", "M12 for trange steder"],
    ["04", "Vi setter opp riktig pakke"],
  ],
};

mkdirSync("out", { recursive: true });

for (const variant of ["A", "B", "C"]) {
  const result = await renderInnlegg("feature", variant, "fb", data);
  const buf = Buffer.from(result.base64, "base64");
  const path = `out/milwaukee-feature-${variant}.png`;
  writeFileSync(path, buf);
  console.log(`✓ ${path} (${(buf.length / 1024).toFixed(0)} KB, ${result.width}×${result.height})`);
}

process.exit(0);
