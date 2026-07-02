import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * UTM-link-register: GET (liste alle) + POST (lag ny).
 * Krysskobles med GA4 traffic_sources i /api/utm-links/stats for å vise
 * faktiske klikk + konverteringer per kampanje.
 */

export interface UtmLinkRow {
  id: string;
  label: string;
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  full_url: string;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

function buildFullUrl(input: {
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string | null;
  utm_term?: string | null;
}): string {
  const url = new URL(input.base_url);
  url.searchParams.set("utm_source", input.utm_source);
  url.searchParams.set("utm_medium", input.utm_medium);
  url.searchParams.set("utm_campaign", input.utm_campaign);
  if (input.utm_content) url.searchParams.set("utm_content", input.utm_content);
  if (input.utm_term) url.searchParams.set("utm_term", input.utm_term);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const sp = request.nextUrl.searchParams;
  const campaign = sp.get("campaign");
  const source = sp.get("source");

  let query = supabase
    .from("utm_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (campaign) query = query.eq("utm_campaign", campaign);
  if (source) query = query.eq("utm_source", source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: data as UtmLinkRow[] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = String(body.label ?? "").trim();
  const base_url = String(body.base_url ?? "").trim();
  const utm_source = String(body.utm_source ?? "").trim();
  const utm_medium = String(body.utm_medium ?? "").trim();
  const utm_campaign = String(body.utm_campaign ?? "").trim();
  const utm_content = body.utm_content ? String(body.utm_content).trim() : null;
  const utm_term = body.utm_term ? String(body.utm_term).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!label || !base_url || !utm_source || !utm_medium || !utm_campaign) {
    return NextResponse.json(
      { error: "Mangler felt: label, base_url, utm_source, utm_medium, utm_campaign er påkrevd" },
      { status: 400 }
    );
  }

  let full_url: string;
  try {
    full_url = buildFullUrl({ base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term });
  } catch {
    return NextResponse.json({ error: "Ugyldig base_url" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("utm_links")
    .insert({
      label,
      base_url,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      full_url,
      notes,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data as UtmLinkRow });
}
