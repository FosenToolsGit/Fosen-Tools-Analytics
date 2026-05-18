-- Public share-token for prisplakat-spillelister
--
-- Bakgrunn: Digitale skjermavspillere (f.eks. UniFi US Cast Pro) trenger
-- direkte URL uten innloggings-skjerm. Vi legger til en uforutsigbar
-- share_token som lar `/prisplakat/share/<token>/play` rendre slideshowet
-- offentlig — uten å eksponere alle spillelister.
--
-- Tokenet er uuid (122-bit entropy) → praktisk uangripbart. Bruker kan
-- regenerere tokenet hvis det lekkes.
--
-- En egen RLS-policy gir anon-rolle SELECT på rader hvor share_token
-- matches via API-laget. Vi unngår en bred anon-policy ved å la API-en
-- bruke service-role for nettopp share-lookup.

alter table public.pricetag_playlists
  add column if not exists share_token uuid default gen_random_uuid();

-- Backfill eksisterende rader (de som var opprettet før denne migrasjonen)
update public.pricetag_playlists
  set share_token = gen_random_uuid()
  where share_token is null;

-- Krev unik token og at den alltid finnes
alter table public.pricetag_playlists
  alter column share_token set not null;

create unique index if not exists pricetag_playlists_share_token_idx
  on public.pricetag_playlists(share_token);

-- Vi setter IKKE en public/anon RLS-policy her — share-API-en bruker
-- service-role-nøkkelen internt og validerer mot share_token. Det gir
-- token-basert tilgang uten å åpne hele tabellen for anon-lesning.
