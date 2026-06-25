import { createClient } from "@supabase/supabase-js";

export function getDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY não configurados.");
  return createClient(url, key, { auth: { persistSession: false } });
}
