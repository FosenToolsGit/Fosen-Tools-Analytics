"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, AlertCircle, FileText, Search, TrendingUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

type PageType = "manufacturer" | "category" | "article" | "landing";

interface ApiResponse {
  keyword: string;
  page_type: PageType;
  competitors_scraped: number;
  competitors_failed: number;
  competitors_used: string[];
  serp_used: boolean;
  serp_error: string | null;
  prompt: string;
}

interface KeywordCandidate {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  search_volume: number | null;
  competition: string | null;
  score: number;
  category: "low_hanging" | "growth" | "long_tail" | "underperforming";
  reasoning: string;
}

interface AnalyzeResponse {
  url: string;
  days_analyzed: number;
  page_context: {
    title: string | null;
    meta_description: string | null;
    h1: string[];
    h2: string[];
    word_count: number;
  };
  candidates: KeywordCandidate[];
  keyword_planner_available: boolean;
  total_keywords_found: number;
}

interface ParsedBlocks {
  meta_title?: string;
  meta_description?: string;
  intro_block?: string;
  faq_block?: string;
  contact_cta_block?: string;
  json_ld_script?: string;
}

const CATEGORY_LABELS: Record<KeywordCandidate["category"], { label: string; color: string }> = {
  low_hanging: { label: "Lavt hengende frukt", color: "bg-green-700/30 text-green-300 border-green-700" },
  underperforming: { label: "Lav CTR-fix", color: "bg-yellow-700/30 text-yellow-300 border-yellow-700" },
  growth: { label: "Vekst", color: "bg-blue-700/30 text-blue-300 border-blue-700" },
  long_tail: { label: "Long-tail", color: "bg-gray-700/30 text-gray-300 border-gray-700" },
};

function CopyButton({ text, label = "Kopier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" /> Kopiert
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" /> {label}
        </>
      )}
    </button>
  );
}

export default function SeoInnholdPage() {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [pageType, setPageType] = useState<PageType>("manufacturer");
  const [currentPosition, setCurrentPosition] = useState("");
  const [relatedKeywords, setRelatedKeywords] = useState("");
  const [notes, setNotes] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [autoFindCompetitors, setAutoFindCompetitors] = useState(true);
  const [numCompetitors, setNumCompetitors] = useState(5);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // URL-analyse-state
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  // JSON-parser-state (lim inn Claude-svar → vis blokker separat)
  const [jsonInput, setJsonInput] = useState("");
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlocks | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleParseJson() {
    setParseError(null);
    setParsedBlocks(null);
    if (!jsonInput.trim()) {
      setParseError("Lim inn JSON-svaret fra Claude først");
      return;
    }
    let raw = jsonInput.trim();
    // Strip markdown code fences hvis brukeren har kopiert med dem
    if (raw.startsWith("```json")) raw = raw.slice(7);
    if (raw.startsWith("```")) raw = raw.slice(3);
    if (raw.endsWith("```")) raw = raw.slice(0, -3);
    raw = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      setParsedBlocks(parsed);
    } catch (err) {
      setParseError(`Ugyldig JSON: ${err instanceof Error ? err.message : "ukjent feil"}`);
    }
  }

  async function handleAnalyzeUrl() {
    if (!analyzeUrl.trim()) {
      setAnalyzeError("URL er påkrevd");
      return;
    }
    setAnalyzeError(null);
    setIsAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch("/api/insights/seo-content/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: AnalyzeResponse = await res.json();
      setAnalyzeResult(data);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function selectCandidate(candidate: KeywordCandidate) {
    setKeyword(candidate.query);
    setTargetUrl(analyzeUrl);
    setCurrentPosition(candidate.position.toFixed(1));
    if (candidate.search_volume !== null) {
      setNotes(`Søkevolum: ${candidate.search_volume}/mnd. ${candidate.reasoning}`);
    } else {
      setNotes(candidate.reasoning);
    }
    setTimeout(() => {
      document.getElementById("step-2")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleBuild() {
    if (!keyword.trim()) {
      setError("Søkeord er påkrevd");
      return;
    }
    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const competitors = competitorUrls
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http"));

      const res = await fetch("/api/insights/seo-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          target_url: targetUrl.trim() || undefined,
          page_type: pageType,
          current_position: currentPosition ? Number(currentPosition) : undefined,
          related_keywords: relatedKeywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          notes: notes.trim() || undefined,
          competitor_urls: competitors,
          auto_find_competitors: autoFindCompetitors && competitors.length === 0,
          num_competitors: numCompetitors,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">SEO-innhold (prompt-bygger)</h1>
          <p className="text-sm text-gray-400">
            Bygger en strukturert prompt med Fosen Tools-kontekst, Multicase-template og konkurrent-analyse — lim inn i Claude Code så får du ferdig HTML tilbake
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Steg 1 — Lim inn URL og finn beste søkeord</h2>
        </div>
        <p className="text-sm text-gray-400">
          Vi henter Search Console-data for siden, krysskobler med Keyword Planner-volum, og foreslår søkeord rangert etter <strong>volum × posisjon-mulighet</strong>.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={analyzeUrl}
            onChange={(e) => setAnalyzeUrl(e.target.value)}
            placeholder="https://fosen-tools.no/leatherman"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAnalyzeUrl}
            disabled={isAnalyzing || !analyzeUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors whitespace-nowrap"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyserer...</>
            ) : (
              <><Target className="w-4 h-4" /> Foreslå søkeord</>
            )}
          </button>
        </div>
        {analyzeError && (
          <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{analyzeError}</span>
          </div>
        )}

        {analyzeResult && (
          <div className="space-y-3">
            {analyzeResult.page_context.title && (
              <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs">
                <div className="text-gray-400 mb-1">Side-kontekst:</div>
                <div className="text-white"><strong>Tittel:</strong> {analyzeResult.page_context.title}</div>
                {analyzeResult.page_context.meta_description && (
                  <div className="text-gray-300 mt-1"><strong>Meta:</strong> {analyzeResult.page_context.meta_description}</div>
                )}
                {analyzeResult.page_context.h1.length > 0 && (
                  <div className="text-gray-300 mt-1"><strong>H1:</strong> {analyzeResult.page_context.h1.join(" | ")}</div>
                )}
                <div className="text-gray-500 mt-2">
                  {analyzeResult.total_keywords_found} søkeord rangerer for denne URLen siste {analyzeResult.days_analyzed}d
                  {!analyzeResult.keyword_planner_available && " · Keyword Planner ikke godkjent (volum estimert fra GSC)"}
                </div>
              </div>
            )}

            {analyzeResult.candidates.length === 0 ? (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 text-sm text-yellow-300">
                Ingen søkeord-data funnet. Siden rangerer ikke for noen keywords i Search Console siste 90d, eller URL-en matcher ikke en faktisk side i GSC-data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Søkeord</th>
                      <th className="py-2 px-2">Kategori</th>
                      <th className="py-2 px-2 text-right">Volum/mnd</th>
                      <th className="py-2 px-2 text-right">Pos</th>
                      <th className="py-2 px-2 text-right">Klikk</th>
                      <th className="py-2 px-2 text-right">Visninger</th>
                      <th className="py-2 px-2 text-right">Score</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyzeResult.candidates.map((c, i) => (
                      <tr key={c.query} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-2 text-white font-medium">{c.query}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_LABELS[c.category].color}`}>
                            {CATEGORY_LABELS[c.category].label}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-gray-300">
                          {c.search_volume !== null ? c.search_volume.toLocaleString("nb-NO") : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-300">{c.position.toFixed(1)}</td>
                        <td className="py-2 px-2 text-right text-gray-300">{c.clicks}</td>
                        <td className="py-2 px-2 text-right text-gray-300">{c.impressions}</td>
                        <td className="py-2 px-2 text-right text-blue-300 font-medium">{c.score.toLocaleString("nb-NO")}</td>
                        <td className="py-2 px-2">
                          <button
                            onClick={() => selectCandidate(c)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded whitespace-nowrap"
                          >
                            Bruk →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card id="step-2" className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Steg 2 — Bygg prompt for valgt søkeord</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Søkeord <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="f.eks. momentnøkkel"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sidetype</label>
            <select
              value={pageType}
              onChange={(e) => setPageType(e.target.value as PageType)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="manufacturer">Produsent (Wera, Pelicase, etc.)</option>
              <option value="category">Produktkategori (verktøyvogner, etc.)</option>
              <option value="article">Artikkel/blogg</option>
              <option value="landing">Landingsside/kampanje</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mål-URL <span className="text-gray-500">(valgfritt)</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://fosen-tools.no/..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nåværende GSC-posisjon <span className="text-gray-500">(valgfritt)</span>
            </label>
            <input
              type="number"
              value={currentPosition}
              onChange={(e) => setCurrentPosition(e.target.value)}
              placeholder="f.eks. 16"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Relaterte søkeord <span className="text-gray-500">(komma-separert, valgfritt)</span>
            </label>
            <input
              type="text"
              value={relatedKeywords}
              onChange={(e) => setRelatedKeywords(e.target.value)}
              placeholder="momentnøkkel digital, momentnøkkel mekanisk, momentnøkkel kalibrering"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={autoFindCompetitors}
                  onChange={(e) => setAutoFindCompetitors(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-900 border-gray-700"
                />
                Finn konkurrenter automatisk via Google SERP
              </label>
              {autoFindCompetitors && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  Antall:
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numCompetitors}
                    onChange={(e) => setNumCompetitors(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {autoFindCompetitors ? (
                  <>Konkurrent-URLer <span className="text-gray-500">(valgfri overstyring — fyll inn for å hoppe over auto-søk)</span></>
                ) : (
                  <>Konkurrent-URLer <span className="text-gray-500">(én per linje, maks 10)</span></>
                )}
              </label>
              <textarea
                value={competitorUrls}
                onChange={(e) => setCompetitorUrls(e.target.value)}
                placeholder={"https://www.bahco.com/no_no/momentnokkel\nhttps://www.skil.no/momentnokkel"}
                rows={3}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Ekstra kontekst <span className="text-gray-500">(valgfritt)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="f.eks. Målgruppe er Forsvaret. Nevner HDFI-skreddersøm. Vinkel: kalibreringssertifikat."
              rows={2}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Ingen API-kostnad — denne ruten scraper bare konkurrent-data og bygger prompt
          </p>
          <button
            onClick={handleBuild}
            disabled={isLoading || !keyword.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Bygger...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Bygg prompt
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      {result && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" /> Ferdig prompt
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {result.serp_used && "Auto-funnet via Google SERP · "}
                {result.competitors_scraped} konkurrent{result.competitors_scraped === 1 ? "" : "er"} scrapet
                {result.competitors_failed > 0 && ` (${result.competitors_failed} feilet)`} ·{" "}
                {result.prompt.length.toLocaleString("nb-NO")} tegn
              </p>
            </div>
            <CopyButton text={result.prompt} label="Kopier hele prompten" />
          </div>

          {result.competitors_used.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs">
              <div className="text-gray-400 mb-1">Konkurrenter brukt i prompten:</div>
              <ul className="space-y-0.5 text-gray-300">
                {result.competitors_used.map((u) => (
                  <li key={u} className="font-mono break-all">{u}</li>
                ))}
              </ul>
            </div>
          )}

          {result.serp_error && (
            <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>SERP-søk feilet: {result.serp_error}</span>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700 rounded p-3 text-sm text-blue-200">
            <strong>Workflow:</strong>
            <ol className="mt-1 ml-4 list-decimal space-y-1 text-blue-300">
              <li>Klikk «Kopier hele prompten» over</li>
              <li>Lim inn i Claude Code-samtale</li>
              <li>Jeg svarer med JSON-objekt med 6 separate blokker</li>
              <li>Lim JSON-svaret i Steg 3 nedenfor — hver blokk kommer med egen kopi-knapp og plassering-instruks</li>
            </ol>
          </div>

          <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto max-h-[600px] whitespace-pre-wrap font-mono">
            {result.prompt}
          </pre>
        </Card>
      )}

      {result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Steg 3 — Lim inn JSON-svar fra Claude</h2>
          </div>
          <p className="text-sm text-gray-400">
            Etter at du har limt prompten i Claude og fått JSON-svar tilbake, lim hele svaret her — vi parser og viser hver blokk med kopi-knapp.
          </p>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"meta_title": "...", "meta_description": "...", "intro_block": "...", ...}'
            rows={6}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Kodeblokk-omslag (```json) fjernes automatisk.
            </p>
            <button
              onClick={handleParseJson}
              disabled={!jsonInput.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
            >
              <FileText className="w-4 h-4" /> Parse JSON
            </button>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedBlocks && (
            <div className="space-y-3 pt-2">
              {[
                { key: "meta_title", label: "Meta-tittel", placement: "Lim inn i tittel-feltet i Multicase", isHtml: false },
                { key: "meta_description", label: "Meta-beskrivelse", placement: "Lim inn i meta-beskrivelse-feltet i Multicase", isHtml: false },
                { key: "intro_block", label: "INTRO-blokk", placement: "Lim inn som EGEN PUBLISERING — toppen av siden", isHtml: true },
                { key: "faq_block", label: "FAQ-blokk", placement: "Lim inn som EGEN PUBLISERING — etter INTRO", isHtml: true },
                { key: "contact_cta_block", label: "Kontakt-CTA-blokk", placement: "Lim inn som EGEN PUBLISERING — nederst på siden", isHtml: true },
                { key: "json_ld_script", label: "JSON-LD-script", placement: "Lim inn som EGEN PUBLISERING — typisk nederst (gjør ikke noe synlig, men viktig for Google)", isHtml: true },
              ].map((block) => {
                const value = parsedBlocks[block.key as keyof ParsedBlocks];
                if (!value) return null;
                return (
                  <div key={block.key} className="bg-gray-900 border border-gray-700 rounded p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white">{block.label}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">→ {block.placement}</p>
                        {!block.isHtml && (
                          <p className="text-xs text-gray-500 mt-0.5">{value.length} tegn</p>
                        )}
                      </div>
                      <CopyButton text={value} label="Kopier" />
                    </div>
                    <pre className="bg-black/40 border border-gray-800 rounded p-2 text-xs text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                      {value}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
