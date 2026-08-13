// Gjør bakgrunnen uskarp uten å røre motivet.
//
//   node scripts/ref-blur.mjs --inn f.jpg --ut u.jpg [--topp 0.34] [--bunn 0.22] [--mykt 0.10] [--styrke 22]
//
// Rot i verkstedbilder ligger langs kantene: reoler og tak øverst, gulv, paller
// og føtter nederst. En gradient fra kanten fjerner det uten maskering, og kan
// derfor ikke svikte langs konturen av motivet.
//
// --topp 0.34  = uskarpt over øverste 34 % av høyden
// --bunn 0.22  = uskarpt under nederste 22 %
// Begge kan brukes samtidig.
import sharp from "sharp";

const arg = (n, d = null) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const inn = arg("inn"), ut = arg("ut");
const topp = arg("topp") ? Number(arg("topp")) : null;
const bunn = arg("bunn") ? Number(arg("bunn")) : null;
const mykt = Number(arg("mykt", "0.10"));
const styrke = Number(arg("styrke", "22"));
if (!inn || !ut || (!topp && !bunn)) {
  console.log("bruk: --inn <fil> --ut <fil> [--topp 0.34] [--bunn 0.22] [--mykt 0.10] [--styrke 22]");
  process.exit(1);
}

// Målene må leses ETTER rotate(), ellers står bredde og høyde byttet om på
// stående bilder, og maska får feil format.
const original = await sharp(inn).rotate().toBuffer();
const { width: W, height: H } = await sharp(original).metadata();
const uskarp = await sharp(original).blur(styrke).toBuffer();

// dest-in bruker ALFA, ikke lysstyrke. Gradienten må gå fra ugjennomsiktig til
// gjennomsiktig, ellers beholdes hele det uskarpe laget.
const stopp = [];
if (topp) {
  stopp.push(`<stop offset="0" stop-color="#fff" stop-opacity="1"/>`);
  stopp.push(`<stop offset="${Math.max(0, topp - mykt).toFixed(4)}" stop-color="#fff" stop-opacity="1"/>`);
  stopp.push(`<stop offset="${topp.toFixed(4)}" stop-color="#fff" stop-opacity="0"/>`);
} else {
  stopp.push(`<stop offset="0" stop-color="#fff" stop-opacity="0"/>`);
}
if (bunn) {
  stopp.push(`<stop offset="${(1 - bunn).toFixed(4)}" stop-color="#fff" stop-opacity="0"/>`);
  stopp.push(`<stop offset="${Math.min(1, 1 - bunn + mykt).toFixed(4)}" stop-color="#fff" stop-opacity="1"/>`);
  stopp.push(`<stop offset="1" stop-color="#fff" stop-opacity="1"/>`);
} else {
  stopp.push(`<stop offset="1" stop-color="#fff" stop-opacity="0"/>`);
}

const maske = Buffer.from(
  `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
  stopp.join("") + `</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);

const lag = await sharp(uskarp).composite([{ input: maske, blend: "dest-in" }]).png().toBuffer();
await sharp(original).composite([{ input: lag }]).jpeg({ quality: 94 }).toFile(ut);
console.log("  " + ut.split("/").pop().padEnd(14) +
  (topp ? "topp " + Math.round(topp * 100) + "%  " : "") +
  (bunn ? "bunn " + Math.round(bunn * 100) + "%  " : "") + "radius " + styrke);
