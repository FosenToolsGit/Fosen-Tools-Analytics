-- SIKKERHETSFIKS 3. august 2026 — Supabase-varsel «rls_disabled_in_public».
--
-- Funn: tags, tag_rules og tag_assignments manglet Row-Level Security helt.
-- Verifisert med anon-nøkkelen (som ligger offentlig i klientkoden):
--   tags             2 av 2 rader lesbare uten innlogging
--   tag_rules       11 av 11 rader lesbare uten innlogging
--   tag_assignments  1621 av 1621 rader lesbare uten innlogging
--   DELETE ble ikke blokkert av noen policy.
-- Alle øvrige 28 tabeller var korrekt beskyttet.
--
-- Bruksmønster: alle tre leses/skrives KUN server-side, via API-ruter som
-- krever requireAuth() og bruker createAdminClient (service role).
-- Service role bypasser RLS, så appen påvirkes ikke av denne endringen.
--
-- Vi gir innloggede lesetilgang (nyttig hvis noe skal leses klient-side senere),
-- men ingen skrivetilgang — all skriving går gjennom service role.

-- ── tags ─────────────────────────────────────────────────────────────
alter table public.tags enable row level security;

drop policy if exists "tags_select_authenticated" on public.tags;
create policy "tags_select_authenticated"
  on public.tags for select to authenticated
  using (true);

-- ── tag_rules ────────────────────────────────────────────────────────
alter table public.tag_rules enable row level security;

drop policy if exists "tag_rules_select_authenticated" on public.tag_rules;
create policy "tag_rules_select_authenticated"
  on public.tag_rules for select to authenticated
  using (true);

-- ── tag_assignments ──────────────────────────────────────────────────
alter table public.tag_assignments enable row level security;

drop policy if exists "tag_assignments_select_authenticated" on public.tag_assignments;
create policy "tag_assignments_select_authenticated"
  on public.tag_assignments for select to authenticated
  using (true);

-- ── Verifisering ─────────────────────────────────────────────────────
-- Skal returnere rowsecurity = true for alle tre:
--   select relname, relrowsecurity from pg_class
--   where relname in ('tags','tag_rules','tag_assignments');
