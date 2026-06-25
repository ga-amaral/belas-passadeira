import PDFDocumentLib from "pdfkit";
import { uploadBuffer } from "./storage.server";

const GOLD = "#D4AF37";
const ROSE = "#C9A9A6";
const BROWN = "#4A3F35";

export async function gerarPdf({ order, client, items, employee }: {
  order: Record<string, unknown>;
  client: Record<string, unknown>;
  items: Record<string, unknown>[];
  employee: Record<string, unknown>;
}): Promise<{ publicUrl: string; filename: string }> {

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocumentLib({ size: "A4", margins: { top: 50, left: 50, right: 50, bottom: 50 } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill(BROWN);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(22).text("Belas Passadeiras", 50, 30);
    doc.font("Helvetica").fontSize(10).fillColor(GOLD).text("Lavanderia & Passadoria", 50, 58);
    doc.fillColor("white").fontSize(9).text(`Pedido #${order.id}`, doc.page.width - 150, 35, { align: "right" });

    const dateStr = order.created_at
      ? new Date(order.created_at as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleDateString("pt-BR");
    doc.text(dateStr, doc.page.width - 250, 50, { align: "right" });

    let y = 120;

    // Cliente
    section(doc, "Cliente", y); y += 22;
    row(doc, "Nome", String(client.name || ""), y); y += 18;
    row(doc, "WhatsApp", String(client.whatsapp || ""), y); y += 18;
    if (client.address_city) {
      const addr = [client.address_street, client.address_number, client.address_neighborhood, client.address_city, client.address_state].filter(Boolean).join(", ");
      row(doc, "Endereço", addr, y); y += 18;
    }
    if (client.preferences) { row(doc, "Preferências", String(client.preferences), y); y += 18; }

    y += 10; divider(doc, y); y += 16;
    row(doc, "Atendida por", String((employee as Record<string, unknown>)?.name || "—"), y); y += 26;

    // Peças
    section(doc, "Peças registradas", y); y += 22;
    doc.font("Helvetica").fontSize(9).fillColor(BROWN);
    items.forEach((item, i) => {
      if (y > doc.page.height - 120) { doc.addPage(); y = 50; }
      const desc = String(item.manual_description || item.ai_description || "Peça");
      const size = item.size ? ` – ${item.size}` : "";
      doc.rect(50, y, doc.page.width - 100, 20).fill("#F5F0E8");
      doc.fillColor(BROWN).font("Helvetica-Bold").fontSize(9).text(`${i + 1}.`, 55, y + 5, { width: 20 });
      doc.font("Helvetica").text(`${desc}${size}`, 75, y + 5, { width: doc.page.width - 130 });
      y += 24;
    });

    y += 10; divider(doc, y); y += 16;

    // Financeiro
    section(doc, "Resumo financeiro", y); y += 22;
    let volumes: Record<string, unknown>[] = [];
    try { volumes = JSON.parse(String(order.volumes_json || "[]")); } catch { /**/ }
    volumes.forEach((v) => {
      if (Number(v.quantidade) > 0) {
        lineItem(doc, `${v.nome} × ${v.quantidade}`, brl(Number(v.quantidade) * Number(v.preco)), y);
        y += 18;
      }
    });
    if (Number(order.avulsos) > 0) { lineItem(doc, `Peças avulsas × ${order.avulsos}`, "—", y); y += 18; }

    y += 8;
    doc.rect(50, y, doc.page.width - 100, 36).fill(GOLD);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(13).text("Total", 60, y + 10);
    doc.fontSize(15).text(brl(Number(order.total_amount)), 0, y + 8, { align: "right", width: doc.page.width - 60 });
    y += 56;

    doc.fontSize(8).fillColor(ROSE).font("Helvetica").text("Obrigada pela preferência! Belas Passadeiras", 50, y, { align: "center" });
    doc.end();
  });

  const filename = `pedido_${order.id}_${Date.now()}.pdf`;
  const publicUrl = await uploadBuffer("pdfs", filename, buffer, "application/pdf");
  return { publicUrl, filename };
}

function section(doc: PDFKit.PDFDocument, text: string, y: number) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BROWN).text(text, 50, y);
  doc.moveTo(50, y + 14).lineTo(50 + doc.widthOfString(text), y + 14).stroke(GOLD);
}
function row(doc: PDFKit.PDFDocument, label: string, value: string, y: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ROSE).text(`${label}:`, 50, y, { width: 90 });
  doc.font("Helvetica").fontSize(9).fillColor(BROWN).text(value || "—", 145, y, { width: 350 });
}
function lineItem(doc: PDFKit.PDFDocument, label: string, value: string, y: number) {
  doc.font("Helvetica").fontSize(9).fillColor(BROWN).text(label, 50, y);
  doc.text(value, 0, y, { align: "right", width: doc.page.width - 60 });
}
function divider(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(0.5).stroke("#E0D8CE");
}
function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}
