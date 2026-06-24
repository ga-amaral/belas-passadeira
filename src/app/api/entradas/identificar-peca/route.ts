import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { identificarPeca } from "@/lib/server/openai.server";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Nenhuma imagem enviada." }, { status: 400 });

  const file = formData.get("foto") as File | null;
  if (!file) return NextResponse.json({ message: "Nenhuma imagem enviada." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const resultado = await identificarPeca(buffer, file.type || "image/jpeg");
  return NextResponse.json(resultado);
}
