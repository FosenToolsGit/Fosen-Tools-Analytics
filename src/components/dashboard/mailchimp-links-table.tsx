"use client";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import { ExternalLink } from "lucide-react";
import type { MailchimpLinkAggregate } from "@/app/api/mailchimp/links/route";

interface Props {
  data: MailchimpLinkAggregate[];
  loading?: boolean;
}

function truncate(url: string, len = 60): string {
  if (url.length <= len) return url;
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length > len - u.hostname.length - 3) {
      return `${u.hostname}${path.slice(0, len - u.hostname.length - 6)}...`;
    }
    return `${u.hostname}${path}`;
  } catch {
    return url.slice(0, len - 3) + "...";
  }
}

export function MailchimpLinksTable({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen lenke-klikk registrert ennå. Kjør en Mailchimp-sync for å hente
        click-details.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-gray-400 font-medium">Lenke</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">
                Klikk
              </th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">
                Unike klikk
              </th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">
                Kampanjer
              </th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((link, i) => (
              <tr
                key={`${link.url}-${i}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-400 inline-flex items-center gap-1 max-w-lg"
                    title={link.url}
                  >
                    <span className="truncate">{truncate(link.url)}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  {link.campaigns.length > 0 && (
                    <div className="text-xs text-gray-600 mt-0.5 truncate max-w-lg">
                      {link.campaigns.slice(0, 2).join(", ")}
                      {link.campaigns.length > 2 &&
                        ` +${link.campaigns.length - 2}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(link.total_clicks)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(link.unique_clicks)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 text-xs">
                  {link.campaigns_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
