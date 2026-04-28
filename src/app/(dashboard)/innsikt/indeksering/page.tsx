"use client";

import { useState } from "react";
import {
  AlertTriangle,
  FileSearch,
  Ghost,
  FileX,
  Layers,
  ArrowRightLeft,
  Link2,
  CheckCircle,
  XCircle,
  ExternalLink,
  RotateCw,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useIndexing } from "@/hooks/use-insights";
import { formatNumber } from "@/lib/utils/format";
import type { IndexingResponse } from "@/app/api/insights/indexing/route";

type IssueKey =
  | "cannibalized"
  | "buried"
  | "zombies"
  | "legacy_urls"
  | "param_urls"
  | "orphans";

const TABS: { key: IssueKey; label: string; description: string }[] = [
  {
    key: "cannibalized",
    label: "Kannibalisering",
    description:
      "Samme søkeord rangerer på flere sider — de konkurrerer mot hverandre og svekker begge.",
  },
  {
    key: "buried",
    label: "Begravet",
    description:
      "Høy visningsvolum men posisjon > 30. Siden er indeksert, men Google viser den langt ned.",
  },
  {
    key: "zombies",
    label: "Zombies",
    description: "Rangerer i Google men mangler fra sitemap.xml. Burde vært deklarert.",
  },
  {
    key: "legacy_urls",
    label: "Legacy-URLer",
    description:
      "/categories/-URLer som burde ha 301-redirect til den direkte versjonen.",
  },
  {
    key: "param_urls",
    label: "Filter-URLer",
    description:
      "URLer med query-parametere (?Filter=, ?deviceSize= osv) som likevel får visninger.",
  },
  {
    key: "orphans",
    label: "Orphans",
    description:
      "I sitemap men ingen visninger siste periode. Normalt for produktsider uten søkevolum.",
  },
];

interface IssueCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}

function IssueCard({ title, value, subtitle, icon: Icon, iconColor }: IssueCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-400 truncate">{title}</span>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor} flex-shrink-0`} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl sm:text-3xl font-bold text-white">{formatNumber(value)}</span>
        <span className="text-xs text-gray-500">{subtitle}</span>
      </div>
    </Card>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname + u.search);
  } catch {
    return url;
  }
}

function IssueBadge({
  count,
  severity,
}: {
  count: number;
  severity: "high" | "medium" | "low" | "ok";
}) {
  const colors: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/40",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    ok: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[severity]}`}>
      {count}
    </span>
  );
}

function CannibalizedList({ rows }: { rows: IndexingResponse["issues"]["cannibalized"] }) {
  if (rows.length === 0)
    return <p className="text-sm text-gray-500 py-8 text-center">Ingen kannibalisering funnet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.query} className="border border-gray-800 rounded-lg p-4 bg-gray-900/40">
          <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
            <div>
              <div className="text-white font-medium">{row.query}</div>
              <div className="text-xs text-gray-500 mt-1">
                {row.urls.length} konkurrerende sider · {formatNumber(row.total_impressions)} visninger · {formatNumber(row.total_clicks)} klikk
              </div>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 font-normal">Side</th>
                <th className="py-1 font-normal text-right w-16">Pos.</th>
                <th className="py-1 font-normal text-right w-20">Visn.</th>
                <th className="py-1 font-normal text-right w-16">Klikk</th>
              </tr>
            </thead>
            <tbody>
              {row.urls.map((u, i) => (
                <tr key={u.url} className={i === 0 ? "text-green-400" : "text-gray-400"}>
                  <td className="py-1 truncate max-w-[400px]">
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {shortenUrl(u.url)}
                    </a>
                    {i === 0 && <span className="ml-2 text-[10px] text-green-500">(vinner)</span>}
                  </td>
                  <td className="py-1 text-right">{u.position.toFixed(1)}</td>
                  <td className="py-1 text-right">{formatNumber(u.impressions)}</td>
                  <td className="py-1 text-right">{formatNumber(u.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({
  rows,
  headers,
  renderRow,
  empty,
}: {
  rows: unknown[];
  headers: Array<{ label: string; align?: "left" | "right" | "center" }>;
  renderRow: (row: unknown, i: number) => React.ReactNode;
  empty: string;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-gray-500 py-8 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            {headers.map((h) => (
              <th
                key={h.label}
                className={`px-4 py-3 text-gray-400 font-medium ${
                  h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : ""
                }`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

export default function IndexingPage() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, error, isLoading, mutate } = useIndexing(dateRange);
  const [tab, setTab] = useState<IssueKey>("cannibalized");
  const [showRobots, setShowRobots] = useState(false);

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-blue-400" />
            Indeksering
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Helsesjekk av hva Google faktisk ser — sitemap, kannibalisering, legacy-URLer og mer.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            dateRange={dateRange}
            activePreset={preset}
            onPresetChange={setPreset}
            onCustomRange={setCustomRange}
          />
          <button
            onClick={() => mutate()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            Oppdater
          </button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-500/40 bg-red-500/10">
          <p className="text-sm text-red-400">Feil: {String(error)}</p>
        </Card>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Analyserer sitemap og Search Console...
        </div>
      )}

      {data && (
        <>
          {/* Helse-status */}
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  {data.summary.sitemap_ok ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    Sitemap: {data.summary.sitemap_ok ? "OK" : "Mangler"} ({formatNumber(data.summary.sitemap_total)} URLer)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {data.summary.robots_ok ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <button
                    onClick={() => setShowRobots(!showRobots)}
                    className="text-sm text-gray-300 hover:text-white underline-offset-2 hover:underline"
                  >
                    robots.txt: {data.summary.robots_ok ? "OK" : "Mangler"}
                  </button>
                </div>
                <a
                  href={data.sitemap_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Åpne sitemap
                </a>
              </div>
              <div className="text-xs text-gray-500">
                {formatNumber(data.summary.sitemap_with_impressions)} av{" "}
                {formatNumber(data.summary.sitemap_total)} sitemap-URLer har visninger i perioden
              </div>
            </div>
            {showRobots && data.robots_txt && (
              <pre className="mt-4 p-3 bg-gray-950 border border-gray-800 rounded text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                {data.robots_txt}
              </pre>
            )}
          </Card>

          {/* KPI-kort */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <IssueCard
              title="Kannibalisering"
              value={data.summary.cannibalized}
              subtitle="søkeord m/ flere sider"
              icon={Layers}
              iconColor="text-red-400"
            />
            <IssueCard
              title="Begravet"
              value={data.summary.buried}
              subtitle="sider med pos > 30"
              icon={FileX}
              iconColor="text-orange-400"
            />
            <IssueCard
              title="Zombies"
              value={data.summary.zombies}
              subtitle="ikke i sitemap"
              icon={Ghost}
              iconColor="text-yellow-400"
            />
            <IssueCard
              title="Legacy-URLer"
              value={data.summary.legacy_urls}
              subtitle="/categories/ duplikater"
              icon={ArrowRightLeft}
              iconColor="text-purple-400"
            />
            <IssueCard
              title="Filter-URLer"
              value={data.summary.param_urls}
              subtitle="med ?parameters"
              icon={Link2}
              iconColor="text-blue-400"
            />
            <IssueCard
              title="Orphans"
              value={data.summary.orphans}
              subtitle="ingen visninger"
              icon={AlertTriangle}
              iconColor="text-gray-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  tab === t.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {t.label}
                <IssueBadge
                  count={data.summary[t.key]}
                  severity={
                    data.summary[t.key] === 0
                      ? "ok"
                      : data.summary[t.key] > 10
                        ? "high"
                        : "medium"
                  }
                />
              </button>
            ))}
          </div>

          <Card className="p-4">
            <div className="mb-4">
              <h2 className="text-white font-medium">{activeTab.label}</h2>
              <p className="text-xs text-gray-500 mt-1">{activeTab.description}</p>
            </div>

            {tab === "cannibalized" && <CannibalizedList rows={data.issues.cannibalized} />}

            {tab === "buried" && (
              <SimpleTable
                rows={data.issues.buried}
                headers={[
                  { label: "URL" },
                  { label: "Toppsøkeord" },
                  { label: "Visn.", align: "right" },
                  { label: "Klikk", align: "right" },
                  { label: "Pos.", align: "right" },
                ]}
                empty="Ingen begravde sider funnet."
                renderRow={(r, i) => {
                  const row = r as IndexingResponse["issues"]["buried"][number];
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline text-xs"
                        >
                          {shortenUrl(row.url)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{row.top_query || "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.position.toFixed(1)}</td>
                    </tr>
                  );
                }}
              />
            )}

            {tab === "zombies" && (
              <SimpleTable
                rows={data.issues.zombies}
                headers={[
                  { label: "URL (ikke i sitemap)" },
                  { label: "Visn.", align: "right" },
                  { label: "Klikk", align: "right" },
                  { label: "Pos.", align: "right" },
                ]}
                empty="Ingen zombie-URLer funnet."
                renderRow={(r, i) => {
                  const row = r as IndexingResponse["issues"]["zombies"][number];
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline text-xs"
                        >
                          {shortenUrl(row.url)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.position.toFixed(1)}</td>
                    </tr>
                  );
                }}
              />
            )}

            {tab === "legacy_urls" && (
              <SimpleTable
                rows={data.issues.legacy_urls}
                headers={[
                  { label: "Legacy URL" },
                  { label: "Burde redirectes til" },
                  { label: "Visn. (legacy)", align: "right" },
                  { label: "Klikk (legacy)", align: "right" },
                  { label: "Visn. (direkte)", align: "right" },
                ]}
                empty="Ingen legacy-URLer funnet."
                renderRow={(r, i) => {
                  const row = r as IndexingResponse["issues"]["legacy_urls"][number];
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:underline text-xs"
                        >
                          {shortenUrl(row.url)}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={row.alternative}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-400 hover:underline text-xs"
                        >
                          {shortenUrl(row.alternative)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatNumber(row.alternative_impressions)}
                      </td>
                    </tr>
                  );
                }}
              />
            )}

            {tab === "param_urls" && (
              <SimpleTable
                rows={data.issues.param_urls}
                headers={[
                  { label: "URL" },
                  { label: "Visn.", align: "right" },
                  { label: "Klikk", align: "right" },
                  { label: "Pos.", align: "right" },
                  { label: "Blokkert av robots", align: "center" },
                ]}
                empty="Ingen parameter-URLer med visninger."
                renderRow={(r, i) => {
                  const row = r as IndexingResponse["issues"]["param_urls"][number];
                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline text-xs break-all"
                        >
                          {shortenUrl(row.url)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.position.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.blocked_by_robots ? (
                          <CheckCircle className="w-4 h-4 text-green-400 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 inline" />
                        )}
                      </td>
                    </tr>
                  );
                }}
              />
            )}

            {tab === "orphans" && (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Viser første 500 (av {formatNumber(data.summary.orphans)} totalt). Mange orphans
                  er normalt for e-handel — produktsider uten søkevolum er ikke nødvendigvis et problem.
                </p>
                <SimpleTable
                  rows={data.issues.orphans}
                  headers={[{ label: "URL (i sitemap, ingen visninger)" }]}
                  empty="Ingen orphans."
                  renderRow={(r, i) => {
                    const row = r as IndexingResponse["issues"]["orphans"][number];
                    return (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-white hover:underline text-xs"
                          >
                            {shortenUrl(row.url)}
                          </a>
                        </td>
                      </tr>
                    );
                  }}
                />
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
