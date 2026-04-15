"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Rocket,
  Wrench,
  Search,
  ArrowLeft,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useGoogleAdsAnalysis } from "@/hooks/use-google-ads-analysis";
import type {
  CampaignAnalysis,
  AnalysisResponse,
  BusinessModel,
} from "@/app/api/google-ads/analysis/route";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
const nokPrecise = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("nb-NO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function verdictStyle(v: CampaignAnalysis["verdict"]) {
  switch (v) {
    case "scale_up":
      return { border: "border-green-700", bg: "bg-green-950/30", text: "text-green-400", icon: Rocket };
    case "keep":
      return { border: "border-blue-700", bg: "bg-blue-950/30", text: "text-blue-400", icon: CheckCircle2 };
    case "optimize":
      return { border: "border-yellow-700", bg: "bg-yellow-950/20", text: "text-yellow-400", icon: Wrench };
    case "investigate":
      return { border: "border-orange-700", bg: "bg-orange-950/20", text: "text-orange-400", icon: Search };
    case "insufficient_data":
      return { border: "border-gray-700", bg: "bg-gray-900/30", text: "text-gray-400", icon: AlertTriangle };
  }
}

function roasColor(roas: number): string {
  if (roas >= 4) return "text-green-400";
  if (roas >= 1.5) return "text-blue-400";
  if (roas >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

function TrackingHealthBanner({
  health,
  issues,
}: {
  health: AnalysisResponse["insights"]["tracking_health"];
  issues: string[];
}) {
  // Skill ut INFO-meldinger (historisk kontekst) fra reelle problemer
  const infoMessages = issues
    .filter((i) => i.startsWith("INFO:"))
    .map((i) => i.replace(/^INFO:\s*/, ""));
  const realIssues = issues.filter((i) => !i.startsWith("INFO:"));

  if (health === "ok" && realIssues.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="border border-green-800/50 bg-green-950/20 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-300">Sporing ser sunn ut</p>
              <p className="text-xs text-green-500/80 mt-1">
                Nye kjøp spores korrekt. Historiske data kan avvike fordi
                Google fryser primary-status på konverterings-tidspunktet.
              </p>
            </div>
          </div>
        </Card>
        {infoMessages.length > 0 && (
          <Card className="border border-blue-900/40 bg-blue-950/10 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">
                  Historisk kontekst
                </p>
                <ul className="mt-1 space-y-1 text-xs text-blue-400/80 list-disc list-inside">
                  {infoMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  const isWarning = health === "warning";
  const Icon = isWarning ? AlertTriangle : XCircle;
  const borderClass = isWarning ? "border-yellow-800/50 bg-yellow-950/20" : "border-red-800/50 bg-red-950/20";
  const iconClass = isWarning ? "text-yellow-400" : "text-red-400";
  const titleClass = isWarning ? "text-yellow-300" : "text-red-300";

  return (
    <div className="space-y-3">
      <Card className={`border p-4 ${borderClass}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${titleClass}`}>
              {isWarning ? "Konverteringssporingen har problemer" : "Konverteringssporingen er brutt"}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-gray-400 list-disc list-inside">
              {realIssues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        </div>
      </Card>
      {infoMessages.length > 0 && (
        <Card className="border border-blue-900/40 bg-blue-950/10 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300">
                Historisk kontekst
              </p>
              <ul className="mt-1 space-y-1 text-xs text-blue-400/80 list-disc list-inside">
                {infoMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function SettingsPanel({
  campaign,
  onSaved,
  onClose,
}: {
  campaign: CampaignAnalysis;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [model, setModel] = useState<BusinessModel>(campaign.business_model);
  const [leadValue, setLeadValue] = useState(String(campaign.estimated_lead_value_nok));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/google-ads/campaign-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.campaign_id,
          business_model: model,
          estimated_lead_value_nok: parseFloat(leadValue) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Lagring feilet");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-semibold text-white">Innstillinger</h3>
          <p className="text-sm text-gray-500">{campaign.campaign_name}</p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase">
            Forretningsmodell
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "purchase" as const, label: "Kjøp", desc: "E-handel" },
              { key: "leads" as const, label: "Leads", desc: "B2B" },
              { key: "mixed" as const, label: "Blandet", desc: "Begge" },
            ]).map((m) => (
              <button
                key={m.key}
                onClick={() => setModel(m.key)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  model === m.key
                    ? "border-blue-700 bg-blue-950/30 text-blue-300"
                    : "border-gray-800 bg-gray-900/50 text-gray-400 hover:text-white"
                }`}
              >
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {model === "purchase" && "ROAS beregnes fra ekte kjøp (purchase-event)."}
            {model === "leads" && "ROAS beregnes fra leads × antatt lead-verdi."}
            {model === "mixed" && "ROAS beregnes fra begge (kjøp + leads × verdi)."}
          </p>
        </div>

        {(model === "leads" || model === "mixed") && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase">
              Antatt verdi per lead (NOK)
            </label>
            <input
              type="number"
              step="100"
              min="0"
              value={leadValue}
              onChange={(e) => setLeadValue(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-white focus:outline-none focus:border-blue-700"
            />
            <p className="text-xs text-gray-600">
              Formel: antatt <em>lead-til-kunde konverteringsrate × gjennomsnittlig ordreverdi</em>.
              <br />
              Eks: 20% × 15 000 NOK = 3 000 NOK/lead. Start konservativt, juster når du har reelle tall.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-md text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Avbryt
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CampaignCard({
  c,
  onEdit,
}: {
  c: CampaignAnalysis;
  onEdit: () => void;
}) {
  const style = verdictStyle(c.verdict);
  const Icon = style.icon;
  const ModelIcon = c.business_model === "leads" ? Users : ShoppingCart;
  const modelLabel =
    c.business_model === "purchase"
      ? "Kjøp-fokusert"
      : c.business_model === "leads"
        ? "Lead-fokusert"
        : "Blandet";
  const roasClass = roasColor(c.effective_roas);

  return (
    <Card className={`p-5 border ${style.border} ${style.bg} space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/ga4/google-ads/${encodeURIComponent(c.campaign_id)}`}
              className="text-white font-semibold hover:text-blue-400 transition-colors"
            >
              {c.campaign_name}
            </Link>
            {c.channel_type && (
              <span className="text-xs text-gray-500 uppercase">
                {c.channel_type === "10" ? "Pmax" : c.channel_type === "2" ? "Search" : c.channel_type === "4" ? "Shopping" : c.channel_type === "3" ? "Display" : c.channel_type}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/50 text-gray-400">
              <ModelIcon className="w-3 h-3" />
              {modelLabel}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Kostnad: {nok.format(c.cost_nok)} • {c.clicks} klikk • {nokPrecise.format(c.cpc)}/klikk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
            title="Endre innstillinger"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${style.bg} ${style.border} border ${style.text}`}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">{c.verdict_label}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-300">{c.verdict_reason}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-800">
        <div>
          <div className="text-xs text-gray-500 mb-1">
            {c.business_model === "leads" ? "Lead-ROAS" : c.business_model === "mixed" ? "Samlet ROAS" : "Ekte ROAS"}
          </div>
          <div className={`text-2xl font-bold ${roasClass}`}>
            {c.effective_roas.toFixed(2)}x
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {c.business_model === "leads"
              ? `${nok.format(c.estimated_lead_total_value)} est.`
              : c.business_model === "mixed"
                ? `${nok.format(c.real_purchase_value + c.estimated_lead_total_value)}`
                : `${nok.format(c.real_purchase_value)}`}
          </div>
        </div>

        {c.business_model === "purchase" || c.business_model === "mixed" ? (
          <div>
            <div className="text-xs text-gray-500 mb-1">Ekte kjøp</div>
            <div className="text-2xl font-bold text-white">
              {c.real_purchases.toFixed(c.real_purchases % 1 === 0 ? 0 : 1)}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {c.cpa_real !== null ? `${nok.format(c.cpa_real)} per kjøp` : "ingen kjøp"}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xs text-gray-500 mb-1">Kost per lead</div>
            <div className="text-2xl font-bold text-white">
              {c.cost_per_lead !== null ? nok.format(c.cost_per_lead) : "—"}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              mål: under {nok.format(c.estimated_lead_value_nok)}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-gray-500 mb-1">
            {c.business_model === "purchase" ? "Leads (bonus)" : "Leads"}
          </div>
          <div className="text-2xl font-bold text-white">{c.real_leads}</div>
          <div className="text-xs text-gray-600 mt-0.5">
            à {nok.format(c.estimated_lead_value_nok)} est.
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Brand-andel</div>
          <div className="text-2xl font-bold text-white">
            {pct.format(c.brand_share_pct / 100)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            ~{nok.format(c.estimated_brand_cost_nok)} brand
          </div>
        </div>
      </div>

      {c.primary_value < c.real_purchase_value * 0.5 && c.real_purchase_value > 0 && (
        <div className="text-xs bg-yellow-950/30 border border-yellow-900/50 rounded-md p-3 text-yellow-400">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Primary-sporing henger etter
          </div>
          <p className="text-yellow-400/80">
            Google Ads teller {nok.format(c.primary_value)} som primary, men faktisk kjøpsverdi er {nok.format(c.real_purchase_value)}. Algoritmen jobber blindt til dette synkroniseres.
          </p>
        </div>
      )}
    </Card>
  );
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading, mutate } = useGoogleAdsAnalysis(dateRange);
  const [editing, setEditing] = useState<CampaignAnalysis | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/ga4/google-ads"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til Google Ads
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Analyse og anbefalinger</h1>
              <p className="text-xs text-gray-500">
                ROAS beregnes fra faktiske kjøp og leads. Sett forretningsmodell per
                kampanje med <Settings className="w-3 h-3 inline" />-knappen.
              </p>
            </div>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      {isLoading ? (
        <MetricGrid loading />
      ) : !data ? (
        <Card className="p-6 text-center text-gray-500">Kunne ikke laste analyse-data.</Card>
      ) : (
        <>
          <TrackingHealthBanner
            health={data.insights.tracking_health}
            issues={data.insights.tracking_issues}
          />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="text-xs text-gray-500 mb-1">Total kostnad</div>
              <div className="text-2xl font-bold text-white">{nok.format(data.totals.cost_nok)}</div>
              <div className="text-xs text-gray-600 mt-1">{data.period.days} dager</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-gray-500 mb-1">Ekte kjøp-verdi</div>
              <div className="text-2xl font-bold text-white">{nok.format(data.totals.real_purchase_value)}</div>
              <div className="text-xs text-gray-600 mt-1">fra purchase-event</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-gray-500 mb-1">Samlet kjøps-ROAS</div>
              <div className={`text-2xl font-bold ${roasColor(data.totals.real_roas)}`}>
                {data.totals.real_roas.toFixed(2)}x
              </div>
              <div className="text-xs text-gray-600 mt-1">eksklusiv leads</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-gray-500 mb-1">Estimert brand-kostnad</div>
              <div className="text-2xl font-bold text-white">
                {nok.format(data.insights.total_brand_cost_estimate)}
              </div>
              <div className="text-xs text-gray-600 mt-1">kannibalisering av organisk</div>
            </Card>
          </div>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300/90 space-y-1">
                <p className="font-semibold">ROAS-farger</p>
                <ul className="text-xs text-blue-400/70 space-y-0.5 list-disc list-inside">
                  <li><span className="text-green-400 font-semibold">Grønn ≥ 4x:</span> Meget lønnsomt — vurder å skalere</li>
                  <li><span className="text-blue-400 font-semibold">Blå 1,5–4x:</span> Lønnsomt — behold og overvåk</li>
                  <li><span className="text-yellow-400 font-semibold">Gul 0,5–1,5x:</span> Under mål — optimaliser</li>
                  <li><span className="text-red-400 font-semibold">Rød &lt; 0,5x:</span> Tap — undersøk eller pause</li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Per kampanje</h2>
            {data.campaigns.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                Ingen kampanjer med data i valgt periode.
              </Card>
            ) : (
              data.campaigns.map((c) => (
                <CampaignCard key={c.campaign_id} c={c} onEdit={() => setEditing(c)} />
              ))
            )}
          </div>

          {editing && (
            <SettingsPanel
              campaign={editing}
              onSaved={() => mutate()}
              onClose={() => setEditing(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
