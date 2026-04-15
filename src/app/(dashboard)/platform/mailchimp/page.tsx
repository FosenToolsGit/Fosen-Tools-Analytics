"use client";

import { Suspense, useState } from "react";
import {
  Mail,
  Eye,
  MousePointerClick,
  Users,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { TopPostsTable } from "@/components/dashboard/top-posts-table";
import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useMetrics, aggregateMetrics } from "@/hooks/use-metrics";
import { usePosts } from "@/hooks/use-posts";
import {
  useMailchimpLinks,
  useMailchimpGrowth,
  useMailchimpLocations,
} from "@/hooks/use-mailchimp-extended";
import { MailchimpLinksTable } from "@/components/dashboard/mailchimp-links-table";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

const num = new Intl.NumberFormat("nb-NO");
const pct = new Intl.NumberFormat("nb-NO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics(
    dateRange,
    "mailchimp"
  );
  const { data: postsData, isLoading: postsLoading } = usePosts("mailchimp", 20);
  const { data: links, isLoading: linksLoading } = useMailchimpLinks(90);
  const { data: growth } = useMailchimpGrowth();
  const { data: locations } = useMailchimpLocations(90);

  const [linkDays, setLinkDays] = useState(90);

  const agg = metricsData ? aggregateMetrics(metricsData) : null;

  // Snitt åpningsrate og klikkrate fra posts
  const postsArr = Array.isArray(postsData) ? postsData : [];
  const avgOpenRate =
    postsArr.length > 0
      ? postsArr.reduce((sum, p) => {
          const sent = p.reach || 0;
          const opens = p.likes || 0;
          return sum + (sent > 0 ? opens / sent : 0);
        }, 0) / postsArr.length
      : 0;
  const avgClickRate =
    postsArr.length > 0
      ? postsArr.reduce((sum, p) => {
          const sent = p.reach || 0;
          const clicks = p.clicks || 0;
          return sum + (sent > 0 ? clicks / sent : 0);
        }, 0) / postsArr.length
      : 0;

  // Growth chart data
  const growthChart = (growth ?? []).map((g) => ({
    date: g.metric_date,
    label: format(parseISO(g.metric_date), "MMM yy", { locale: nb }),
    Eksisterende: g.existing,
    Nye: g.optins + g.imports,
    Unsubs: -(g.unsubs + g.cleaned),
    Netto: g.net_growth,
  }));

  // Top 10 lokasjoner
  const topLocations = (locations ?? []).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FFE01B20" }}
          >
            <Mail className="w-5 h-5" style={{ color: "#FFE01B" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mailchimp</h1>
            <p className="text-xs text-gray-500">
              Dyp analyse: lenker, geografi, vekst og subject lines
            </p>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <MetricGrid loading={metricsLoading}>
        {agg && (
          <>
            <MetricCard
              title="Abonnenter"
              value={agg.followers}
              icon={Users}
              tooltip="Totalt antall abonnenter på listen akkurat nå"
            />
            <MetricCard
              title="Mottakere (periode)"
              value={agg.reach}
              icon={Mail}
              tooltip="Totalt antall e-post sendt i perioden"
            />
            <MetricCard
              title="Åpninger"
              value={agg.impressions}
              icon={Eye}
              tooltip="Totalt antall åpninger"
            />
            <MetricCard
              title="Snitt åpningsrate"
              value={avgOpenRate * 100}
              format="percent"
              icon={TrendingUp}
              tooltip="Snitt av åpningsrater for hver kampanje i perioden"
            />
            <MetricCard
              title="Snitt klikkrate"
              value={avgClickRate * 100}
              format="percent"
              icon={MousePointerClick}
              tooltip="Snitt av klikkrater for hver kampanje i perioden"
            />
          </>
        )}
      </MetricGrid>

      {/* Subject line performance */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Subject line-performance</h2>
        <p className="text-xs text-gray-500 mb-3">
          Hvilke emner gir best åpningsrate? Sortert etter åpningsrate i fallende rekkefølge.
        </p>
        <TopPostsTable
          posts={(postsArr || [])
            .slice()
            .sort((a, b) => {
              const aRate = a.reach > 0 ? (a.likes || 0) / a.reach : 0;
              const bRate = b.reach > 0 ? (b.likes || 0) / b.reach : 0;
              return bRate - aRate;
            })}
          loading={postsLoading}
          platformFilter="mailchimp"
        />
      </div>

      {/* Mest klikkede lenker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LinkIcon className="w-5 h-5" /> Mest klikkede lenker
            </h2>
            <p className="text-xs text-gray-500">
              Aggregert på tvers av kampanjer — hvilket innhold interesserer abonnentene mest?
            </p>
          </div>
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 text-xs">
            {[30, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setLinkDays(d)}
                className={`px-2.5 py-1 rounded-md ${
                  linkDays === d
                    ? "bg-yellow-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <MailchimpLinksTable
          data={Array.isArray(links) ? links : []}
          loading={linksLoading}
        />
      </div>

      {/* Abonnent-vekst */}
      {growthChart.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Abonnent-vekst over tid</h2>
          <Card className="p-4">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="label"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Nye" fill="#34d399" />
                  <Bar dataKey="Unsubs" fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Topp lokasjoner */}
      {topLocations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Topp lokasjoner (siste 90 dager)</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Land</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Åpninger</th>
                </tr>
              </thead>
              <tbody>
                {topLocations.map((loc) => (
                  <tr
                    key={loc.country_code}
                    className="border-b border-gray-800/50"
                  >
                    <td className="px-4 py-3 text-white">
                      {loc.country_code}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {num.format(loc.opens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MailchimpPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
