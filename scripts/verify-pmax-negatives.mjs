#!/usr/bin/env node
import { GoogleAdsApi } from "google-ads-api";

const PMAX_ID = "23086139934";

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

const MATCH = { 2: "EXACT", 3: "PHRASE", 4: "BROAD" };

async function main() {
  // 1. Kampanje-nivå negatives på Pmax
  const camp = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign_criterion.keyword.text,
      campaign_criterion.keyword.match_type,
      campaign_criterion.negative,
      campaign_criterion.status
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = TRUE
      AND campaign.id = ${PMAX_ID}
  `);

  console.log(`\n=== KAMPANJE-NIVÅ NEGATIVE KEYWORDS PÅ PMAX (${PMAX_ID}) ===`);
  console.log(`Antall: ${camp.length}`);
  for (const r of camp) {
    const kw = r.campaign_criterion?.keyword;
    console.log(`  "${kw?.text}" [${MATCH[kw?.match_type] ?? kw?.match_type}] status=${r.campaign_criterion?.status}`);
  }

  // 2. Shared lists applied til Pmax
  const sharedApplied = await customer.query(`
    SELECT
      campaign_shared_set.shared_set,
      campaign_shared_set.status,
      campaign.id
    FROM campaign_shared_set
    WHERE campaign.id = ${PMAX_ID}
      AND campaign_shared_set.status = 'ENABLED'
  `);

  console.log(`\n=== SHARED NEGATIVE LISTS APPLIED PÅ PMAX ===`);
  console.log(`Antall: ${sharedApplied.length}`);
  const sharedSetIds = [];
  for (const r of sharedApplied) {
    const setRes = String(r.campaign_shared_set?.shared_set ?? "");
    const setId = setRes.split("/").pop();
    sharedSetIds.push(setId);
    console.log(`  ${setRes}`);
  }

  // 3. Innhold i hver shared list
  for (const setId of sharedSetIds) {
    const setMeta = await customer.query(`
      SELECT shared_set.id, shared_set.name, shared_set.type
      FROM shared_set
      WHERE shared_set.id = ${setId}
    `);
    const meta = setMeta[0]?.shared_set;
    console.log(`\n--- Shared list "${meta?.name}" (id=${meta?.id}) ---`);

    const setKws = await customer.query(`
      SELECT
        shared_criterion.keyword.text,
        shared_criterion.keyword.match_type
      FROM shared_criterion
      WHERE shared_set.id = ${setId}
    `);
    console.log(`  Antall keywords: ${setKws.length}`);
    for (const r of setKws) {
      const kw = r.shared_criterion?.keyword;
      console.log(`    "${kw?.text}" [${MATCH[kw?.match_type] ?? kw?.match_type}]`);
    }
  }

  // 4. Brand-pattern-sjekk
  console.log("\n=== BRAND-DEKNINGS-VERIFIKASJON ===");
  const checkTerms = ["fosen tools", "fosentools", "fosen-tools", "fosen tool"];
  for (const t of checkTerms) {
    const blockedCamp = camp.find((r) =>
      String(r.campaign_criterion?.keyword?.text ?? "").toLowerCase() === t.toLowerCase()
    );
    console.log(`  "${t}": ${blockedCamp ? "BLOKKERT (kampanje-nivå " + (MATCH[blockedCamp.campaign_criterion?.keyword?.match_type] ?? "?") + ")" : "IKKE BLOKKERT på kampanje-nivå"}`);
  }
}

main().catch((e) => {
  console.error("FEIL:", e.message ?? e);
  if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
  process.exit(1);
});
