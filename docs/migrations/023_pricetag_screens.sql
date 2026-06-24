-- Skjermer: kobler en fysisk butikk-skjerm (fast kiosk-URL) til en spilleliste.
-- Enheten får ÉN permanent URL (/skjerm/{screen_token}). Hvilken spilleliste
-- som vises styres fra dashbordet (playlist_id) UTEN å røre enheten.
-- Eksempel: «Wera-veggen», «Milwaukee-rommet», «HDFI», «Factory Store-inngang».

create table if not exists public.pricetag_screens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Fast token i kiosk-URL — endres aldri når man bytter spilleliste
  screen_token uuid not null default gen_random_uuid() unique,
  -- Hvilken spilleliste skjermen viser akkurat nå (kan byttes fritt)
  playlist_id uuid references public.pricetag_playlists(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricetag_screens_token_idx on public.pricetag_screens(screen_token);
create index if not exists pricetag_screens_updated_idx on public.pricetag_screens(updated_at desc);

alter table public.pricetag_screens enable row level security;

-- Team-wide tilgang (alle innloggede), samme som playlists (migrasjon 019)
drop policy if exists "pricetag_screens_select" on public.pricetag_screens;
create policy "pricetag_screens_select" on public.pricetag_screens
  for select to authenticated using (true);

drop policy if exists "pricetag_screens_insert" on public.pricetag_screens;
create policy "pricetag_screens_insert" on public.pricetag_screens
  for insert to authenticated with check (true);

drop policy if exists "pricetag_screens_update" on public.pricetag_screens;
create policy "pricetag_screens_update" on public.pricetag_screens
  for update to authenticated using (true) with check (true);

drop policy if exists "pricetag_screens_delete" on public.pricetag_screens;
create policy "pricetag_screens_delete" on public.pricetag_screens
  for delete to authenticated using (true);

-- updated_at-trigger
create or replace function public.tg_pricetag_screens_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists pricetag_screens_touch on public.pricetag_screens;
create trigger pricetag_screens_touch
  before update on public.pricetag_screens
  for each row execute function public.tg_pricetag_screens_touch();
