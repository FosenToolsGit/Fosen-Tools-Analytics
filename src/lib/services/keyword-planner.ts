/**
 * Google Ads Keyword Planner wrapper med graceful degradation.
 *
 * KeywordPlanIdeaService krever Basic Access på developer token, som
 * typisk godkjennes av Google 1-2 virkedager etter søknad. Under tiden
 * er tokenet på "Explorer"-nivå og KP-kall gir DEVELOPER_TOKEN_NOT_APPROVED.
 *
 * Denne wrappen:
 * - Cacher access-status i 1 time slik at vi ikke spammer feilende kall
 * - Returnerer tom liste i stedet for å kaste ved ikke-godkjent token
 * - Lar resten av systemet fungere uavhengig av om KP er tilgjengelig
 */
import { GoogleAdsApi, type Customer } from "google-ads-api";

export interface KeywordPlannerResult {
  text: string;
  avg_monthly_searches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  low_top_bid_nok: number;
  high_top_bid_nok: number;
}

export interface KeywordPlannerStatus {
  available: boolean;
  reason?:
    | "developer_token_not_approved"
    | "no_credentials"
    | "error"
    | "ok";
  message?: string;
}

interface CachedStatus {
  status: KeywordPlannerStatus;
  expires_at: number;
}

let statusCache: CachedStatus | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 time

function credentialsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );
}

export class KeywordPlannerService {
  private customer: Customer;
  private customerId: string;

  constructor() {
    if (!credentialsConfigured()) {
      throw new Error("Google Ads credentials missing");
    }
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(
      /-/g,
      ""
    );

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    this.customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}),
    });
    this.customerId = customerId;
  }

  /**
   * Sjekker om Keyword Planner-API er tilgjengelig. Cacher resultatet i 1 time
   * slik at repeterte kall ikke sprenger feilmeldings-kvoten.
   */
  async checkAccess(): Promise<KeywordPlannerStatus> {
    if (statusCache && statusCache.expires_at > Date.now()) {
      return statusCache.status;
    }

    try {
      // Minimalt test-kall med ett seed-ord
      await this.customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: this.customerId,
        language: "languageConstants/10", // Norwegian
        geo_target_constants: ["geoTargetConstants/2578"], // Norway
        keyword_plan_network: 2, // GOOGLE_SEARCH
        keyword_seed: { keywords: ["test"] },
        page_size: 1,
      } as unknown as Parameters<
        typeof this.customer.keywordPlanIdeas.generateKeywordIdeas
      >[0]);
      const status: KeywordPlannerStatus = { available: true, reason: "ok" };
      statusCache = { status, expires_at: Date.now() + CACHE_TTL_MS };
      return status;
    } catch (err: unknown) {
      const errObj = err as { errors?: Array<{ error_code?: Record<string, unknown>; message?: string }> };
      const errors = errObj?.errors ?? [];
      const notApproved = errors.some(
        (e) =>
          e.error_code &&
          (e.error_code as Record<string, unknown>).authorization_error ===
            "DEVELOPER_TOKEN_NOT_APPROVED"
      );
      const status: KeywordPlannerStatus = notApproved
        ? {
            available: false,
            reason: "developer_token_not_approved",
            message:
              "Developer token er på Explorer-nivå. Google må godkjenne Basic Access (1-2 virkedager).",
          }
        : {
            available: false,
            reason: "error",
            message:
              errors[0]?.message ||
              (err instanceof Error ? err.message : "Unknown error"),
          };
      statusCache = { status, expires_at: Date.now() + CACHE_TTL_MS };
      return status;
    }
  }

  /**
   * Henter keyword-ideer fra Google Keyword Planner basert på seed-ord.
   * Returnerer tom liste hvis API ikke er tilgjengelig.
   */
  async getIdeas(
    seedKeywords: string[],
    opts: { pageSize?: number } = {}
  ): Promise<KeywordPlannerResult[]> {
    if (seedKeywords.length === 0) return [];

    const status = await this.checkAccess();
    if (!status.available) return [];

    try {
      const response = (await this.customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: this.customerId,
        language: "languageConstants/10",
        geo_target_constants: ["geoTargetConstants/2578"],
        keyword_plan_network: 2,
        keyword_seed: { keywords: seedKeywords.slice(0, 20) },
        page_size: opts.pageSize ?? 100,
      } as unknown as Parameters<
        typeof this.customer.keywordPlanIdeas.generateKeywordIdeas
      >[0])) as unknown as { results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;

      const results = Array.isArray(response)
        ? response
        : response.results ?? [];

      return results
        .map((row: Record<string, unknown>) => {
          const metrics = (row.keyword_idea_metrics ?? {}) as Record<
            string,
            unknown
          >;
          const competitionValue = metrics.competition;
          let competition: KeywordPlannerResult["competition"] = "UNSPECIFIED";
          if (typeof competitionValue === "string") {
            if (["LOW", "MEDIUM", "HIGH"].includes(competitionValue)) {
              competition = competitionValue as KeywordPlannerResult["competition"];
            }
          } else if (typeof competitionValue === "number") {
            // Enum: 0=UNSPECIFIED, 1=UNKNOWN, 2=LOW, 3=MEDIUM, 4=HIGH
            competition =
              competitionValue === 2
                ? "LOW"
                : competitionValue === 3
                  ? "MEDIUM"
                  : competitionValue === 4
                    ? "HIGH"
                    : "UNSPECIFIED";
          }

          return {
            text: String(row.text ?? ""),
            avg_monthly_searches: Number(metrics.avg_monthly_searches ?? 0),
            competition,
            low_top_bid_nok:
              Number(metrics.low_top_of_page_bid_micros ?? 0) / 1_000_000,
            high_top_bid_nok:
              Number(metrics.high_top_of_page_bid_micros ?? 0) / 1_000_000,
          };
        })
        .filter((r) => r.text.length > 0);
    } catch (err) {
      console.error("KeywordPlanner.getIdeas error:", err);
      return [];
    }
  }
}

/**
 * Sjekker om KP er tilgjengelig uten å kaste feil — for bruk i ruter som
 * ikke skal krasje hvis credentials mangler.
 */
export async function getKeywordPlannerStatus(): Promise<KeywordPlannerStatus> {
  if (!credentialsConfigured()) {
    return {
      available: false,
      reason: "no_credentials",
      message: "Google Ads credentials mangler",
    };
  }
  try {
    const svc = new KeywordPlannerService();
    return await svc.checkAccess();
  } catch (err) {
    return {
      available: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
