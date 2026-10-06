# Analyserer musikkbiblioteket og skriver register.json + register.html.
# Kjør: python3 scripts/musikk-register.py [mappe]. Standard er ~/Desktop/Fosen Tools/Bilder og media/Musikk.
# Leser alle .wav/.mp3 i undermappene. Kopi ligger også som analyser.py i Musikk-mappa.
import os, json, subprocess, re, sys, numpy as np, html

ROT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/Fosen Tools/Bilder og media/Musikk")
SR, HOP = 11025, 256
FPS = SR / HOP

BRUK = {}  # fylles fra bruk.json hvis den finnes
if os.path.exists(os.path.join(ROT, "bruk.json")):
    BRUK = json.load(open(os.path.join(ROT, "bruk.json")))

def dekod(sti):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sti, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def lufs(sti):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", sti, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    return float(m[-1]) if m else None

def tempo(flux):
    f = flux - flux.mean()
    ac = np.correlate(f, f, "full")[len(f) - 1:]
    lags = np.arange(len(ac)) / FPS
    m = (lags > 60 / 170) & (lags < 60 / 70)
    if not m.any() or ac[m].max() <= 0:
        return None
    return round(60 / lags[m][np.argmax(ac[m])])

def analyser(sti):
    x = dekod(sti)
    dur = len(x) / SR
    n = len(x) // HOP
    e = np.sqrt(np.mean(x[: n * HOP].reshape(n, HOP) ** 2, axis=1)) + 1e-9
    db = 20 * np.log10(e)
    flux = np.maximum(0, np.diff(e, prepend=e[0]))
    # per halvsekund for kurve
    k = int(FPS / 2)
    m = len(db) // k
    kurve = (20 * np.log10(np.sqrt(np.mean(e[: m * k].reshape(m, k) ** 2, axis=1)))).round(1)
    med = float(np.median(kurve))
    # pusterom: minst 1 s (2 punkter) >= 5 dB under median, ikke i de første/siste 3 s
    puster = []
    i = 0
    while i < m:
        if kurve[i] < med - 5 and 6 <= i < m - 6:
            j = i
            while j < m and kurve[j] < med - 5:
                j += 1
            if j - i >= 2:
                puster.append([round(i / 2, 1), round(j / 2, 1)])
            i = j
        else:
            i += 1
    # drop: største hopp oppover (snitt neste 2 s mot forrige 2 s), finposisjon på sterkeste onset
    drops = []
    for i in range(4, m - 4):
        hopp = kurve[i:i + 4].mean() - kurve[i - 4:i].mean()
        if hopp >= 6:
            drops.append((hopp, i))
    valgt = []
    for hopp, i in sorted(drops, reverse=True):
        if all(abs(i - j) > 10 for _, j in valgt):
            valgt.append((hopp, i))
        if len(valgt) >= 4:
            break
    dropliste = []
    for hopp, i in sorted(valgt, key=lambda v: v[1]):
        a, b = int((i / 2 - 1) * FPS), int((i / 2 + 1) * FPS)
        a, b = max(0, a), min(len(flux), b)
        fin = (a + int(np.argmax(flux[a:b]))) / FPS if b > a else i / 2
        dropliste.append({"t": round(fin, 2), "hopp_db": round(float(hopp), 1)})
    # start og slutt
    start_hit = bool(kurve[:2].mean() > med - 3)
    slutt = "fade" if kurve[-4:].mean() < med - 10 else "brå slutt"
    return {
        "sekunder": round(dur, 1),
        "bpm": tempo(flux[: int(min(len(flux), 90 * FPS))]),
        "lufs": lufs(sti),
        "starter_med_treff": start_hit,
        "slutt": slutt,
        "pusterom": puster[:6],
        "drops": dropliste,
        "kurve": kurve.tolist(),
        "median_db": round(med, 1),
    }

def mmss(s):
    return f"{int(s // 60)}:{int(s % 60):02d}"

def svg(k, drops, puster, dur):
    w, h = 520, 46
    lo, hi = min(k), max(k)
    pts = " ".join(f"{i * w / max(1, len(k) - 1):.1f},{h - (v - lo) / max(1e-6, hi - lo) * (h - 4) - 2:.1f}" for i, v in enumerate(k))
    rect = "".join(f'<rect x="{a / dur * w:.1f}" y="0" width="{(b - a) / dur * w:.1f}" height="{h}" fill="#3b82f633"/>' for a, b in puster)
    lin = "".join(f'<line x1="{d["t"] / dur * w:.1f}" x2="{d["t"] / dur * w:.1f}" y1="0" y2="{h}" stroke="#ED1C24" stroke-width="2"/>' for d in drops)
    return f'<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" preserveAspectRatio="none">{rect}<polyline points="{pts}" fill="none" stroke="#C9A86A" stroke-width="1.2"/>{lin}</svg>'

def main():
    reg = {}
    for mappe in sorted(os.listdir(ROT)):
        p = os.path.join(ROT, mappe)
        if not os.path.isdir(p):
            continue
        for f in sorted(os.listdir(p)):
            if not f.lower().endswith((".wav", ".mp3")):
                continue
            rel = f"{mappe}/{f}"
            print("analyserer", rel, flush=True)
            reg[rel] = analyser(os.path.join(p, f))
    json.dump(reg, open(os.path.join(ROT, "register.json"), "w"), ensure_ascii=False, indent=1)

    rader = []
    for rel, a in reg.items():
        navn = rel.split("/")[-1].rsplit(".", 1)[0]
        nr = "-".join(navn.split("-")[:2])
        bruk = BRUK.get(nr, "")
        drops = ", ".join(f'{mmss(d["t"])}' for d in a["drops"]) or "–"
        pust = ", ".join(f"{mmss(x)}–{mmss(y)}" for x, y in a["pusterom"]) or "–"
        rader.append(f"""<div class="k"><div class="top"><b>{html.escape(navn)}</b>
<span class="m">{mmss(a['sekunder'])} · {a['bpm'] or '?'} BPM · {a['lufs'] if a['lufs'] is not None else '?'} LUFS · {'starter med treff' if a['starter_med_treff'] else 'myk start'} · {a['slutt']}</span></div>
<div class="bruk">{html.escape(bruk)}</div>
{svg(a['kurve'], a['drops'], a['pusterom'], a['sekunder'])}
<div class="m">Drop: {drops} &nbsp;·&nbsp; Pusterom: {pust}</div>
<audio controls preload="none" src="{html.escape(rel)}"></audio></div>""")
    side = f"""<!doctype html><html lang="no"><head><meta charset="utf-8"><title>Musikkregister</title>
<style>body{{background:#0F1115;color:#E6E8EB;font-family:Manrope,system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 16px}}
h1{{font-size:28px;border-bottom:4px solid #ED1C24;padding-bottom:10px}}.n{{color:#9AA3AF;font-size:14px;line-height:1.6}}
.k{{background:#1A1D23;border:1px solid #2A2F38;border-radius:6px;padding:12px 14px;margin:10px 0}}
.top{{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}}.m{{color:#9AA3AF;font-size:13px;margin:4px 0}}
.bruk{{font-size:13px;color:#cfd3da;margin:4px 0 6px}}audio{{width:100%;height:32px;margin-top:6px}}</style></head><body>
<h1>Musikkregister</h1>
<p class="n">{len(reg)} låter. Gull linje = lydnivå gjennom låta, rød strek = drop, blått felt = pusterom.
BPM er anslått og kan være halvt eller dobbelt av det du hører. Bygget av <code>analyser.py</code> i samme mappe.</p>
{''.join(rader)}</body></html>"""
    open(os.path.join(ROT, "register.html"), "w").write(side)
    print("ferdig:", len(reg), "låter")

if __name__ == "__main__":
    main()
