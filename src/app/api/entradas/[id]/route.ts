import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const db = getDb();
  const { data: order, error } = await db.from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .eq("id", params.id).single();
  if (error || !order) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });

  const { data: items } = await db.from("order_items").select("*").eq("order_id", order.id);
  const r = order as Record<string, unknown>;
  const clients = r.clients as Record<string, unknown> | null;
  const users = r.users as Record<string, unknown> | null;

  return NextResponse.json({
    id: r.id, clienteId: r.client_id, clienteNome: clients?.name || "",
    clienteWhatsapp: clients?.whatsapp || "", funcionariaId: r.employee_id,
    funcionariaNome: users?.name || "", totalGeral: r.total_amount,
    status: r.status, avulsos: r.avulsos, createdAt: r.created_at,
    volumes: (() => { try { return JSON.parse(String(r.volumes_json || "[]")); } catch { return []; } })(),
    pecas: (items || []).map((i: Record<string, unknown>) => ({
      descricao: i.manual_description || i.ai_description,
      tamanho: i.size,
      quantidade: Number(i.quantity) || 1,
      fotoUrl: i.image_url || null,
    })),
  });
}
