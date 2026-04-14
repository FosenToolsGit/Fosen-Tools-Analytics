"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import { formatCompact, formatPercent } from "@/lib/utils/format";
import { formatDateNorwegian } from "@/lib/utils/date";
import type { PostRow } from "@/hooks/use-posts";
import { ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { TagCell } from "@/components/tags/tag-cell";
import { TagFilter } from "@/components/tags/tag-filter";
import { useTaggingsForEntityType } from "@/hooks/use-tags";
import { postEntityKey, type Tag } from "@/lib/types/tags";

interface TopPostsTableProps {
  posts: PostRow[];
  loading?: boolean;
  platformFilter?: PlatformKey;
}

type SortColumn =
  | "date"
  | "clicks"
  | "engagement"
  | "likes"
  | "impressions"
  | "reach"
  | "open_rate";
type SortDirection = "asc" | "desc";

export function TopPostsTable({
  posts,
  loading,
  platformFilter,
}: TopPostsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const { data: taggings } = useTaggingsForEntityType("post");

  const tagsByKey = useMemo(() => {
    const map = new Map<string, Tag[]>();
    taggings?.forEach((t) => {
      const list = map.get(t.entity_key) ?? [];
      list.push(t.tag);
      map.set(t.entity_key, list);
    });
    return map;
  }, [taggings]);

  const isMailchimp = platformFilter === "mailchimp";
  const isGA4 = platformFilter === "ga4";

  const filtered = useMemo(() => {
    if (!posts?.length) return [];
    if (!tagFilter) return posts;
    return posts.filter((p) => {
      const tags = tagsByKey.get(postEntityKey(p.platform, p.platform_post_id));
      return tags?.some((t) => t.id === tagFilter);
    });
  }, [posts, tagFilter, tagsByKey]);

  const sorted = useMemo(() => {
    if (!filtered.length) return [];
    return [...filtered].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (sortColumn) {
        case "date":
          aVal = a.published_at
            ? new Date(a.published_at).getTime()
            : 0;
          bVal = b.published_at
            ? new Date(b.published_at).getTime()
            : 0;
          break;
        case "clicks":
          aVal = a.clicks;
          bVal = b.clicks;
          break;
        case "engagement":
          aVal = a.likes + a.comments + a.shares;
          bVal = b.likes + b.comments + b.shares;
          break;
        case "likes":
          aVal = a.likes;
          bVal = b.likes;
          break;
        case "impressions":
          aVal = a.impressions;
          bVal = b.impressions;
          break;
        case "reach":
          aVal = a.reach;
          bVal = b.reach;
          break;
        case "open_rate":
          aVal = a.reach > 0 ? a.impressions / a.reach : 0;
          bVal = b.reach > 0 ? b.impressions / b.reach : 0;
          break;
        default:
          return 0;
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) {
      return <ChevronDown className="w-3 h-3 text-gray-600 inline ml-1" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-400 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-400 inline ml-1" />
    );
  }

  function SortableTh({
    column,
    label,
    align = "right",
  }: {
    column: SortColumn;
    label: string;
    align?: "left" | "right";
  }) {
    return (
      <th
        className={`px-4 py-3 text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200 ${
          align === "right" ? "text-right" : "text-left"
        }`}
        onClick={() => handleSort(column)}
      >
        {label}
        <SortIcon column={column} />
      </th>
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!posts?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen innlegg funnet
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </div>
      <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                {isMailchimp ? "Kampanje" : "Innlegg"}
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                Plattform
              </th>
              {isMailchimp ? (
                <>
                  <SortableTh column="reach" label="Sendt" />
                  <SortableTh column="impressions" label="Åpninger" />
                  <SortableTh column="clicks" label="Klikk" />
                  <SortableTh column="open_rate" label="Åpningsrate" />
                </>
              ) : isGA4 ? (
                <>
                  <SortableTh column="impressions" label="Visninger" />
                  <SortableTh column="reach" label="Brukere" />
                </>
              ) : (
                <>
                  <SortableTh column="clicks" label="Klikk" />
                  <SortableTh column="engagement" label="Engasjement" />
                  <SortableTh column="likes" label="Likes" />
                </>
              )}
              <SortableTh column="date" label="Dato" />
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((post) => {
              const platform = PLATFORMS[post.platform];
              const totalEngagement =
                post.likes + post.comments + post.shares;
              const openRate =
                post.reach > 0 ? post.impressions / post.reach : 0;
              const postIsMailchimp = post.platform === "mailchimp";
              const postIsGA4 = post.platform === "ga4";

              return (
                <tr
                  key={post.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.thumbnail_url && (
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-white truncate max-w-[300px]">
                          {post.title || post.content_snippet || "Uten tittel"}
                        </p>
                        {post.post_url && (
                          <a
                            href={
                              postIsGA4
                                ? `https://fosen-tools.no${post.post_url}`
                                : post.post_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
                          >
                            {postIsMailchimp
                              ? "Se rapport"
                              : postIsGA4
                                ? post.post_url
                                : "Se innlegg"}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        backgroundColor: `${platform?.color}20`,
                        color: platform?.color,
                      }}
                    >
                      {platform?.label || post.platform}
                    </Badge>
                  </td>
                  {isMailchimp ? (
                    <>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.reach)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatPercent(openRate)}
                      </td>
                    </>
                  ) : isGA4 ? (
                    <>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.reach)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(totalEngagement)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(post.likes)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                    {post.published_at
                      ? formatDateNorwegian(new Date(post.published_at))
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TagCell
                      tags={tagsByKey.get(postEntityKey(post.platform, post.platform_post_id)) ?? []}
                      entityType="post"
                      entityKey={postEntityKey(post.platform, post.platform_post_id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </Card>
    </div>
  );
}
