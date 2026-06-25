import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";

export async function GET() {
  const vars = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    JWT_SECRET: !!process.env.JWT_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
  };

  let dbOk = false;
  let dbError = "";
  try {
    const { error } = await getDb().from("users").select("id").limit(1);
    dbOk = !error;
    if (error) dbError = error.message;
  } catch (e) {
    dbError = String(e);
  }

  return NextResponse.json({ status: "ok", vars, db: dbOk, dbError });
}
