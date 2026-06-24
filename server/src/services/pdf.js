const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const PDF_DIR = path.resolve(__dirname, "../../pdfs");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// Cores da marca
const GOLD = "#D4AF37";
const ROSE = "#C9A9A6";
const BROWN = "#4A3F35";
const BG = "#FAF7F2";

function gerarPdf({ order, client, items, employee }) {
  return new Promise((resolve, reject) => {
    const filename = `pedido_${order.id}_${Date.now()}.pdf`;
    const filePath = path.join(PDF_DIR, filename);

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, left: 50, right: 50, bottom: 50 },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill(BROWN);
    doc.fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Belas Passadeiras", 50, 30);
    doc.font("Helvetica")
      .fontSize(10)
      .fillColor(GOLD)
      .text("Lavanderia & Passadoria", 50, 58);
    doc.fillColor("white")
      .fontSize(9)
      .text(`Pedido #${order.id}`, doc.page.width - 150, 35, { align: "right" });
    doc.text(
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(order.created_at || Date.now())),
      doc.page.width - 250,
      50,
      { align: "right" }
    );

    let y = 120;

    // Info do cliente
    sectionTitle(doc, "Cliente", y);
    y += 22;
    infoRow(doc, "Nome", client.name, y); y += 18;
    infoRow(doc, "WhatsApp", client.whatsapp, y); y += 18;
    if (client.address_city) {
      const addr = [client.address_street, client.address_number, client.address_neighborhood, client.address_city, client.address_state]
        .filter(Boolean).join(", ");
      infoRow(doc, "Endereço", addr, y); y += 18;
    }
    if (client.preferences) {
      infoRow(doc, "Preferências", client.preferences, y); y += 18;
    }

    y += 10;
    divider(doc, y); y += 16;

    // Funcionária
    infoRow(doc, "Atendida por", employee?.name || "—", y); y += 26;

    // Peças
    sectionTitle(doc, "Peças registradas", y); y += 22;
    doc.font("Helvetica").fontSize(9).fillColor(BROWN);

    items.forEach((item, i) => {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }
      const desc = item.manual_description || item.ai_description || "Peça";
      const size = item.size ? ` – ${item.size}` : "";
      const avulso = item.is_avulso ? " [avulso]" : "";

      doc.rect(50, y, doc.page.width - 100, 20).fill("#F5F0E8");
      doc.fillColor(BROWN)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`${i + 1}.`, 55, y + 5, { width: 20 });
      doc.font("Helvetica")
        .text(`${desc}${size}${avulso}`, 75, y + 5, { width: doc.page.width - 130 });
      y += 24;
    });

    y += 10;
    divider(doc, y); y += 16;

    // Resumo financeiro
    sectionTitle(doc, "Resumo financeiro", y); y += 22;

    let volumes = [];
    try { volumes = JSON.parse(order.volumes_json || "[]"); } catch { /* */ }

    volumes.forEach((v) => {
      if (v.quantidade > 0) {
        lineItem(doc, `${v.nome} × ${v.quantidade}`, formatBRL(v.quantidade * v.preco), y);
        y += 18;
      }
    });

    if (order.avulsos > 0) {
      lineItem(doc, `Peças avulsas × ${order.avulsos}`, "—", y);
      y += 18;
    }

    y += 8;
    // Total box
    doc.rect(50, y, doc.page.width - 100, 36).fill(GOLD);
    doc.fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Total", 60, y + 10);
    doc.fontSize(15)
      .text(formatBRL(order.total_amount), 0, y + 8, { align: "right", width: doc.page.width - 60 });

    y += 56;

    // Footer
    doc.fontSize(8).fillColor(ROSE).font("Helvetica")
      .text("Obrigada pela preferência! 💛 Belas Passadeiras", 50, y, { align: "center" });

    doc.end();
    stream.on("finish", () => resolve({ filePath, filename }));
    stream.on("error", reject);
  });
}

function sectionTitle(doc, text, y) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BROWN).text(text, 50, y);
  doc.moveTo(50, y + 14).lineTo(50 + doc.widthOfString(text), y + 14).stroke(GOLD);
}

function infoRow(doc, label, value, y) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ROSE).text(`${label}:`, 50, y, { width: 90 });
  doc.font("Helvetica").fontSize(9).fillColor(BROWN).text(value || "—", 145, y, { width: 350 });
}

function lineItem(doc, label, value, y) {
  doc.font("Helvetica").fontSize(9).fillColor(BROWN).text(label, 50, y);
  doc.text(value, 0, y, { align: "right", width: doc.page.width - 60 });
}

function divider(doc, y) {
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(0.5).stroke("#E0D8CE");
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

module.exports = { gerarPdf };
