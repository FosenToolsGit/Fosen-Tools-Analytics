"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import { formatCompact } from "@/lib/utils/format";
import { formatDateNorwegian } from "@/lib/utils/date";
import type { PostRow } from "@/hooks/use-posts";
import { ExternalLink } from "lucide-react";

interface TopPostsTableProps {
  posts: PostRow[];
  loading?: boolean;
}

export function TopPostsTable({ posts, loading }: TopPostsTableProps) {
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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                Innlegg
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                Plattform
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Klikk
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Engasjement
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Likes
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Dato
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const platform = PLATFORMS[post.platform];
              const totalEngagement =
                post.likes + post.comments + post.shares;

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
                            href={post.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
                          >
                            Se innlegg
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
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatCompact(post.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatCompact(totalEngagement)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatCompact(post.likes)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                    {post.published_at
                      ? formatDateNorwegian(new Date(post.published_at))
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
