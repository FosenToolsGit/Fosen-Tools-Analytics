"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TagBadge } from "./tag-badge";
import { TagPicker } from "./tag-picker";
import { useAssignTag, useUnassignTag } from "@/hooks/use-tags";
import type { Tag, TaggableEntity } from "@/lib/types/tags";

interface TagCellProps {
  tags: Tag[];
  entityType: TaggableEntity;
  entityKey: string;
}

export function TagCell({ tags, entityType, entityKey }: TagCellProps) {
  const [open, setOpen] = useState(false);
  const { assignTag } = useAssignTag();
  const { unassignTag } = useUnassignTag();
  const selectedIds = new Set(tags.map((t) => t.id));

  async function handleToggle(tag: Tag) {
    try {
      if (selectedIds.has(tag.id)) {
        await unassignTag({
          tag_id: tag.id,
          entity_type: entityType,
          entity_key: entityKey,
        });
      } else {
        await assignTag({
          tag_id: tag.id,
          entity_type: entityType,
          entity_key: entityKey,
        });
      }
    } catch (e) {
      console.error("Tag toggle failed", e);
    }
  }

  return (
    <div
      className="relative inline-flex flex-wrap items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onRemove={() =>
            unassignTag({
              tag_id: tag.id,
              entity_type: entityType,
              entity_key: entityKey,
            }).catch((e) => console.error(e))
          }
        />
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full border border-dashed border-gray-700 p-1 text-gray-500 hover:border-gray-500 hover:text-gray-300"
        aria-label="Legg til tag"
      >
        <Plus className="h-3 w-3" />
      </button>
      {open && (
        <TagPicker
          selectedTagIds={selectedIds}
          onToggle={handleToggle}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
