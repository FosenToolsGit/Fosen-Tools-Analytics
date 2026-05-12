-- Prisplakat-spillelister: del lesetilgang innenfor teamet.
--
-- Tidligere: RLS var owner-only — Erik kunne ikke åpne en delelink fra Adrian
-- fordi `.single()` på en annens playlist returnerte 0 rader (PGRST116:
-- "Cannot coerce the result to a single JSON object").
--
-- Nå: alle innloggede brukere kan lese alle playlists (samme team-bruks-mønster
-- som Slack-kanaler og delte Google Sheets). Insert/update/delete forblir
-- owner-only — du kan ikke endre eller slette andres playlister.

drop policy if exists "pricetag_playlists_select_own" on public.pricetag_playlists;

-- Ny select-policy: alle authenticated kan lese.
drop policy if exists "pricetag_playlists_select_authenticated" on public.pricetag_playlists;
create policy "pricetag_playlists_select_authenticated"
  on public.pricetag_playlists for select to authenticated
  using (true);

-- Insert/update/delete er allerede owner-only (fra 012-migrasjonen) — ikke rør.
