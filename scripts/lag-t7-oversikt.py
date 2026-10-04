#!/usr/bin/env python3
"""Bygger én samlet, søkbar oversikt over hele T7: OVERSIKT.html + ALLE-FLYTTINGER.tsv på diskens rot.
Kjør etter hver flytting:  python3 scripts/lag-t7-oversikt.py"""
import os, html, json, time, unicodedata as u, glob
T = "/Volumes/T7"
if not os.path.isdir(T): raise SystemExit("T7 er ikke tilkoblet")
def størrelse(p):
    t = n = 0
    for dp, _, fs in os.walk(p):
        for f in fs:
            if f.startswith("._") or f == ".DS_Store": continue
            try: t += os.path.getsize(os.path.join(dp, f)); n += 1
            except OSError: pass
    return t, n
def gb(b): return f"{b/1e9:.1f} GB" if b >= 1e9 else f"{b/1e6:.0f} MB"
SKJUL = {".Spotlight-V100", ".fseventsd", ".Trashes", "System Volume Information", ".TemporaryItems"}
områder = []
for top in sorted(os.listdir(T)):
    p = os.path.join(T, top)
    if top in SKJUL or top.startswith(".") or not os.path.isdir(p): continue
    under = []
    for s in sorted(os.listdir(p)):
        sp = os.path.join(p, s)
        if s.startswith(".") or s.startswith("._"): continue
        if os.path.isdir(sp):
            b, n = størrelse(sp)
            barn = [x for x in sorted(os.listdir(sp)) if not x.startswith(".")][:12]
            under.append({"navn": s, "b": b, "n": n, "barn": barn})
    b, n = størrelse(p)
    områder.append({"navn": top, "b": b, "n": n, "under": under})
# Alle flyttinger samlet
rader = []
def les(fil, kol):
    if not os.path.exists(fil): return
    for i, l in enumerate(open(fil, encoding="utf-8")):
        if i == 0 and l.lower().startswith(("dato", "tema")): continue
        f = l.rstrip("\n").split("\t")
        if len(f) > max(kol.values()): rader.append({k: f[v] for k, v in kol.items()})
les(f"{T}/Fosen Tools - arkiv/HVOR-LIGGER-TINGENE.tsv", {"fra": 1, "til": 2, "str": 3})
les(f"{T}/Fosen Tools - arkiv/Skrivebord-arkiv 2026-10-03/INNHOLD.tsv", {"fra": 1, "til": 2, "str": 3})
for m in [x for x in glob.glob(f"{T}/MANIFEST*.tsv") if "omklass" not in x]:
    les(m, {"fra": 1, "til": 2, "str": 3})
with open(f"{T}/ALLE-FLYTTINGER.tsv", "w", encoding="utf-8") as f:
    f.write("flyttet fra\tligger nå på T7\tstørrelse\n")
    for r in rader: f.write(f"{r['fra']}\t{r['til']}\t{r['str']}\n")
fri = os.statvfs(T); ledig = fri.f_bavail * fri.f_frsize
kort = "".join(f"""<section><h2>{html.escape(o['navn'])} <small>{gb(o['b'])} · {o['n']:,} filer</small></h2><ul>""" + "".join(
    f"<li><b>{html.escape(x['navn'])}</b> <small>{gb(x['b'])} · {x['n']:,} filer</small><div class='barn'>{html.escape(' · '.join(x['barn']))}{' …' if len(x['barn'])==12 else ''}</div></li>"
    for x in o["under"]) + "</ul></section>" for o in områder).replace(",", " ")
data = json.dumps(rader, ensure_ascii=False)
side = f"""<!doctype html><html lang="no"><meta charset="utf-8"><title>T7 – oversikt</title>
<style>:root{{--r:#ED1C24;--bg:#0F1115;--k:#1A1D23;--t:#E6E8EB;--m:#9AA3AF}}body{{background:var(--bg);color:var(--t);font:15px/1.5 system-ui,sans-serif;max-width:1000px;margin:32px auto;padding:0 16px}}
h1{{border-bottom:4px solid var(--r);padding-bottom:8px}}h2{{margin:28px 0 8px;font-size:19px}}small{{color:var(--m);font-weight:400}}ul{{list-style:none;padding:0}}li{{background:var(--k);border-radius:6px;padding:10px 14px;margin:6px 0}}
.barn{{color:var(--m);font-size:13px;margin-top:2px}}input{{width:100%;padding:12px;font-size:16px;border-radius:6px;border:1px solid #333;background:var(--k);color:var(--t)}}
table{{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}}td{{padding:5px 6px;border-bottom:1px solid #222;vertical-align:top;word-break:break-word}}.lite{{color:var(--m)}}</style>
<h1>Samsung T7 – hva ligger hvor</h1>
<p class="lite">Oppdatert {time.strftime('%d.%m.%Y %H:%M')} · {gb(ledig)} ledig · bygges av <code>scripts/lag-t7-oversikt.py</code></p>
<h2>Søk i alt som er flyttet hit <small>{len(rader):,} poster</small></h2>
<input id="q" placeholder="Søk på filnavn, mappe eller gammel plassering …"><table id="t"></table>
{kort}
<script>const D={data};const t=document.getElementById('t'),q=document.getElementById('q');
function vis(){{const s=q.value.toLowerCase().trim();if(!s){{t.innerHTML='';return}}const r=D.filter(x=>(x.fra+' '+x.til).toLowerCase().includes(s)).slice(0,300);
t.innerHTML=r.map(x=>`<tr><td>${{x.til}}</td><td class=lite>fra ${{x.fra}}</td><td class=lite>${{x.str}}</td></tr>`).join('')||'<tr><td class=lite>Ingen treff</td></tr>'}}q.oninput=vis;</script></html>""".replace("{len(rader):,}", "")
open(f"{T}/OVERSIKT.html", "w", encoding="utf-8").write(side)
print(f"OVERSIKT.html: {len(områder)} hovedområder, {len(rader)} flytteposter, {gb(ledig)} ledig")
