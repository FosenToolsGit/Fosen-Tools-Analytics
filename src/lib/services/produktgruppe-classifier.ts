/**
 * Regel-basert klassifiserer som foreslår Multicase Produktgruppe 1/2/3
 * basert på norsk produktnavn og marketing-beskrivelse.
 *
 * Tilpasset Wera-stil-navngivning ("3335 Sporskrutrekker, rustfritt stål, ...").
 * Returnerer null hvis ingen regel matcher — operator må velge manuelt.
 */

export interface ClassifierResult {
  g1: string | null;
  g2: string | null;
  g3: string | null;
}

interface Rule {
  /** Regex som matcher mot kombinert navn + beskrivelse (lowercase) */
  pattern: RegExp;
  g1: string;
  g2: string;
  g3: string;
  /** Hvis satt, regex testes kun mot navn (ikke marketing description) — bruk for
   *  primær-noun-deteksjon der marketing kan ha falske treff på samme ord. */
  nameOnly?: boolean;
  /** Hvis satt, regex testes mot navn + første 60 tegn av marketing — fanger
   *  produkter der navnet er kryptisk men marketing starter med produkt-type
   *  (f.eks. «VDE-klinge for Kraftform...»). */
  nameAndMarketingStart?: boolean;
}

// Mer spesifikke regler først (matches stoppes ved første treff)
const RULES: Rule[] = [
  // ── Syl (Wera 1427-serien — verktøy for pilot-hull) — FØR klinge-reglene
  //   siden Wera 1427 har «klinge» i navn men er egentlig en syl.
  { pattern: /\bsyl\b|skruehullstans/, g1: "Skrutrekkere", g2: "Skruehullstanser", g3: "Skruehullstanse" },

  // ── Klinger (utskiftbare blader) — krever klinge i navn eller første 15 tegn av marketing
  { pattern: /(?=.*\b(?:klinge|adapterklinge)\b)(?=.*\b(?:firkant|piper|socket)\b)/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Firkant" },
  { pattern: /(?=.*\b(?:klinge|adapterklinge)\b)(?=.*\b(?:1\/4|3\/8|1\/2|5\/8|3\/4|1-1\/2)["”]?)/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Firkant" },
  { pattern: /(?=.*\bklinge\b)(?=.*\b(?:pozidriv|pz\s?\d))/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Pozidriv" },
  { pattern: /(?=.*\bklinge\b)(?=.*\b(?:phillips|ph\s?\d))/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Phillips" },
  { pattern: /(?=.*\bklinge\b)(?=.*\b(?:torx|tx\s?\d))/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Torx" },
  { pattern: /(?=.*\bklinge\b)(?=.*\b(?:sekskant|hex\s?\d))/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Sekskant" },
  // Klinge med 3D-størrelse (NxNxN, f.eks. 0.5x3x80) er en SL/flat klinge
  { pattern: /(?=.*\bklinge\b)(?=.*\d+[.,]?\d*\s*[xX×]\s*\d+[.,]?\d*\s*[xX×]\s*\d+)/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Rett" },
  { pattern: /(?=.*\bklinge\b)(?=.*\b(?:spor|slot))/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Rett" },
  { pattern: /utskiftbar(\s+\w+)?\s+klinge|adapterklinge|\bklinge\b/, nameAndMarketingStart: true, g1: "Skrutrekkere", g2: "Klinger", g3: "Holder" },

  // ── Micro / elektronikk-pipetrekker (Wera 2069 Micro-serien) ──────────
  { pattern: /elektronikk.?pipetrekker|micro.?pipe(?:n[øo]kkel|trekker)/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Sekskant" },

  // ── Skrutrekkere - Presisjon — profil-spesifikt (mer presist enn /Sett-default) ──
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\b(?:phillips|ph\s?\d))/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Phillips" },
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\b(?:pozidriv|pz\s?\d))/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Pozidriv" },
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\b(?:torx|tx\s?\d))/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Torx" },
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\b(?:sekskant|hex\s?\d))/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Sekskant" },
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\b(?:spor|slot|sporskru))/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Rett" },
  // Fallback til Sett kun for sett-kit i Presisjon
  { pattern: /(?=.*(?:precision|elektroniker|esd|\bmicro\s+\d+))(?=.*\bsett\b)/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Sett" },
  { pattern: /\bmicro\s+\d+|precision|elektroniker|esd\b/, g1: "Skrutrekkere", g2: "Presisjon", g3: "Sett" },

  // ── Flaggnøkler (Wera 1267-serien — bits formet som «flagg») ──────────
  { pattern: /(?=.*flaggn[øo]kk?[el])(?=.*\b(?:tx\s?\d|torx))/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Torx" },
  { pattern: /(?=.*flaggn[øo]kk?[el])(?=.*kombinasjon)(?=.*\b(?:tx\s?\d|torx))/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Torx" },
  { pattern: /(?=.*flaggn[øo]kk?[el])(?=.*kombinasjon)/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Pozi/rett kombi" },
  { pattern: /flaggn[øo]kk?[el]/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Torx" },

  // ── Brotsj / rømmer (utvidelse av borehull, fin-bearbeiding) ──────────
  { pattern: /\bbrotsj\b|r[øo]mmer/, g1: "Tilbehør", g2: "Forsenker", g3: "Forsenker" },

  // ── Skrueholder-bits / skruefestere (Wera 1440-serien) ────────────────
  //   Fanger «skrueholder», «skrueholdersett», «skruefester» — krever eksplisitt
  //   keyword (IKKE bare ordet «holder» i marketing).
  { pattern: /\bskrueholder|\bskruefester/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Holder" },

  // ── Reservedeler / reservedelssett ────────────────────────────────────
  { pattern: /reservedel|reserve\s*delsett/, g1: "Tilbehør", g2: "Tilbehør - deler", g3: "Tilbehør - deler" },

  // ── Piper og skraller (Wera Zyklop 8790/8740/8100-serien + pipesett) ──
  // Profil-spesifikt G3 (Torx/Sekskant) + drev-størrelse (1/4"/3/8"/1/2") som G2
  { pattern: /(?=.*\bpipe?bits)(?=.*\b3\/8)/, g1: "Piper og skraller", g2: "3/8\"", g3: "Holder" },
  { pattern: /(?=.*\bpipe?bits)(?=.*\b1\/2)/, g1: "Piper og skraller", g2: "1/2\"", g3: "Holder" },
  { pattern: /(?=.*\bpipe?bits)(?=.*\b1\/4)/, g1: "Piper og skraller", g2: "1/4\"", g3: "Holder" },
  { pattern: /\bpipe?bits/, g1: "Piper og skraller", g2: "1/4\"", g3: "Holder" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b3\/8)(?=.*\b(?:tx\s?\d|torx))/, g1: "Piper og skraller", g2: "3/8\"", g3: "Torx" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b1\/2)(?=.*\b(?:tx\s?\d|torx))/, g1: "Piper og skraller", g2: "1/2\"", g3: "Torx" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b1\/4)(?=.*\b(?:tx\s?\d|torx))/, g1: "Piper og skraller", g2: "1/4\"", g3: "Torx" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b3\/8)/, g1: "Piper og skraller", g2: "3/8\"", g3: "Sekskant" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b1\/2)/, g1: "Piper og skraller", g2: "1/2\"", g3: "Sekskant" },
  { pattern: /(?=.*\b(?:pipe|sokkel|zyklop))(?=.*\b1\/4)/, g1: "Piper og skraller", g2: "1/4\"", g3: "Sekskant" },

  // ── Skrallesett / Skrallenøkler (Wera 8100-serien) ────────────────────
  { pattern: /skrallesett|skrallen[øo]kler.*sett/, g1: "Nøkler", g2: "Skrallenøkler", g3: "Sett" },
  { pattern: /skrallen[øo]kk?[el]r?|ratchet/, g1: "Nøkler", g2: "Skrallenøkler", g3: "Skrallenøkler" },

  // ── Vinkelnøkler (Wera 950/3950-serien) — alias for L-nøkler ──────────
  { pattern: /(?=.*vinkeln[øo]kk?[el]r?)(?=.*\b(?:tx\s?\d|torx))/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Torx" },
  { pattern: /(?=.*vinkeln[øo]kk?[el]r?)(?=.*sett)/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Sett" },
  { pattern: /vinkeln[øo]kk?[el]r?/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Sekskant" },

  // ── Kombiklinge (klinge for Vario-håndtak — mest spor+phillips) ───────
  { pattern: /kombiklinge/, g1: "Skrutrekkere", g2: "Klinger", g3: "Holder" },

  // ── Kombigjengebor (HSS combo tap/drill) ──────────────────────────────
  { pattern: /kombigjengebor|gjengebor/, g1: "Tilbehør", g2: "Gjengeverktøy", g3: "Gjengetapp" },

  // ── Slagnøkler (plural) ───────────────────────────────────────────────
  { pattern: /slagn[øo]kk?[el]r?/, g1: "Nøkler", g2: "Slagnøkkel", g3: "Slagnøkkel" },

  // ── Momentnøkler (plural) ─────────────────────────────────────────────
  { pattern: /momentn[øo]kk?[el]r?(?:sett)?/, g1: "Momentverktøy", g2: "Momentnøkler", g3: "Momentnøkler" },

  // ── Momentindikator (Wera 400-serien, fast moment) ────────────────────
  { pattern: /momentindikator/, g1: "Momentverktøy", g2: "Momentstav", g3: "Momentstav" },

  // ── Fasetester / spenningstester (Wera 247-serien) ────────────────────
  { pattern: /fasetester|spenningstester|enpolet.?tester/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Tester" },

  // ── Uttrekker (Wera 1429 / generisk skrueuttrekker) ───────────────────
  { pattern: /\buttrekker|\butrekker/, g1: "Skrutrekkere", g2: "Skrueuttrekker", g3: "Skrueuttrekker" },

  // ── XZN Spline / mangekantbits ────────────────────────────────────────
  { pattern: /xzn|mangekantbits|spline/, g1: "Maskintilbehør", g2: "Bits", g3: "Spline" },

  // ── Senkeborbits / forsenker-bits ─────────────────────────────────────
  { pattern: /senkebor(bits)?|forsenker/, g1: "Tilbehør", g2: "Forsenker", g3: "Forsenker" },

  // ── Innstikksverktøy med gjenger (Wera 879/4 — stud installer) ────────
  { pattern: /innstikksverkt[øo]y.*gjeng|gjengestang/, g1: "Tilbehør", g2: "Gjengeverktøy", g3: "Gjengetapp" },

  // ── Bit-Check / Bit-Box (bit-sortimenter i kasse) ─────────────────────
  { pattern: /(?=.*bit[\-\s]?(?:check|box))(?=.*\b(?:firkant|innenfirkant|square))/, g1: "Maskintilbehør", g2: "Bits", g3: "Firkant" },
  { pattern: /bit[\-\s]?check|bit[\-\s]?box|bitssett|bitsortiment/, g1: "Maskintilbehør", g2: "Bits", g3: "Bitssett" },

  // ── Universalholder / bitsholder (Wera 899) ───────────────────────────
  { pattern: /universalholder|magnetholder|bitholder/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Bitsholder" },

  // ── Vario-forlenger / Vario-system (utskiftbare klinger) ──────────────
  { pattern: /vario.?(forlenger|adapter|h[åa]ndtak)|\b91\s+vario/, g1: "Skrutrekkere", g2: "Klinger", g3: "Holder" },

  // ── Hybrid-forlenger / Zyklop-forlenger ───────────────────────────────
  { pattern: /hybrid.?forlenger|zyklop.?forlenger/, g1: "Piper og skraller", g2: "1/2\"", g3: "Forlengere" },

  // ── Trinnøkkel (Wera 9529 — 1/2 pipe) ─────────────────────────────────
  { pattern: /trinn[øo]kk?[el]|trinn[\-\s]?n[øo]kkel/, g1: "Piper og skraller", g2: "1/2\"", g3: "Sekskant" },

  // ── Zyklop Mini Skralle ───────────────────────────────────────────────
  { pattern: /zyklop.?mini.*skralle|mini.?skralle/, g1: "Piper og skraller", g2: "1/4\"", g3: "Skraller" },

  // ── Ekspansjonsdor / Utløserstift / reservedeler for Zyklop ───────────
  { pattern: /ekspansjonsdor|utl[øo]serstift|innstikkspatron/, g1: "Tilbehør", g2: "Tilbehør - deler", g3: "Tilbehør - deler" },

  // ── Ventilholder ──────────────────────────────────────────────────────
  { pattern: /ventilholder/, g1: "Tilbehør", g2: "Tilbehør - deler", g3: "Tilbehør - deler" },

  // ── Tom-bokser / oppbevaring / futteral / verktøybærer (Wera 2go osv.)
  //   Inkluderer norske, engelske og tyske varianter siden marketing kan være på flere språk.
  { pattern: /\btekstilboks|\btekstilfutteral|\btextilboks|\brullefutteral|sammenleggbart\s+futteral|magnetstripe(\s+uten)?|wera\s+2go|verkt[øo]yb[æae]rer|skulderrem|einstecktasche|innstikklomme|innstikkpose|insertion\s+pocket|empty\s+(?:case|pocket|pouch)/, g1: "Oppbevaring", g2: "Bag", g3: "Bag" },

  // ── Adapter for Tool-Check Modular ────────────────────────────────────
  { pattern: /adapter.*tool[\-\s]?check|tool[\-\s]?check.*adapter/, g1: "Tilbehør", g2: "Tilbehør - deler", g3: "Tilbehør - deler" },

  // ── Pipe-fallback når drev ikke er nevnt — IKKE klassifisere automatisk.
  //   Wera-serier kan ha forskjellige drev (1/4", 3/8", Halfmoon osv.).
  //   La heller pipen stå uten gruppe slik at operatør sjekker og setter manuelt
  //   enn å gjette feil drev.

  // ── Bitsskrutrekkere ──────────────────────────────────────────────────
  { pattern: /bitsskrutrekker.*inkl.*bits|bit.?holder.*screwdriver/, g1: "Skrutrekkere", g2: "Bitsskrutrekkere", g3: "Bitsskrutrekker inkl. bits" },
  { pattern: /bitsskrutrekker/, g1: "Skrutrekkere", g2: "Bitsskrutrekkere", g3: "Bitsskrutrekker" },

  // ── Skrutrekkere - type ───────────────────────────────────────────────
  // KRYSSPOR = phillips/pozidriv, IKKE flat slot — sjekk profil for å skille
  { pattern: /(?=.*kryssporskru)(?=.*\b(?:pz\s?\d|pozidriv))/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Pozidriv" },
  { pattern: /kryssporskru/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Phillips" },
  { pattern: /sporskru|slotted|spor[\-\s]?skrutrekker/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Rett" },
  { pattern: /stjerneskru|phillips/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Phillips" },
  { pattern: /pozidriv|pozi[\-\s]/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Pozidriv" },
  { pattern: /torx.*hull|tamper.*torx/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Torx m/hull" },
  { pattern: /\btorx\b.*skrutrekker|skrutrekker.*\btorx\b|\btx[\s\-]\d/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Torx" },
  { pattern: /sekskant.*skrutrekker|skrutrekker.*sekskant|hex.*screwdriver/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Sekskant" },
  { pattern: /spenningstester|voltage tester/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Tester" },

  // ── Vinkelskrutrekkere ────────────────────────────────────────────────
  { pattern: /vinkelskrutrekker.*phillips/, g1: "Skrutrekkere", g2: "Vinkelskrutrekkere", g3: "Phillips" },
  { pattern: /vinkelskrutrekker/, g1: "Skrutrekkere", g2: "Vinkelskrutrekkere", g3: "Rett" },

  // ── T-håndtak / L-nøkler (rekkefølge: spesifikk profil → fallback) ─────
  { pattern: /(?=.*t.?håndtak)(?=.*\b(?:torx|tx\s?\d))/, g1: "Skrutrekkere", g2: "T-håndtak", g3: "Torx" },
  { pattern: /(?=.*t.?håndtak)(?=.*\bsett\b)/, g1: "Skrutrekkere", g2: "T-håndtak", g3: "Sett" },
  { pattern: /\bt.?håndtak\b/, g1: "Skrutrekkere", g2: "T-håndtak", g3: "Sekskant" },
  { pattern: /(?=.*\b(?:l.?nøkkel|hex.?key|allen.?key))(?=.*\b(?:torx|tx\s?\d))/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Torx" },
  { pattern: /(?=.*\b(?:l.?nøkkel|hex.?key|allen.?key))(?=.*\bsett\b)/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Sett" },
  { pattern: /\b(?:l.?nøkkel|hex.?key|allen.?key)\b/, g1: "Skrutrekkere", g2: "L-nøkler", g3: "Sekskant" },

  // ── Bits og bitsholder ────────────────────────────────────────────────
  { pattern: /bitsholder|bit.?holder/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Bitsholder" },
  { pattern: /\bbits[\s,]|bitsett|bit\s?set|bit\s?box/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Bits" },

  // ── Nøkler ────────────────────────────────────────────────────────────
  { pattern: /pipenøkkel|pipenokkel|socket\s+wrench/, g1: "Nøkler", g2: "Pipenøkkel", g3: "Pipenøkkel" },
  { pattern: /kombinasjonsnøk|combination\s+wrench/, g1: "Nøkler", g2: "Kombinasjonsnøkler", g3: "Kombinasjonsnøkler" },
  { pattern: /fastnøkkel|fast.?nøkkel|open[\-\s]?end\s+wrench/, g1: "Nøkler", g2: "Fastnøkler", g3: "Fastnøkler" },
  { pattern: /ringnøkkel|ring\s+wrench/, g1: "Nøkler", g2: "Ringnøkler", g3: "Ringnøkler" },
  { pattern: /skrallenøkkel.*sett/, g1: "Nøkler", g2: "Skrallenøkler", g3: "Sett" },
  { pattern: /skrallenøkkel|ratchet\s+wrench/, g1: "Nøkler", g2: "Skrallenøkler", g3: "Skrallenøkler" },
  { pattern: /skiftenøkkel|adjustable\s+wrench/, g1: "Nøkler", g2: "Skiftenøkkel", g3: "Skiftenøkkel" },

  // ── Tenger ────────────────────────────────────────────────────────────
  { pattern: /kombinasjonstang|combination\s+plier/, g1: "Tenger", g2: "Kombinasjonstang", g3: "Kombinasjonstang" },
  { pattern: /avbitertang|side\s+cutter/, g1: "Tenger", g2: "Avbitertang", g3: "Avbitertang" },
  { pattern: /spisstang|long\s+nose/, g1: "Tenger", g2: "Spisstang", g3: "Spisstang" },
  { pattern: /vannpumpetang|water\s+pump\s+plier|polygrip/, g1: "Tenger", g2: "Vannpumpetang", g3: "Vannpumpetang" },
  { pattern: /seegeringstang|seeger.?ring|circlip/, g1: "Tenger", g2: "Seegeringstang", g3: "Seegeringstang" },
  { pattern: /flattang|flat\s+plier/, g1: "Tenger", g2: "Flattang", g3: "Flattang" },
  { pattern: /gripetang|gripping\s+plier/, g1: "Tenger", g2: "Gripetang", g3: "Gripetang" },
  { pattern: /universaltang/, g1: "Tenger", g2: "Universaltang", g3: "Universaltang" },

  // ── Momentverktøy ─────────────────────────────────────────────────────
  { pattern: /momentnøkkel|torque\s+wrench/, g1: "Momentverktøy", g2: "Momentnøkler", g3: "Momentnøkler" },
  { pattern: /momentskrutrekker|torque\s+screwdriver/, g1: "Momentverktøy", g2: "Momentstav", g3: "Momentstav" },

  // ── Sett (generelt fallback for "kompakt"/"set") ──────────────────────
  { pattern: /\bsett\b|kompakt|\bset\b/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Sett" },

  // ── Skrutrekkere fallback (når intet annet matcher) ───────────────────
  { pattern: /skrutrekker|screwdriver|kraftform/, g1: "Skrutrekkere", g2: "Skrutrekkere", g3: "Skrutrekker" },
];

export function classify(name: string, marketingDesc?: string): ClassifierResult {
  const nameLower = name.toLowerCase();
  const text = `${name} ${marketingDesc ?? ""}`.toLowerCase();
  // Bruker bare første 15 tegn av marketing slik at vi fanger primær-noun-mønstre
  // («VDE-klinge for...») uten å trigges av mid-setning bruk («skrutrekker med klinge»).
  const marketingStart = (marketingDesc ?? "").slice(0, 15).toLowerCase();
  const nameAndStart = `${nameLower} ${marketingStart}`;
  for (const rule of RULES) {
    const target = rule.nameOnly
      ? nameLower
      : rule.nameAndMarketingStart
      ? nameAndStart
      : text;
    if (rule.pattern.test(target)) {
      return { g1: rule.g1, g2: rule.g2, g3: rule.g3 };
    }
  }
  return { g1: null, g2: null, g3: null };
}
