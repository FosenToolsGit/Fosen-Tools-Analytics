-- Optional seed: pre-fyller utm_links med de 7 linkene generert i dagens
-- samtale (3. mai 2026). Kjør ETTER 011_utm_links.sql.
-- user_id = NULL betyr "system-seedet" (ingen eier kan slette).

INSERT INTO public.utm_links (label, base_url, utm_source, utm_medium, utm_campaign, full_url, notes)
VALUES
  (
    'HDFI vs generisk – Facebook',
    'https://fosen-tools.no/kundesenter/kontakt-oss',
    'facebook', 'organic', 'hdfi-vs-generisk',
    'https://fosen-tools.no/kundesenter/kontakt-oss?utm_source=facebook&utm_medium=organic&utm_campaign=hdfi-vs-generisk',
    'Publisert 3. mai – tematisk innlegg om null-absorberende skum'
  ),
  (
    'HDFI vs generisk – Instagram-post',
    'https://fosen-tools.no/kundesenter/kontakt-oss',
    'instagram', 'organic', 'hdfi-vs-generisk',
    'https://fosen-tools.no/kundesenter/kontakt-oss?utm_source=instagram&utm_medium=organic&utm_campaign=hdfi-vs-generisk',
    'Foreløpig ikke publisert (IG har ikke klikkbar lenke i feed)'
  ),
  (
    'HDFI vs generisk – LinkedIn',
    'https://fosen-tools.no/kundesenter/kontakt-oss',
    'linkedin', 'organic', 'hdfi-vs-generisk',
    'https://fosen-tools.no/kundesenter/kontakt-oss?utm_source=linkedin&utm_medium=organic&utm_campaign=hdfi-vs-generisk',
    'Klar for deling'
  ),
  (
    'Instagram bio – kontakt oss',
    'https://fosen-tools.no/kundesenter/kontakt-oss',
    'instagram', 'bio', 'ig-bio',
    'https://fosen-tools.no/kundesenter/kontakt-oss?utm_source=instagram&utm_medium=bio&utm_campaign=ig-bio',
    'Always-on bio-link'
  ),
  (
    'Mailchimp 6. mai – HDFI midtseksjon',
    'https://fosen-tools.no/hdfi',
    'FTNett', 'email', 'glemte-klassikere-mai',
    'https://fosen-tools.no/hdfi?utm_source=FTNett&utm_medium=email&utm_campaign=glemte-klassikere-mai',
    'Midtseksjon i nyhetsbrev som sendes 6. mai kl 11'
  ),
  (
    'Mailchimp 6. mai – FTINDU2',
    'https://fosen-tools.no/fosen-tools-custom/124612',
    'FTNett', 'email', 'glemte-klassikere-mai',
    'https://fosen-tools.no/fosen-tools-custom/124612?utm_source=FTNett&utm_medium=email&utm_campaign=glemte-klassikere-mai',
    'Produkt 1 av 3 i nyhetsbrev'
  ),
  (
    'Mailchimp 6. mai – Milwaukee 120645',
    'https://fosen-tools.no/milwaukee/120645',
    'FTNett', 'email', 'glemte-klassikere-mai',
    'https://fosen-tools.no/milwaukee/120645?utm_source=FTNett&utm_medium=email&utm_campaign=glemte-klassikere-mai',
    'Produkt 2 av 3 i nyhetsbrev'
  ),
  (
    'Mailchimp 6. mai – Rennsteig krympetang',
    'https://fosen-tools.no/rennsteig/123244',
    'FTNett', 'email', 'glemte-klassikere-mai',
    'https://fosen-tools.no/rennsteig/123244?utm_source=FTNett&utm_medium=email&utm_campaign=glemte-klassikere-mai',
    'Produkt 3 av 3 i nyhetsbrev'
  );
