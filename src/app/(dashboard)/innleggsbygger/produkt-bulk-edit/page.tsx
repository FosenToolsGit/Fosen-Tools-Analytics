"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Download, Loader2, Upload, Search, ChevronDown, CheckSquare, Square, AlertTriangle } from "lucide-react";
import hierarki from "@/lib/data/produktgruppe-hierarki.json";

const HIERARKI = hierarki as Record<string, Record<string, string[]>>;

type Row = Record<string, unknown>;

/**
 * Score-system: produkter som mangler kritisk data får høyere score og bobler opp.
 * Returnerer { score: number, issues: string[] } så vi kan vise hva som mangler.
 */
function rowQualityScore(row: Row): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  const str = (key: string) => String(row[key] ?? "").trim();

  if (!str("Produktgruppe 1")) { score += 100; issues.push("mangler G1"); }
  else if (!str("Produktgruppe 2")) { score += 50; issues.push("mangler G2"); }
  else if (!str("Produktgruppe 3")) { score += 30; issues.push("mangler G3"); }

  if (!str("Produktbeskrivelse 1")) { score += 80; issues.push("mangler navn"); }
  else if (str("Produktbeskrivelse 1").length > 40) { score += 20; issues.push("navn >40 tegn"); }

  if (!str("Produktbeskrivelse 2")) { score += 20; issues.push("mangler B2"); }

  if (!str("BildeFilnavn")) { score += 40; issues.push("mangler bilde"); }

  if (!str("Produktinformasjon") || str("Produktinformasjon").length < 50) {
    score += 30;
    issues.push("tynn produktinfo");
  }

  if (row["Hovedleverandør kostpris  "] == null || row["Hovedleverandør kostpris  "] === "") {
    score += 25;
    issues.push("mangler kostpris");
  }

  if (!str("EANnr")) { score += 15; issues.push("mangler EAN"); }
  if (!str("Produsent")) { score += 15; issues.push("mangler produsent"); }

  return { score, issues };
}

const COLUMN_DEFS: Array<{ key: string; label: string; width: number; type: "text" | "number" | "boolean" }> = [
  { key: "Leverandør produktnummer", label: "Lev.prodnr", width: 130, type: "text" },
  { key: "Produktbeskrivelse 1", label: "Navn (B1)", width: 260, type: "text" },
  { key: "Produktbeskrivelse 2", label: "Beskrivelse 2", width: 200, type: "text" },
  { key: "Produktgruppe 1", label: "G1", width: 140, type: "text" },
  { key: "Produktgruppe 2", label: "G2", width: 140, type: "text" },
  { key: "Produktgruppe 3", label: "G3", width: 140, type: "text" },
  { key: "Produsent", label: "Produsent", width: 110, type: "text" },
  { key: "Hovedleverandør kostpris  ", label: "Kostpris", width: 90, type: "number" },
  { key: "ListePris1", label: "Listepris", width: 90, type: "number" },
  { key: "Aktiv på web", label: "Aktiv", width: 60, type: "number" },
];

export default function ProduktBulkEditPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [filterG1, setFilterG1] = useState("");
  const [sortNeedsWork, setSortNeedsWork] = useState(true);
  const [onlyNeedsWork, setOnlyNeedsWork] = useState(false);
  const [bulkG1, setBulkG1] = useState("");
  const [bulkG2, setBulkG2] = useState("");
  const [bulkG3, setBulkG3] = useState("");
  const [bulkAktiv, setBulkAktiv] = useState<"" | "0" | "1">("");
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success" | "info"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.map((r, i) => ({ row: r, idx: i, quality: rowQualityScore(r) }));
    if (filterG1) list = list.filter(({ row }) => String(row["Produktgruppe 1"] ?? "") === filterG1);
    if (q) {
      list = list.filter(({ row }) => {
        const haystack = [
          row["Produktbeskrivelse 1"],
          row["Produktbeskrivelse 2"],
          row["Leverandør produktnummer"],
          row["Produsent"],
        ].map((v) => String(v ?? "").toLowerCase()).join(" ");
        return haystack.includes(q);
      });
    }
    if (onlyNeedsWork) list = list.filter(({ quality }) => quality.score > 0);
    if (sortNeedsWork) {
      list = [...list].sort((a, b) => b.quality.score - a.quality.score);
    }
    return list;
  }, [rows, search, filterG1, sortNeedsWork, onlyNeedsWork]);

  const totalNeedsWork = useMemo(
    () => rows.reduce((sum, r) => sum + (rowQualityScore(r).score > 0 ? 1 : 0), 0),
    [rows]
  );

  const allG1Options = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { const g = r["Produktgruppe 1"]; if (g) set.add(String(g)); });
    return Array.from(set).sort();
  }, [rows]);

  async function handleFile(file: File) {
    setLoading(true);
    setStatus({ kind: "info", msg: `Leser ${file.name}...` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/produkt-import/parse-multicase-export", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ kind: "error", msg: `Feil: ${err.error ?? res.status}` });
        return;
      }
      const data = await res.json();
      setRows(data.rows);
      setSelected(new Set());
      setStatus({ kind: "success", msg: `Lastet ${data.count} produkter` });
    } catch (err) {
      setStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setLoading(false);
    }
  }

  function updateCell(idx: number, key: string, value: unknown) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function toggleSelect(idx: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((f) => f.idx)));
  }

  function applyBulk() {
    if (selected.size === 0) return;
    setRows((rs) => rs.map((r, i) => {
      if (!selected.has(i)) return r;
      const next = { ...r };
      if (bulkG1) next["Produktgruppe 1"] = bulkG1;
      if (bulkG2) next["Produktgruppe 2"] = bulkG2;
      if (bulkG3) next["Produktgruppe 3"] = bulkG3;
      if (bulkAktiv !== "") next["Aktiv på web"] = parseInt(bulkAktiv);
      return next;
    }));
    setStatus({ kind: "success", msg: `Oppdatert ${selected.size} produkter` });
  }

  async function exportXlsx() {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/produkt-import/export-multicase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ kind: "error", msg: `Eksport feilet: ${err.error ?? res.status}` });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produktimport-edit-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus({ kind: "error", msg: `Feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Bulk-redigér produkter</h1>
        <p className="text-gray-400 text-sm">Last opp en Multicase produkteksport-XLSX, gjør massive endringer (produktgrupper, aktiv-status, format), eksporter modifisert fil tilbake.</p>
      </div>

      {/* File upload */}
      <section className="bg-gray-900/50 border border-gray-800 rounded p-4 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "Leser..." : "Last opp Multicase-eksport"}
        </button>
        {rows.length > 0 && (
          <span className="text-sm text-gray-300">{rows.length} produkter lastet — {filtered.length} synlige</span>
        )}
        {status && (
          <span className={`ml-auto text-xs px-2 py-1 rounded ${
            status.kind === "error" ? "bg-red-900/50 text-red-200" :
            status.kind === "success" ? "bg-green-900/50 text-green-200" :
            "bg-blue-900/50 text-blue-200"
          }`}>{status.msg}</span>
        )}
      </section>

      {rows.length > 0 && (
        <>
          {/* Search + filter */}
          <section className="bg-gray-900/50 border border-gray-800 rounded p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søk i navn, lev.prodnr, produsent..."
                className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-2 py-1 text-sm text-white"
              />
            </div>
            <select
              value={filterG1}
              onChange={(e) => setFilterG1(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            >
              <option value="">Alle G1</option>
              {allG1Options.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={sortNeedsWork} onChange={(e) => setSortNeedsWork(e.target.checked)} />
              Sortér «trenger arbeid» øverst
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none whitespace-nowrap" title={`${totalNeedsWork} av ${rows.length} produkter har minst ett kvalitets-problem`}>
              <input type="checkbox" checked={onlyNeedsWork} onChange={(e) => setOnlyNeedsWork(e.target.checked)} />
              Kun trenger arbeid <span className="text-amber-400 font-semibold">({totalNeedsWork})</span>
            </label>
            <button
              onClick={selectAllFiltered}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
            >
              Velg alle synlige ({filtered.length})
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
            >
              Fjern markering
            </button>
          </section>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <section className="bg-amber-950/40 border border-amber-700/50 rounded p-3 flex flex-wrap items-center gap-2 sticky top-2 z-10">
              <strong className="text-amber-200 text-sm">{selected.size} valgt</strong>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">G1:</span>
                <Combobox value={bulkG1} options={Object.keys(HIERARKI)} onChange={(v) => { setBulkG1(v); setBulkG2(""); setBulkG3(""); }} placeholder="(ikke endre)" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">G2:</span>
                <Combobox value={bulkG2} options={bulkG1 && HIERARKI[bulkG1] ? Object.keys(HIERARKI[bulkG1]) : []} onChange={(v) => { setBulkG2(v); setBulkG3(""); }} placeholder="(ikke endre)" disabled={!bulkG1} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">G3:</span>
                <Combobox value={bulkG3} options={bulkG1 && bulkG2 && HIERARKI[bulkG1]?.[bulkG2] ? HIERARKI[bulkG1][bulkG2] : []} onChange={setBulkG3} placeholder="(ikke endre)" disabled={!bulkG2} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Aktiv:</span>
                <select
                  value={bulkAktiv}
                  onChange={(e) => setBulkAktiv(e.target.value as "" | "0" | "1")}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">(ikke endre)</option>
                  <option value="1">1 — Synlig</option>
                  <option value="0">0 — Skjult</option>
                </select>
              </div>
              <button
                onClick={applyBulk}
                className="ml-auto px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium"
              >
                Bruk på {selected.size} produkter
              </button>
            </section>
          )}

          {/* Table */}
          <section className="bg-gray-950 border border-gray-800 rounded overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="text-xs w-full">
                <thead className="bg-gray-900 sticky top-0 z-10">
                  <tr className="text-left text-gray-400">
                    <th className="px-2 py-1 w-8"></th>
                    <th className="px-2 py-1 w-7" title="Trenger arbeid"></th>
                    {COLUMN_DEFS.map((col) => (
                      <th key={col.key} className="px-2 py-1" style={{ minWidth: col.width }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map(({ row, idx, quality }) => {
                    const isSel = selected.has(idx);
                    return (
                      <tr key={idx} className={`border-t border-gray-800 ${isSel ? "bg-amber-900/20" : "hover:bg-gray-900/50"}`}>
                        <td className="px-2 py-1">
                          <button onClick={() => toggleSelect(idx)} className="p-0.5">
                            {isSel ? <CheckSquare className="h-4 w-4 text-amber-400" /> : <Square className="h-4 w-4 text-gray-500" />}
                          </button>
                        </td>
                        <td className="px-1 py-1 text-center">
                          {quality.score > 0 && (
                            <span
                              className={`inline-flex items-center ${quality.score >= 100 ? "text-red-400" : quality.score >= 50 ? "text-amber-400" : "text-yellow-500"}`}
                              title={`Mangler: ${quality.issues.join(", ")}`}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                        {COLUMN_DEFS.map((col) => (
                          <td key={col.key} className="px-1 py-0.5">
                            <input
                              type={col.type === "number" ? "number" : "text"}
                              value={String(row[col.key] ?? "")}
                              onChange={(e) => updateCell(idx, col.key, col.type === "number" ? (e.target.value === "" ? null : parseFloat(e.target.value)) : e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-orange-500 rounded px-1 py-0.5 text-white"
                              style={{ minWidth: col.width - 8 }}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > 500 && (
              <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-800">
                Viser første 500 av {filtered.length} treff — bruk søk/filter for å smalne ned
              </div>
            )}
          </section>

          {/* Export */}
          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={exportXlsx}
              disabled={exporting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded shadow-lg"
            >
              {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {exporting ? "Bygger XLSX..." : `Last ned modifisert XLSX (${rows.length} rader)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Combobox({
  value, options, onChange, placeholder, disabled,
}: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const filt = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button" disabled={disabled}
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white disabled:opacity-50 min-w-[110px] max-w-[160px]"
      >
        <span className={`truncate ${value ? "text-white" : "text-gray-500"}`}>{value || placeholder || "Velg..."}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-1" />
      </button>
      {open && !disabled && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl max-h-64 overflow-hidden flex flex-col w-[200px]">
          <input
            autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk..." className="bg-gray-800 border-b border-gray-700 px-2 py-1 text-xs text-white focus:outline-none"
          />
          <div className="overflow-y-auto flex-1">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="block w-full text-left px-2 py-1 text-xs text-gray-400 italic hover:bg-gray-800">(tom — ikke endre)</button>
            {filt.map((opt) => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); setSearch(""); }} className={`block w-full text-left px-2 py-1 text-xs hover:bg-orange-600/20 ${opt === value ? "bg-orange-600/30 text-orange-300" : "text-gray-200"}`}>{opt}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
