"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useTags, useAddTag } from "@/hooks/use-tags";
import type { Tag } from "@/lib/types/tags";

interface TagPickerProps {
  selectedTagIds: Set<string>;
  onToggle: (tag: Tag) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function TagPicker({ selectedTagIds, onToggle, onClose }: TagPickerProps) {
  const { data: tags } = useTags();
  const { addTag } = useAddTag();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  async function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    try {
      const tag = await addTag({ name: name.trim(), color });
      onToggle(tag);
      setName("");
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    }
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-60 overflow-y-auto p-2">
        {tags && tags.length > 0 ? (
          tags.map((tag) => {
            const selected = selectedTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-gray-200">{tag.name}</span>
                </span>
                {selected && <Check className="h-4 w-4 text-blue-400" />}
              </button>
            );
          })
        ) : (
          <div className="px-2 py-3 text-center text-xs text-gray-500">
            Ingen tags ennå
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 p-2">
        {creating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Tag-navn"
              className="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full ${
                    color === c ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Velg farge ${c}`}
                />
              ))}
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Opprett
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setError(null);
                }}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Ny tag
          </button>
        )}
      </div>
    </div>
  );
}
