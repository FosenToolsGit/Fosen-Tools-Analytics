import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Sanity-sjekk for LinkedIn-integrasjonen. Tester:
 *  1. Token introspection (/userinfo) — er access tokenet gyldig?
 *  2. Organisasjons-metadata — kan vi lese Fosen Tools-siden?
 *  3. Share-statistikk endepunkt — har vi Community Management API?
 *  4. Follower-statistikk endepunkt — har vi full innsikt?
 *
 * Returnerer status per sjekk og en samlet verdikt.
 */

interface Check {
  name: string;
  status: "ok" | "fail" | "skipped";
  detail: string;
  scopes_needed?: string;
}

async function callLinkedIn(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = new URL(`https://api.linkedin.com/v2${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!token || !orgId) {
    return NextResponse.json({
      verified: false,
      summary: "Mangler env-variabler",
      checks: [
        {
          name: "Env-variabler",
          status: "fail",
          detail: !token
            ? "LINKEDIN_ACCESS_TOKEN mangler"
            : "LINKEDIN_ORGANIZATION_ID mangler",
        },
      ],
    });
  }

  const checks: Check[] = [];
  const orgUrn = `urn:li:organization:${orgId}`;
  const orgUrnEncoded = encodeURIComponent(orgUrn);

  // 1. Token gyldighet via /me
  {
    const r = await callLinkedIn("/me", token);
    checks.push({
      name: "Access token gyldighet",
      status: r.ok ? "ok" : "fail",
      detail: r.ok
        ? "Tokenet fungerer og kan identifisere brukeren"
        : `Status ${r.status}: ${r.body.slice(0, 200)}`,
      scopes_needed: "r_liteprofile eller profile",
    });
  }

  // 2. Organisasjon kan leses
  {
    const r = await callLinkedIn(`/organizations/${orgId}`, token);
    checks.push({
      name: "Organisasjons-metadata",
      status: r.ok ? "ok" : "fail",
      detail: r.ok
        ? (() => {
            try {
              const j = JSON.parse(r.body);
              return `Side funnet: "${j.localizedName ?? "(ukjent)"}" — vanityName: ${j.vanityName ?? "n/a"}`;
            } catch {
              return "Side funnet";
            }
          })()
        : `Status ${r.status}: ${r.body.slice(0, 200)}`,
      scopes_needed: "r_organization_admin eller r_organization_social",
    });
  }

  // 3. Share statistics (Community Management API)
  {
    const now = Date.now();
    const sevenAgo = now - 7 * 86400000;
    const r = await callLinkedIn(
      "/organizationalEntityShareStatistics",
      token,
      {
        q: "organizationalEntity",
        organizationalEntity: orgUrn,
        "timeIntervals.timeGranularityType": "DAY",
        "timeIntervals.timeRange.start": sevenAgo.toString(),
        "timeIntervals.timeRange.end": now.toString(),
      }
    );
    let detail: string;
    if (r.ok) {
      try {
        const j = JSON.parse(r.body);
        const count = (j.elements || []).length;
        detail = `Share-statistikk tilgjengelig (${count} dager returnert)`;
      } catch {
        detail = "Share-statistikk tilgjengelig";
      }
    } else {
      detail = `Status ${r.status}: ${r.body.slice(0, 200)}`;
    }
    checks.push({
      name: "Share-statistikk (Community Management API)",
      status: r.ok ? "ok" : "fail",
      detail,
      scopes_needed: "r_organization_social + Community Management API-godkjenning",
    });
  }

  // 4. Follower statistics
  {
    const r = await callLinkedIn(
      "/organizationalEntityFollowerStatistics",
      token,
      { q: "organizationalEntity", organizationalEntity: orgUrn }
    );
    let detail: string;
    if (r.ok) {
      try {
        const j = JSON.parse(r.body);
        const followers =
          j.elements?.[0]?.followerCounts?.organicFollowerCount;
        detail =
          followers != null
            ? `Følgere: ${followers}`
            : "Endepunkt svarer men ingen follower-tall";
      } catch {
        detail = "Endepunkt svarer";
      }
    } else {
      detail = `Status ${r.status}: ${r.body.slice(0, 200)}`;
    }
    checks.push({
      name: "Follower-statistikk",
      status: r.ok ? "ok" : "fail",
      detail,
      scopes_needed: "r_organization_social",
    });
  }

  // Samlet verdikt
  const allOk = checks.every((c) => c.status === "ok");
  const tokenOk = checks[0]?.status === "ok";
  const orgOk = checks[1]?.status === "ok";
  const statsOk = checks[2]?.status === "ok";

  let summary: string;
  if (allOk) {
    summary = "✅ Fullt verifisert — LinkedIn-integrasjonen er klar";
  } else if (tokenOk && orgOk && !statsOk) {
    summary =
      "⚠️ Delvis verifisert — tokenet virker og organisasjonen er koblet, men Community Management API er ikke godkjent. Du kan lese basis-info men ikke detaljerte statistikker.";
  } else if (tokenOk && !orgOk) {
    summary =
      "⚠️ Tokenet virker, men organisasjons-URN er feil eller mangler tilgang. Sjekk LINKEDIN_ORGANIZATION_ID og at appen har tilgang til denne siden.";
  } else if (!tokenOk) {
    summary =
      "❌ Access tokenet virker ikke — kan være utløpt eller mangler scopes. Generer nytt token i LinkedIn Developer-konsollen.";
  } else {
    summary = "⚠️ Delvis verifisert — sjekk detaljer nedenfor";
  }

  return NextResponse.json({
    verified: allOk,
    summary,
    organization_id: orgId,
    checks,
  });
}
