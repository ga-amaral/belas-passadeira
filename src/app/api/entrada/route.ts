import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate } from "@/lib/server/auth.server";
import { uploadFile } from "@/lib/server/storage.server";
import { identificarPeca } from "@/lib/server/openai.server";
import { gerarPdf } from "@/lib/server/pdf.server";
import { enviarPdf } from "@/lib/server/whatsapp.server";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const clienteId = formData.get("clienteId") as string;
  if (!clienteId) return NextResponse.json({ message: "clienteId é obrigatório." }, { status: 400 });

  const db = getDb();
  const { data: client, error: clientErr } = await db.from("clients").select("*").eq("id", clienteId).single();
  if (clientErr || !client) return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });

  const employee = auth.user;
  const total = parseFloat(formData.get("totalGeral") as string) || 0;
  const avulsosQtd = parseInt(formData.get("avulsos") as string) || 0;
  let volumesData: unknown[] = [];
  try { volumesData = JSON.parse(formData.get("volumes") as string || "[]"); } catch { /**/ }

  const { data: order, error: orderErr } = await db.from("orders").insert({
    client_id: clienteId, employee_id: employee.id,
    total_amount: total, volumes_json: JSON.stringify(volumesData),
    avulsos: avulsosQtd, status: "recebido",
  }).select("*").single();
  if (orderErr) return NextResponse.json({ message: orderErr.message }, { status: 500 });

  const orderId = order.id;

  // Processa cada peça (fotos enviadas como pecas[0][foto], pecas[1][foto], ...)
  const fotos: File[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("pecas[") && key.endsWith("][foto]") && value instanceof File) {
      const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || "0");
      fotos[idx] = value;
    }
  });

  for (let i = 0; i < fotos.length; i++) {
    const file = fotos[i];
    if (!file) continue;
    const descricaoManual = formData.get(`pecas[${i}][descricao]`) as string | null;
    const tamanhoManual = formData.get(`pecas[${i}][tamanho]`) as string | null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const [aiResult, imageUrl] = await Promise.all([
      identificarPeca(buffer, file.type || "image/jpeg").catch(() => ({ descricao: "Peça de roupa", tipo: "outro", tamanhoSugerido: null })),
      uploadFile("item-photos", file).catch(() => null),
    ]);

    await db.from("order_items").insert({
      order_id: orderId, image_path: file.name, image_url: imageUrl,
      ai_description: aiResult.descricao, manual_description: descricaoManual,
      item_type: aiResult.tipo, size: tamanhoManual || aiResult.tamanhoSugerido || null,
    });
  }

  const { data: items } = await db.from("order_items").select("*").eq("order_id", orderId);

  let pdfPublicUrl: string | null = null;
  let whatsappSent = false;
  try {
    const { publicUrl, filename } = await gerarPdf({ order, client, items: items || [], employee });
    pdfPublicUrl = publicUrl;
    await db.from("orders").update({ pdf_path: publicUrl }).eq("id", orderId);
    whatsappSent = await enviarPdf(String(client.whatsapp), publicUrl, String(client.name));
    await db.from("orders").update({ whatsapp_sent: whatsappSent }).eq("id", orderId);
    void filename;
  } catch (err) {
    console.error("[PDF/WhatsApp]", err);
  }

  return NextResponse.json({
    id: orderId, success: whatsappSent, pdfGerado: !!pdfPublicUrl,
    message: whatsappSent ? "Pedido registrado e PDF enviado pelo WhatsApp." : "Pedido registrado. Falha ao enviar WhatsApp.",
  }, { status: 201 });
}
