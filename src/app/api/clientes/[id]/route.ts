import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";

function mapCliente(c: Record<string, unknown>) {
  return {
    id: c.id, nome: c.name, cpfCnpj: c.doc_number, whatsapp: c.whatsapp,
    logradouro: c.address_street, numero: c.address_number, complemento: c.address_complement,
    bairro: c.address_neighborhood, cidade: c.address_city, estado: c.address_state, cep: c.address_zip,
    preferencias: c.preferences ? String(c.preferences).split(",").map((s: string) => s.trim()) : [],
    createdAt: c.created_at,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { data, error } = await getDb().from("clients").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
  return NextResponse.json(mapCliente(data));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const { nome, cpfCnpj, whatsapp, logradouro, numero, complemento, bairro, cidade, estado, cep, preferencias } = body;

  if (!nome || !whatsapp) {
    return NextResponse.json({ message: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
  }

  const docType = cpfCnpj ? (String(cpfCnpj).replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj") : null;
  const prefStr = Array.isArray(preferencias) ? preferencias.join(", ") : (preferencias || null);

  const { data, error } = await getDb()
    .from("clients")
    .update({
      name: nome.trim(),
      doc_type: docType,
      doc_number: cpfCnpj || null,
      address_street: logradouro || null,
      address_number: numero || null,
      address_complement: complemento || null,
      address_neighborhood: bairro || null,
      address_city: cidade || null,
      address_state: estado || null,
      address_zip: cep || null,
      whatsapp: String(whatsapp).trim(),
      preferences: prefStr,
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(mapCliente(data));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const db = getDb();
  const { data: orders } = await db.from("orders").select("id").eq("client_id", params.id);
  if (orders && orders.length > 0) {
    const ids = orders.map((o: Record<string, unknown>) => o.id);
    await db.from("order_items").delete().in("order_id", ids);
    await db.from("orders").delete().eq("client_id", params.id);
  }
  const { error } = await db.from("clients").delete().eq("id", params.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ message: "Cliente removido." });
}
