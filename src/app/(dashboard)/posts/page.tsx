"use client";

import { Suspense } from "react";
import { TopPostsTable } from "@/components/dashboard/top-posts-table";
import { usePosts } from "@/hooks/use-posts";
import { Skeleton } from "@/components/ui/skeleton";

function PostsContent() {
  const { data: posts, isLoading } = usePosts(undefined, 50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Topp innlegg</h1>
      <TopPostsTable posts={posts || []} loading={isLoading} />
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
