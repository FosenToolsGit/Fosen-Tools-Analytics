"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  ShieldOff,
  Rocket,
  Search,
  Megaphone,
  CheckCircle2,
  Flame,
  ExternalLink,
  Printer,
  ShoppingCart,
  Shield,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMandagsmote, type MandagsmoteData } from "@/hooks/use-mandagsmote";
import { formatNumber, formatCompact } from "@/lib/utils/format";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

function DeltaBadge({ value, large = false }: { value: number; large?: boolean }) {
  const Icon = value > 5 ? TrendingUp : value < -5 ? TrendingDown : Minus;
  const color =
    value > 10 ? "text-green-400" : value < -10 ? "text-red-400" : "text-gray-400";
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${color} ${
        large ? "text-base" : "text-xs"
      }`}
    >
      <Icon className={large ? "w-4 h-4" : "w-3 h-3"} />
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

function statusBorder(status: "up" | "down" | "flat"): string {
  if (status === "up") return "border-green-500/40 bg-green-950/10";
  if (status === "down") return "border-red-500/40 bg-red-950/10";
  return "border-gray-700 bg-gray-900/50";
}

interface PlatformSnapshot {
  platform: string;
  status: "up" | "down" | "flat";
  current: {
    sessions: number;
    clicks: number;
    reach: number;
    engagement: number;
    followers: number;
  };
  delta_pct: {
    sessions: number;
    clicks: number;
    reach: number;
    engagement: number;
    followers: number;
  };
}

function buildActionItems(d: MandagsmoteData): Array<{
  priority: "high" | "medium" | "low";
  text: string;
  href?: string;
}> {
  const items: Array<{
    priority: "high" | "medium" | "low";
    text: string;
    href?: string;
  }> = [];

  // Nye konkurrent-søk
  const competitorTerms = d.anomalies.filter(
    (a) =>
      (a as { category?: string }).category === "new_competitor_brand" &&
      (a as { status?: string }).status === "active"
  );
  if (competitorTerms.length > 0) {
    items.push({
      priority: "high",
      text: `Auto-apply ${competitorTerms.length} nye konkurrent-søk som negative keywords`,
      href: "/sokeord-generator/intelligens",
    });
  }

  // Kritiske anomalier
  const criticals = d.anomalies.filter(
    (a) => (a as { severity?: string }).severity === "critical"
  );
  if (criticals.length > 0) {
    items.push({
      priority: "high",
      text: `Gjennomgå ${criticals.length} kritisk${criticals.length === 1 ? "" : "e"} varsel og acknowledge/resolver`,
      href: "/varsler",
    });
  }

  // SEO quick wins
  const quickWins = d.seo?.summary?.quick_wins ?? 0;
  if (quickWins > 0) {
    items.push({
      priority: "medium",
      text: `Jobb videre med ${quickWins} SEO quick wins`,
      href: "/innsikt/seo",
    });
  }

  // Falt i SEO (kritiske bevegelser)
  const seoFallers = (d.seo?.opportunities ?? []).filter(
    (o) =>
      (o as { position_change?: number }).position_change !== undefined &&
      (o as { position_change: number }).position_change < -10
  );
  if (seoFallers.length > 0) {
    items.push({
      priority: "high",
      text: `Undersøk ${seoFallers.length} SEO-søkeord som har falt kraftig`,
      href: "/innsikt/seo",
    });
  }

  // Mailchimp momentum
  const mc = (d.sb14?.platforms ?? []).find((p) => p.platform === "Mailchimp");
  if (mc && (mc.delta_pct?.clicks ?? 0) > 50) {
    items.push({
      priority: "medium",
      text: "Send nytt nyhetsbrev — Mailchimp driver flest klikk akkurat nå",
      href: "/innleggsbygger/nyhetsbrev",
    });
  }

  // Google Ads spend-fall
  const gads7 = d.sb7?.google_ads;
  if (gads7 && gads7.delta_pct?.cost < -30) {
    items.push({
      priority: "high",
      text: "Sjekk Google Ads — spend har falt kraftig. Er kampanjer pauset?",
      href: "/ga4/google-ads",
    });
  }

  return items;
}

function Content() {
  const { data, isLoading, mutate } = useMandagsmote();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mandagsmøte</h1>
            <p className="text-xs text-gray-500">Laster data …</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] bg-gray-800/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const sb7 = data.sb7;
  const sb14 = data.sb14;
  const platforms14: PlatformSnapshot[] = (sb14?.platforms ??
    []) as PlatformSnapshot[];
  const totalSessions7 = (sb7?.platforms ?? []).reduce(
    (s, p) => s + (p.current?.sessions ?? 0),
    0
  );
  const totalReach7 = (sb7?.platforms ?? []).reduce(
    (s, p) => s + (p.current?.reach ?? 0),
    0
  );
  const gadsCost = sb7?.google_ads?.current?.cost ?? 0;
  const gadsCostDelta = sb7?.google_ads?.delta_pct?.cost ?? 0;

  const critAnomalies = data.anomalies.filter(
    (a) => (a as { severity?: string }).severity === "critical"
  );
  const warnAnomalies = data.anomalies.filter(
    (a) => (a as { severity?: string }).severity === "warning"
  );
  const competitorAnomalies = data.anomalies.filter(
    (a) => (a as { category?: string }).category === "new_competitor_brand"
  );

  // Topp innlegg (ROI-score high)
  const topPosts = (data.content?.posts ?? [])
    .filter((p) => p.roi_score === "high" || p.traffic_lift_pct > 20)
    .slice(0, 5);

  // SEO movers
  const seoOps = data.seo?.opportunities ?? [];
  const seoRisers = [...seoOps]
    .filter((o) => (o.position_change ?? 0) > 0.5)
    .sort((a, b) => (b.position_change ?? 0) - (a.position_change ?? 0))
    .slice(0, 5);
  const seoFallers = [...seoOps]
    .filter((o) => (o.position_change ?? 0) < -0.5)
    .sort((a, b) => (a.position_change ?? 0) - (b.position_change ?? 0))
    .slice(0, 5);

  // Vekstmuligheter
  const growthTop = (data.growth?.opportunities ?? []).slice(0, 6);

  const actions = buildActionItems(data);
  const generatedAt = new Date(data.generated_at).toLocaleString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mandagsmøte</h1>
            <p className="text-xs text-gray-500">
              Generert {generatedAt} · Uke-i-uke sammenligning
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/mandagsmote/brief"
            className="flex items-center gap-1 px-3 py-2 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Møtebrief
          </Link>
          <button
            onClick={() => mutate()}
            className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Oppdater
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors print:hidden"
          >
            <Printer className="w-3 h-3" /> Skriv ut
          </button>
        </div>
      </div>

      {/* Hero: Denne uken i tall */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Denne uken i tall — siste 7 dager
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">Sesjoner (GA4)</span>
            <span className="text-3xl font-bold text-white">
              {formatNumber(totalSessions7)}
            </span>
            <DeltaBadge
              value={
                (sb7?.platforms ?? []).find((p) => p.platform === "Google Analytics")
                  ?.delta_pct?.sessions ?? 0
              }
            />
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">Total rekkevidde</span>
            <span className="text-3xl font-bold text-white">
              {formatCompact(totalReach7)}
            </span>
            <span className="text-xs text-gray-500">Alle plattformer</span>
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">Ad-spend</span>
            <span className="text-3xl font-bold text-white">
              {nok.format(gadsCost)}
            </span>
            <DeltaBadge value={Math.round(gadsCostDelta)} />
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">Aktive varsler</span>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-white">
                {data.anomalies.length}
              </span>
              {critAnomalies.length > 0 && (
                <span className="flex items-center gap-1 text-sm text-red-400 mb-1">
                  <AlertOctagon className="w-4 h-4" />
                  {critAnomalies.length} kritisk
                </span>
              )}
            </div>
            <Link
              href="/varsler"
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Se alle →
            </Link>
          </Card>
        </div>
      </section>

      {/* Konverteringer siste 7d */}
      {data.conversions?.current && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Konverteringer — siste 7 dager
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="flex flex-col gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> Kjøp
              </span>
              <span className="text-3xl font-bold text-white">
                {data.conversions.current.purchases.toFixed(0)}
              </span>
              <DeltaBadge value={Math.round(data.conversions.delta_pct.purchases)} />
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">Kjøpsverdi</span>
              <span className="text-3xl font-bold text-white">
                {nok.format(data.conversions.current.purchase_value)}
              </span>
              <DeltaBadge
                value={Math.round(data.conversions.delta_pct.purchase_value)}
              />
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">ROAS (ekte kjøp)</span>
              <span className="text-3xl font-bold text-white">
                {data.conversions.current.roas.toFixed(2)}x
              </span>
              <DeltaBadge value={Math.round(data.conversions.delta_pct.roas)} />
            </Card>
            {/* Kjøps-intent — fanger checkout-lekkasje. Rød border når
                folk når kassen men ingen fullfører (lekkasje-alarm). */}
            <Card
              className={`flex flex-col gap-2 border-2 ${
                data.conversions.current.intent_value > 0 &&
                data.conversions.current.purchases === 0
                  ? "border-red-500/60"
                  : "border-transparent"
              }`}
            >
              <span className="text-xs text-gray-400">Kjøps-intent</span>
              <span className="text-3xl font-bold text-white">
                {nok.format(data.conversions.current.intent_value)}
              </span>
              <DeltaBadge
                value={Math.round(data.conversions.delta_pct.intent_value)}
              />
              <span className="text-xs text-gray-500">
                {data.conversions.current.intent_count.toFixed(0)} begin_checkout
                {data.conversions.current.intent_value > 0 &&
                  data.conversions.current.purchases === 0 && (
                    <span className="text-red-400 font-medium">
                      {" "}
                      · lekkasje?
                    </span>
                  )}
              </span>
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">Leads (skjema)</span>
              <span className="text-3xl font-bold text-white">
                {data.conversions.current.leads.toFixed(0)}
              </span>
              <DeltaBadge value={Math.round(data.conversions.delta_pct.leads)} />
              {data.conversions.current.cost_per_lead !== null && (
                <span className="text-xs text-gray-500">
                  {nok.format(data.conversions.current.cost_per_lead)} per lead
                </span>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Plattform-status (14d) */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Trafikklys per plattform — siste 14 dager
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms14.map((p) => (
            <Card
              key={p.platform}
              className={`flex flex-col gap-2 border-2 ${statusBorder(p.status)}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  {p.platform}
                </h3>
                {p.status === "up" && (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                )}
                {p.status === "down" && (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
                {p.status === "flat" && <Minus className="w-5 h-5 text-gray-400" />}
              </div>
              <div className="space-y-1.5">
                {p.current?.sessions > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Sesjoner</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">
                        {formatCompact(p.current.sessions)}
                      </span>
                      <DeltaBadge value={p.delta_pct.sessions} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Rekkevidde</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {formatCompact(p.current.reach)}
                    </span>
                    <DeltaBadge value={p.delta_pct.reach} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Klikk</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {formatNumber(p.current.clicks)}
                    </span>
                    <DeltaBadge value={p.delta_pct.clicks} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Engasjement</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {formatCompact(p.current.engagement)}
                    </span>
                    <DeltaBadge value={p.delta_pct.engagement} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Validering av forrige uke */}
      {data.validation?.campaigns && data.validation.campaigns.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Validering av forrige uke — virket endringene?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.validation.campaigns.map((c) => {
              const Icon =
                c.role === "pmax"
                  ? Sparkles
                  : c.role === "brand_search"
                    ? Shield
                    : Search;
              const isGood =
                c.role === "pmax"
                  ? c.delta_pct.brand_share_pct < -1
                  : c.role === "brand_search"
                    ? c.current.clicks > 0
                    : c.current.real_purchases > 0 || c.current.real_leads > 0;
              const isBad =
                c.role === "pmax"
                  ? c.delta_pct.brand_share_pct > 2
                  : c.role === "bransjer"
                    ? c.current.cost > 1000 &&
                      c.current.real_purchases === 0 &&
                      c.current.real_leads === 0
                    : false;
              return (
                <Card
                  key={c.campaign_id}
                  className={`flex flex-col gap-3 border-2 ${
                    isGood
                      ? "border-green-500/40 bg-green-950/10"
                      : isBad
                        ? "border-red-500/40 bg-red-950/10"
                        : "border-gray-700 bg-gray-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-white">
                        {c.role === "pmax"
                          ? "Pmax (General)"
                          : c.role === "brand_search"
                            ? "Brand Search"
                            : "Bransjer (Søk)"}
                      </h3>
                    </div>
                    {isGood ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : isBad ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400 truncate" title={c.campaign_name}>
                    {c.campaign_name}
                  </p>
                  {c.role === "pmax" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Brand-andel</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {c.current.brand_share_pct}%
                          </span>
                          <span
                            className={`text-xs ${
                              c.delta_pct.brand_share_pct < 0
                                ? "text-green-400"
                                : c.delta_pct.brand_share_pct > 0
                                  ? "text-red-400"
                                  : "text-gray-500"
                            }`}
                          >
                            {c.delta_pct.brand_share_pct > 0 ? "+" : ""}
                            {c.delta_pct.brand_share_pct}pp
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">ROAS</span>
                        <span className="text-sm font-semibold text-white">
                          {c.current.roas.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  )}
                  {c.role === "brand_search" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Status</span>
                        <span
                          className={`text-xs font-semibold ${
                            c.status === "ENABLED"
                              ? "text-green-400"
                              : "text-amber-400"
                          }`}
                        >
                          {c.status ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Klikk</span>
                        <span className="text-sm font-semibold text-white">
                          {c.current.clicks}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Kostnad</span>
                        <span className="text-sm font-semibold text-white">
                          {nok.format(c.current.cost)}
                        </span>
                      </div>
                    </div>
                  )}
                  {c.role === "bransjer" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Kostnad</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {nok.format(c.current.cost)}
                          </span>
                          <DeltaBadge value={Math.round(c.delta_pct.cost)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Leads</span>
                        <span className="text-sm font-semibold text-white">
                          {c.current.real_leads.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Kjøp</span>
                        <span className="text-sm font-semibold text-white">
                          {c.current.real_purchases.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed mt-1">
                    {c.story}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Handlingspunkter */}
      {actions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Hva vi bør gjøre denne uken
          </h2>
          <Card>
            <ul className="space-y-3">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      a.priority === "high"
                        ? "bg-red-900/40 text-red-400"
                        : a.priority === "medium"
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {a.priority === "high" ? (
                      <Flame className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{a.text}</p>
                  </div>
                  {a.href && (
                    <Link
                      href={a.href}
                      className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
                    >
                      Åpne →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Kritiske varsler */}
      {(critAnomalies.length > 0 || warnAnomalies.length > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Varsler å gå gjennom
          </h2>
          <Card>
            <div className="space-y-2">
              {[...critAnomalies, ...warnAnomalies].slice(0, 8).map((a, i) => {
                const ax = a as {
                  id: number;
                  title: string;
                  description: string;
                  severity: string;
                  category: string;
                  suggested_action?: string;
                };
                return (
                  <div
                    key={ax.id ?? i}
                    className={`p-3 rounded-lg border-l-4 ${
                      ax.severity === "critical"
                        ? "border-red-500 bg-red-950/20"
                        : "border-amber-500 bg-amber-950/10"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {ax.severity === "critical" ? (
                        <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {ax.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ax.description}
                        </p>
                        {ax.suggested_action && (
                          <p className="text-xs text-amber-300/80 mt-1 italic">
                            → {ax.suggested_action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {competitorAnomalies.length > 0 && (
              <div className="mt-4 p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-semibold text-white">
                    {competitorAnomalies.length} konkurrent-søk kan auto-applies
                    som negative
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {competitorAnomalies.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-red-900/30 text-red-300 text-xs rounded"
                    >
                      {(a as { target_id: string }).target_id}
                    </span>
                  ))}
                </div>
                <Link
                  href="/sokeord-generator/intelligens"
                  className="inline-block mt-2 text-xs text-amber-400 hover:text-amber-300"
                >
                  Gå til Intelligens-siden for å auto-apply →
                </Link>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Topp innlegg */}
      {topPosts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Topp innlegg — hva som driver trafikk
          </h2>
          <Card>
            <div className="space-y-2">
              {topPosts.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-800/40"
                >
                  <span className="text-xs text-gray-500 w-6">#{i + 1}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${
                      p.platform === "mailchimp"
                        ? "bg-yellow-900/30 text-yellow-300"
                        : p.platform === "meta"
                          ? "bg-blue-900/30 text-blue-300"
                          : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    {p.platform}
                  </span>
                  <span className="flex-1 text-sm text-white truncate">
                    {p.title}
                  </span>
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {p.published_at}
                  </span>
                  <span className="text-sm font-semibold text-green-400">
                    +{p.traffic_lift_pct}%
                  </span>
                  {p.post_url ? (
                    <a
                      href={p.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 print:hidden"
                      title="Åpne innlegg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Mailchimp siste kampanje */}
      {data.mailchimp_latest?.latest && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Mailchimp — siste kampanje
          </h2>
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-400">
                      Sendt{" "}
                      {new Date(
                        data.mailchimp_latest.latest.sent_at
                      ).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      · {formatNumber(data.mailchimp_latest.latest.sent_count)} mottakere
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {data.mailchimp_latest.latest.title}
                  </h3>
                  {data.mailchimp_latest.latest.subject &&
                    data.mailchimp_latest.latest.subject !==
                      data.mailchimp_latest.latest.title && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Emne: {data.mailchimp_latest.latest.subject}
                      </p>
                    )}
                </div>
                {data.mailchimp_latest.latest.post_url && (
                  <a
                    href={data.mailchimp_latest.latest.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap print:hidden"
                  >
                    Mailchimp-rapport <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <p className="text-xs text-gray-400">Åpningsrate</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-white">
                      {data.mailchimp_latest.latest.open_rate}%
                    </span>
                    {data.mailchimp_latest.baseline.n_campaigns > 0 && (
                      <span
                        className={`text-xs font-medium ${
                          data.mailchimp_latest.open_rate_lift_pct > 5
                            ? "text-green-400"
                            : data.mailchimp_latest.open_rate_lift_pct < -5
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {data.mailchimp_latest.open_rate_lift_pct > 0 ? "+" : ""}
                        {data.mailchimp_latest.open_rate_lift_pct}% vs snitt
                      </span>
                    )}
                  </div>
                  {data.mailchimp_latest.baseline.n_campaigns > 0 && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Snitt {data.mailchimp_latest.baseline.avg_open_rate}% (
                      {data.mailchimp_latest.baseline.n_campaigns} forrige)
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <p className="text-xs text-gray-400">Klikkrate</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-white">
                      {data.mailchimp_latest.latest.click_rate}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {formatNumber(data.mailchimp_latest.latest.clicks)} klikk totalt
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <p className="text-xs text-gray-400">Avmeldinger</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-white">
                      {data.mailchimp_latest.latest.unsubscribed}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {data.mailchimp_latest.latest.sent_count > 0
                      ? (
                          (data.mailchimp_latest.latest.unsubscribed /
                            data.mailchimp_latest.latest.sent_count) *
                          100
                        ).toFixed(2)
                      : "0"}
                    % av mottakere
                  </p>
                </div>
              </div>
              {data.mailchimp_latest.top_link && (
                <div className="p-3 rounded-lg bg-yellow-950/15 border border-yellow-900/30">
                  <p className="text-xs text-yellow-300/80 mb-1">
                    Mest klikket lenke
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={data.mailchimp_latest.top_link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-white hover:text-amber-300 truncate flex-1"
                    >
                      {data.mailchimp_latest.top_link.url}
                    </a>
                    <span className="text-sm font-semibold text-yellow-300 whitespace-nowrap">
                      {data.mailchimp_latest.top_link.clicks} klikk
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* SEO-bevegelser */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          SEO — hva som rører seg
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white">
                Vi stiger ({seoRisers.length})
              </h3>
            </div>
            {seoRisers.length === 0 ? (
              <p className="text-xs text-gray-500">Ingen kraftige stigninger denne uken.</p>
            ) : (
              <div className="space-y-1">
                {seoRisers.map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="text-white truncate flex-1">{o.query}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">pos {o.position}</span>
                      <span className="text-green-400 font-medium">
                        +{o.position_change?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">
                Vi faller ({seoFallers.length})
              </h3>
            </div>
            {seoFallers.length === 0 ? (
              <p className="text-xs text-gray-500">Ingen kraftige fall denne uken.</p>
            ) : (
              <div className="space-y-1">
                {seoFallers.map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="text-white truncate flex-1">{o.query}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">pos {o.position}</span>
                      <span className="text-red-400 font-medium">
                        {o.position_change?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>{data.seo?.summary?.quick_wins ?? 0} quick wins totalt</span>
          <span>·</span>
          <span>Snitt pos {data.seo?.summary?.avg_position ?? "—"}</span>
          <span>·</span>
          <Link href="/innsikt/seo" className="text-amber-400 hover:text-amber-300">
            Se alle SEO-muligheter →
          </Link>
        </div>
      </section>

      {/* Vekstmuligheter */}
      {growthTop.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Vekstmuligheter — søkeord vi bør bygge for
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-2 py-2 text-gray-400 font-medium">Søkeord</th>
                    <th className="px-2 py-2 text-right text-gray-400 font-medium">
                      Volum/mnd
                    </th>
                    <th className="px-2 py-2 text-right text-gray-400 font-medium">
                      Nå pos
                    </th>
                    <th className="px-2 py-2 text-right text-gray-400 font-medium">
                      Potensial
                    </th>
                    <th className="px-2 py-2 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {growthTop.map((o, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="px-2 py-2 text-white font-medium">
                        {o.keyword}
                      </td>
                      <td className="px-2 py-2 text-right text-white">
                        {formatNumber(o.monthly_searches)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-400">
                        {o.current_position !== null
                          ? o.current_position
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-right text-green-400 font-semibold">
                        {o.potential_score > 0
                          ? `+${formatNumber(o.potential_score)}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {o.category === "not_ranking" ? (
                          <span className="text-red-400">Ikke rangerer</span>
                        ) : o.category === "low_rank" ? (
                          <span className="text-amber-400">Lav posisjon</span>
                        ) : o.category === "almost_page_one" ? (
                          <span className="text-blue-400">Nesten side 1</span>
                        ) : (
                          <span className="text-green-400">Rangerer bra</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <Link
                href="/innsikt/vekst"
                className="text-amber-400 hover:text-amber-300"
              >
                Se alle {data.growth?.summary?.total_ideas ?? 0} vekstmuligheter →
              </Link>
            </div>
          </Card>
        </section>
      )}

      {/* Quick-lenker */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Verktøy for denne ukens planlegging
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/innleggsbygger/sosiale"
            className="p-4 bg-pink-950/20 border border-pink-900/40 rounded-xl hover:bg-pink-950/30 transition-colors"
          >
            <Megaphone className="w-5 h-5 text-pink-400 mb-2" />
            <p className="text-sm font-medium text-white">Sosiale poster</p>
            <p className="text-xs text-gray-400">Caption-forslag + Native prompts</p>
          </Link>
          <Link
            href="/innleggsbygger/nyhetsbrev"
            className="p-4 bg-yellow-950/20 border border-yellow-900/40 rounded-xl hover:bg-yellow-950/30 transition-colors"
          >
            <Mail className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-sm font-medium text-white">Nyhetsbrev</p>
            <p className="text-xs text-gray-400">Emne-forslag + temaer</p>
          </Link>
          <Link
            href="/innsikt/seo"
            className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-xl hover:bg-blue-950/30 transition-colors"
          >
            <Search className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-sm font-medium text-white">SEO-muligheter</p>
            <p className="text-xs text-gray-400">Quick wins + analyse</p>
          </Link>
          <Link
            href="/innsikt/vekst"
            className="p-4 bg-purple-950/20 border border-purple-900/40 rounded-xl hover:bg-purple-950/30 transition-colors"
          >
            <Rocket className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-sm font-medium text-white">Vekstmuligheter</p>
            <p className="text-xs text-gray-400">Keyword Planner</p>
          </Link>
        </div>
      </section>

      <p className="text-xs text-gray-600 text-center pt-4">
        Trykk <span className="font-mono bg-gray-800 px-1 rounded">Oppdater</span>{" "}
        for å hente ferske tall. Siden henter data hver gang du åpner den.
      </p>
    </div>
  );
}

export default function MandagsmotePage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
