"use client";

import { useTags } from "@/hooks/use-tags";

interface TagFilterProps {
  value: string | null;
  onChange: (tagId: string | null) => void;
}

export function TagFilter({ value, onChange }: TagFilterProps) {
  const { data: tags } = useTags();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Alle tags</option>
      {tags?.map((tag) => (
        <option key={tag.id} value={tag.id}>
          {tag.name}
        </option>
      ))}
    </select>
  );
}
