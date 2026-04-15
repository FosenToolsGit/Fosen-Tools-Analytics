import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { GoogleAdsApi } from "google-ads-api";

/**
 * Legger til negative keywords på kampanje-nivå i Google Ads.
 * Krever bekreftet input fra bruker — UI må ha vist preview-modal først.
 *
 * Alt som gjøres logges til google_ads_auto_actions for sporbarhet og
 * mulighet for å reversere senere.
 */

type MatchTypeInput = "EXACT" | "PHRASE" | "BROAD";

interface Item {
  campaign_id: string;
  keyword: string;
  match_type: MatchTypeInput;
}

interface Body {
  items: Item[];
}

// KeywordMatchType enum i Google Ads API:
// 0 = UNSPECIFIED, 1 = UNKNOWN, 2 = EXACT, 3 = PHRASE, 4 = BROAD
function matchTypeToEnum(mt: MatchTypeInput): number {
  switch (mt) {
    case "EXACT":
      return 2;
    case "PHRASE":
      return 3;
    case "BROAD":
      return 4;
    default:
      return 3;
  }
}

const MAX_PER_BATCH = 50;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'items' array" },
      { status: 400 }
    );
  }

  if (body.items.length > MAX_PER_BATCH) {
    return NextResponse.json(
      {
        error: `Maks ${MAX_PER_BATCH} negatives per kall for å unngå feilbatch`,
      },
      { status: 400 }
    );
  }

  // Valider credentials
  if (
    !process.env.GOOGLE_ADS_DEVELOPER_TOKEN ||
    !process.env.GOOGLE_ADS_CLIENT_ID ||
    !process.env.GOOGLE_ADS_CLIENT_SECRET ||
    !process.env.GOOGLE_ADS_REFRESH_TOKEN ||
    !process.env.GOOGLE_ADS_CUSTOMER_ID
  ) {
    return NextResponse.json(
      { error: "Google Ads credentials mangler" },
      { status: 500 }
    );
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, "");
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(
    /-/g,
    ""
  );

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}),
  });

  const admin = createAdminClient();
  const results: Array<{
    item: Item;
    status: "applied" | "failed";
    log_id: number | null;
    resource_name?: string;
    error?: string;
  }> = [];

  for (const item of body.items) {
    // 1. Logg intensjon
    const { data: logRow } = await admin
      .from("google_ads_auto_actions")
      .insert({
        action_type: "add_negative_keyword",
        target_resource: `customers/${customerId}/campaigns/${item.campaign_id}`,
        payload: {
          campaign_id: item.campaign_id,
          keyword: item.keyword,
          match_type: item.match_type,
        },
        status: "pending",
        applied_by: user.email ?? user.id,
      })
      .select("id")
      .single();

    const logId = (logRow?.id as number) ?? null;

    try {
      // 2. Bygg og send mutation
      const mutation = {
        entity: "campaign_criterion" as const,
        operation: "create" as const,
        resource: {
          campaign: `customers/${customerId}/campaigns/${item.campaign_id}`,
          negative: true,
          keyword: {
            text: item.keyword,
            match_type: matchTypeToEnum(item.match_type),
          },
        },
      };

      const response = await customer.mutateResources([
        mutation as unknown as Parameters<typeof customer.mutateResources>[0][0],
      ]);

      const mutResults = (
        response as unknown as {
          mutate_operation_responses?: Array<{
            campaign_criterion_result?: { resource_name?: string };
          }>;
        }
      ).mutate_operation_responses;
      const resourceName =
        mutResults?.[0]?.campaign_criterion_result?.resource_name;

      // 3. Oppdater log til applied
      if (logId) {
        await admin
          .from("google_ads_auto_actions")
          .update({
            status: "applied",
            applied_at: new Date().toISOString(),
            target_resource: resourceName ?? undefined,
          })
          .eq("id", logId);
      }

      results.push({
        item,
        status: "applied",
        log_id: logId,
        resource_name: resourceName,
      });
    } catch (err) {
      const errObj = err as {
        errors?: Array<{ message?: string }>;
      };
      const errorMessage =
        errObj?.errors?.[0]?.message ||
        (err instanceof Error ? err.message : "Unknown error");

      if (logId) {
        await admin
          .from("google_ads_auto_actions")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", logId);
      }

      results.push({
        item,
        status: "failed",
        log_id: logId,
        error: errorMessage,
      });
    }
  }

  const applied = results.filter((r) => r.status === "applied").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    total: body.items.length,
    applied,
    failed,
    results,
  });
}
