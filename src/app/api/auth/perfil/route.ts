import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { atualizarPerfil } from "@/lib/server/perfil.server";

export async function PUT(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const result = await atualizarPerfil(auth.user.id, body);

  if ("message" in result) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json({ user: result.user });
}
