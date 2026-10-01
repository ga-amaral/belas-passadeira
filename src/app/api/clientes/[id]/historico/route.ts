import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const db = getDb();
  const { data: pedidos } = await db.from("orders")
    .select("id, created_at, total_amount, pdf_path, users:employee_id(name)")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!pedidos || pedidos.length === 0) return NextResponse.json({ pedidos: [], itensEmpresa: { sacos: 0, cabides: 0 } });

  const orderIds = pedidos.map((p: Record<string, unknown>) => p.id);
  const { data: allItems } = await db.from("order_items")
    .select("order_id, ai_description, manual_description, size, quantity, image_url, image_path")
    .in("order_id", orderIds);

  const byOrder: Record<string, unknown[]> = {};
  for (const item of allItems || []) {
    const r = item as Record<string, unknown>;
    if (!byOrder[String(r.order_id)]) byOrder[String(r.order_id)] = [];
    byOrder[String(r.order_id)].push({
      descricao: r.manual_description || r.ai_description || "Peça",
      tamanho: r.size || null,
      quantidade: Number(r.quantity) || 1,
      fotoUrl: r.image_url || null,
    });
  }

  return NextResponse.json({
    pedidos: pedidos.map((p: Record<string, unknown>) => ({
      id: p.id,
      data: p.created_at,
      total: p.total_amount,
      funcionaria: (p.users as Record<string, unknown>)?.name || null,
      pdfUrl: p.pdf_path && String(p.pdf_path).startsWith("http") ? p.pdf_path : null,
      pecas: byOrder[String(p.id)] || [],
    })),
    itensEmpresa: { sacos: 0, cabides: 0 },
  });
}
