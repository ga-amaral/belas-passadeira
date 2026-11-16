import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole } from "@/lib/server/pedidos.server";
import { listPecasPerdidas, parseClienteId } from "@/lib/server/perdidos.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }

  const clienteIdTexto = req.nextUrl.searchParams.get("clienteId")?.trim() ?? "";
  let clienteId: string | null = null;
  if (clienteIdTexto) {
    clienteId = parseClienteId(clienteIdTexto);
    if (!clienteId) {
      return NextResponse.json({ message: "clienteId inválido." }, { status: 400 });
    }
  }

  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    return NextResponse.json({ pecas: await listPecasPerdidas(clienteId, q) });
  } catch {
    return NextResponse.json({ message: "Erro ao buscar peças." }, { status: 500 });
  }
}
