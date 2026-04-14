"use client";

import { Suspense, useState } from "react";
import { TopPostsTable } from "@/components/dashboard/top-posts-table";
import { usePosts } from "@/hooks/use-posts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { PlatformKey } from "@/lib/utils/platforms";

type FilterValue = "all" | PlatformKey;

const filters: { label: string; value: FilterValue }[] = [
  { label: "Alle", value: "all" },
  { label: "Facebook", value: "meta" },
  { label: "Mailchimp", value: "mailchimp" },
  { label: "LinkedIn", value: "linkedin" },
];

function PostsContent() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const { data: posts, isLoading } = usePosts(
    filter === "all" ? undefined : filter,
    100
  );

  // Always exclude GA4 pages from the posts view
  const filtered = (posts || []).filter((p) => p.platform !== "ga4");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Innlegg og kampanjer</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Filter:</span>
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>
      <TopPostsTable
        posts={filtered}
        loading={isLoading}
        platformFilter={filter === "all" ? undefined : filter}
      />
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px]" />}>
      <PostsContent />
    </Suspense>
  );
}
