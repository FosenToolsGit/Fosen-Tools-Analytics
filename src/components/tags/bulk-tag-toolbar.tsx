"use client";

import { useState } from "react";
import { X, Tag as TagIcon, Loader2 } from "lucide-react";
import { useTags, useBulkAssignTag } from "@/hooks/use-tags";
import type { TaggableEntity } from "@/lib/types/tags";

interface BulkTagToolbarProps {
  entityType: TaggableEntity;
  selectedKeys: string[];
  onClear: () => void;
}

export function BulkTagToolbar({ entityType, selectedKeys, onClear }: BulkTagToolbarProps) {
  const { data: tags } = useTags();
  const { bulkAssign } = useBulkAssignTag();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (selectedKeys.length === 0) return null;

  async function handleAssign(tagId: string) {
    setSubmitting(true);
    setFeedback(null);
    try {
      await bulkAssign({ tag_id: tagId, entity_type: entityType, entity_keys: selectedKeys });
      setFeedback(`Tagget ${selectedKeys.length} rader`);
      setTimeout(() => {
        onClear();
        setFeedback(null);
      }, 1000);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-lg border border-blue-700 bg-blue-900/40 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <TagIcon className="w-4 h-4 text-blue-300 flex-shrink-0" />
        <span className="text-sm text-blue-100 whitespace-nowrap">
          {selectedKeys.length} rader valgt
        </span>
        {feedback && (
          <span className="text-xs text-green-300 truncate">{feedback}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
        ) : (
          tags?.slice(0, 6).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleAssign(tag.id)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium hover:opacity-80"
              style={{ backgroundColor: tag.color, color: "#111" }}
            >
              + {tag.name}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded p-1 text-blue-200 hover:bg-blue-800/50"
          aria-label="Avbryt valg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
