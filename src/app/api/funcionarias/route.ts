import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { data, error } = await getDb().from("users").select("id, name, email, role, active, created_at").eq("role", "funcionaria").order("name");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(mapUser));
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { name, email, senha } = await req.json().catch(() => ({}));
  if (!name || !email || !senha) return NextResponse.json({ message: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });

  const { data: existing } = await getDb().from("users").select("id").eq("email", String(email).toLowerCase()).single();
  if (existing) return NextResponse.json({ message: "E-mail já cadastrado." }, { status: 409 });

  const hash = await bcrypt.hash(String(senha), 10);
  const { data, error } = await getDb()
    .from("users")
    .insert({ name, email: String(email).toLowerCase(), password_hash: hash, role: "funcionaria" })
    .select("id, name, email, role, active, created_at")
    .single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(mapUser(data), { status: 201 });
}

function mapUser(u: Record<string, unknown>) {
  return { id: u.id, name: u.name, email: u.email, ativo: u.active, createdAt: u.created_at };
}
