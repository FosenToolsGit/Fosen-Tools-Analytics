"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import type { ConversionAggregate } from "@/app/api/google-ads/conversions/route";

interface Props {
  data: ConversionAggregate[];
  loading?: boolean;
  groupByCampaign?: boolean;
}

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

/**
 * Mapper conversion-action-navn til en menneskevennlig kategori-label og
 * plasserer i trakten. Basert på navngivnings-mønsteret GA4-import bruker
 * ("Fosen-Tools GA4 (web) <event>").
 */
function categorize(name: string): {
  label: string;
  funnelOrder: number;
  important: boolean;
} {
  const lower = name.toLowerCase();
  if (lower.includes("purchase"))
    return { label: "🛒 Kjøp", funnelOrder: 6, important: true };
  if (lower.includes("begin_checkout"))
    return { label: "💳 Begynt checkout", funnelOrder: 5, important: true };
  if (lower.includes("add_to_cart"))
    return { label: "➕ Lagt i handlekurv", funnelOrder: 4, important: true };
  if (lower.includes("form_submit"))
    return { label: "📝 Skjema sendt", funnelOrder: 3, important: true };
  if (lower.includes("klikk_kontakt") || lower.includes("kontakt"))
    return { label: "📞 Kontakt-klikk", funnelOrder: 2, important: false };
  if (lower.includes("email"))
    return { label: "✉️ E-post klikk", funnelOrder: 1, important: false };
  return { label: name, funnelOrder: 0, important: false };
}

export function GoogleAdsConversionsTable({
  data,
  loading,
  groupByCampaign = true,
}: Props) {
  const grouped = useMemo(() => {
    if (!data?.length) return [];
    const byCamp = new Map<
      string,
      {
        campaign_id: string;
        campaign_name: string | null;
        actions: (ConversionAggregate & {
          label: string;
          funnelOrder: number;
          important: boolean;
        })[];
        totalAllConv: number;
        totalAllValue: number;
        totalPrimaryConv: number;
      }
    >();
    for (const row of data) {
      const cat = categorize(row.conversion_action_name);
      const existing = byCamp.get(row.campaign_id);
      if (existing) {
        existing.actions.push({ ...row, ...cat });
        existing.totalAllConv += row.all_conversions;
        existing.totalAllValue += row.all_conversions_value;
        existing.totalPrimaryConv += row.conversions;
      } else {
        byCamp.set(row.campaign_id, {
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          actions: [{ ...row, ...cat }],
          totalAllConv: row.all_conversions,
          totalAllValue: row.all_conversions_value,
          totalPrimaryConv: row.conversions,
        });
      }
    }
    // sort actions within each campaign by funnel order
    for (const camp of byCamp.values()) {
      camp.actions.sort((a, b) => b.funnelOrder - a.funnelOrder);
    }
    return Array.from(byCamp.values()).sort(
      (a, b) => b.totalAllConv - a.totalAllConv
    );
  }, [data]);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen konverteringsdata i perioden. Kjør sync for å hente.
      </Card>
    );
  }

  if (!groupByCampaign) {
    // Flat tabell for detalj-sider hvor vi bare viser én kampanje
    const flat = grouped[0]?.actions ?? [];
    return (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-400 font-medium">
                  Handling
                </th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">
                  Primary
                </th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">
                  All
                </th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">
                  Verdi (all)
                </th>
              </tr>
            </thead>
            <tbody>
              {flat.map((row) => (
                <tr
                  key={row.conversion_action_name}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="text-white">{row.label}</div>
                    <div className="text-xs text-gray-600">
                      {row.conversion_action_name}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      row.conversions > 0 ? "text-green-400" : "text-gray-600"
                    }`}
                  >
                    {formatNumber(row.conversions)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      row.important ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {formatNumber(row.all_conversions)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {row.all_conversions_value > 0
                      ? nok.format(row.all_conversions_value)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((camp) => (
        <Card key={camp.campaign_id} className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">
                {camp.campaign_name || "(ukjent kampanje)"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatNumber(camp.totalAllConv)} handlinger totalt —{" "}
                {camp.totalPrimaryConv > 0 && (
                  <span className="text-green-400">
                    {formatNumber(camp.totalPrimaryConv)} primary
                  </span>
                )}
                {camp.totalAllValue > 0 && (
                  <>
                    {" "}
                    — verdi: {nok.format(camp.totalAllValue)}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">
                    Handling
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Primary
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    All
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Verdi (all)
                  </th>
                </tr>
              </thead>
              <tbody>
                {camp.actions.map((row) => (
                  <tr
                    key={`${camp.campaign_id}-${row.conversion_action_name}`}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className={row.important ? "text-white" : "text-gray-400"}>
                        {row.label}
                      </div>
                      <div className="text-xs text-gray-600">
                        {row.conversion_action_name}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        row.conversions > 0 ? "text-green-400" : "text-gray-700"
                      }`}
                    >
                      {formatNumber(row.conversions)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        row.important ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {formatNumber(row.all_conversions)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {row.all_conversions_value > 0
                        ? nok.format(row.all_conversions_value)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <p className="text-xs text-gray-600">
        <strong>Primary</strong>: hva Google Ads teller som "Konverteringer" —
        driver Pmax/budoptimalisering. <strong>All</strong>: alle trackede
        handlinger, inkludert de som ikke er merket som primary. Hvis primary
        er mye lavere enn all, er konverteringssporingen konfigurert feil.
      </p>
    </div>
  );
}
