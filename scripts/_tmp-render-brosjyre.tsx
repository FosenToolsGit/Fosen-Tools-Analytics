import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { chromium } from "playwright";
import { ObjectRenderer } from "../src/components/brosjyre/object-renderer";
const [id, outDir] = process.argv.slice(2);
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await supa.from("brochures").select("doc").eq("id", id).single();
  const doc = data!.doc;
  const css = fs.readFileSync("src/components/brosjyre/editor.css", "utf8");
  const pages = doc.pages.map((page: any) => renderToStaticMarkup(
    <div className="page-paper" style={{ width: `${page.w}mm`, height: `${page.h}mm`, background: page.bg, position: "relative", overflow: "hidden", marginBottom: "10mm" }}>
      {page.objects.map((obj: any) => (
        <div key={obj.id} style={{ position: "absolute", left: `${obj.x}mm`, top: `${obj.y}mm`, width: `${obj.w}mm`, height: `${obj.h}mm`, transform: obj.rot ? `rotate(${obj.rot}deg)` : undefined }}>
          <ObjectRenderer obj={obj} tokens={doc.tokens} />
        </div>))}
    </div>));
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="https://fosen-tools-analytics.vercel.app/"><style>${css}</style></head><body style="margin:0;background:#ccc"><div class="brosjyre-editor" style="position:static">${pages.join("")}</div></body></html>`;
  fs.writeFileSync(`${outDir}/brosjyre.html`, html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
  await p.goto(`file://${outDir}/brosjyre.html`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  const els = await p.$$(".page-paper");
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${outDir}/side-${i + 1}.png` });
  await b.close(); console.log("rendret", els.length);
})();
