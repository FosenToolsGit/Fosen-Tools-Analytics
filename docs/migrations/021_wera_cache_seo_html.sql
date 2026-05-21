-- Utvid wera_product_cache med kolonner for SEO-HTML og feature-bullets/sections
-- så vi slipper å generere HTML på nytt hver gang.

alter table public.wera_product_cache
  add column if not exists produktinformasjon_html text,
  add column if not exists feature_bullets jsonb,
  add column if not exists description_sections jsonb;
