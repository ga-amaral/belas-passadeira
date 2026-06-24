import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

function mapPreco(r: Record<string, unknown>) {
  return { id: String(r.id), nome: r.name, volume: r.volume || undefined, preco: parseFloat(String(r.price)), tipo: r.type };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { data, error } = await getDb().from("prices").select("*").eq("active", true).order("sort_order");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(mapPreco));
}

export async function PUT(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { precos } = await req.json().catch(() => ({}));
  if (!Array.isArray(precos)) return NextResponse.json({ message: "Campo 'precos' deve ser um array." }, { status: 400 });

  const db = getDb();
  for (const p of precos as Record<string, unknown>[]) {
    if (p.id) {
      await db.from("prices").update({ name: p.nome || p.name, price: parseFloat(String(p.preco ?? p.price)) || 0 }).eq("id", p.id);
    }
  }
  const { data } = await db.from("prices").select("*").eq("active", true).order("sort_order");
  return NextResponse.json((data || []).map(mapPreco));
}
