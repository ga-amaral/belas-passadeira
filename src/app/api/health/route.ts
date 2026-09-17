import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";

export async function GET() {
  const vars = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    JWT_SECRET: !!process.env.JWT_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: !!process.env.EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE: !!process.env.EVOLUTION_INSTANCE,
    WAHA_API_URL: !!process.env.WAHA_API_URL,
    WAHA_API_KEY: !!process.env.WAHA_API_KEY,
    WAHA_SESSION: !!process.env.WAHA_SESSION,
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

  let pdfOk = false;
  let pdfError = "";
  try {
    const { gerarPdf } = await import("@/lib/server/pdf.server");
    await gerarPdf({
      order: { id: "TEST", created_at: new Date().toISOString(), total_amount: 0, volumes_json: "[]", avulsos: 0 },
      client: { name: "Teste", whatsapp: "11999999999" },
      items: [],
      employee: { name: "Admin" },
    });
    pdfOk = true;
  } catch (e) {
    pdfError = String(e);
  }

  return NextResponse.json({ status: "ok", vars, db: dbOk, dbError, pdf: pdfOk, pdfError });
}
