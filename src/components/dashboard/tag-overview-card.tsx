"use client";

import Link from "next/link";
import useSWR from "swr";
import { Tag as TagIcon, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tags/tag-badge";
import type { Tag, TagAssignmentWithTag } from "@/lib/types/tags";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TagSummary {
  tag: Tag;
  count: number;
}

export function TagOverviewCard() {
  const { data: tags } = useSWR<Tag[]>("/api/tags", fetcher);
  const { data: keywordTags } = useSWR<TagAssignmentWithTag[]>(
    "/api/taggings?entity_type=keyword",
    fetcher
  );
  const { data: postTags } = useSWR<TagAssignmentWithTag[]>(
    "/api/taggings?entity_type=post",
    fetcher
  );
  const { data: campaignTags } = useSWR<TagAssignmentWithTag[]>(
    "/api/taggings?entity_type=campaign",
    fetcher
  );
  const { data: sourceTags } = useSWR<TagAssignmentWithTag[]>(
    "/api/taggings?entity_type=source",
    fetcher
  );

  const summaries: TagSummary[] = [];
  if (tags) {
    const counts = new Map<string, number>();
    for (const list of [keywordTags, postTags, campaignTags, sourceTags]) {
      list?.forEach((t) => {
        counts.set(t.tag_id, (counts.get(t.tag_id) ?? 0) + 1);
      });
    }
    for (const tag of tags) {
      const count = counts.get(tag.id) ?? 0;
      if (count > 0) summaries.push({ tag, count });
    }
    summaries.sort((a, b) => b.count - a.count);
  }

  const top = summaries.slice(0, 5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 inline-flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-purple-400" />
          Mest brukte tags
        </h3>
        <Link
          href="/tags"
          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
        >
          Se alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="text-xs text-gray-500">
          Ingen tags i bruk ennå.{" "}
          <Link href="/tags" className="text-blue-400 hover:underline">
            Opprett din første tag
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map(({ tag, count }) => (
            <li key={tag.id}>
              <Link
                href={`/tags/${tag.id}`}
                className="flex items-center justify-between gap-2 rounded bg-gray-900/50 px-3 py-2 hover:bg-gray-800/50"
              >
                <TagBadge tag={tag} />
                <span className="text-xs text-gray-400">{count} entiteter</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
