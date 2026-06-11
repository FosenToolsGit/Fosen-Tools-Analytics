/**
 * Last opp Wera-logoen med slogan 4C white til Supabase.
 *
 *   node --env-file=.env.local scripts/upload-wera-slogan-logo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const file = path.join(process.cwd(), "public/social/leverandor-logoer/wera-with-slogan-4c-white.png");
const buf = fs.readFileSync(file);
const target = "brand-assets/leverandor-logoer/wera-with-slogan.png";

console.log(`⬆️  ${file} (${(buf.length / 1024).toFixed(0)} kB) → social_assets/${target}`);

const { error } = await sb.storage.from("social_assets").upload(target, buf, {
  contentType: "image/png",
  upsert: true,
});

if (error) {
  console.error("❌", error);
  process.exit(1);
}

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social_assets/${target}`;
console.log(`\n✅ Lastet opp.\n   ${url}`);
