import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { getPedidoDetalhe, isAllowedPedidoRole, parsePedidoId } from "@/lib/server/pedidos.server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }
  const id = parsePedidoId(params.id);
  if (id === null) return NextResponse.json({ message: "ID de pedido inválido." }, { status: 400 });
  try {
    const pedido = await getPedidoDetalhe(id);
    if (!pedido) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(pedido);
  } catch {
    return NextResponse.json({ message: "Erro ao carregar pedido." }, { status: 500 });
  }
}
