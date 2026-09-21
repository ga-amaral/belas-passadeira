import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate, requireAdmin } from "@/lib/server/auth.server";
import { gerarPdf } from "@/lib/server/pdf.server";
import { enviarPdf } from "@/lib/server/whatsapp.server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  const admin = requireAdmin(auth.user);
  if (admin) return NextResponse.json({ message: admin.error }, { status: admin.status });

  const db = getDb();
  const { data: order, error } = await db.from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .eq("id", params.id).single();
  if (error || !order) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });

  const r = order as Record<string, unknown>;
  const client = r.clients as Record<string, unknown>;
  const employee = r.users as Record<string, unknown>;

  let pdfUrl = String(r.pdf_path || "");
  if (!pdfUrl.startsWith("http")) {
    const { data: items } = await db.from("order_items").select("*").eq("order_id", r.id);
    try {
      const { publicUrl } = await gerarPdf({ order: r, client, items: items || [], employee });
      pdfUrl = publicUrl;
      await db.from("orders").update({ pdf_path: publicUrl }).eq("id", r.id);
    } catch (err) {
      return NextResponse.json({ message: "Erro ao gerar PDF: " + (err as Error).message }, { status: 500 });
    }
  }

  const sent = await enviarPdf(String(client.whatsapp), pdfUrl, String(client.name));
  if (sent) await db.from("orders").update({ whatsapp_sent: true }).eq("id", r.id);
  return NextResponse.json({ success: sent, message: sent ? "PDF reenviado!" : "Falha ao enviar WhatsApp." });
}
