"use client";

import { Suspense, useMemo, useState } from "react";
import {
  Share2,
  Eye,
  MousePointerClick,
  Users,
  Heart,
  MessageCircle,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useMetrics, aggregateMetrics } from "@/hooks/use-metrics";
import { usePosts } from "@/hooks/use-posts";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

type SourceFilter = "all" | "facebook" | "instagram";

function postSource(postType: string | null): "facebook" | "instagram" | "unknown" {
  if (!postType) return "unknown";
  if (postType.startsWith("instagram")) return "instagram";
  if (postType.startsWith("facebook")) return "facebook";
  // Legacy "post" type = Facebook
  if (postType === "post") return "facebook";
  return "unknown";
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data: metricsData, isLoading: metricsLoading } = useMetrics(
    dateRange,
    "meta"
  );
  const { data: postsData, isLoading: postsLoading } = usePosts("meta", 50);
  const [source, setSource] = useState<SourceFilter>("all");

  const agg = metricsData ? aggregateMetrics(metricsData) : null;

  const allPosts = Array.isArray(postsData) ? postsData : [];
  const filtered = useMemo(() => {
    if (source === "all") return allPosts;
    return allPosts.filter((p) => postSource(p.post_type) === source);
  }, [allPosts, source]);

  // Per-source totals
  const fbPosts = allPosts.filter((p) => postSource(p.post_type) === "facebook");
  const igPosts = allPosts.filter((p) => postSource(p.post_type) === "instagram");

  const sumMetric = (posts: typeof allPosts, m: "reach" | "likes" | "clicks" | "impressions") =>
    posts.reduce((s, p) => s + (p[m] || 0), 0);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aEng = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
      const bEng = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
      return bEng - aEng;
    });
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#1877F220" }}
          >
            <Share2 className="w-5 h-5" style={{ color: "#1877F2" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Meta</h1>
            <p className="text-xs text-gray-500">
              Facebook og Instagram — posts, engasjement og trafikk
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
              title="Rekkevidde"
              value={agg.reach}
              icon={Eye}
              tooltip="Unike personer som har sett innholdet"
            />
            <MetricCard
              title="Engasjement"
              value={agg.engagement}
              icon={Heart}
              tooltip="Totalt antall likes, kommentarer og delinger"
            />
            <MetricCard
              title="Klikk"
              value={agg.clicks}
              icon={MousePointerClick}
              tooltip="Klikk på posts eller lenker"
            />
            <MetricCard
              title="Følgere"
              value={agg.followers}
              icon={Users}
              tooltip="Totalt antall følgere på Facebook-siden"
            />
          </>
        )}
      </MetricGrid>

      {/* Source comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-950/40 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold">Facebook</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Poster</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {fbPosts.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Likes</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {formatCompact(sumMetric(fbPosts, "likes"))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Klikk</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {formatCompact(sumMetric(fbPosts, "clicks"))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-950/40 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-pink-400" />
            </div>
            <h3 className="text-white font-semibold">Instagram</h3>
          </div>
          {igPosts.length === 0 ? (
            <p className="text-xs text-gray-500">
              Ingen Instagram-poster funnet. Sjekk at Instagram Business
              Account er koblet til Facebook-siden, eller sett{" "}
              <code>META_INSTAGRAM_ACCOUNT_ID</code> i env.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Poster</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {igPosts.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Likes</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatCompact(sumMetric(igPosts, "likes"))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Rekkevidde</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatCompact(sumMetric(igPosts, "reach"))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Posts filter + table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Top poster (etter engasjement)</h2>
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 text-xs">
            {(["all", "facebook", "instagram"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-md ${
                  source === s
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {s === "all" ? "Alle" : s === "facebook" ? "Facebook" : "Instagram"}
              </button>
            ))}
          </div>
        </div>

        {postsLoading ? (
          <Card className="p-6">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-800 rounded" />
              ))}
            </div>
          </Card>
        ) : sorted.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            Ingen poster funnet for filteret.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Post</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Rekkev.
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Likes
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Komm.
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Klikk
                    </th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Dato</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 50).map((post) => {
                    const src = postSource(post.post_type);
                    const typeLabel =
                      src === "instagram"
                        ? (post.post_type || "").replace("instagram_", "")
                        : "post";
                    return (
                      <tr
                        key={post.platform_post_id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3 max-w-sm">
                          {post.post_url ? (
                            <a
                              href={post.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-blue-400 truncate block"
                            >
                              {(post.content_snippet || "(uten tekst)").slice(0, 80)}
                              {(post.content_snippet || "").length > 80 && "..."}
                            </a>
                          ) : (
                            <span className="text-white">
                              {(post.content_snippet || "(uten tekst)").slice(0, 80)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              src === "instagram"
                                ? "border-pink-800 bg-pink-950/30 text-pink-400"
                                : "border-blue-800 bg-blue-950/30 text-blue-400"
                            }`}
                          >
                            {src === "instagram" ? (
                              <>
                                <ImageIcon className="w-3 h-3 inline mr-1" />
                                {typeLabel.toUpperCase()}
                              </>
                            ) : (
                              "FB POST"
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatCompact(post.reach)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNumber(post.likes)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNumber(post.comments)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNumber(post.clicks)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {post.published_at
                            ? format(parseISO(post.published_at), "d. MMM", {
                                locale: nb,
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MetaPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
