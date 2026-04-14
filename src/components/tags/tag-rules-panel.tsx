"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useTagRules,
  useAddTagRule,
  useDeleteTagRule,
  useApplyTagRules,
} from "@/hooks/use-tags";
import type { RuleMatchMode, TaggableEntity } from "@/lib/types/tags";

interface TagRulesPanelProps {
  tagId: string;
}

const ENTITY_LABELS: Record<TaggableEntity, string> = {
  keyword: "Søkeord",
  post: "Innlegg",
  campaign: "Kampanje",
  source: "Trafikkilde",
};

const MODE_LABELS: Record<RuleMatchMode, string> = {
  contains: "inneholder",
  equals: "er nøyaktig",
  starts_with: "starter med",
  regex: "regex",
};

export function TagRulesPanel({ tagId }: TagRulesPanelProps) {
  const { data: rules, isLoading } = useTagRules(tagId);
  const { addRule } = useAddTagRule();
  const { deleteRule } = useDeleteTagRule();
  const { applyRules } = useApplyTagRules();

  const [pattern, setPattern] = useState("");
  const [entityType, setEntityType] = useState<TaggableEntity>("keyword");
  const [mode, setMode] = useState<RuleMatchMode>("contains");
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await addRule({
        tag_id: tagId,
        entity_type: entityType,
        pattern: pattern.trim(),
        mode,
      });
      setPattern("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette regel? Auto-tilordninger fra denne regelen forsvinner også.")) return;
    try {
      await deleteRule(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ukjent feil");
    }
  }

  async function handleApply() {
    setApplying(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await applyRules();
      setFeedback(`Anvendt ${res.applied} tilordninger fra ${res.rules_evaluated} regler.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Auto-tagging regler</h3>
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || !rules?.length}
          className="inline-flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {applying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          Anvend regler nå
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Regler kjøres mot all data i basen og tilordner tagen automatisk til alle
        treff. Manuelle tilordninger berøres ikke.
      </p>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as TaggableEntity)}
          className="rounded bg-gray-900 border border-gray-700 px-2 py-1.5 text-sm text-gray-200"
        >
          {(Object.keys(ENTITY_LABELS) as TaggableEntity[]).map((t) => (
            <option key={t} value={t}>
              {ENTITY_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as RuleMatchMode)}
          className="rounded bg-gray-900 border border-gray-700 px-2 py-1.5 text-sm text-gray-200"
        >
          {(Object.keys(MODE_LABELS) as RuleMatchMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Mønster (f.eks. bosch)"
          className="md:col-span-2 rounded bg-gray-900 border border-gray-700 px-2 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Legg til regel
        </button>
      </form>

      {feedback && <div className="mb-2 text-xs text-green-400">{feedback}</div>}
      {error && <div className="mb-2 text-xs text-red-400">{error}</div>}

      {isLoading ? (
        <div className="text-xs text-gray-500">Laster…</div>
      ) : !rules?.length ? (
        <div className="text-xs text-gray-500">Ingen regler ennå.</div>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded bg-gray-900/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 text-gray-300 min-w-0">
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                  {ENTITY_LABELS[r.entity_type]}
                </span>
                <span className="text-xs text-gray-500">{MODE_LABELS[r.mode]}</span>
                <code className="truncate text-blue-300">{r.pattern}</code>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                aria-label="Slett regel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
