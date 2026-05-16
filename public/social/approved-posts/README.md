# Approved posts — style-refs til Innholdsmotor

Dropp bilder her du er fornøyd med — Innholdsmotor sender dem som **STYLE REFERENCE** til Gemini ved hver bildegenerering, så modellen etterligner komposisjon, mood og typografi-tilnærmingen.

## Konvensjon

To dimensjoner: **archetype** (innholdstype) og **stil** (visuell DNA).

```
public/social/approved-posts/
├── _all/             ← alltid med, uansett archetype + stil
│
├── _profesjonell/    ← stil-valg «Profesjonell» (cinematic, jagerfly-stil)
├── _skreddersydd/    ← stil-valg «Skreddersydd» (sketched/CAD/wireframe)
│
├── foto/             ← archetype = "foto"
├── definisjon/       ← archetype = "definisjon"
├── statement/        ← archetype = "statement"
├── kontrast/         ← archetype = "kontrast" (FØR/ETTER osv)
├── milepael/         ← archetype = "milepael" (25-år, leveranser, jubileer)
├── sitat/            ← archetype = "sitat"
└── sertifikat/       ← archetype = "sertifikat"
```

**Archetype-mapper** = matches innholdstypen brukeren genererer.
**Stil-mapper** (med `_`-prefiks) = matches «Visuell stil»-dropdown i UI. Drop bilder her for å lære AI hvordan disse stilene ser ut.

## Bruk

1. Last ned et innlegg du liker fra Meta/IG/LinkedIn (eller eksportér fra brosjyre-editoren)
2. Drop fila i den arketype-mappen som passer (eller `_all/` for universelle refs)
3. Commit + push (`git add public/social/approved-posts/ && git commit -m "feat(refs): X godkjente innlegg"`)
4. Vercel henter dem automatisk ved neste deploy — ingen restart nødvendig

## Detaljer

- **Filformater:** `.png`, `.jpg`, `.jpeg`, `.webp`
- **Maks-størrelse:** 5 MB per fil (større blir hoppet over)
- **Antall:** Innholdsmotor plukker tilfeldig opp til **3 refs per generering** (fra matching archetype + `_all/`) — for mange refs forvirrer Gemini
- **Cache:** Refs leses fra disk én gang per server-process. Etter ny deploy får du fersk lesning.

## Hva blir SENT til AI

Hver fil sendes med denne instruksjonen til Gemini:

> STYLE REFERENCE (approved post — `{archetype}/{filnavn}`): match the visual style, composition, mood and typography approach of this image. This is a reference for HOW the output should look, not WHAT it should contain.

Så modellen kopierer ikke innholdet, men etterligner stilen.

## Sletting

Vil du fjerne en ref? Slett fila + commit. Cache er per-process, så Vercel-funksjonen får fersk liste neste cold start (~5-10 min, eller umiddelbart ved ny deploy).

## Tomt for nå

Mappene er tomme bortsett fra denne README. Start med å droppe 2-3 av dine beste innlegg i `foto/` og `milepael/` — dét er arketypene Innholdsmotor velger oftest.
