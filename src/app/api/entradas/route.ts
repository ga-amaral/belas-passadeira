import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

function mapOrder(r: Record<string, unknown>) {
  const clients = r.clients as Record<string, unknown> | null;
  const users = r.users as Record<string, unknown> | null;
  return {
    id: r.id, clienteId: r.client_id, clienteNome: clients?.name || "",
    clienteWhatsapp: clients?.whatsapp || "", funcionariaId: r.employee_id,
    funcionariaNome: users?.name || "", totalGeral: r.total_amount,
    status: r.status, avulsos: r.avulsos,
    volumes: (() => { try { return JSON.parse(String(r.volumes_json || "[]")); } catch { return []; } })(),
    pecas: [], createdAt: r.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { searchParams } = new URL(req.url);
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");
  const clienteId = searchParams.get("clienteId");
  const funcionariaId = searchParams.get("funcionariaId");
  const search = searchParams.get("search");

  let q = getDb().from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .order("created_at", { ascending: false }).limit(200);

  if (dataInicio) q = q.gte("created_at", dataInicio);
  if (dataFim)    q = q.lte("created_at", dataFim + "T23:59:59");
  if (clienteId)  q = q.eq("client_id", clienteId);
  if (funcionariaId) q = q.eq("employee_id", funcionariaId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  let rows = (data || []) as Record<string, unknown>[];
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) => {
      const c = r.clients as Record<string, unknown> | null;
      const u = r.users as Record<string, unknown> | null;
      return String(c?.name || "").toLowerCase().includes(s) || String(u?.name || "").toLowerCase().includes(s);
    });
  }
  return NextResponse.json(rows.map(mapOrder));
}
