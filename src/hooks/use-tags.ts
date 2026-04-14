"use client";

import useSWR, { useSWRConfig } from "swr";
import type { Tag, TagAssignmentWithTag, TaggableEntity } from "@/lib/types/tags";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTags() {
  const { data, error, isLoading, mutate } = useSWR<Tag[]>("/api/tags", fetcher);
  return { data, error, isLoading, mutate };
}

export function useTaggingsForEntityType(entityType: TaggableEntity) {
  const { data, error, isLoading, mutate } = useSWR<TagAssignmentWithTag[]>(
    `/api/taggings?entity_type=${entityType}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}

export function useAddTag() {
  const { mutate } = useSWRConfig();

  const addTag = async (tag: {
    name: string;
    color?: string;
    description?: string;
  }) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tag),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add tag");
    }
    const data = await res.json();
    mutate("/api/tags");
    return data as Tag;
  };

  return { addTag };
}

export function useUpdateTag() {
  const { mutate } = useSWRConfig();

  const updateTag = async (
    id: string,
    updates: { name?: string; color?: string; description?: string | null }
  ) => {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update tag");
    }
    mutate("/api/tags");
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/taggings"),
      undefined,
      { revalidate: true }
    );
    return res.json();
  };

  return { updateTag };
}

export function useDeleteTag() {
  const { mutate } = useSWRConfig();

  const deleteTag = async (id: string) => {
    const res = await fetch(`/api/tags?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete tag");
    }
    mutate("/api/tags");
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/taggings"),
      undefined,
      { revalidate: true }
    );
  };

  return { deleteTag };
}

export function useAssignTag() {
  const { mutate } = useSWRConfig();

  const assignTag = async (params: {
    tag_id: string;
    entity_type: TaggableEntity;
    entity_key: string;
  }) => {
    const res = await fetch("/api/taggings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to assign tag");
    }
    mutate(
      (key) =>
        typeof key === "string" &&
        key.startsWith(`/api/taggings?entity_type=${params.entity_type}`),
      undefined,
      { revalidate: true }
    );
    return res.json();
  };

  return { assignTag };
}

export function useUnassignTag() {
  const { mutate } = useSWRConfig();

  const unassignTag = async (params: {
    tag_id: string;
    entity_type: TaggableEntity;
    entity_key: string;
  }) => {
    const url = `/api/taggings?tag_id=${params.tag_id}&entity_type=${params.entity_type}&entity_key=${encodeURIComponent(params.entity_key)}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to unassign tag");
    }
    mutate(
      (key) =>
        typeof key === "string" &&
        key.startsWith(`/api/taggings?entity_type=${params.entity_type}`),
      undefined,
      { revalidate: true }
    );
  };

  return { unassignTag };
}
