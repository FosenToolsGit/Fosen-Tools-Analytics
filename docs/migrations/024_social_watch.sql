-- 024_social_watch.sql
-- Overvåking av eksterne sosiale kontoer (IG Business Discovery). Cronen
-- lagrer «sist sette innlegg» per konto her, og pusher varsel (ntfy) ved nytt.

create table if not exists public.social_watch (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null default 'instagram',
  username        text not null,
  label           text,                 -- visningsnavn i varsel (f.eks. "Wera Norway")
  last_post_id    text,                 -- IG media-id sist sett
  last_timestamp  timestamptz,          -- tidspunkt for sist sette innlegg
  last_checked_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (platform, username)
);

-- RLS på: uten policies har kun service-role (cronen) tilgang. Ingen anon/authenticated.
alter table public.social_watch enable row level security;

-- Auto-oppdater updated_at
create or replace function public.social_watch_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_social_watch_touch on public.social_watch;
create trigger trg_social_watch_touch
  before update on public.social_watch
  for each row execute function public.social_watch_touch_updated_at();

-- Seed: Wera Tool Rebels Norway (IG). Legg til flere kontoer ved behov.
insert into public.social_watch (platform, username, label)
values ('instagram', 'weratoolrebelsnorway', 'Wera Norway')
on conflict (platform, username) do nothing;
