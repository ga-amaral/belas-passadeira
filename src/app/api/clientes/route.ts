import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate } from "@/lib/server/auth.server";

function mapCliente(c: Record<string, unknown>) {
  return {
    id: c.id, nome: c.name, cpfCnpj: c.doc_number, whatsapp: c.whatsapp,
    logradouro: c.address_street, numero: c.address_number, complemento: c.address_complement,
    bairro: c.address_neighborhood, cidade: c.address_city, estado: c.address_state, cep: c.address_zip,
    preferencias: c.preferences ? String(c.preferences).split(",").map((s: string) => s.trim()) : [],
    createdAt: c.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const search = new URL(req.url).searchParams.get("search")?.trim() || "";
  const db = getDb();
  let q = db.from("clients").select("*").order("name").limit(50);
  if (search.length >= 2) {
    q = db.from("clients").select("*")
      .or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%,doc_number.ilike.%${search}%`)
      .order("name").limit(30);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(mapCliente));
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const { nome, cpfCnpj, whatsapp, logradouro, numero, complemento, bairro, cidade, estado, cep, preferencias } = body;
  if (!nome || !whatsapp) return NextResponse.json({ message: "Nome e WhatsApp são obrigatórios." }, { status: 400 });

  const docType = cpfCnpj ? (String(cpfCnpj).replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj") : null;
  const prefStr = Array.isArray(preferencias) ? preferencias.join(", ") : (preferencias || null);

  const { data, error } = await getDb().from("clients").insert({
    name: String(nome).trim(), doc_type: docType, doc_number: cpfCnpj || null,
    address_street: logradouro || null, address_number: numero || null,
    address_complement: complemento || null, address_neighborhood: bairro || null,
    address_city: cidade || null, address_state: estado || null,
    address_zip: cep || null, whatsapp: String(whatsapp).trim(), preferences: prefStr,
  }).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(mapCliente(data), { status: 201 });
}
