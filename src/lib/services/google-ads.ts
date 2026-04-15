import { GoogleAdsApi, type Customer } from "google-ads-api";

/**
 * Service-wrapper for Google Ads API. Bruker google-ads-api-pakken
 * (https://opteo.com/dev/google-ads-api).
 *
 * Krever env-variabler:
 *  - GOOGLE_ADS_DEVELOPER_TOKEN
 *  - GOOGLE_ADS_CLIENT_ID
 *  - GOOGLE_ADS_CLIENT_SECRET
 *  - GOOGLE_ADS_REFRESH_TOKEN
 *  - GOOGLE_ADS_CUSTOMER_ID (10 sifre uten bindestrek)
 *  - GOOGLE_ADS_LOGIN_CUSTOMER_ID (valgfritt — for MCC)
 *
 * Se docs/google-ads-setup.md for instruksjoner.
 */

export interface GoogleAdsCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  channel_type: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  cost_nok: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  average_cpc_nok: number;
}

export interface GoogleAdsKeyword {
  campaign_id: string;
  ad_group_id: string;
  ad_group_name: string;
  keyword_text: string;
  match_type: string;
  status: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  cost_nok: number;
  conversions: number;
  ctr: number;
  average_cpc_nok: number;
  quality_score: number | null;
}

export interface GoogleAdsSearchTerm {
  source: "search_term" | "pmax_insight";
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  search_term: string;
  status: string | null;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  cost_nok: number;
  conversions: number;
}

export class GoogleAdsService {
  private customer: Customer;

  constructor() {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
      throw new Error(
        "Google Ads credentials missing. Se docs/google-ads-setup.md"
      );
    }

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken,
    });

    this.customer = client.Customer({
      customer_id: customerId.replace(/-/g, ""),
      refresh_token: refreshToken,
      ...(loginCustomerId
        ? { login_customer_id: loginCustomerId.replace(/-/g, "") }
        : {}),
    });
  }

  /**
   * Kjapp sanity-sjekk — returnerer metadata om kontoen.
   */
  async health() {
    const rows = (await this.customer.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `)) as unknown as Array<{
      customer?: {
        id?: string;
        descriptive_name?: string;
        currency_code?: string;
        time_zone?: string;
      };
    }>;
    const row = rows[0];
    return {
      customer_id: row?.customer?.id,
      account_name: row?.customer?.descriptive_name,
      currency: row?.customer?.currency_code,
      timezone: row?.customer?.time_zone,
    };
  }

  /**
   * Henter daglig kampanje-metrics for gitt periode.
   */
  async fetchCampaignMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<GoogleAdsCampaign[]> {
    const from = startDate.toISOString().split("T")[0];
    const to = endDate.toISOString().split("T")[0];

    const rows = (await this.customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const campaign = (row.campaign ?? {}) as Record<string, unknown>;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const segments = (row.segments ?? {}) as Record<string, unknown>;
      const costMicros = Number(metrics.cost_micros ?? 0);
      return {
        campaign_id: String(campaign.id ?? ""),
        campaign_name: String(campaign.name ?? ""),
        status: String(campaign.status ?? ""),
        channel_type: String(campaign.advertising_channel_type ?? ""),
        metric_date: String(segments.date ?? ""),
        impressions: Number(metrics.impressions ?? 0),
        clicks: Number(metrics.clicks ?? 0),
        cost_micros: costMicros,
        cost_nok: costMicros / 1_000_000,
        conversions: Number(metrics.conversions ?? 0),
        conversion_value: Number(metrics.conversions_value ?? 0),
        ctr: Number(metrics.ctr ?? 0),
        average_cpc_nok: Number(metrics.average_cpc ?? 0) / 1_000_000,
      };
    });
  }

  /**
   * Henter søkeord-nivå data med kostnader og kvalitetsscore.
   */
  async fetchKeywordMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<GoogleAdsKeyword[]> {
    const from = startDate.toISOString().split("T")[0];
    const to = endDate.toISOString().split("T")[0];

    const rows = (await this.customer.query(`
      SELECT
        campaign.id,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM keyword_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const campaign = (row.campaign ?? {}) as Record<string, unknown>;
      const adGroup = (row.ad_group ?? {}) as Record<string, unknown>;
      const criterion = (row.ad_group_criterion ?? {}) as Record<string, unknown>;
      const keyword = (criterion.keyword ?? {}) as Record<string, unknown>;
      const qualityInfo = (criterion.quality_info ?? {}) as Record<string, unknown>;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const segments = (row.segments ?? {}) as Record<string, unknown>;
      const costMicros = Number(metrics.cost_micros ?? 0);

      return {
        campaign_id: String(campaign.id ?? ""),
        ad_group_id: String(adGroup.id ?? ""),
        ad_group_name: String(adGroup.name ?? ""),
        keyword_text: String(keyword.text ?? ""),
        match_type: String(keyword.match_type ?? ""),
        status: String(criterion.status ?? ""),
        metric_date: String(segments.date ?? ""),
        impressions: Number(metrics.impressions ?? 0),
        clicks: Number(metrics.clicks ?? 0),
        cost_micros: costMicros,
        cost_nok: costMicros / 1_000_000,
        conversions: Number(metrics.conversions ?? 0),
        ctr: Number(metrics.ctr ?? 0),
        average_cpc_nok: Number(metrics.average_cpc ?? 0) / 1_000_000,
        quality_score: qualityInfo.quality_score != null
          ? Number(qualityInfo.quality_score)
          : null,
      };
    });
  }

  /**
   * Henter faktiske søketermer (search_term_view) for Search-kampanjer.
   * Dette er det brukerne faktisk har skrevet i Google for å trigge annonsene.
   */
  async fetchSearchTerms(
    startDate: Date,
    endDate: Date
  ): Promise<GoogleAdsSearchTerm[]> {
    const from = startDate.toISOString().split("T")[0];
    const to = endDate.toISOString().split("T")[0];

    const rows = (await this.customer.query(`
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const campaign = (row.campaign ?? {}) as Record<string, unknown>;
      const adGroup = (row.ad_group ?? {}) as Record<string, unknown>;
      const stv = (row.search_term_view ?? {}) as Record<string, unknown>;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const segments = (row.segments ?? {}) as Record<string, unknown>;
      const costMicros = Number(metrics.cost_micros ?? 0);
      return {
        source: "search_term" as const,
        campaign_id: String(campaign.id ?? ""),
        campaign_name: String(campaign.name ?? ""),
        ad_group_id: String(adGroup.id ?? ""),
        ad_group_name: String(adGroup.name ?? ""),
        search_term: String(stv.search_term ?? ""),
        status: stv.status != null ? String(stv.status) : null,
        metric_date: String(segments.date ?? ""),
        impressions: Number(metrics.impressions ?? 0),
        clicks: Number(metrics.clicks ?? 0),
        cost_micros: costMicros,
        cost_nok: costMicros / 1_000_000,
        conversions: Number(metrics.conversions ?? 0),
      };
    });
  }

  /**
   * Henter Performance Max søketerm-kategorier for gitte Pmax-kampanjer.
   * Pmax eksponerer ikke individuelle søkeord, men Google grupperer søk i
   * kategorier (f.eks. "fosen tools", "snap on norge"). Returnerer clicks +
   * impressions men IKKE cost (Google holder cost tilbake for disse).
   *
   * Google returnerer ALLE rader som aggregert sum over den filtrerte perioden
   * (ikke daglig). Vi stamper derfor hver rad med endDate som metric_date så
   * opsert blir idempotent per sync-dag.
   */
  async fetchPmaxSearchTerms(
    pmaxCampaignIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<GoogleAdsSearchTerm[]> {
    if (pmaxCampaignIds.length === 0) return [];

    // Pmax støtter bare et begrenset sett DURING-literaler. LAST_90_DAYS
    // finnes ikke — maksimum er LAST_30_DAYS. Vi bruker eksplisitt BETWEEN
    // med dato-literaler i stedet. segments.date må IKKE være i SELECT.
    const from = startDate.toISOString().split("T")[0];
    const to = endDate.toISOString().split("T")[0];
    const snapshotDate = to;
    const results: GoogleAdsSearchTerm[] = [];

    for (const campaignId of pmaxCampaignIds) {
      try {
        const rows = (await this.customer.query(`
          SELECT
            campaign.id,
            campaign.name,
            campaign_search_term_insight.category_label,
            campaign_search_term_insight.id,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions
          FROM campaign_search_term_insight
          WHERE campaign_search_term_insight.campaign_id = "${campaignId}"
            AND segments.date BETWEEN '${from}' AND '${to}'
        `)) as unknown as Array<Record<string, unknown>>;

        for (const row of rows) {
          const campaign = (row.campaign ?? {}) as Record<string, unknown>;
          const insight = (row.campaign_search_term_insight ?? {}) as Record<
            string,
            unknown
          >;
          const metrics = (row.metrics ?? {}) as Record<string, unknown>;
          const label = String(insight.category_label ?? "");
          results.push({
            source: "pmax_insight",
            campaign_id: campaignId,
            campaign_name: String(campaign.name ?? ""),
            ad_group_id: "",
            ad_group_name: "",
            // Tom label = "Other" bucket som Google grupperer små volum i
            search_term: label || "(other)",
            status: null,
            metric_date: snapshotDate,
            impressions: Number(metrics.impressions ?? 0),
            clicks: Number(metrics.clicks ?? 0),
            cost_micros: 0, // Ikke eksponert av Google for Pmax
            cost_nok: 0,
            conversions: Number(metrics.conversions ?? 0),
          });
        }
      } catch (err) {
        console.error(
          `Pmax search term insight failed for campaign ${campaignId}:`,
          err
        );
      }
    }

    return results;
  }

  /**
   * Finner ID-ene til alle Performance Max-kampanjer (for bruk med
   * fetchPmaxSearchTerms). Google avviser integer enum-verdier i WHERE,
   * så vi henter alle kampanjer og filtrerer klient-side. channel_type=10
   * er PERFORMANCE_MAX i API-responsen.
   */
  async fetchPmaxCampaignIds(): Promise<string[]> {
    const rows = (await this.customer.query(`
      SELECT campaign.id, campaign.advertising_channel_type
      FROM campaign
    `)) as unknown as Array<Record<string, unknown>>;

    return rows
      .filter((row) => {
        const campaign = (row.campaign ?? {}) as Record<string, unknown>;
        return Number(campaign.advertising_channel_type) === 10;
      })
      .map((row) => {
        const campaign = (row.campaign ?? {}) as Record<string, unknown>;
        return campaign.id != null ? String(campaign.id) : "";
      })
      .filter((id) => id.length > 0);
  }
}
