"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag as TagIcon, Trash2, ExternalLink } from "lucide-react";
import { useTags, useAddTag, useDeleteTag } from "@/hooks/use-tags";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TagBadge } from "@/components/tags/tag-badge";



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

export default function TagsPage() {
  const { data: tags, isLoading } = useTags();
  const { addTag } = useAddTag();
  const { deleteTag } = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await addTag({ name: name.trim(), color, description: description.trim() || undefined });
      setName("");
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette denne tag-en? Alle tilordninger forsvinner også.")) return;
    try {
      await deleteTag(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ukjent feil");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
          <TagIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-sm text-gray-400">
            Kategoriser søkeord, innlegg, kampanjer og trafikkilder på tvers av plattformer
          </p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag-navn (f.eks. Politi)"
              className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivelse (valgfritt)"
              className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Legg til tag
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Farge:</span>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ${
                  color === c ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Velg farge ${c}`}
              />
            ))}
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !tags?.length ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Ingen tags ennå. Opprett en over for å komme i gang.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Tag</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Beskrivelse</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <TagBadge tag={tag} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">{tag.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/tags/${tag.id}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/30"
                      >
                        Se detaljer <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                        aria-label={`Slett ${tag.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
