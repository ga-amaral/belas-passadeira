import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const body = await req.json().catch(() => ({}));
  const { name, email, senha, active } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = String(name).trim();
  if (email) updateData.email = String(email).toLowerCase().trim();
  if (typeof active === "boolean") updateData.active = active;
  if (senha && String(senha).length >= 6) {
    updateData.password_hash = await bcrypt.hash(String(senha), 10);
  }

  const { data, error } = await getDb()
    .from("users")
    .update(updateData)
    .eq("id", params.id)
    .eq("role", "funcionaria")
    .select("id, name, email, active, created_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ...data, ativo: data.active });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const { error } = await getDb().from("users").update({ active: false }).eq("id", params.id).eq("role", "funcionaria");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ message: "Funcionária desativada." });
}

