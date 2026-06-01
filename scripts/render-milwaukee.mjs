// Lokal render-test for milwaukee-okosystem-idéen.
import { renderInnlegg } from "../src/lib/services/innlegg/index.ts";
import { writeFileSync, mkdirSync } from "fs";

const data = {
  manufacturer: "MILWAUKEE",
  tagline: "M18 og M12-økosystemet",
  items: [
    { name: "Verktøyvogn 10 skuffer SRC46-1", priceNow: "16667", photo: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/32403/image/66640dc9-0bd3-41ae-bc77-604be8b1eb80/4932478852--hero_1.w900.jpg" },
    { name: "Sirkelsag M18 CCS55-0", priceNow: "3475", photo: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/52148/image/ff5a89f2-c16a-47a2-8318-c596cfdfc78a/m18_ccs55-0--hero_1.w900.jpg" },
    { name: "Popnaglepistol M12 BPRT", priceNow: "4190", photo: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/55333/image/b3bd145d-e9fe-47f5-a7f9-c26286768128/m12_bprt-201x--hero_2.w900.jpg" },
    { name: "Muttertrekker M12 FIWF12-0", priceNow: "950", photo: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/55999/image/00aee763-6b11-4f8f-9b80-8dd7f41ff7cc/m12_fiwf12-0--hero_1.w720.jpg" },
  ],
};

mkdirSync("out", { recursive: true });

for (const variant of ["A", "B", "C"]) {
  const result = await renderInnlegg("produkt-mfr", variant, "fb", data);
  const buf = Buffer.from(result.base64, "base64");
  const path = `out/milwaukee-okosystem-${variant}.png`;
  writeFileSync(path, buf);
  console.log(`✓ ${path} (${(buf.length / 1024).toFixed(0)} KB, ${result.width}×${result.height})`);
}

process.exit(0);
