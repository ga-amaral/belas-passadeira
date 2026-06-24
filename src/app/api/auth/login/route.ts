import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/server/db.server";

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json().catch(() => ({}));
  if (!email || !senha) return NextResponse.json({ message: "E-mail e senha são obrigatórios." }, { status: 400 });

  const { data: user, error } = await getDb()
    .from("users")
    .select("id, name, email, role, active, password_hash")
    .eq("email", String(email).toLowerCase())
    .single();

  if (error || !user) return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
  if (!user.active) return NextResponse.json({ message: "Usuário inativo." }, { status: 401 });

  const ok = await bcrypt.compare(String(senha), user.password_hash);
  if (!ok) return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as "7d" });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
