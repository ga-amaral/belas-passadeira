import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { uploadBuffer } from "./storage.server";

const H = 841.89; // A4 height pts
const W = 595.28; // A4 width pts
const M = 50;     // margin

const GOLD  = rgb(0.831, 0.686, 0.216);
const ROSE  = rgb(0.788, 0.663, 0.651);
const BROWN = rgb(0.290, 0.247, 0.208);
const WHITE = rgb(1, 1, 1);
const CREAM = rgb(0.961, 0.941, 0.910);
const LGRAY = rgb(0.878, 0.847, 0.820);

function y(fromTop: number) { return H - fromTop; }

export async function gerarPdf({ order, client, items, employee }: {
  order: Record<string, unknown>;
  client: Record<string, unknown>;
  items: Record<string, unknown>[];
  employee: Record<string, unknown>;
}): Promise<{ publicUrl: string; filename: string }> {

  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([W, H]);

  // Header background
  page.drawRectangle({ x: 0, y: y(100), width: W, height: 100, color: BROWN });
  page.drawText("Belas Passadeiras", { x: M, y: y(48), font: bold, size: 22, color: WHITE });
  page.drawText("Lavanderia & Passadoria", { x: M, y: y(70), font: regular, size: 10, color: GOLD });
  page.drawText(`Pedido #${order.id}`, { x: W - 160, y: y(42), font: bold, size: 9, color: WHITE });

  const dateStr = order.created_at
    ? new Date(order.created_at as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR");
  page.drawText(dateStr, { x: W - 160, y: y(58), font: regular, size: 8, color: WHITE });

  let cursor = 125;

  function section(title: string) {
    page.drawText(title, { x: M, y: y(cursor), font: bold, size: 11, color: BROWN });
    page.drawLine({ start: { x: M, y: y(cursor + 15) }, end: { x: M + bold.widthOfTextAtSize(title, 11), y: y(cursor + 15) }, thickness: 1, color: GOLD });
    cursor += 22;
  }

  function row(label: string, value: string) {
    const safe = value.replace(/[^\x00-\xFF]/g, "?");
    page.drawText(`${label}:`, { x: M, y: y(cursor), font: bold, size: 9, color: ROSE });
    page.drawText(safe || "—", { x: M + 95, y: y(cursor), font: regular, size: 9, color: BROWN, maxWidth: 350 });
    cursor += 18;
  }

  function divider() {
    page.drawLine({ start: { x: M, y: y(cursor) }, end: { x: W - M, y: y(cursor) }, thickness: 0.5, color: LGRAY });
    cursor += 14;
  }

  function checkPage() {
    if (cursor > H - 120) {
      page = pdfDoc.addPage([W, H]);
      cursor = 50;
    }
  }

  // Cliente
  section("Cliente");
  row("Nome", String(client.name || ""));
  row("WhatsApp", String(client.whatsapp || ""));
  if (client.address_city) {
    const addr = [client.address_street, client.address_number, client.address_city, client.address_state].filter(Boolean).join(", ");
    row("Endereco", addr);
  }
  if (client.preferences) row("Preferencias", String(client.preferences));

  cursor += 8; divider();
  row("Atendida por", String((employee as Record<string, unknown>)?.name || "—"));
  cursor += 10;

  // Peças
  section("Pecas registradas");
  items.forEach((item, i) => {
    checkPage();
    const desc = String(item.manual_description || item.ai_description || "Peca").replace(/[^\x00-\xFF]/g, "?");
    const size = item.size ? ` - ${item.size}` : "";
    const qty = Number(item.quantity) > 1 ? ` x${Number(item.quantity)}` : "";
    page.drawRectangle({ x: M, y: y(cursor + 3), width: W - M * 2, height: 20, color: CREAM });
    page.drawText(`${i + 1}. ${desc}${size}${qty}`, { x: M + 6, y: y(cursor + 3) + 5, font: regular, size: 9, color: BROWN, maxWidth: W - M * 2 - 12 });
    cursor += 24;
  });

  cursor += 8; divider();

  // Financeiro
  section("Resumo financeiro");
  let volumes: Record<string, unknown>[] = [];
  try { volumes = JSON.parse(String(order.volumes_json || "[]")); } catch { /**/ }

  volumes.forEach((v) => {
    if (Number(v.quantidade) > 0) {
      checkPage();
      const label = `${String(v.nome).replace(/[^\x00-\xFF]/g, "?")} x ${v.quantidade}`;
      const val = brl(Number(v.quantidade) * Number(v.preco));
      page.drawText(label, { x: M, y: y(cursor), font: regular, size: 9, color: BROWN });
      page.drawText(val, { x: W - M - regular.widthOfTextAtSize(val, 9), y: y(cursor), font: regular, size: 9, color: BROWN });
      cursor += 18;
    }
  });

  if (Number(order.avulsos) > 0) {
    checkPage();
    const label = `Pecas avulsas x ${order.avulsos}`;
    page.drawText(label, { x: M, y: y(cursor), font: regular, size: 9, color: BROWN });
    cursor += 18;
  }

  cursor += 8;
  checkPage();
  // Total box
  page.drawRectangle({ x: M, y: y(cursor + 36), width: W - M * 2, height: 36, color: GOLD });
  page.drawText("Total", { x: M + 10, y: y(cursor + 20), font: bold, size: 13, color: WHITE });
  const total = brl(Number(order.total_amount));
  page.drawText(total, { x: W - M - bold.widthOfTextAtSize(total, 15) - 10, y: y(cursor + 18), font: bold, size: 15, color: WHITE });
  cursor += 52;

  checkPage();
  page.drawText("Obrigada pela preferencia! Belas Passadeiras", {
    x: W / 2 - 130, y: y(cursor + 10), font: regular, size: 8, color: ROSE,
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  const filename = `pedido_${order.id}_${Date.now()}.pdf`;
  const publicUrl = await uploadBuffer("pdfs", filename, buffer, "application/pdf");
  return { publicUrl, filename };
}

function brl(v: number) {
  return `R$ ${(v ?? 0).toFixed(2).replace(".", ",")}`;
}
