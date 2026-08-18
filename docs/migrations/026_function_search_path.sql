-- HERDING 18. august 2026 — Supabase-lint «function_search_path_mutable».
--
-- Alle ti er trivielle updated_at-triggere (NEW.updated_at = now()) uten
-- tabellreferanser, så search_path kan låses helt uten atferdsendring:
-- now() løses via pg_catalog, som alltid søkes implisitt.
--
-- Kjørt via Supabase MCP apply_migration 18. aug 2026 (MCP har skrivetilgang).

alter function public.update_updated_at() set search_path = '';
alter function public.brochures_set_updated_at() set search_path = '';
alter function public.utm_links_set_updated_at() set search_path = '';
alter function public.update_mailchimp_drafts_updated_at() set search_path = '';
alter function public.set_updated_at_pricetag_playlists() set search_path = '';
alter function public.social_corpus_set_updated_at() set search_path = '';
alter function public.social_drafts_set_updated_at() set search_path = '';
alter function public.update_newsletter_wizard_drafts_updated_at() set search_path = '';
alter function public.tg_pricetag_screens_touch() set search_path = '';
alter function public.social_watch_touch_updated_at() set search_path = '';
