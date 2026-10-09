import { PDFDocument, rgb, StandardFonts, PDFPage, PDFImage } from "pdf-lib";
import { uploadBuffer } from "./storage.server";
import fs from "fs";
import path from "path";

const H = 841.89;
const W = 595.28;
const M = 50;

const PLUM = rgb(0.420, 0.196, 0.404);
const PURPLE = rgb(0.639, 0.349, 0.627);
const LILAC = rgb(0.757, 0.592, 0.824);
const LILAC_LIGHT = rgb(0.965, 0.933, 0.976);
const PINK = rgb(0.965, 0.322, 0.627);
const WHITE = rgb(1, 1, 1);
const TEXT_DARK = rgb(0.220, 0.125, 0.212);
const TEXT_MEDIUM = rgb(0.350, 0.250, 0.340);
const GRAY_LIGHT = rgb(0.900, 0.880, 0.910);

const HEADER_H = 100;
const LOGO_W = 150;
const LOGO_H = LOGO_W * 503 / 1446;

function y(fromTop: number) { return H - fromTop; }

function sanitizeWinAnsi(str: string): string {
  return str.replace(/[^\u0000-\u00FF]/g, "?");
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  const logoPath = path.resolve(process.cwd(), "public/brand/logo-white.png");
  try {
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
  } catch {
  }
  return null;
}

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
  const pageCountRef = { count: 1 };

  const logoBytes = await loadLogoBytes();
  let logoImage: PDFImage | null = null;
  if (logoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {
      logoImage = null;
    }
  }

  const dateStr = order.created_at
    ? new Date(order.created_at as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("pt-BR");
  const orderText = `Pedido #${order.id}`;

  function drawFullHeader(currentPage: PDFPage, pageNum: number, totalPages: number) {
    currentPage.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: PLUM });

    if (logoImage) {
      const logoX = M;
      const logoY = y(HEADER_H) + (HEADER_H - LOGO_H) / 2;
      currentPage.drawImage(logoImage, { x: logoX, y: logoY, width: LOGO_W, height: LOGO_H });
    } else {
      currentPage.drawText("Belas Passadeiras", { x: M, y: y(48), font: bold, size: 22, color: WHITE });
      currentPage.drawText("Lavanderia & Passadoria", { x: M, y: y(70), font: regular, size: 10, color: LILAC });
    }

    const orderWidth = bold.widthOfTextAtSize(orderText, 9);
    currentPage.drawText(orderText, { x: W - M - orderWidth, y: y(42), font: bold, size: 9, color: WHITE });

    const dateWidth = regular.widthOfTextAtSize(dateStr, 8);
    currentPage.drawText(dateStr, { x: W - M - dateWidth, y: y(58), font: regular, size: 8, color: WHITE });

    const pageText = `Página ${pageNum} de ${totalPages}`;
    const pageWidth = regular.widthOfTextAtSize(pageText, 8);
    currentPage.drawText(pageText, { x: W - M - pageWidth, y: y(82), font: regular, size: 8, color: LILAC });
  }

  function drawCompactHeader(currentPage: PDFPage, pageNum: number, totalPages: number) {
    currentPage.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: PLUM });

    const pageText = `Página ${pageNum} de ${totalPages}`;
    const pageWidth = regular.widthOfTextAtSize(pageText, 8);
    currentPage.drawText(pageText, { x: W - M - pageWidth, y: y(82), font: regular, size: 8, color: LILAC });
  }

  function drawFooter(currentPage: PDFPage) {
    const footerY = 40;
    currentPage.drawLine({
      start: { x: M, y: footerY + 10 },
      end: { x: W - M, y: footerY + 10 },
      thickness: 0.5,
      color: GRAY_LIGHT,
    });
    const thankYou = "Obrigada pela preferência! — Belas Passadeiras";
    const tw = regular.widthOfTextAtSize(thankYou, 8);
    currentPage.drawText(thankYou, { x: W / 2 - tw / 2, y: footerY, font: regular, size: 8, color: PINK });
  }

  async function checkPage(currentCursor: number): Promise<{ page: PDFPage; cursor: number }> {
    if (currentCursor > H - 120) {
      page = pdfDoc.addPage([W, H]);
      pageCountRef.count++;
      return { page, cursor: HEADER_H + 10 };
    }
    return { page, cursor: currentCursor };
  }

  let cursor = HEADER_H + 15;

  function section(title: string) {
    page.drawText(sanitizeWinAnsi(title), { x: M, y: y(cursor), font: bold, size: 11, color: PLUM });
    page.drawLine({ start: { x: M, y: y(cursor + 15) }, end: { x: M + bold.widthOfTextAtSize(title, 11), y: y(cursor + 15) }, thickness: 1.5, color: PINK });
    cursor += 22;
  }

  const clientCardW = (W - M * 2 - 10) / 2;
  const employeeCardW = (W - M * 2 - 10) / 2;

  const clientFields: [string, string][] = [
    ["Nome", String(client.name || "")],
    ["WhatsApp", String(client.whatsapp || "")],
  ];
  if (client.address_city) {
    const addr = [client.address_street, client.address_number, client.address_city, client.address_state].filter(Boolean).join(", ");
    clientFields.push(["Endereço", addr]);
  }
  if (client.preferences) clientFields.push(["Preferências", String(client.preferences)]);

  const employeeFields: [string, string][] = [
    ["Nome", String((employee as Record<string, unknown>)?.name || "—")],
  ];

  const cardH = Math.max(18 + clientFields.length * 18 + 10, 18 + employeeFields.length * 18 + 10);

  page.drawRectangle({ x: M, y: y(cursor + cardH), width: clientCardW, height: cardH, color: LILAC_LIGHT, borderWidth: 0.5, borderColor: LILAC });
  page.drawText("Cliente", { x: M + 8, y: y(cursor + 16), font: bold, size: 10, color: PLUM });
  let fieldY = cursor + 30;
  clientFields.forEach(([label, value]) => {
    page.drawText(`${sanitizeWinAnsi(label)}:`, { x: M + 8, y: y(fieldY), font: bold, size: 8, color: PURPLE });
    page.drawText(sanitizeWinAnsi(value) || "—", { x: M + 80, y: y(fieldY), font: regular, size: 8, color: TEXT_DARK, maxWidth: clientCardW - 90 });
    fieldY += 16;
  });

  const employeeX = M + clientCardW + 10;
  page.drawRectangle({ x: employeeX, y: y(cursor + cardH), width: employeeCardW, height: cardH, color: LILAC_LIGHT, borderWidth: 0.5, borderColor: LILAC });
  page.drawText("Atendida por", { x: employeeX + 8, y: y(cursor + 16), font: bold, size: 10, color: PLUM });
  fieldY = cursor + 30;
  employeeFields.forEach(([label, value]) => {
    page.drawText(`${sanitizeWinAnsi(label)}:`, { x: employeeX + 8, y: y(fieldY), font: bold, size: 8, color: PURPLE });
    page.drawText(sanitizeWinAnsi(value) || "—", { x: employeeX + 80, y: y(fieldY), font: regular, size: 8, color: TEXT_DARK, maxWidth: employeeCardW - 90 });
    fieldY += 16;
  });

  cursor += cardH + 20;

  section("Peças registradas");

  const tableCols = [
    { key: "num", label: "#", width: 30, align: "center" as const },
    { key: "desc", label: "Descrição", width: 285, align: "left" as const },
    { key: "size", label: "Tamanho", width: 100, align: "left" as const },
    { key: "qty", label: "Qtd", width: 80, align: "center" as const },
  ];
  const tableX = M;
  const tableW = W - M * 2;
  const rowH = 22;
  const tableHeaderH = 26;

  let tableCursor = cursor;

  async function drawTableHeader(pageToDraw: PDFPage, topY: number) {
    pageToDraw.drawRectangle({ x: tableX, y: y(topY) - tableHeaderH, width: tableW, height: tableHeaderH, color: PLUM });
    let colX = tableX;
    tableCols.forEach((col) => {
      const tw = regular.widthOfTextAtSize(col.label, 9);
      const tx = col.align === "center" ? colX + (col.width - tw) / 2 : colX + 4;
      pageToDraw.drawText(col.label, { x: tx, y: y(topY) - tableHeaderH + 8, font: bold, size: 9, color: WHITE });
      colX += col.width;
    });
  }

  await drawTableHeader(page, tableCursor);
  tableCursor += tableHeaderH;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const check = await checkPage(tableCursor);
    page = check.page;
    tableCursor = check.cursor;

    if (tableCursor === HEADER_H + 10) {
      await drawTableHeader(page, tableCursor);
      tableCursor += tableHeaderH;
    }

    const bgColor = i % 2 === 0 ? WHITE : LILAC_LIGHT;
    page.drawRectangle({ x: tableX, y: y(tableCursor) - rowH, width: tableW, height: rowH, color: bgColor });

    const desc = sanitizeWinAnsi(String(item.manual_description || item.ai_description || "Peça"));
    const size = item.size ? sanitizeWinAnsi(String(item.size)) : "";
    const qty = String(Number(item.quantity) || 1);

    let colX = tableX;
    const numText = String(i + 1);
    page.drawText(numText, { x: colX + (tableCols[0].width - regular.widthOfTextAtSize(numText, 9)) / 2, y: y(tableCursor) - rowH + 6, font: regular, size: 9, color: TEXT_DARK });
    colX += tableCols[0].width;

    page.drawText(desc, { x: colX + 4, y: y(tableCursor) - rowH + 6, font: regular, size: 9, color: TEXT_DARK, maxWidth: tableCols[1].width - 8 });
    colX += tableCols[1].width;

    page.drawText(size, { x: colX + 4, y: y(tableCursor) - rowH + 6, font: regular, size: 9, color: TEXT_MEDIUM, maxWidth: tableCols[2].width - 8 });
    colX += tableCols[2].width;

    page.drawText(qty, { x: colX + (tableCols[3].width - regular.widthOfTextAtSize(qty, 9)) / 2, y: y(tableCursor) - rowH + 6, font: regular, size: 9, color: TEXT_DARK });


    tableCursor += rowH;
  }

  cursor = tableCursor + 30;

  const summaryCheck = await checkPage(cursor);
  page = summaryCheck.page;
  cursor = summaryCheck.cursor;

  section("Resumo do pedido");
  cursor += 8;

  let volumes: Record<string, unknown>[] = [];
  try { volumes = JSON.parse(String(order.volumes_json || "[]")); } catch { }

  if (volumes.length > 0) {
    page.drawText("Volumes:", { x: M, y: y(cursor), font: bold, size: 10, color: PLUM });
    cursor += 18;
    volumes.forEach((v) => {
      if (Number(v.quantidade) > 0) {
        const label = `${sanitizeWinAnsi(String(v.nome))} × ${v.quantidade}`;
        page.drawText(`• ${label}`, { x: M + 10, y: y(cursor), font: regular, size: 9, color: TEXT_DARK });
        cursor += 16;
      }
    });
    cursor += 6;
  }

  if (Number(order.avulsos) > 0) {
    page.drawText(`Peças avulsas × ${order.avulsos}`, { x: M, y: y(cursor), font: regular, size: 9, color: TEXT_DARK });
    cursor += 18;
  }

  cursor += 10;

  const totalPages = pageCountRef.count;
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const p = pdfDoc.getPage(i);
    if (i === 0) {
      drawFullHeader(p, 1, totalPages);
    } else {
      drawCompactHeader(p, i + 1, totalPages);
    }
    drawFooter(p);
  }

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  const filename = `pedido_${order.id}_${Date.now()}.pdf`;
  const publicUrl = await uploadBuffer("pdfs", filename, buffer, "application/pdf");
  return { publicUrl, filename };
}