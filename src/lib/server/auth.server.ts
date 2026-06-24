import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getDb } from "./db.server";

export type AuthUser = { id: number; name: string; email: string; role: string; active: boolean };

export async function authenticate(req: NextRequest): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return { error: "Token não fornecido.", status: 401 };

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const { data: user, error } = await getDb()
      .from("users")
      .select("id, name, email, role, active")
      .eq("id", payload.id)
      .single();
    if (error || !user || !user.active) return { error: "Usuário inativo ou não encontrado.", status: 401 };
    return { user };
  } catch {
    return { error: "Token inválido ou expirado.", status: 401 };
  }
}

export function requireAdmin(user: AuthUser): { error: string; status: number } | null {
  if (user.role !== "admin") return { error: "Acesso restrito a administradores.", status: 403 };
  return null;
}
