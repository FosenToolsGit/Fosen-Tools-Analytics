import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleAdsApi, type Customer } from "google-ads-api";

/**
 * Lister alle negative keywords som er aktive for kampanjene våre.
 * Henter tre datasett:
 *  1. Kampanje-nivå negative keywords (campaign_criterion med negative=true)
 *  2. Shared negative keyword lists + som kampanjer de er applied på
 *  3. Innhold i hver shared list (shared_criterion)
 */

interface NegativeCriterion {
  campaign_id: string;
  campaign_name: string;
  keyword_text: string;
  match_type: string;
  source: "campaign" | "shared_list";
  list_name?: string;
}

interface SharedList {
  list_id: string;
  list_name: string;
  applied_to_campaigns: string[];
  keywords: Array<{ text: string; match_type: string }>;
}

const MATCH_TYPE_LABELS: Record<string | number, string> = {
  2: "EXACT",
  3: "PHRASE",
  4: "BROAD",
  EXACT: "EXACT",
  PHRASE: "PHRASE",
  BROAD: "BROAD",
};

function matchType(v: unknown): string {
  const s = String(v ?? "").toUpperCase();
  return MATCH_TYPE_LABELS[s] ?? MATCH_TYPE_LABELS[Number(v)] ?? s;
}

async function getCustomer(): Promise<Customer> {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  return client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await getCustomer();

    // 1. Kampanje-nivå negatives
    const campaignNegRows = (await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign_criterion.keyword.text,
        campaign_criterion.keyword.match_type,
        campaign_criterion.negative
      FROM campaign_criterion
      WHERE campaign_criterion.type = 'KEYWORD'
        AND campaign_criterion.negative = TRUE
        AND campaign.status != 'REMOVED'
    `)) as unknown as Array<Record<string, Record<string, unknown>>>;

    const campaignNegatives: NegativeCriterion[] = campaignNegRows
      .map((r) => ({
        campaign_id: String(r.campaign?.id ?? ""),
        campaign_name: String(r.campaign?.name ?? ""),
        keyword_text: String(
          (r.campaign_criterion?.keyword as Record<string, unknown>)?.text ?? ""
        ),
        match_type: matchType(
          (r.campaign_criterion?.keyword as Record<string, unknown>)
            ?.match_type
        ),
        source: "campaign" as const,
      }))
      .filter((n) => n.keyword_text);

    // 2. Shared negative keyword lists — metadata
    const sharedListRows = (await customer.query(`
      SELECT
        shared_set.id,
        shared_set.name,
        shared_set.type,
        shared_set.status
      FROM shared_set
      WHERE shared_set.type = 'NEGATIVE_KEYWORDS'
        AND shared_set.status = 'ENABLED'
    `)) as unknown as Array<{ shared_set?: { id?: string; name?: string } }>;

    // 3. Hvilke kampanjer hver shared list er applied på
    const campaignSharedRows = (await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign_shared_set.shared_set,
        campaign_shared_set.status
      FROM campaign_shared_set
      WHERE campaign_shared_set.status = 'ENABLED'
    `)) as unknown as Array<{
      campaign?: { id?: string; name?: string };
      campaign_shared_set?: { shared_set?: string };
    }>;

    // 4. Innhold i shared lists
    const sharedKeywordRows = (await customer.query(`
      SELECT
        shared_set.id,
        shared_criterion.keyword.text,
        shared_criterion.keyword.match_type
      FROM shared_criterion
      WHERE shared_criterion.type = 'KEYWORD'
    `)) as unknown as Array<{
      shared_set?: { id?: string };
      shared_criterion?: { keyword?: { text?: string; match_type?: unknown } };
    }>;

    const sharedLists: SharedList[] = sharedListRows.map((r) => {
      const listId = String(r.shared_set?.id ?? "");
      const resourceName = `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/sharedSets/${listId}`;
      const appliedTo = campaignSharedRows
        .filter((c) => c.campaign_shared_set?.shared_set === resourceName)
        .map((c) => String(c.campaign?.name ?? ""));
      const keywords = sharedKeywordRows
        .filter((k) => String(k.shared_set?.id ?? "") === listId)
        .map((k) => ({
          text: String(k.shared_criterion?.keyword?.text ?? ""),
          match_type: matchType(k.shared_criterion?.keyword?.match_type),
        }))
        .filter((k) => k.text);
      return {
        list_id: listId,
        list_name: String(r.shared_set?.name ?? ""),
        applied_to_campaigns: appliedTo,
        keywords,
      };
    });

    return NextResponse.json({
      campaign_negatives: campaignNegatives,
      shared_lists: sharedLists,
      summary: {
        total_campaign_negatives: campaignNegatives.length,
        total_shared_lists: sharedLists.length,
        total_shared_keywords: sharedLists.reduce(
          (s, l) => s + l.keywords.length,
          0
        ),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
