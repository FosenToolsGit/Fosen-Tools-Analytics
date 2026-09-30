// Lager ferdig PDF av en brosjyre fra editoren, uten innlogging.
// Bruker editorens egen ObjectRenderer; SVG-logoer fra public/ settes inn direkte
// (editoren henter dem i nettleseren, som SSR ikke gjør). Produktkort blir klikkbare.
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { chromium } from "playwright";
import { ObjectRenderer } from "../src/components/brosjyre/object-renderer";
const [id, outPdf] = process.argv.slice(2);
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const svg = (src: string) => fs.readFileSync("public" + decodeURI(src), "utf8")
  .replace(/<\?xml[^>]*>/, "").replace(/(<svg[^>]*?)\swidth="[^"]*"/i, "$1").replace(/(<svg[^>]*?)\sheight="[^"]*"/i, "$1")
  .replace(/<svg/i, '<svg style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet"');
(async () => {
  const { data } = await supa.from("brochures").select("doc,title").eq("id", id).single();
  const doc = data!.doc;
  const css = fs.readFileSync("src/components/brosjyre/editor.css", "utf8");
  const obj = (o: any) => {
    if (o.type === "image" && /^\/.*\.svg$/i.test(o.props.src || ""))
      return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", filter: o.props.tint === "white" ? "brightness(0) invert(1)" : undefined }} dangerouslySetInnerHTML={{ __html: svg(o.props.src) }} />;
    const r = <ObjectRenderer obj={o} tokens={doc.tokens} />;
    const url = o.type === "productCard" ? o.props.product?.source_url : null;
    return url ? <a href={url} style={{ display: "block", width: "100%", height: "100%", color: "inherit", textDecoration: "none" }}>{r}</a> : r;
  };
  const pages = doc.pages.map((page: any) => renderToStaticMarkup(
    <div className="page-paper" style={{ width: `${page.w}mm`, height: `${page.h}mm`, background: page.bg, position: "relative", overflow: "hidden", breakAfter: "page" }}>
      {page.objects.map((o: any) => (
        <div key={o.id} style={{ position: "absolute", left: `${o.x}mm`, top: `${o.y}mm`, width: `${o.w}mm`, height: `${o.h}mm`, transform: o.rot ? `rotate(${o.rot}deg)` : undefined }}>{obj(o)}</div>))}
    </div>));
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="https://fosen-tools-analytics.vercel.app/"><style>${css}@page{size:A4;margin:0}html,body{margin:0;padding:0}</style></head><body><div class="brosjyre-editor" style="position:static">${pages.join("")}</div></body></html>`;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
  if (process.env.SJEKK) {
    const funn = await p.evaluate(() => {
      const ut: string[] = [];
      document.querySelectorAll(".page-paper").forEach((pg, pi) => {
        [...pg.children].forEach((w) => {
          const wr = w.getBoundingClientRect();
          w.querySelectorAll("*").forEach((e) => {
            const el = e as HTMLElement; const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return;
            const txt = (el.innerText || "").replace(/\s+/g, " ").trim();
            const eget = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim());
            // kuttet tekst (line-clamp / overflow hidden)
            if (eget && (cs.overflow === "hidden" || cs.webkitLineClamp !== "none") && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2))
              ut.push(`s${pi + 1} KUTTET ${el.scrollHeight}/${el.clientHeight}px: «${txt.slice(0, 60)}» vises: «${(()=>{const r=document.createRange();r.selectNodeContents(el);const rs=[...r.getClientRects()].filter(x=>x.bottom<=el.getBoundingClientRect().bottom+1);return rs.length+" av "+[...r.getClientRects()].length+" linjebiter"})()}»`);
            // tekst utenfor objektets boks
            if (eget) { const r = el.getBoundingClientRect(); if (r.width && (r.right > wr.right + 1 || r.bottom > wr.bottom + 1 || r.left < wr.left - 1 || r.top < wr.top - 1))
              ut.push(`s${pi + 1} UTENFOR (${Math.round(r.right - wr.right)}/${Math.round(r.bottom - wr.bottom)}px): «${txt.slice(0, 60)}»`); }
          });
        });
      });
      return [...new Set(ut)];
    });
    console.log(funn.length ? funn.join("\n") : "ingen funn");
  }
  await p.pdf({ path: outPdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  const brutt = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src.slice(-50)));
  await b.close(); console.log("PDF:", outPdf, "· sider:", doc.pages.length, "· brutte bilder:", brutt.length ? brutt : 0);
})();
