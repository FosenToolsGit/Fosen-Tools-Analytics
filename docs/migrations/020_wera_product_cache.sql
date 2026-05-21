-- Wera deep-scrape cache — lagrer scraped data per Wera-produktkode
-- så vi slipper å scrape samme produkt flere ganger ved gjentatte importer.

create table if not exists public.wera_product_cache (
  code              text primary key,                  -- Wera produktkode (11 sifre)
  name              text,                              -- Produktnavn fra wera.de
  drive_type        text,                              -- Detektert drev: «1/4" hex», «4 mm Halfmoon», «3/8" sq», osv.
  profile           text,                              -- Profil: «PH 2», «TX 10», «PZ 1», «SL», osv.
  size_mm           text,                              -- Størrelse fra product page (kan inkl. lengde)
  length_mm         numeric,                           -- Lengde i mm (ekstrahert tall)
  image_url         text,                              -- Direkte URL til hovedbilde fra wera.de
  is_vde            boolean default false,             -- Om produktet er VDE-isolert
  application_notes text,                              -- Bruksområde-info fra siden
  suggested_g1      text,                              -- Forslag til Produktgruppe 1 basert på scraped data
  suggested_g2      text,                              -- Forslag til Produktgruppe 2
  suggested_g3      text,                              -- Forslag til Produktgruppe 3
  raw_data          jsonb,                             -- Hele scraping-resultatet for evt. senere bruk
  scraped_at        timestamptz default now(),
  expires_at        timestamptz default (now() + interval '180 days')
);

create index if not exists wera_product_cache_expires_at_idx
  on public.wera_product_cache (expires_at);

-- RLS: åpent for authenticated users (alle FT-ansatte kan lese/skrive cache)
alter table public.wera_product_cache enable row level security;

drop policy if exists "wera_cache_read" on public.wera_product_cache;
drop policy if exists "wera_cache_write" on public.wera_product_cache;
drop policy if exists "wera_cache_update" on public.wera_product_cache;

create policy "wera_cache_read"
  on public.wera_product_cache
  for select
  to authenticated
  using (true);

create policy "wera_cache_write"
  on public.wera_product_cache
  for insert
  to authenticated
  with check (true);

create policy "wera_cache_update"
  on public.wera_product_cache
  for update
  to authenticated
  using (true)
  with check (true);
