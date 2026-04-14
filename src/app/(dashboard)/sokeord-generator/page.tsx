"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setSuccess(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".csv"))) {
      setFile(f);
      setError(null);
      setSuccess(false);
    } else {
      setError("Filen må være .xlsx eller .csv");
    }
  }

  async function handleGenerate() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/keyword-generator", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generering feilet");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sokeord-Anbefalinger-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Søkeords-generator</h1>
          <p className="text-sm text-gray-400">
            Last opp en Google Ads-rapport — få en optimalisert anbefaling
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Slik fungerer det</h2>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Eksporter søkeords-rapporten din fra Google Ads som Excel</li>
          <li>Filen må ha kolonnene: Søkeord, Klikk, Kostnad, CPC, Annonsegruppe</li>
          <li>Last opp filen her</li>
          <li>
            Generatoren analyserer mot ditt eget Search Console-data og
            foreslår:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-gray-400">
              <li>Hvilke søkeord du bør kutte (sparer penger)</li>
              <li>Hvilke som leverer (behold disse)</li>
              <li>Nye muligheter du ikke har testet ennå</li>
            </ul>
          </li>
          <li>Last ned ferdig Excel-rapport</li>
        </ol>
      </Card>

      <Card
        className="p-8 border-2 border-dashed border-gray-700 hover:border-blue-500 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {!file ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  Dra og slipp Excel-filen her
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  eller klikk for å velge fil
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Velg fil
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setSuccess(false);
                    setError(null);
                  }}
                >
                  Velg en annen
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    "Genererer..."
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-1.5" />
                      Generer rapport
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900/20 border border-red-800/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Feil</p>
              <p className="text-sm text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {success && (
        <Card className="p-4 bg-green-900/20 border border-green-800/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-300">
                Rapport generert!
              </p>
              <p className="text-sm text-green-400/80 mt-1">
                Excel-filen er lastet ned. Åpne den for å se anbefalinger.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Hva får du i rapporten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white font-medium">📊 Sammendrag</p>
            <p className="text-gray-400 mt-0.5">
              Totaler, snitt CPC, mulig besparelse
            </p>
          </div>
          <div>
            <p className="text-white font-medium">❌ Kutt disse</p>
            <p className="text-gray-400 mt-0.5">
              Konkurrent-merker, dyre uten volum
            </p>
          </div>
          <div>
            <p className="text-white font-medium">✅ Behold disse</p>
            <p className="text-gray-400 mt-0.5">
              Søkeord som leverer godt
            </p>
          </div>
          <div>
            <p className="text-white font-medium">💡 Nye muligheter</p>
            <p className="text-gray-400 mt-0.5">
              Fra Search Console-data
            </p>
          </div>
          <div>
            <p className="text-white font-medium">⚠️ Vurder disse</p>
            <p className="text-gray-400 mt-0.5">
              Borderline — trenger menneskelig vurdering
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
