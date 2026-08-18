-- 027: AI-synlighetssporing (18. aug 2026)
-- Logger månedlige kjøringer av AI-discoverability-promptene mot Gemini
-- (med søke-grounding). Skrives KUN via service role (scripts/ai-synlighet.mjs);
-- innloggede brukere kan lese.
--
-- Kjørt via Supabase MCP apply_migration 18. aug 2026.

create table if not exists public.ai_visibility_checks (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  prompt text not null,
  model text not null,
  grounded boolean not null default true,
  ft_mentioned boolean not null default false,
  ft_rank int,
  brands_mentioned jsonb not null default '[]'::jsonb,
  answer text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_visibility_checks_run_date_idx
  on public.ai_visibility_checks (run_date desc);

alter table public.ai_visibility_checks enable row level security;

create policy "authenticated can read ai_visibility_checks"
  on public.ai_visibility_checks for select
  to authenticated
  using (true);
-- Ingen insert/update/delete-policyer: kun service role (bypasser RLS) skriver.
