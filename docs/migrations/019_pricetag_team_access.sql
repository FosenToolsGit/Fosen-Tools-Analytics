-- Prisplakat: åpne opp fra owner-only til team-wide tilgang.
-- Alle innloggede team-medlemmer kan se og redigere alle playlists.
-- Kun eier kan slette. Insert krever at user_id = auth.uid().

-- SELECT: alle innloggede kan lese alle playlists
drop policy if exists "pricetag_playlists_select_own" on public.pricetag_playlists;
create policy "pricetag_playlists_select_authenticated"
  on public.pricetag_playlists for select to authenticated
  using (true);

-- UPDATE: alle innloggede kan oppdatere alle playlists
drop policy if exists "pricetag_playlists_update_own" on public.pricetag_playlists;
create policy "pricetag_playlists_update_authenticated"
  on public.pricetag_playlists for update to authenticated
  using (true) with check (true);

-- INSERT: beholder owner-krav (ny playlist settes til din user_id)
-- (policy "pricetag_playlists_insert_own" forblir uendret)

-- DELETE: beholder owner-krav (kun du kan slette dine egne)
-- (policy "pricetag_playlists_delete_own" forblir uendret)
