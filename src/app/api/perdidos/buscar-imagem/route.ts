import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole } from "@/lib/server/pedidos.server";
import {
  filterPecasPorIds,
  listPecasPerdidasCandidatas,
  parseClienteId,
} from "@/lib/server/perdidos.server";
import { encontrarPecasPorImagem } from "@/lib/server/openai.server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const clienteIdTexto =
    typeof formData.get("clienteId") === "string" ? String(formData.get("clienteId")).trim() : "";
  let clienteId: string | null = null;
  if (clienteIdTexto) {
    clienteId = parseClienteId(clienteIdTexto);
    if (!clienteId) {
      return NextResponse.json({ message: "clienteId inválido." }, { status: 400 });
    }
  }

  const file = formData.get("foto");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "Nenhuma imagem enviada." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Arquivo de imagem inválido." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ message: "Imagem muito grande (máximo 8MB)." }, { status: 400 });
  }

  const candidatos = await listPecasPerdidasCandidatas(clienteId).catch(() => null);
  if (!candidatos) return NextResponse.json({ message: "Erro ao buscar peças." }, { status: 500 });
  const { pecas, limitado } = candidatos;
  if (pecas.length === 0) return NextResponse.json({ pecas: [], limitado });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ids = await encontrarPecasPorImagem(
      buffer,
      file.type || "image/jpeg",
      pecas.map((peca) =>
        clienteId
          ? { id: peca.id, descricao: peca.descricao }
          : { id: peca.id, descricao: peca.descricao, clienteNome: peca.clienteNome },
      ),
    );
    return NextResponse.json({ pecas: filterPecasPorIds(pecas, ids), limitado });
  } catch {
    return NextResponse.json(
      { message: "Busca por imagem indisponível no momento. Tente novamente mais tarde." },
      { status: 503 },
    );
  }
}
