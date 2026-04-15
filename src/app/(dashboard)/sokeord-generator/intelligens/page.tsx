"use client";

import { Suspense, useState } from "react";
import {
  Brain,
  Rocket,
  CheckCircle2,
  Wrench,
  XCircle,
  ShieldOff,
  Lightbulb,
  Download,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import {
  useKeywordIntelligence,
  type KeywordSignal,
} from "@/hooks/use-keyword-intelligence";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("nb-NO");

interface PlannerIdea {
  text: string;
  avg_monthly_searches: number;
  competition: string;
  low_top_bid_nok: number;
  high_top_bid_nok: number;
}

function verdictColor(v: KeywordSignal["verdict"]): string {
  if (v === "scale_up") return "text-green-400";
  if (v === "keep") return "text-blue-400";
  if (v === "optimize") return "text-yellow-400";
  if (v === "cut") return "text-red-400";
  if (v === "negative_keyword") return "text-purple-400";
  if (v === "new_opportunity") return "text-cyan-400";
  return "text-gray-500";
}

function NegativeConfirmModal({
  items,
  onConfirm,
  onCancel,
  loading,
}: {
  items: Array<{ campaign_id: string; campaign_name: string; keyword: string; match_type: "PHRASE" }>;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <Card className="max-w-2xl w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <ShieldOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Bekreft: legg til {items.length} negative keywords
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Dette vil skrive direkte til Google Ads. Endringene logges i{" "}
              Auto-actions og kan reverseres derfra.
            </p>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800">
          {items.map((item, i) => (
            <div key={i} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{item.keyword}</span>
                <span className="text-xs text-gray-500 uppercase">
                  {item.match_type}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Kampanje: {item.campaign_name || item.campaign_id}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Avbryt
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Legger til...
              </>
            ) : (
              <>Bekreft og legg til</>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Content() {
  const [days, setDays] = useState(90);
  const { data, isLoading, mutate } = useKeywordIntelligence(days);

  // Negative keyword valg
  const [selectedNegatives, setSelectedNegatives] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // Keyword Planner
  const [seedInput, setSeedInput] = useState("");
  const [plannerIdeas, setPlannerIdeas] = useState<PlannerIdea[] | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  function toggleNeg(norm: string) {
    setSelectedNegatives((prev) => {
      const next = new Set(prev);
      if (next.has(norm)) next.delete(norm);
      else next.add(norm);
      return next;
    });
  }

  function selectAllNegatives() {
    if (!data?.negative_suggestions) return;
    setSelectedNegatives(new Set(data.negative_suggestions.map((s) => s.normalized)));
  }

  function clearNegatives() {
    setSelectedNegatives(new Set());
  }

  async function applySelectedNegatives() {
    if (!data) return;
    const selectedSignals = data.negative_suggestions.filter((s) =>
      selectedNegatives.has(s.normalized)
    );
    if (selectedSignals.length === 0) return;

    setApplyLoading(true);
    setApplyResult(null);
    try {
      const items = selectedSignals
        .filter((s) => s.primary_campaign_id)
        .map((s) => ({
          campaign_id: s.primary_campaign_id!,
          keyword: s.keyword,
          match_type: "PHRASE" as const,
        }));

      const res = await fetch("/api/google-ads/apply-negatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Applying failed");
      }

      const result = await res.json();
      setApplyResult(
        `Lagt til ${result.applied} negative keywords. ${result.failed > 0 ? `${result.failed} feilet.` : ""}`
      );
      setShowConfirmModal(false);
      setSelectedNegatives(new Set());
      await mutate();
    } catch (err) {
      setApplyResult(err instanceof Error ? err.message : "Feil ved apply");
    } finally {
      setApplyLoading(false);
    }
  }

  async function fetchPlannerIdeas() {
    const seeds = seedInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (seeds.length === 0) {
      setPlannerError("Lim inn minst ett søkeord");
      return;
    }
    setPlannerLoading(true);
    setPlannerError(null);
    try {
      const res = await fetch("/api/keyword-generator/keyword-planner-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeds }),
      });
      const json = await res.json();
      if (!json.status?.available) {
        setPlannerError(
          json.status?.message || "Keyword Planner ikke tilgjengelig enda"
        );
        setPlannerIdeas([]);
      } else {
        setPlannerIdeas(json.ideas || []);
      }
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : "Feil");
    } finally {
      setPlannerLoading(false);
    }
  }

  const selectedItems = data?.negative_suggestions
    ? data.negative_suggestions
        .filter((s) => selectedNegatives.has(s.normalized))
        .filter((s) => s.primary_campaign_id)
        .map((s) => ({
          campaign_id: s.primary_campaign_id!,
          campaign_name: s.primary_campaign_name || "",
          keyword: s.keyword,
          match_type: "PHRASE" as const,
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Søkeords-intelligens</h1>
            <p className="text-xs text-gray-500">
              Kombinerer data fra Google Ads, Pmax, Search Console og konverteringer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  days === d
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <a
            href={`/api/keyword-generator?source=db&days=${days}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-800 bg-gray-900/50 text-gray-300 hover:text-white"
          >
            <Download className="w-4 h-4" />
            Last ned Excel
          </a>
        </div>
      </div>

      {/* Keyword Planner status */}
      {data?.keyword_planner_status && !data.keyword_planner_status.available && (
        <Card className="border border-yellow-900/40 bg-yellow-950/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-yellow-300">
                Keyword Planner ikke tilgjengelig
              </p>
              <p className="text-yellow-400/80 text-xs mt-1">
                {data.keyword_planner_status.message ||
                  "Krever Basic Access på developer token. Google godkjenner typisk 1–2 virkedager etter søknad."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <MetricGrid loading />
      ) : !data ? (
        <Card className="p-6 text-center text-gray-500">Kunne ikke laste data</Card>
      ) : (
        <>
          {/* Totaler */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-xs text-gray-500">Totalt signaler</div>
              <div className="text-2xl font-bold text-white mt-1">
                {num.format(data.totals.total_signals)}
              </div>
            </Card>
            <Card className="p-4 border border-green-900/40">
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Rocket className="w-3 h-3" />
                Skaler opp
              </div>
              <div className="text-2xl font-bold text-green-400 mt-1">
                {data.totals.scale_up}
              </div>
            </Card>
            <Card className="p-4 border border-yellow-900/40">
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <Wrench className="w-3 h-3" />
                Optimaliser
              </div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">
                {data.totals.optimize}
              </div>
            </Card>
            <Card className="p-4 border border-red-900/40">
              <div className="flex items-center gap-1 text-xs text-red-400">
                <XCircle className="w-3 h-3" />
                Kutt
              </div>
              <div className="text-2xl font-bold text-red-400 mt-1">
                {data.totals.cut}
              </div>
            </Card>
            <Card className="p-4 border border-purple-900/40">
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <ShieldOff className="w-3 h-3" />
                Neg. kandidater
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {data.totals.negative}
              </div>
            </Card>
          </div>

          {/* Del 1: Seed Keyword Planner */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Keyword Planner</h2>
              {data.keyword_planner_status?.available ? (
                <span className="text-xs px-2 py-0.5 rounded-full border border-green-700 bg-green-950/30 text-green-400">
                  Tilgjengelig
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-700 bg-yellow-950/30 text-yellow-400">
                  Venter på Google
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Lim inn 5–20 seed-søkeord (ett per linje) for å hente forslag med volum,
              konkurranse og CPC-estimat fra Google Keyword Planner.
            </p>
            <textarea
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder={"våpenskap\nverktøyvogn\nmobilhotell skole"}
              rows={5}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-white font-mono text-sm focus:outline-none focus:border-purple-700"
              disabled={!data.keyword_planner_status?.available}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={fetchPlannerIdeas}
                disabled={plannerLoading || !data.keyword_planner_status?.available}
              >
                {plannerLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Henter...
                  </>
                ) : (
                  "Hent forslag"
                )}
              </Button>
              {plannerError && (
                <span className="text-xs text-red-400">{plannerError}</span>
              )}
            </div>
            {plannerIdeas && plannerIdeas.length > 0 && (
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-3 py-2 text-gray-400">Søkeord</th>
                      <th className="px-3 py-2 text-right text-gray-400">Søk/mnd</th>
                      <th className="px-3 py-2 text-gray-400">Konkurranse</th>
                      <th className="px-3 py-2 text-right text-gray-400">CPC-range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plannerIdeas.slice(0, 50).map((idea, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-3 py-2 text-white">{idea.text}</td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {num.format(idea.avg_monthly_searches)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs ${
                              idea.competition === "LOW"
                                ? "text-green-400"
                                : idea.competition === "MEDIUM"
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }`}
                          >
                            {idea.competition}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {idea.low_top_bid_nok.toFixed(0)}–{idea.high_top_bid_nok.toFixed(0)} NOK
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Del 2: Skaler opp */}
          {data.top_scale_up.length > 0 && (
            <Card className="p-5 space-y-3 border border-green-900/40">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold">Skaler opp (topp 20)</h2>
              </div>
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-3 py-2 text-gray-400">Søkeord</th>
                      <th className="px-3 py-2 text-right text-gray-400">Klikk</th>
                      <th className="px-3 py-2 text-right text-gray-400">Kostnad</th>
                      <th className="px-3 py-2 text-right text-gray-400">Est. verdi</th>
                      <th className="px-3 py-2 text-right text-gray-400">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_scale_up.map((s, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-3 py-2 text-white">{s.keyword}</td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {s.total_clicks}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {nok.format(s.total_cost)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {nok.format(s.est_conversion_value)}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${verdictColor(s.verdict)}`}>
                          {s.est_roas.toFixed(2)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Del 3: Negative kandidater med auto-apply */}
          <Card className="p-5 space-y-3 border border-purple-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldOff className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">
                  Negativ-kandidater ({data.negative_suggestions.length})
                </h2>
              </div>
              {data.negative_suggestions.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllNegatives}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Velg alle
                  </button>
                  <button
                    onClick={clearNegatives}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Fjern valg
                  </button>
                </div>
              )}
            </div>
            {data.negative_suggestions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ingen negativ-kandidater funnet i perioden.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto border border-gray-800 rounded-lg max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900">
                      <tr className="border-b border-gray-800 text-left">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2 text-gray-400">Søkeord</th>
                        <th className="px-3 py-2 text-right text-gray-400">Klikk</th>
                        <th className="px-3 py-2 text-right text-gray-400">Kostnad</th>
                        <th className="px-3 py-2 text-gray-400">Grunn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.negative_suggestions.map((s) => {
                        const checked = selectedNegatives.has(s.normalized);
                        return (
                          <tr
                            key={s.normalized}
                            className={`border-b border-gray-800/50 cursor-pointer ${
                              checked ? "bg-purple-950/30" : "hover:bg-gray-800/30"
                            }`}
                            onClick={() => toggleNeg(s.normalized)}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleNeg(s.normalized)}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 text-white">{s.keyword}</td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {s.total_clicks}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {nok.format(s.total_cost)}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {s.verdict_reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                    {selectedNegatives.size} valgt
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selectedNegatives.size === 0}
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Legg til som negative keywords i Google Ads
                  </Button>
                </div>
                {applyResult && (
                  <Card className="p-3 bg-green-950/20 border border-green-800/50 text-sm text-green-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {applyResult}
                    </div>
                  </Card>
                )}
              </>
            )}
          </Card>

          {/* Del 4: Nye muligheter */}
          {data.new_opportunities.length > 0 && (
            <Card className="p-5 space-y-3 border border-cyan-900/40">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold">
                  Nye muligheter ({data.new_opportunities.length})
                </h2>
              </div>
              <p className="text-xs text-gray-500">
                Søkeord fra Search Console eller Pmax som kunne blitt dedikerte
                Search-keywords
              </p>
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-3 py-2 text-gray-400">Søkeord</th>
                      <th className="px-3 py-2 text-right text-gray-400">
                        Org. visninger
                      </th>
                      <th className="px-3 py-2 text-right text-gray-400">
                        Org. posisjon
                      </th>
                      <th className="px-3 py-2 text-gray-400">Anbefaling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.new_opportunities.slice(0, 30).map((s, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-3 py-2 text-white">{s.keyword}</td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {num.format(s.organic_impressions ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {s.organic_position?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {s.verdict_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {showConfirmModal && (
        <NegativeConfirmModal
          items={selectedItems}
          onConfirm={applySelectedNegatives}
          onCancel={() => setShowConfirmModal(false)}
          loading={applyLoading}
        />
      )}
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
