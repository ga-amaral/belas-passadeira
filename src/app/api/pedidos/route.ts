import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole, listPedidosKanban } from "@/lib/server/pedidos.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }
  try {
    return NextResponse.json({ pedidos: await listPedidosKanban() });
  } catch {
    return NextResponse.json({ message: "Erro ao carregar pedidos." }, { status: 500 });
  }
}
