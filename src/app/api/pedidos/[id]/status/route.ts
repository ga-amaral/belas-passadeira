import { NextRequest, NextResponse } from "next/server";
import type { PedidoStatus } from "@/types";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole, updatePedidoStatus } from "@/lib/server/pedidos.server";
import { isPedidoStatus } from "@/lib/domain/pedido-status";

export function parsePedidoId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }
  const id = parsePedidoId(params.id);
  if (id === null) return NextResponse.json({ message: "ID de pedido inválido." }, { status: 400 });
  const body = await req.json().catch(() => null) as { status?: unknown } | null;
  if (!body || !isPedidoStatus(body.status)) {
    return NextResponse.json({ message: "Status inválido." }, { status: 400 });
  }
  try {
    const updated = await updatePedidoStatus(id, body.status as PedidoStatus);
    if (!updated) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
