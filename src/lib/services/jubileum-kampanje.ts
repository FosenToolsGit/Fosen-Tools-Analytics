/**
 * Jubileum-kampanjen — 14 dager med planlagt innhold opp mot
 * 25-årsjubileumet + butikkåpningen 26. juni 2026.
 *
 * Innhold er strukturert per dag med:
 *   - dato + ukedag + countdown-badge (T-14, T-1, DAGEN)
 *   - mal/variant/data for bilde-rendering via /api/innleggsbygger/render-innlegg
 *   - separate captions for Facebook, Instagram og LinkedIn (med UTM)
 *   - anbefalt posting-tid
 *
 * Datadrevet — UI henter listen, kaller render-API per dag, lar bruker
 * kopiere captions plattform-for-plattform.
 *
 * Mønster:
 *   - skreddersydd/HDFI/CADLAB → +144% engasjement
 *   - emoji-start → +93%
 *   - tor/fre kl 12:00 → beste vindu
 *   - alt-tekst legges på via mobil etter publisering
 */

import type {
  InnleggMal,
  InnleggVariant,
  MilepaelData,
  StandData,
  BesokData,
  SitatData,
  FeatureData,
} from "./innlegg";

// =============================================================================
// Video-mapping — egne Remotion-komposisjoner per dag
// =============================================================================

/**
 * Hver av de 15 dagene har sin egen Remotion-komposisjon
 * (JubileumT14 … JubileumDagen) med dag-spesifikk visuell vinkling.
 * Type-tagen `kind` peker til komposisjonen i `remotion/jubileum/types.ts`.
 */
export type JubileumVideo =
  | { kind: "jub-t14"; dateLine: string; subtitle: string; place: string }
  | { kind: "jub-t13"; eyebrow: string; headline: string; bullets: [string, string, string] }
  | { kind: "jub-t12"; quote: string; name: string; role: string }
  | { kind: "jub-t11"; eyebrow: string; schedule: { time: string; label: string }[] }
  | {
      kind: "jub-t10" | "jub-t9" | "jub-t8";
      partner: string;
      accentColor: string;
      tagline: string;
      chips: string[];
    }
  | { kind: "jub-t7"; daysLeft: number; unit: string; headline: string }
  | { kind: "jub-t6"; count: number; headline: string; contents: string[] }
  | { kind: "jub-t5"; timeline: { year: string; label: string }[]; headline: string }
  | { kind: "jub-t4"; eyebrow: string; guestA: string; guestB: string; subline: string }
  | { kind: "jub-t3"; eyebrow: string; time: string; pitch: string }
  | { kind: "jub-t2"; highlights: string[] }
  | { kind: "jub-t1"; headline: string; subline: string }
  | { kind: "jub-dagen"; headline: string; chips: string[] };

const EVENT_DATE_ISO = "2026-06-26"; // fre 26. juni
const EVENT_DATE_LABEL = "26.06.26";
const UTM_BASE = "?utm_source=meta&utm_medium=social&utm_campaign=jubileum-2026-06-26";

export interface JubileumCaption {
  caption: string;
  cta_link?: string;
  hashtags?: string;
}

export interface JubileumPost {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  weekday: string;
  countdown_label: string; // T-14, T-7, T-1, DAGEN
  theme: string; // kort tema-navn (UI)
  internal_note: string; // 1-linje intern beskrivelse
  recommended_time: string; // f.eks "12:00"

  // Bilde-rendering
  mal: InnleggMal;
  variant: InnleggVariant;
  image_data: unknown;

  // Video-rendering (Remotion)
  video: JubileumVideo;

  // Plattform-spesifikke captions
  facebook: JubileumCaption;
  instagram: JubileumCaption;
  linkedin: JubileumCaption;
}

// =============================================================================
// Felles caption-elementer
// =============================================================================

const BUTIKK_URL = `https://fosen-tools.no/${UTM_BASE}&utm_content=`;

const IG_HASHTAGS_LANG =
  "#fosentools #25år #jubileum #brekstad #fosenhalvøya #ørland #verktøy #proff #håndverk #CADLAB #HDFI #milwaukee #wera #leverandørtilforsvaret";
const IG_HASHTAGS_PARTNER = "#fosentools #jubileum #brekstad #leverandører #proff #verktøy";
const IG_HASHTAGS_COUNTDOWN = "#fosentools #25år #brekstad #countdown #snartgodt";

// =============================================================================
// Kampanjeplan: 14 dager (12.–26. juni 2026)
// =============================================================================

export const JUBILEUM_KAMPANJE: JubileumPost[] = [
  // -----------------------------------------------------------------------
  // T-14 · fre 12. juni · «Save the date»
  // -----------------------------------------------------------------------
  {
    id: "t-14-save-the-date",
    date: "2026-06-12",
    weekday: "Fredag",
    countdown_label: "T-14",
    theme: "Save the date",
    internal_note: "Kick-off: kunngjør dato + tema. Ekstra trykk på «Sett av».",
    recommended_time: "12:00",
    mal: "milepael",
    variant: "C",
    image_data: {
      brand: "FOSEN TOOLS",
      number: "25",
      unit: "år",
      headline: "26. juni feirer vi sammen",
      subhead: "25-årsjubileum + ombygd butikk på Brekstad. Sett av datoen.",
      timeline: [
        { year: "2001", label: "Stiftet" },
        { year: "2026", label: "25 år · ny butikk" },
      ],
    } satisfies MilepaelData,
    video: {
      kind: "jub-t14",
      dateLine: "26. JUNI 2026",
      subtitle: "25 ÅR + BUTIKKÅPNING",
      place: "BREKSTAD",
    },
    facebook: {
      caption:
        "🎉 Sett av 26. juni! Fosen Tools fyller 25 år, og vi åpner samtidig dørene til en ombygget butikk på Brekstad. " +
        "Et kvart århundre med verktøyløsninger — for håndverkere, industri og Forsvaret. " +
        "Bli med på en innholdsrik dag med leverandører på plass, faglig påfyll og noen spesielle gjester. " +
        "Mer info kommer hver dag fram til vi sees i Industrigata 1. ⬇️\n\n" +
        "📍 Industrigata 1, Brekstad · 26. juni · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}save-the-date`,
    },
    instagram: {
      caption:
        "🎉 Sett av 26. juni — vi fyller 25 år!\n\n" +
        "Et kvart århundre med verktøyløsninger — fra Brekstad til Forsvaret. " +
        "26. juni åpner vi dørene til ombygd butikk og inviterer til en innholdsrik dag med leverandører, faglig påfyll og " +
        "spesielle gjester.\n\n" +
        "📍 Industrigata 1, Brekstad\n" +
        "🕙 10:00 – 16:00\n\n" +
        "Lenke i bio for mer info.",
      hashtags: IG_HASHTAGS_LANG,
    },
    linkedin: {
      caption:
        "Fosen Tools fyller 25 år.\n\n" +
        "Siden 2001 har vi levert skreddersydde verktøyløsninger til håndverkere, industri og Forsvaret — alt produsert med " +
        "CADLAB-tegninger og CNC-maskinert HDFI fra Brekstad.\n\n" +
        "26. juni markerer vi jubileet OG åpner dørene til ombygd butikk i Industrigata 1. Bli med på en innholdsrik dag " +
        "med leverandører fra hele bransjen, faglige presentasjoner og noen spesielle gjester.\n\n" +
        "→ 26. juni 2026 · 10:00 – 16:00 · Brekstad\n" +
        "→ Mer informasjon i ukene som kommer.",
      cta_link: `${BUTIKK_URL}save-the-date-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-13 · lør 13. juni · Behind-the-scenes: butikk-ombygging
  // -----------------------------------------------------------------------
  {
    id: "t-13-bts-ombygging",
    date: "2026-06-13",
    weekday: "Lørdag",
    countdown_label: "T-13",
    theme: "Bak kulissene — ombygging",
    internal_note: "Helg-soft post. Bilde fra butikken under ombygging.",
    recommended_time: "10:00",
    mal: "feature",
    variant: "B",
    image_data: {
      eyebrow: "OMBYGGING · BREKSTAD",
      headline: "Vi gjør plass til neste 25 år",
      bullets: [
        "Ny butikk-layout med åpne soner",
        "Demo-områder for HDFI og verktøykontroll",
        "Bedre flyt for proffkundene",
      ],
      cta: "Klart 26. juni",
    } satisfies FeatureData,
    video: {
      kind: "jub-t13",
      eyebrow: "OMBYGGING · BREKSTAD",
      headline: "VI GJØR PLASS\nTIL NESTE 25 ÅR",
      bullets: [
        "Ny butikk-layout",
        "Demo-soner for HDFI",
        "Bedre flyt for proffkundene",
      ],
    },
    facebook: {
      caption:
        "🔨 Det skjer noe på Brekstad disse dagene. Vi gjør butikken klar for neste 25 år — med nye demo-soner for HDFI " +
        "og verktøykontroll, og bedre flyt for dere som kommer innom på fagprat.\n\n" +
        "Klart 26. juni. Vi gleder oss til å vise det fram.",
      cta_link: `${BUTIKK_URL}bts-ombygging`,
    },
    instagram: {
      caption:
        "🔨 Bak kulissene: ny butikk klar 26. juni.\n\n" +
        "Demo-soner for HDFI og verktøykontroll. Bedre flyt for proffkundene. Samme adresse — ny opplevelse.\n\n" +
        "Industrigata 1, Brekstad.",
      hashtags: "#fosentools #brekstad #ombygging #behindthescenes #25år",
    },
    linkedin: {
      caption:
        "Vi bygger om butikken vår på Brekstad — klar til 25-årsjubileet 26. juni.\n\n" +
        "Nye demo-soner for HDFI og verktøykontroll. Tydeligere produktområder. Mer plass til den faglige samtalen med " +
        "proffkundene.\n\n" +
        "Velkommen innom 26. juni.",
      cta_link: `${BUTIKK_URL}bts-ombygging-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-12 · søn 14. juni · Stille dag — historie / sitat
  // -----------------------------------------------------------------------
  {
    id: "t-12-historie-sitat",
    date: "2026-06-14",
    weekday: "Søndag",
    countdown_label: "T-12",
    theme: "Erik om 25 år",
    internal_note: "Søndag — rolig post. Sitat fra daglig leder.",
    recommended_time: "11:00",
    mal: "sitat",
    variant: "A",
    image_data: {
      quote:
        "Vi har aldri solgt verktøy alene. Vi har solgt riktig verktøy for hverdagen — og fulgt opp etterpå.",
      name: "Erik Bonsaksen",
      role: "Daglig leder",
      company: "Fosen Tools AS",
    } satisfies SitatData,
    video: {
      kind: "jub-t12",
      quote:
        "Vi har aldri solgt verktøy alene. Vi har solgt riktig verktøy for hverdagen — og fulgt opp etterpå.",
      name: "Erik Bonsaksen",
      role: "Daglig leder · Fosen Tools",
    },
    facebook: {
      caption:
        "🛠️ «Vi har aldri solgt verktøy alene. Vi har solgt riktig verktøy for hverdagen — og fulgt opp etterpå.»\n\n" +
        "— Erik Bonsaksen, daglig leder\n\n" +
        "25 år med kundene våre. Vi feirer 26. juni på Brekstad.",
      cta_link: `${BUTIKK_URL}sitat-erik`,
    },
    instagram: {
      caption:
        "«Riktig verktøy for hverdagen — og oppfølging etterpå.»\n\n" +
        "Eriks doktrine i 25 år. Vi feirer 26. juni.\n\n" +
        "Velkommen innom Industrigata 1.",
      hashtags: "#fosentools #25år #brekstad #proff #verktøy",
    },
    linkedin: {
      caption:
        "«Vi har aldri solgt verktøy alene. Vi har solgt riktig verktøy for hverdagen — og fulgt opp etterpå.»\n\n" +
        "— Erik Bonsaksen, daglig leder i Fosen Tools\n\n" +
        "Doktrinen som har båret oss gjennom 25 år. Vi feirer 26. juni på Brekstad.",
      cta_link: `${BUTIKK_URL}sitat-erik-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-11 · man 15. juni · Program-avsløring
  // -----------------------------------------------------------------------
  {
    id: "t-11-program",
    date: "2026-06-15",
    weekday: "Mandag",
    countdown_label: "T-11",
    theme: "Programmet 26. juni",
    internal_note: "Avslør PROGRAMMET. Inviter folk inn.",
    recommended_time: "12:00",
    mal: "stand",
    variant: "A",
    image_data: {
      eyebrow: "PROGRAM 26. JUNI",
      event: "VI FEIRER 25 ÅR",
      year: "2026",
      pitch:
        "10:00 dørene åpner · 11–13 enkel servering · 13:00 PROFF-presentasjon · " +
        "leverandører til stede hele dagen.",
      date: "26.06.26",
      place: "Industrigata 1, Brekstad",
      stand: "10:00 – 16:00",
      cta: "Velkommen inn",
    } satisfies StandData,
    video: {
      kind: "jub-t11",
      eyebrow: "PROGRAM 26. JUNI",
      schedule: [
        { time: "10:00", label: "Dørene åpner" },
        { time: "11–13", label: "Enkel servering" },
        { time: "13:00", label: "PROFF-presentasjon" },
        { time: "16:00", label: "Vi takker for besøket" },
      ],
    },
    facebook: {
      caption:
        "📅 Programmet for jubileet er klart!\n\n" +
        "🕙 10:00 — Dørene åpner og messen starter\n" +
        "🍽️ 11:00 – 13:00 — Enkel servering\n" +
        "🎯 13:00 — PROFF-presentasjon\n" +
        "🛠️ Hele dagen — Leverandørene står klare for spørsmål og demo\n\n" +
        "📍 Industrigata 1, Brekstad · 26. juni · 10:00 – 16:00\n\n" +
        "Vi gleder oss til å se deg! 👇",
      cta_link: `${BUTIKK_URL}program-info`,
    },
    instagram: {
      caption:
        "📅 Programmet er klart — 26. juni:\n\n" +
        "10:00 — Dørene åpner\n" +
        "11–13 — Enkel servering\n" +
        "13:00 — PROFF-presentasjon\n" +
        "Hele dagen — Leverandørene står klare\n\n" +
        "📍 Industrigata 1, Brekstad · 10–16\n\n" +
        "Mer info i bio.",
      hashtags: "#fosentools #25år #program #brekstad #jubileum",
    },
    linkedin: {
      caption:
        "Programmet for vårt 25-årsjubileum 26. juni er klart:\n\n" +
        "• 10:00 — Dørene åpner og messen starter\n" +
        "• 11:00 – 13:00 — Enkel servering\n" +
        "• 13:00 — PROFF-presentasjon\n" +
        "• Hele dagen — Leverandørene er til stede for spørsmål og demo\n\n" +
        "Velkommen — ta turen innom.",
      cta_link: `${BUTIKK_URL}program-info-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-10 · tir 16. juni · Partner Milwaukee
  // -----------------------------------------------------------------------
  {
    id: "t-10-milwaukee",
    date: "2026-06-16",
    weekday: "Tirsdag",
    countdown_label: "T-10",
    theme: "Partner: Milwaukee",
    internal_note: "Milwaukee på plass. Snakk M18/M12-økosystem.",
    recommended_time: "12:00",
    mal: "besok",
    variant: "A",
    image_data: {
      company: "Milwaukee",
      location: "På plass 26. juni",
      description:
        "M18 og M12-økosystem · faglig prat · demo direkte fra Milwaukee-ekspertene.",
      quote: "Møt teamet ansvarlig for de profesjonelle batteriverktøyene du bruker daglig.",
      date: "26.06.26 · 10–16",
      url: "fosen-tools.no/milwaukee",
    } satisfies BesokData,
    video: {
      kind: "jub-t10",
      partner: "MILWAUKEE",
      accentColor: "#DC0000",
      tagline: "M18 OG M12-ØKOSYSTEMET — MØT TEAMET DIREKTE",
      chips: ["M18 FUEL", "M12", "MX FUEL", "PACKOUT"],
    },
    facebook: {
      caption:
        "🔴 Milwaukee er på plass 26. juni!\n\n" +
        "Møt teamet bak M12 og M18-økosystemet — still de spørsmålene du har lurt på, og se de nye produktene live. " +
        "Demo direkte fra fagfolkene som kjenner verktøyene best.\n\n" +
        "📍 Industrigata 1, Brekstad · 10–16",
      cta_link: `${BUTIKK_URL}partner-milwaukee`,
    },
    instagram: {
      caption:
        "🔴 Milwaukee live i butikken 26. juni.\n\n" +
        "M18, M12, MX FUEL — møt teamet og test selv.\n\n" +
        "Brekstad · 10–16. Lenke i bio.",
      hashtags: IG_HASHTAGS_PARTNER + " #milwaukee #m18 #m12",
    },
    linkedin: {
      caption:
        "Milwaukee Tool deltar på vårt 25-årsjubileum 26. juni.\n\n" +
        "Møt teamet bak M12, M18 og MX FUEL-økosystemene — still tekniske spørsmål, se nye produkter live, " +
        "og diskuter løsninger for ditt verksted direkte med ekspertene.\n\n" +
        "Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}partner-milwaukee-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-9 · ons 17. juni · Partner Wera
  // -----------------------------------------------------------------------
  {
    id: "t-9-wera",
    date: "2026-06-17",
    weekday: "Onsdag",
    countdown_label: "T-9",
    theme: "Partner: Wera",
    internal_note: "Wera på plass. Kraftform/Joker-vinkling.",
    recommended_time: "12:00",
    mal: "besok",
    variant: "B",
    image_data: {
      company: "Wera",
      location: "På plass 26. juni",
      description:
        "Tysk presisjon · Kraftform-skrutrekkere · Joker-fastnøkler · Wera Tool Rebel-ånd hele dagen.",
      quote: "Møt teamet bak tysk skruverktøy-presisjon — direkte i butikken.",
      date: "26.06.26 · 10–16",
      url: "fosen-tools.no/wera",
    } satisfies BesokData,
    video: {
      kind: "jub-t9",
      partner: "WERA",
      accentColor: "#13B04C",
      tagline: "TYSK PRESISJON SIDEN 1936",
      chips: ["KRAFTFORM", "JOKER", "TOOL REBEL"],
    },
    facebook: {
      caption:
        "🔧 Wera kommer til Brekstad 26. juni!\n\n" +
        "Tysk presisjon siden 1936. Kraftform-skrutrekkere, Joker-fastnøkler, Wera Tool Rebel-ånd hele dagen. " +
        "Møt teamet og snakk fag — eller bare ta en demo.\n\n" +
        "📍 Industrigata 1, Brekstad · 10–16",
      cta_link: `${BUTIKK_URL}partner-wera`,
    },
    instagram: {
      caption:
        "🔧 Wera på plass 26. juni.\n\n" +
        "Tysk skruverktøy-presisjon, demo + Tool Rebel-ånd. Brekstad · 10–16.\n\n" +
        "Lenke i bio.",
      hashtags: IG_HASHTAGS_PARTNER + " #wera #toolrebel",
    },
    linkedin: {
      caption:
        "Wera Tools deltar på vårt 25-årsjubileum 26. juni.\n\n" +
        "Snakk skruverktøy-presisjon med fagfolkene fra Wera — Kraftform-serien, Joker-fastnøkler og resten av " +
        "sortimentet er på plass for spørsmål og demo.\n\n" +
        "Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}partner-wera-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-8 · tor 18. juni · Partner Soudal
  // -----------------------------------------------------------------------
  {
    id: "t-8-soudal",
    date: "2026-06-18",
    weekday: "Torsdag",
    countdown_label: "T-8",
    theme: "Partner: Soudal",
    internal_note: "Soudal-spesialister. Lim, fugemasse, FOAM-løsninger.",
    recommended_time: "12:00",
    mal: "besok",
    variant: "C",
    image_data: {
      company: "Soudal",
      location: "På plass 26. juni",
      description:
        "Belgisk lim, fugemasse og foam-spesialister · møt produktekspertene direkte.",
      quote: "Få konkrete råd til ditt prosjekt — direkte fra Soudal-teamet.",
      date: "26.06.26 · 10–16",
      url: "fosen-tools.no/soudal",
    } satisfies BesokData,
    video: {
      kind: "jub-t8",
      partner: "SOUDAL",
      accentColor: "#003C82",
      tagline: "BELGISK LIM, FUGEMASSE OG FOAM",
      chips: ["LIM", "FUGEMASSE", "FOAM"],
    },
    facebook: {
      caption:
        "🧴 Soudal på plass 26. juni!\n\n" +
        "Belgisk lim-, fugemasse- og foam-spesialister. Få konkrete råd til ditt neste prosjekt — direkte fra " +
        "produktekspertene.\n\n" +
        "📍 Industrigata 1, Brekstad · 10–16",
      cta_link: `${BUTIKK_URL}partner-soudal`,
    },
    instagram: {
      caption:
        "🧴 Soudal i butikken 26. juni.\n\n" +
        "Lim · fugemasse · foam — direkte råd fra ekspertene. Brekstad · 10–16.\n\n" +
        "Lenke i bio.",
      hashtags: IG_HASHTAGS_PARTNER + " #soudal #lim #fugemasse",
    },
    linkedin: {
      caption:
        "Soudal Norge deltar på vårt 25-årsjubileum 26. juni.\n\n" +
        "Møt produktekspertene som kjenner lim-, fugemasse- og foam-løsningene best — perfekt anledning til å få konkrete " +
        "råd til ditt prosjekt eller diskutere spesialløsninger.\n\n" +
        "Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}partner-soudal-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-7 · fre 19. juni · «En uke igjen!»
  // -----------------------------------------------------------------------
  {
    id: "t-7-en-uke-igjen",
    date: "2026-06-19",
    weekday: "Fredag",
    countdown_label: "T-7",
    theme: "En uke igjen",
    internal_note: "Stor countdown. Inviter inn — varm tone.",
    recommended_time: "12:00",
    mal: "milepael",
    variant: "B",
    image_data: {
      brand: "FOSEN TOOLS",
      number: "7",
      unit: "dager",
      headline: "En uke til vi feirer 25 år",
      subhead: "Velkommen til Brekstad — vi gleder oss til å se deg.",
    } satisfies MilepaelData,
    video: {
      kind: "jub-t7",
      daysLeft: 7,
      unit: "DAGER",
      headline: "ÉN UKE TIL VI FEIRER 25 ÅR",
    },
    facebook: {
      caption:
        "⏳ Én uke igjen! Fredag 26. juni feirer vi 25 år på Brekstad — og åpner ombygd butikk samme dag.\n\n" +
        "Vi har leverandører fra hele bransjen, faglige presentasjoner og noen spesielle gjester. Vi gleder oss til å " +
        "se så mange som mulig — kom innom! 🎁\n\n" +
        "📍 Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}t-7-info`,
    },
    instagram: {
      caption:
        "⏳ 7 dager igjen.\n\n" +
        "Fredag 26. juni: 25 år · ny butikk · leverandører · servering · goodiebag.\n\n" +
        "Brekstad · 10–16. Mer info i bio.",
      hashtags: IG_HASHTAGS_COUNTDOWN,
    },
    linkedin: {
      caption:
        "Én uke igjen til vårt 25-årsjubileum.\n\n" +
        "Fredag 26. juni åpner vi dørene til ombygd butikk i Brekstad, og inviterer kunder, leverandører og partnere " +
        "til en innholdsrik dag.\n\n" +
        "Velkommen — ta turen innom.",
      cta_link: `${BUTIKK_URL}t-7-info-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-6 · lør 20. juni · Goodiebag teaser
  // -----------------------------------------------------------------------
  {
    id: "t-6-goodiebag",
    date: "2026-06-20",
    weekday: "Lørdag",
    countdown_label: "T-6",
    theme: "Goodiebag-teaser",
    internal_note: "Helg-soft. Tease goodiebag — begrenset antall (ikke spesifiser tall).",
    recommended_time: "10:00",
    mal: "feature",
    variant: "C",
    image_data: {
      eyebrow: "GOODIEBAG TIL BESØKENDE",
      headline: "En liten takk for at du tar turen",
      bullets: [
        "Begrenset antall — først til mølla",
        "Faglig påfyll fra leverandørene",
        "Eksklusive dagstilbud og kampanjer",
      ],
      cta: "Kom innom 26. juni",
    } satisfies FeatureData,
    video: {
      kind: "jub-t6",
      count: 0, // 0 = vis ikke spesifikt tall, kun "begrenset antall"
      headline: "GOODIEBAG\nBEGRENSET ANTALL",
      contents: [
        "Først til mølla 26. juni",
        "Faglig påfyll fra leverandørene",
        "Eksklusive dagstilbud og kampanjer",
      ],
    },
    facebook: {
      caption:
        "🎁 Goodiebag til besøkende — begrenset antall!\n\n" +
        "26. juni feirer vi 25 år og åpner PROFF-butikk. Kom innom så har vi en liten takk klar — først til mølla.\n\n" +
        "📍 Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}goodiebag`,
    },
    instagram: {
      caption:
        "🎁 Goodiebag til besøkende — begrenset antall.\n\n" +
        "Først til mølla 26. juni.\n\n" +
        "Brekstad · 10–16.",
      hashtags: "#fosentools #goodiebag #jubileum #25år #brekstad",
    },
    linkedin: {
      caption:
        "Goodiebag til besøkende 26. juni — begrenset antall.\n\n" +
        "En liten takk til kunder som tar turen — del av markeringen av 25 år.\n\n" +
        "Brekstad · 10:00 – 16:00.",
      cta_link: `${BUTIKK_URL}goodiebag-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-5 · søn 21. juni · 100 år i konsernet
  // -----------------------------------------------------------------------
  {
    id: "t-5-100-aar",
    date: "2026-06-21",
    weekday: "Søndag",
    countdown_label: "T-5",
    theme: "100 år i konsernet",
    internal_note: "Søndag — historie. Vis 100-årsperspektivet.",
    recommended_time: "11:00",
    mal: "milepael",
    variant: "A",
    image_data: {
      brand: "FAMILIEKONSERN",
      number: "100",
      unit: "år",
      headline: "Et helt århundre med verdiskaping",
      subhead: "Fosen Tools er 4. generasjon. 25 år alene — 100 år sammen.",
      timeline: [
        { year: "1926", label: "Familien starter" },
        { year: "2001", label: "Fosen Tools stiftes" },
        { year: "2026", label: "25 år · 100 år" },
      ],
    } satisfies MilepaelData,
    video: {
      kind: "jub-t5",
      timeline: [
        { year: "1926", label: "Familien starter" },
        { year: "2001", label: "Fosen Tools stiftes" },
        { year: "2026", label: "25 år + 100 år" },
      ],
      headline: "ET HELT ÅRHUNDRE\nMED VERDISKAPING",
    },
    facebook: {
      caption:
        "🌳 25 år for Fosen Tools — men 100 år for familien.\n\n" +
        "Fosen Tools er en del av et familiekonsern stiftet i 1926. Fjerde generasjon driver verkstedet videre fra " +
        "Brekstad. Det er den lange linjen vi feirer 26. juni — sammen med dere som har vært med oss på reisen.\n\n" +
        "📍 Industrigata 1, Brekstad · 26. juni · 10–16",
      cta_link: `${BUTIKK_URL}100-aar`,
    },
    instagram: {
      caption:
        "🌳 25 år for Fosen Tools.\n100 år for familien.\n\n" +
        "Fjerde generasjon, samme verksted. Vi feirer 26. juni.\n\n" +
        "Brekstad · 10–16. Lenke i bio.",
      hashtags: "#fosentools #100år #25år #familiekonsern #brekstad",
    },
    linkedin: {
      caption:
        "Fosen Tools fyller 25 år — som del av et familiekonsern på 100 år.\n\n" +
        "Fjerde generasjon driver verkstedet videre fra Brekstad. Det er den lange linjen vi markerer 26. juni: " +
        "kontinuitet, fag og verdiskaping over generasjoner.\n\n" +
        "Industrigata 1, Brekstad · 10:00 – 16:00.",
      cta_link: `${BUTIKK_URL}100-aar-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-4 · man 22. juni · Spesielle gjester
  // -----------------------------------------------------------------------
  {
    id: "t-4-spesielle-gjester",
    date: "2026-06-22",
    weekday: "Mandag",
    countdown_label: "T-4",
    theme: "Spesielle gjester (Red Bull + Tesla)",
    internal_note: "Avslør Red Bull + Tesla Mobile Service.",
    recommended_time: "12:00",
    mal: "besok",
    variant: "C",
    image_data: {
      company: "Red Bull · Tesla Mobile Service",
      location: "Spesielle gjester 26. juni",
      description:
        "Red Bull holder energien oppe · Tesla Mobile Service viser fram service-konseptet på stedet.",
      quote: "To overraskelser du ikke ser hver dag på Brekstad.",
      date: "26.06.26 · 10–16",
      url: "fosen-tools.no",
    } satisfies BesokData,
    video: {
      kind: "jub-t4",
      eyebrow: "SPESIELLE GJESTER",
      guestA: "RED BULL",
      guestB: "TESLA\nMOBILE SERVICE",
      subline: "+ Leverandørene på plass hele dagen",
    },
    facebook: {
      caption:
        "🎯 Vi har spesielle gjester på besøk 26. juni!\n\n" +
        "🐂 Red Bull holder energien oppe gjennom hele dagen\n" +
        "⚡ Tesla Mobile Service viser fram service-konseptet sitt direkte på stedet\n\n" +
        "To overraskelser du ikke ser hver dag på Brekstad. Ta turen!\n\n" +
        "📍 Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}spesielle-gjester`,
    },
    instagram: {
      caption:
        "🎯 Spesielle gjester 26. juni:\n\n" +
        "🐂 Red Bull\n⚡ Tesla Mobile Service\n\n" +
        "I tillegg til leverandørene. Brekstad · 10–16.\n\n" +
        "Lenke i bio.",
      hashtags: "#fosentools #25år #brekstad #redbull #teslamobile #event",
    },
    linkedin: {
      caption:
        "På vårt 25-årsjubileum 26. juni har vi to ekstra gjester:\n\n" +
        "• Red Bull — holder energien gjennom dagen\n" +
        "• Tesla Mobile Service — presenterer service-konseptet sitt på stedet\n\n" +
        "I tillegg til leverandørene som er på plass. Industrigata 1, Brekstad · 10:00 – 16:00.",
      cta_link: `${BUTIKK_URL}spesielle-gjester-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-3 · tir 23. juni · PROFF-presentasjon
  // -----------------------------------------------------------------------
  {
    id: "t-3-proff",
    date: "2026-06-23",
    weekday: "Tirsdag",
    countdown_label: "T-3",
    theme: "PROFF-presentasjon kl 13",
    internal_note: "Push den faglige verdien. PROFF-systemet for B2B.",
    recommended_time: "12:00",
    mal: "stand",
    variant: "B",
    image_data: {
      eyebrow: "PROFF-PRESENTASJON · 26. JUNI · 13:00",
      event: "FAGLIG PÅFYLL",
      year: "2026",
      pitch:
        "Hvordan PROFF-systemet hjelper verksteder, industri og bedrifter med faktura, ordre og innkjøp — " +
        "gjennomgang direkte i butikken.",
      date: "26.06.26",
      place: "Industrigata 1, Brekstad",
      stand: "13:00 (ca 30 min)",
      cta: "Sett av datoen",
    } satisfies StandData,
    video: {
      kind: "jub-t3",
      eyebrow: "PROFF-PRESENTASJON",
      time: "13:00",
      pitch: "FAKTURA · ORDRE · INNKJØP — ÉN FLYT",
    },
    facebook: {
      caption:
        "📊 PROFF-presentasjon kl 13:00 — for deg som driver verksted, industri eller bedrift.\n\n" +
        "Vi viser hvordan PROFF-systemet vårt forenkler hverdagen: faktura, ordre og innkjøp samlet i én flyt. " +
        "Ca 30 min direkte i butikken — perfekt før eller etter en runde med leverandørene.\n\n" +
        "📍 Industrigata 1, Brekstad · 26. juni · 13:00",
      cta_link: `${BUTIKK_URL}proff-presentasjon`,
    },
    instagram: {
      caption:
        "📊 PROFF kl 13:00 · 26. juni.\n\n" +
        "Faktura · ordre · innkjøp — samlet flyt for verksted og bedrift. 30 min direkte i butikken.\n\n" +
        "Brekstad · 10–16. Mer info i bio.",
      hashtags: "#fosentools #proff #b2b #verksted #brekstad #jubileum",
    },
    linkedin: {
      caption:
        "PROFF-presentasjon kl 13:00 på vårt 25-årsjubileum 26. juni.\n\n" +
        "For verkstedsledere, daglig ledere og innkjøpsansvarlige som vil se hvordan PROFF-systemet vårt forenkler " +
        "faktura, ordre og innkjøp i én flyt. Ca 30 minutter — sett av datoen hvis du har ansvar for innkjøpene.\n\n" +
        "Industrigata 1, Brekstad · 13:00.",
      cta_link: `${BUTIKK_URL}proff-presentasjon-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-2 · ons 24. juni · Konkurranser + servering
  // -----------------------------------------------------------------------
  {
    id: "t-2-konkurranser",
    date: "2026-06-24",
    weekday: "Onsdag",
    countdown_label: "T-2",
    theme: "Konkurranser + servering",
    internal_note: "Sosial dagsplan-vinkel. Energi, fellesskap, mat.",
    recommended_time: "12:00",
    mal: "feature",
    variant: "A",
    image_data: {
      eyebrow: "DET VENTER DEG · 26. JUNI",
      headline: "Konkurranser, prat og mat",
      bullets: [
        "Eksklusive dagstilbud og kampanjer",
        "Konkurranser og aktiviteter",
        "Enkel servering 11:00 – 13:00",
        "Faglig påfyll og gode tips fra ekspertene",
      ],
      cta: "Brekstad · 10:00 – 16:00",
    } satisfies FeatureData,
    video: {
      kind: "jub-t2",
      highlights: [
        "Eksklusive dagstilbud og kampanjer",
        "Konkurranser og aktiviteter",
        "Enkel servering 11–13",
        "Faglig påfyll og gode tips fra ekspertene",
      ],
    },
    facebook: {
      caption:
        "🎉 To dager igjen til 26. juni!\n\n" +
        "Det venter deg:\n" +
        "✨ Eksklusive dagstilbud og kampanjer\n" +
        "🎯 Konkurranser og aktiviteter\n" +
        "🍽️ Enkel servering 11–13\n" +
        "🛠️ Faglig påfyll og gode tips direkte fra ekspertene\n" +
        "🚗 Spennende innslag fra Red Bull og Tesla\n\n" +
        "Kommer du?\n\n" +
        "📍 Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}t-2-konkurranser`,
    },
    instagram: {
      caption:
        "✨ 2 dager igjen.\n\n" +
        "Dagstilbud · konkurranser · servering · faglig prat · Red Bull · Tesla.\n\n" +
        "Kommer du?\n\n" +
        "Brekstad · 26. juni · 10–16. Lenke i bio.",
      hashtags: "#fosentools #25år #countdown #brekstad #jubileum",
    },
    linkedin: {
      caption:
        "To dager igjen til vårt 25-årsjubileum 26. juni.\n\n" +
        "Eksklusive dagstilbud og kampanjer, konkurranser og aktiviteter, servering gjennom hele dagen, og spennende innslag fra Red Bull og Tesla Mobile Service.\n\n" +
        "Industrigata 1, Brekstad · 10:00 – 16:00.",
      cta_link: `${BUTIKK_URL}t-2-konkurranser-li`,
    },
  },

  // -----------------------------------------------------------------------
  // T-1 · tor 25. juni · «I morgen!»
  // -----------------------------------------------------------------------
  {
    id: "t-1-i-morgen",
    date: "2026-06-25",
    weekday: "Torsdag",
    countdown_label: "T-1",
    theme: "I morgen!",
    internal_note: "Maks energi. Siste push før dagen.",
    recommended_time: "12:00",
    mal: "milepael",
    variant: "C",
    image_data: {
      brand: "FOSEN TOOLS",
      number: "1",
      unit: "dag",
      headline: "I morgen feirer vi 25 år",
      subhead: "Industrigata 1, Brekstad · 10:00 – 16:00. Vi gleder oss.",
    } satisfies MilepaelData,
    video: {
      kind: "jub-t1",
      headline: "I MORGEN",
      subline: "INDUSTRIGATA 1, BREKSTAD · 10:00 – 16:00",
    },
    facebook: {
      caption:
        "⏰ I MORGEN!\n\n" +
        "Vi har 25-årsjubileum, åpner ombygd butikk, samler leverandører fra hele bransjen, holder PROFF-presentasjon kl " +
        "13 og pakker goodiebags til de første 100.\n\n" +
        "Ta turen til Brekstad i morgen — vi gleder oss til å se deg. 🎉\n\n" +
        "📍 Industrigata 1, Brekstad · 26. juni · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}t-1-i-morgen`,
    },
    instagram: {
      caption:
        "⏰ I MORGEN.\n\n" +
        "25 år · ny butikk · leverandører · PROFF kl 13 · goodiebag · konkurranser.\n\n" +
        "Brekstad · 10–16. Vi sees! 🎉",
      hashtags: IG_HASHTAGS_COUNTDOWN,
    },
    linkedin: {
      caption:
        "I morgen feirer vi 25 år.\n\n" +
        "Velkommen til Industrigata 1, Brekstad — fredag 26. juni 10:00 – 16:00. Leverandører, PROFF-presentasjon kl " +
        "13, servering og spesielle gjester. Vi gleder oss til å se kundene, partnerne og kollegaene våre samlet.",
      cta_link: `${BUTIKK_URL}t-1-i-morgen-li`,
    },
  },

  // -----------------------------------------------------------------------
  // DAGEN · fre 26. juni · VI ER ÅPNE
  // -----------------------------------------------------------------------
  {
    id: "dagen-vi-er-aapne",
    date: "2026-06-26",
    weekday: "Fredag",
    countdown_label: "DAGEN",
    theme: "VI ER ÅPNE!",
    internal_note: "Live-post tidlig morges. Push folk inn døra.",
    recommended_time: "09:30",
    mal: "stand",
    variant: "C",
    image_data: {
      eyebrow: "I DAG · 10:00 — 16:00",
      event: "VI FEIRER 25 ÅR",
      year: "2026",
      pitch:
        "Dørene åpner kl 10. Leverandører på plass · servering 11–13 · PROFF kl 13 · goodiebag til de første · " +
        "velkommen inn!",
      date: EVENT_DATE_LABEL,
      place: "Industrigata 1, Brekstad",
      stand: "10:00 – 16:00",
      cta: "Velkommen inn",
    } satisfies StandData,
    video: {
      kind: "jub-dagen",
      headline: "VI ER ÅPNE",
      chips: [
        "MILWAUKEE",
        "WERA",
        "SOUDAL",
        "PICARD/HALDER",
        "ZWEIBRÜDER",
        "RED BULL",
        "TESLA",
      ],
    },
    facebook: {
      caption:
        "🎉 I DAG! Vi feirer 25 år — dørene åpner kl 10.\n\n" +
        "Hele bransjen er på plass: Milwaukee, Wera, Soudal, Picard/Halder og Zweibrüder. Red Bull og Tesla Mobile " +
        "Service som spesielle gjester. PROFF-presentasjon kl 13. Goodiebag til de første 100. Servering 11–13.\n\n" +
        "Velkommen innom — vi gleder oss til å se deg! 🛠️\n\n" +
        "📍 Industrigata 1, Brekstad · 10:00 – 16:00",
      cta_link: `${BUTIKK_URL}dagen`,
    },
    instagram: {
      caption:
        "🎉 I DAG.\n\n" +
        "25 år. Vi er åpne 10–16. Leverandører, PROFF kl 13, goodiebag, servering.\n\n" +
        "Velkommen til Industrigata 1, Brekstad. 🛠️",
      hashtags: IG_HASHTAGS_LANG,
    },
    linkedin: {
      caption:
        "I dag feirer Fosen Tools 25 år.\n\n" +
        "Dørene åpner kl 10. Hele bransjen er på plass — Milwaukee, Wera, Soudal, Picard/Halder og Zweibrüder. " +
        "PROFF-presentasjon kl 13. Servering 11–13. Goodiebag til de første 100.\n\n" +
        "Velkommen til Industrigata 1, Brekstad. Vi gleder oss til å se kundene, partnerne og kollegaene våre " +
        "samlet i dag.",
      cta_link: `${BUTIKK_URL}dagen-li`,
    },
  },
];

// =============================================================================
// Hjelpere
// =============================================================================

export const JUBILEUM_EVENT_DATE = EVENT_DATE_ISO;

/** Tellesett — antall innlegg per plattform. */
export function countCaptions(): { total: number; facebook: number; instagram: number; linkedin: number } {
  return {
    total: JUBILEUM_KAMPANJE.length,
    facebook: JUBILEUM_KAMPANJE.length,
    instagram: JUBILEUM_KAMPANJE.length,
    linkedin: JUBILEUM_KAMPANJE.length,
  };
}

/** Returner ett innlegg basert på id (UI router helper). */
export function getPostById(id: string): JubileumPost | undefined {
  return JUBILEUM_KAMPANJE.find((p) => p.id === id);
}
