import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate } from "@/lib/server/auth.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { data, error } = await getDb()
    .from("prices")
    .select("id, name, volume, type")
    .eq("active", true)
    .order("sort_order");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json((data || []).map((price) => ({
    id: String(price.id), nome: price.name, volume: price.volume || undefined, tipo: price.type,
  })));
}
