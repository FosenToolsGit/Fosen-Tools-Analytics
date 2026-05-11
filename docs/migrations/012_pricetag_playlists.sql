-- Prisplakat-spillelister: brukes BÅDE for A4-print og butikk-skjerm-slideshow.
-- Hver spilleliste har en liste over produkter (URL + valgfri pris-override)
-- og settings for hvordan de skal vises.

create table if not exists public.pricetag_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  /* Format avgjør hva playlisten brukes til:
     - a4_single  : 1 produkt per A4
     - a4_2up     : 2 produkter per A4
     - a4_4up     : 4 produkter per A4
     - slideshow_landscape : butikk-skjerm 16:9
     - slideshow_portrait  : butikk-skjerm 9:16
   */
  format text not null default 'a4_single',
  /* products = jsonb-array av { source_url, price_override?, label_override? } */
  products jsonb not null default '[]'::jsonb,
  /* settings = { seconds_per_slide?, transition?, show_qr?, show_burst?, accent_color? } */
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricetag_playlists_user_id_idx on public.pricetag_playlists(user_id);
create index if not exists pricetag_playlists_updated_at_idx on public.pricetag_playlists(updated_at desc);

alter table public.pricetag_playlists enable row level security;

-- Eier-policy: brukere ser/styrer bare sine egne playlists
drop policy if exists "pricetag_playlists_select_own" on public.pricetag_playlists;
create policy "pricetag_playlists_select_own"
  on public.pricetag_playlists for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "pricetag_playlists_insert_own" on public.pricetag_playlists;
create policy "pricetag_playlists_insert_own"
  on public.pricetag_playlists for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "pricetag_playlists_update_own" on public.pricetag_playlists;
create policy "pricetag_playlists_update_own"
  on public.pricetag_playlists for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pricetag_playlists_delete_own" on public.pricetag_playlists;
create policy "pricetag_playlists_delete_own"
  on public.pricetag_playlists for delete to authenticated
  using (auth.uid() = user_id);

-- Auto-oppdater updated_at-trigger
create or replace function public.set_updated_at_pricetag_playlists()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pricetag_playlists_updated_at on public.pricetag_playlists;
create trigger trg_pricetag_playlists_updated_at
  before update on public.pricetag_playlists
  for each row execute function public.set_updated_at_pricetag_playlists();
