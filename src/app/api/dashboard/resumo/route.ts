import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { data, error } = await getDb().rpc("get_dashboard_resumo");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  const d = (data as Record<string, unknown>) || {};
  return NextResponse.json({
    pedidosHoje:   Number(d.pedidosHoje   ?? 0),
    pedidosSemana: Number(d.pedidosSemana ?? 0),
    pedidosMes:    Number(d.pedidosMes    ?? 0),
    totalHoje:     Number(d.totalHoje     ?? 0),
    totalSemana:   Number(d.totalSemana   ?? 0),
    totalMes:      Number(d.totalMes      ?? 0),
  });
}
