-- 026: Sesjoner per UTM-kampanje per dag, fra GA4 sessionCampaignName.
-- traffic_sources mangler kampanjedimensjonen, så innholdsserier
-- (mandag-*, torsdag-*, nyhetsbrev-utsendelser) kunne ikke skilles fra
-- hverandre uten manuelle GA4-oppslag. Bygget 11. sept 2026.
create table if not exists campaign_traffic (
  id uuid primary key default gen_random_uuid(),
  campaign text not null,
  source text not null default '',
  medium text not null default '',
  sessions integer not null default 0,
  total_users integer not null default 0,
  conversions integer not null default 0,
  metric_date date not null,
  created_at timestamptz not null default now(),
  unique (campaign, source, medium, metric_date)
);
create index if not exists campaign_traffic_campaign_idx on campaign_traffic (campaign);
create index if not exists campaign_traffic_date_idx on campaign_traffic (metric_date);
alter table campaign_traffic enable row level security;
create policy "campaign_traffic_read" on campaign_traffic
  for select to authenticated using (true);
