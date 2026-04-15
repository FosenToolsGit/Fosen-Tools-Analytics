import { format } from "date-fns";
import type { PlatformService, DailyMetric, PlatformPost } from "./types";

const MC_API_VERSION = "3.0";

interface MCCampaign {
  id: string;
  send_time: string;
  settings: {
    subject_line: string;
    title: string;
    preview_text: string;
  };
  emails_sent: number;
  report_summary?: {
    opens: number;
    unique_opens: number;
    clicks: number;
    subscriber_clicks: number;
    open_rate: number;
    click_rate: number;
  };
}

interface MCReport {
  id: string;
  campaign_title: string;
  subject_line: string;
  emails_sent: number;
  opens: { opens_total: number; unique_opens: number; open_rate: number };
  clicks: {
    clicks_total: number;
    unique_clicks: number;
    click_rate: number;
  };
  bounces: { hard_bounces: number; soft_bounces: number };
  unsubscribed: number;
  send_time: string;
}

export class MailchimpService implements PlatformService {
  private apiKey: string;
  private serverPrefix: string;
  private listId: string;

  constructor() {
    this.apiKey = process.env.MAILCHIMP_API_KEY!;
    this.serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX!;
    this.listId = process.env.MAILCHIMP_LIST_ID!;
  }

  private get baseUrl() {
    return `https://${this.serverPrefix}.api.mailchimp.com/${MC_API_VERSION}`;
  }

  private async mcGet(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mailchimp API error: ${res.status} ${err}`);
    }
    return res.json();
  }

  async fetchDailyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetric[]> {
    // Get subscriber count
    let subscribers = 0;
    try {
      const listInfo = await this.mcGet(`/lists/${this.listId}`);
      subscribers = listInfo.stats?.member_count || 0;
    } catch {
      // List may not be accessible
    }

    // Get campaigns in date range
    const sinceDate = startDate.toISOString();
    const campaigns: MCCampaign[] = [];

    const campaignResponse = await this.mcGet("/campaigns", {
      since_send_time: sinceDate,
      status: "sent",
      count: "100",
      sort_field: "send_time",
      sort_dir: "DESC",
    });

    campaigns.push(...(campaignResponse.campaigns || []));

    // Get detailed reports for each campaign
    const dateMap = new Map<string, DailyMetric>();

    for (const campaign of campaigns) {
      if (!campaign.send_time) continue;

      const sendDate = new Date(campaign.send_time);
      if (sendDate > endDate) continue;

      const date = format(sendDate, "yyyy-MM-dd");

      let report: MCReport | null = null;
      try {
        report = await this.mcGet(`/reports/${campaign.id}`);
      } catch {
        continue;
      }

      const existing = dateMap.get(date) || this.emptyMetric(date, subscribers);

      if (report) {
        existing.impressions += report.opens.opens_total;
        existing.reach += report.emails_sent;
        existing.engagement +=
          report.opens.unique_opens + report.clicks.unique_clicks;
        existing.clicks += report.clicks.clicks_total;
        const totalBounces =
          report.bounces.hard_bounces + report.bounces.soft_bounces;
        if (report.emails_sent > 0) {
          existing.bounce_rate = (totalBounces / report.emails_sent) * 100;
        }
      }

      existing.followers = subscribers;
      dateMap.set(date, existing);
    }

    return Array.from(dateMap.values());
  }

  async fetchTopPosts(limit: number): Promise<PlatformPost[]> {
    // Get recent sent campaigns
    const campaignResponse = await this.mcGet("/campaigns", {
      status: "sent",
      count: limit.toString(),
      sort_field: "send_time",
      sort_dir: "DESC",
    });

    const campaigns: MCCampaign[] = campaignResponse.campaigns || [];
    const posts: PlatformPost[] = [];

    for (const campaign of campaigns) {
      let report: MCReport | null = null;
      try {
        report = await this.mcGet(`/reports/${campaign.id}`);
      } catch {
        // Skip campaigns without reports
        continue;
      }

      const opens = report?.opens.opens_total || 0;
      const uniqueOpens = report?.opens.unique_opens || 0;
      const clicks = report?.clicks.clicks_total || 0;
      const uniqueClicks = report?.clicks.unique_clicks || 0;
      const sent = report?.emails_sent || campaign.emails_sent || 0;
      const unsubscribed = report?.unsubscribed || 0;

      posts.push({
        platform: "mailchimp",
        platform_post_id: campaign.id,
        published_at: campaign.send_time,
        title: campaign.settings.title || campaign.settings.subject_line,
        content_snippet: (
          campaign.settings.subject_line || ""
        ).slice(0, 200),
        post_url: `https://${this.serverPrefix}.admin.mailchimp.com/reports/summary?id=${campaign.id}`,
        thumbnail_url: null,
        post_type: "email",
        impressions: opens,
        reach: sent,
        likes: uniqueOpens, // use as "opens"
        comments: unsubscribed, // track unsubscribes
        shares: 0,
        clicks,
        video_views: 0,
      });
    }

    return posts;
  }

  /**
   * Henter per-lenke klikk for en kampanje (hvilke URL-er klikkes mest).
   * Bruker /reports/{id}/click-details.
   */
  async fetchCampaignClickDetails(campaignId: string): Promise<
    Array<{
      url: string;
      total_clicks: number;
      unique_clicks: number;
      click_percentage: number;
      last_click: string | null;
    }>
  > {
    try {
      const res = await this.mcGet(`/reports/${campaignId}/click-details`, {
        count: "1000",
      });
      const urls = (res.urls_clicked || []) as Array<{
        url: string;
        total_clicks: number;
        unique_clicks: number;
        click_percentage: number;
        last_click?: string;
      }>;
      return urls.map((u) => ({
        url: u.url,
        total_clicks: u.total_clicks || 0,
        unique_clicks: u.unique_clicks || 0,
        click_percentage: u.click_percentage || 0,
        last_click: u.last_click || null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Henter geografisk fordeling av åpninger for en kampanje.
   */
  async fetchCampaignLocations(campaignId: string): Promise<
    Array<{ country_code: string; region: string; opens: number }>
  > {
    try {
      const res = await this.mcGet(`/reports/${campaignId}/locations`, {
        count: "200",
      });
      const locs = (res.locations || []) as Array<{
        country_code?: string;
        region?: string;
        opens?: number;
      }>;
      return locs
        .filter((l) => l.country_code)
        .map((l) => ({
          country_code: l.country_code!,
          region: l.region || "",
          opens: l.opens || 0,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Henter abonnent-veksthistorikk for listen (per måned).
   */
  async fetchListGrowth(): Promise<
    Array<{
      metric_date: string;
      existing: number;
      imports: number;
      optins: number;
      unsubs: number;
      cleaned: number;
    }>
  > {
    try {
      const res = await this.mcGet(
        `/lists/${this.listId}/growth-history`,
        { count: "60" }
      );
      const history = (res.history || []) as Array<{
        month?: string;
        existing?: number;
        imports?: number;
        optins?: number;
        unsubscribes?: number;
        cleaned?: number;
      }>;
      return history
        .filter((h) => h.month)
        .map((h) => ({
          metric_date: `${h.month}-01`, // Mailchimp returnerer YYYY-MM
          existing: h.existing ?? 0,
          imports: h.imports ?? 0,
          optins: h.optins ?? 0,
          unsubs: h.unsubscribes ?? 0,
          cleaned: h.cleaned ?? 0,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Henter daglig liste-aktivitet (sent, opens, clicks, unsubs per dag).
   */
  async fetchListActivity(): Promise<
    Array<{
      metric_date: string;
      emails_sent: number;
      unique_opens: number;
      recipient_clicks: number;
      hard_bounce: number;
      soft_bounce: number;
      unsubs: number;
      other_adds: number;
      other_removes: number;
      subs: number;
    }>
  > {
    try {
      const res = await this.mcGet(
        `/lists/${this.listId}/activity`,
        { count: "180" }
      );
      const activity = (res.activity || []) as Array<{
        day?: string;
        emails_sent?: number;
        unique_opens?: number;
        recipient_clicks?: number;
        hard_bounce?: number;
        soft_bounce?: number;
        unsubs?: number;
        other_adds?: number;
        other_removes?: number;
        subs?: number;
      }>;
      return activity
        .filter((a) => a.day)
        .map((a) => ({
          metric_date: a.day!,
          emails_sent: a.emails_sent ?? 0,
          unique_opens: a.unique_opens ?? 0,
          recipient_clicks: a.recipient_clicks ?? 0,
          hard_bounce: a.hard_bounce ?? 0,
          soft_bounce: a.soft_bounce ?? 0,
          unsubs: a.unsubs ?? 0,
          other_adds: a.other_adds ?? 0,
          other_removes: a.other_removes ?? 0,
          subs: a.subs ?? 0,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Henter ID-ene til siste N kampanjer (for batch-click-details-henting).
   */
  async fetchRecentCampaignIds(sinceDate: Date): Promise<string[]> {
    try {
      const res = await this.mcGet("/campaigns", {
        since_send_time: sinceDate.toISOString(),
        status: "sent",
        count: "100",
        sort_field: "send_time",
        sort_dir: "DESC",
      });
      return (res.campaigns || []).map((c: { id: string }) => c.id);
    } catch {
      return [];
    }
  }

  get effectiveListId(): string {
    return this.listId;
  }

  private emptyMetric(date: string, subscribers: number = 0): DailyMetric {
    return {
      platform: "mailchimp",
      metric_date: date,
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      followers: subscribers,
      sessions: 0,
      pageviews: 0,
      users_total: 0,
      bounce_rate: 0,
    };
  }
}
