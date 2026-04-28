"use client";

import { Suspense, useState } from "react";
import {
  PenTool,
  Sparkles,
  Lightbulb,
  Image as ImageIcon,
  Camera,
  Plus,
  X,
  Copy,
  Check,
  Calendar as CalendarIcon,
  TrendingUp,
  Heart,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useSocialBuilder } from "@/hooks/use-innleggsbygger";
import { formatNumber } from "@/lib/utils/format";

const DEFAULT_THEMES = [
  "Verktøyvogn",
  "Pelicase",
  "Momentnøkkel",
  "Verktøysett",
  "Industriverktøy",
  "Bits",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-400" /> Kopiert
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" /> Kopier
        </>
      )}
    </button>
  );
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const [themes, setThemes] = useState<string[]>(DEFAULT_THEMES);
  const [activeThemes, setActiveThemes] = useState<string[]>(DEFAULT_THEMES);
  const [newTheme, setNewTheme] = useState("");

  const { data, isLoading } = useSocialBuilder(activeThemes, dateRange);

  function addTheme() {
    const t = newTheme.trim();
    if (t && !themes.includes(t)) {
      setThemes([...themes, t]);
      setNewTheme("");
    }
  }
  function removeTheme(t: string) {
    setThemes(themes.filter((x) => x !== t));
  }
  function applyThemes() {
    setActiveThemes([...themes]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-900/30 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Innleggsbygger — Sosiale medier</h1>
            <p className="text-xs text-gray-500">
              Captions, Native-prompts og organiske ideer basert på dine egne topp-poster
            </p>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      {isLoading || !data ? (
        <MetricGrid loading />
      ) : (
        <>
          {/* KPI */}
          <MetricGrid>
            <MetricCard
              title="Poster analysert"
              value={data.summary.posts_analyzed}
              icon={Sparkles}
            />
            <MetricCard
              title="Snitt-engasjement"
              value={data.summary.avg_engagement_rate}
              format="percent"
              icon={Heart}
              tooltip="Gj.snitt (likes + 3×kommentarer + 5×delinger + klikk) / reach"
            />
            <MetricCard
              title="Mønstre funnet"
              value={data.patterns.length}
              icon={TrendingUp}
            />
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Beste dag</span>
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-white">
                {data.summary.best_day ?? "—"}
              </span>
            </Card>
          </MetricGrid>

          {/* Caption-mønstre */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Hva fungerer i dine captions</h2>
            </div>
            {data.patterns.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ikke nok data ennå. Trenger flere Meta-poster i perioden.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-2 py-2 text-gray-400 font-medium">Mønster</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">Lift</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">Treff</th>
                      <th className="px-2 py-2 text-gray-400 font-medium">Eksempel</th>
                      <th className="px-2 py-2 text-gray-400 font-medium">Anbefaling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patterns.map((p) => (
                      <tr key={p.label} className="border-b border-gray-800/50">
                        <td className="px-2 py-2 text-white font-medium">{p.label}</td>
                        <td className="px-2 py-2 text-right">
                          <span className="text-green-400 font-semibold">
                            +{p.lift_pct}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {p.matches}
                        </td>
                        <td className="px-2 py-2 text-gray-500 max-w-[280px] truncate text-xs italic">
                          {p.example ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-gray-300 text-xs">
                          {p.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Topp-poster */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Dine topp 5 poster</h2>
            </div>
            {data.top_posts.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen poster i perioden.</p>
            ) : (
              <div className="space-y-3">
                {data.top_posts.map((p, i) => (
                  <div
                    key={p.id}
                    className="p-3 bg-gray-800/40 rounded-lg border border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-pink-400">
                          {(p.engagement_rate * 100).toFixed(2)}%
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-400">
                          {formatNumber(p.raw_engagement)} interaksjoner
                        </span>
                        {p.post_url && (
                          <a
                            href={p.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 ml-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">
                      {p.caption}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tema-input */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Temaer å bygge for</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Produkter eller kategorier vi skal lage forslag for.
                </p>
              </div>
              <button
                onClick={applyThemes}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Generer forslag
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {themes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 text-gray-300 rounded-md text-xs"
                >
                  {t}
                  <button
                    onClick={() => removeTheme(t)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme())}
                placeholder="Legg til tema (f.eks. 'Spikerpistol')"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-pink-500 focus:outline-none"
              />
              <button
                onClick={addTheme}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Legg til
              </button>
            </div>
          </Card>

          {/* Caption-forslag */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Foreslåtte captions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.caption_suggestions.map((s, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white whitespace-pre-wrap flex-1">
                      {s.caption}
                    </p>
                    <CopyButton text={s.caption} />
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="text-pink-400">Mønstre:</span> {s.pattern_used}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Native-prompts */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Native-prompts (Nano Banana 2)</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Lim disse inn i Native-appen for å generere produktbilder.
            </p>
            <div className="space-y-3">
              {data.native_prompts.map((np, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{np.theme}</h3>
                    <CopyButton text={np.prompt} />
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{np.prompt}</p>
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500">
                      <span className="text-pink-400">Forslag til caption:</span>{" "}
                      {np.caption_seed}
                    </p>
                    <p className="text-xs text-gray-600 italic mt-1">
                      {np.reasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Organiske ideer */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Organiske innleggsideer</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Filming og praktiske ideer du kan produsere selv.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.organic_ideas.map((idea, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-pink-900/30 text-pink-300 text-[10px] uppercase font-semibold rounded">
                      {idea.format}
                    </span>
                    {idea.best_day_hint && (
                      <span className="text-xs text-gray-500">
                        {idea.best_day_hint}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{idea.title}</h3>
                  <p className="text-xs text-gray-400">{idea.description}</p>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Shot-liste:</p>
                    <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
                      {idea.shot_list.map((s, si) => (
                        <li key={si}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-gray-800 flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-300 italic flex-1">
                      {idea.caption_seed}
                    </p>
                    <CopyButton text={idea.caption_seed} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 border border-pink-900/40 bg-pink-950/10 text-xs text-pink-300/80">
            <Lightbulb className="w-4 h-4 inline mr-1" />
            <span className="font-semibold">Hvordan dette fungerer:</span> Vi
            analyserer captions fra alle Meta-poster i valgt periode, scorer dem på
            engagement rate (likes, kommentarer veies 3x, delinger 5x, klikk),
            og finner mønstre som korrelerer med høyere engasjement. Forslagene
            bygges som maler basert på de sterkeste mønstrene — koblet med dine
            valgte temaer.
          </Card>
        </>
      )}
    </div>
  );
}

export default function InnleggsbyggerSosialePage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
