import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { detectarPeca } from "@/lib/server/openai.server";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("foto") as File | null;
  if (!file) return NextResponse.json({ message: "Nenhuma imagem enviada." }, { status: 400 });

  try {
    const temPeca = await detectarPeca(Buffer.from(await file.arrayBuffer()), file.type || "image/jpeg");
    return NextResponse.json({ temPeca });
  } catch (err) {
    console.error("[OpenAI] Erro ao detectar peça:", err instanceof Error ? err.message : err);
    return NextResponse.json({ message: "Detecção de peça indisponível." }, { status: 503 });
  }
}
