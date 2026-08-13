// Gjør en mappe med prosjektbilder klar for opplasting til fosen-tools.no.
//
//   node scripts/ref-bilder.mjs --kat verktøyvogner --slug min-case --fra "~/Downloads/Mappe"
//
// Skalerer til maks 1600 px på lengste side, roterer etter EXIF, navngir
// IMG1.jpg og oppover, og legger dem i en mappe som heter det samme som stien
// i Multicase. Da er opplastingen ren dra-og-slipp.
//
// Rekkefølgen styrer slideren. Filene sorteres på navn, så velg rekkefølgen i
// kildemappa, eller send --rekke "DSC7,DSC3,DSC9" for å styre den eksplisitt.
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

const arg = (n, fallback = null) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const hjem = (p) => p.replace(/^~/, os.homedir());

// Mappenavnet i /userfiles bruker stor forbokstav, slik Fjord Helikopter ble lagt inn.
const KATALOG = {
  "verktøyvogner": "Verktøyvogner",
  "verktøykofferter": "Verktøykofferter",
  "verktøykasser": "Verktøykasser",
  "softcase": "Softcase",
  "våpenlagring": "Våpenlagring",
  "verkstedinnredning": "Verkstedinnredning",
  "lasermerking": "Lasermerking",
  "containere": "Containere",
  "verktøyinnlegg": "Verktøyinnlegg",
};

const kat = arg("kat");
const slug = arg("slug");
const fra = arg("fra");
const maks = Number(arg("maks", "1600"));
const rekke = arg("rekke");
const kun = process.argv.includes("--kun");   // bruk bare bildene i --rekke, dropp resten
// Verkstedrot ligger nesten alltid øverst i bildet: reoler, esker, tak. En
// gradert blur ovenfra fjerner det uten å røre motivet, og uten maskering som
// kan gå galt langs kanten.
const blurTopp = arg("blur", null);          // f.eks. --blur 0.34
const blurStyrke = Number(arg("blurstyrke", "22"));

if (!kat || !slug || !fra) {
  console.log("bruk: node scripts/ref-bilder.mjs --kat <kategori> --slug <case-slug> --fra <mappe> [--maks 1600] [--rekke \"a,b,c\"] [--kun]");
  console.log("--kun: ta med bare bildene i --rekke, i den rekkefølgen");
  console.log("--blur 0.34: gradert blur over øverste 34 % av høyden, mot rotete bakgrunn");
  console.log("kategorier: " + Object.keys(KATALOG).join(", "));
  process.exit(1);
}
if (!KATALOG[kat]) {
  console.log("ukjent kategori: " + kat + "\nvelg blant: " + Object.keys(KATALOG).join(", "));
  process.exit(1);
}

const kilde = hjem(fra);
if (!fs.existsSync(kilde)) { console.log("finner ikke mappa: " + kilde); process.exit(1); }

let filer = fs.readdirSync(kilde)
  .filter((f) => /\.(jpe?g|png|heic|webp|tiff?)$/i.test(f) && !f.startsWith("."))
  // Duplikatene macOS lager ved kopiering, «bilde 2.jpg», hopper vi over.
  .filter((f) => !/ \d+\.(jpe?g|png|heic|webp|tiff?)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, "nb"));

if (rekke) {
  const ønsket = rekke.split(",").map((s) => s.trim().toLowerCase());
  const treff = [];
  for (const nøkkel of ønsket) {
    const f = filer.find((x) => x.toLowerCase().includes(nøkkel));
    if (f && !treff.includes(f)) treff.push(f);
    else if (!f) console.log("  fant ikke: " + nøkkel);
  }
  filer = kun ? treff : [...treff, ...filer.filter((f) => !treff.includes(f))];
}

if (!filer.length) { console.log("ingen bilder i " + kilde); process.exit(1); }

const katalog = KATALOG[kat];
const stiUrl = "/userfiles/image/Referanser/" + katalog + "/" + slug + "/";
const ut = path.join(os.homedir(), "Desktop", "FT-opplasting", katalog, slug);
fs.mkdirSync(ut, { recursive: true });
for (const g of fs.readdirSync(ut)) fs.unlinkSync(path.join(ut, g));

console.log("\n  " + kilde + "\n  " + filer.length + " bilder\n");
let før = 0, etter = 0;
for (let i = 0; i < filer.length; i++) {
  const inn = path.join(kilde, filer[i]);
  const navn = "IMG" + (i + 1) + ".jpg";
  før += fs.statSync(inn).size;
  let bilde = sharp(inn).rotate();             // rotate() retter opp etter EXIF
  if (blurTopp) {
    const b = await bilde.toBuffer();
    const m = await sharp(b).metadata();
    const y0 = (Number(blurTopp) - 0.12).toFixed(4), y1 = Number(blurTopp).toFixed(4);
    const maske = Buffer.from(
      `<svg width="${m.width}" height="${m.height}"><defs>` +
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="1"/>` +
      `<stop offset="${Math.max(0, y0)}" stop-color="#fff" stop-opacity="1"/>` +
      `<stop offset="${y1}" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient></defs><rect width="${m.width}" height="${m.height}" fill="url(#g)"/></svg>`);
    const lag = await sharp(await sharp(b).blur(blurStyrke).toBuffer())
      .composite([{ input: maske, blend: "dest-in" }]).png().toBuffer();
    bilde = sharp(await sharp(b).composite([{ input: lag }]).jpeg({ quality: 95 }).toBuffer());
  }
  await bilde
    .resize({ width: maks, height: maks, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(ut, navn));
  const m = await sharp(path.join(ut, navn)).metadata();
  const st = fs.statSync(path.join(ut, navn));
  etter += st.size;
  console.log(`  ${navn.padEnd(9)} ${String(m.width).padStart(4)}x${String(m.height).padEnd(4)} ${String(Math.round(st.size/1024)).padStart(4)} kB   ${filer[i]}`);
}

console.log(`\n  ${(før/1048576).toFixed(1)} MB  ->  ${(etter/1048576).toFixed(1)} MB`);
console.log("\n  legg filene her i Multicase:\n    " + stiUrl);
console.log("\n  de ligger klare i:\n    " + ut);

// Linja som skal inn i datafila, ferdig formatert. Både katalog og slug må
// prosentkodes, ellers brekker stien så snart en av dem har ø eller å.
const encKat = encodeURIComponent(katalog);
const encSlug = encodeURIComponent(slug);
console.log("\n  bilder-feltet til datafila:\n" +
  "    bilder: [" + filer.map((_, i) => i + 1).join(", ") + "].map(\n" +
  "      (n) => \"/userfiles/image/Referanser/" + encKat + "/" + encSlug + "/IMG\" + n + \".jpg\"\n" +
  "    ),\n");
