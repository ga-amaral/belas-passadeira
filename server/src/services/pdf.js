const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const PDF_DIR = path.resolve(__dirname, "../../pdfs");
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

const PLUM = "#6B3267";
const PURPLE = "#A359A0";
const LILAC = "#C197D2";
const LILAC_LIGHT = "#F6F0F9";
const PINK = "#F652A0";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#381F36";
const TEXT_MEDIUM = "#5A3F57";
const GRAY_LIGHT = "#E6DDE8";

const LOGO_PATH = path.resolve(__dirname, "../../../public/brand/logo-white.png");
const LOGO_W = 150;
const LOGO_H = LOGO_W * 503 / 1446;
const HEADER_H = 100;
const M = 50;

function sanitizeWinAnsi(str) {
  return String(str).replace(/[^\u0000-\u00FF]/g, "?");
}

function gerarPdf({ order, client, items, employee }) {
  return new Promise((resolve, reject) => {
    const filename = `pedido_${order.id}_${Date.now()}.pdf`;
    const filePath = path.join(PDF_DIR, filename);

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
      autoFirstPage: false,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;
    const pageCountRef = { count: 0 };
    let logoImage = null;

    try {
      if (fs.existsSync(LOGO_PATH)) {
        logoImage = LOGO_PATH;
      }
    } catch {}

    const dateStr = order.created_at
      ? new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : new Date().toLocaleDateString("pt-BR");
    const orderText = `Pedido #${order.id}`;

    function addPage() {
      doc.addPage();
      pageCountRef.count++;
      return doc;
    }

    function drawFullHeader(pageNum, totalPages) {
      doc.rect(0, 0, W, HEADER_H).fill(PLUM);

      if (logoImage) {
        try {
          const img = doc.openImage(logoImage);
          const logoX = M;
          const logoY = (HEADER_H - LOGO_H) / 2;
          doc.image(img, logoX, logoY, { width: LOGO_W, height: LOGO_H });
        } catch {
          drawHeaderFallback();
        }
      } else {
        drawHeaderFallback();
      }

      function drawHeaderFallback() {
        doc.fillColor(WHITE)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Belas Passadeiras", M, 30);
        doc.font("Helvetica")
          .fontSize(10)
          .fillColor(LILAC)
          .text("Lavanderia & Passadoria", M, 58);
      }

      doc.fillColor(WHITE)
        .font("Helvetica-Bold")
        .fontSize(9);
      const orderWidth = doc.widthOfString(orderText);
      doc.text(orderText, W - M - orderWidth, 30);

      doc.font("Helvetica")
        .fontSize(8);
      const dateWidth = doc.widthOfString(dateStr);
      doc.text(dateStr, W - M - dateWidth, 50);

      const pageText = `Página ${pageNum} de ${totalPages}`;
      doc.font("Helvetica")
        .fontSize(8)
        .fillColor(LILAC);
      const pageWidth = doc.widthOfString(pageText);
      doc.text(pageText, W - M - pageWidth, 74);
    }

    function drawCompactHeader(pageNum, totalPages) {
      doc.rect(0, 0, W, HEADER_H).fill(PLUM);

      const pageText = `Página ${pageNum} de ${totalPages}`;
      doc.font("Helvetica")
        .fontSize(8)
        .fillColor(LILAC);
      const pageWidth = doc.widthOfString(pageText);
      doc.text(pageText, W - M - pageWidth, 74);
    }

    function drawFooter() {
      const footerY = 40;
      doc.moveTo(M, footerY + 10)
        .lineTo(W - M, footerY + 10)
        .lineWidth(0.5)
        .stroke(GRAY_LIGHT);
      const thankYou = "Obrigada pela preferência! — Belas Passadeiras";
      doc.font("Helvetica")
        .fontSize(8)
        .fillColor(PINK);
      const tw = doc.widthOfString(thankYou);
      doc.text(thankYou, W / 2 - tw / 2, footerY, { align: "center" });
    }

    function section(title) {
      doc.fillColor(PLUM)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(sanitizeWinAnsi(title), M, doc.y);
      const titleWidth = doc.widthOfString(title);
      doc.moveTo(M, doc.y + 15)
        .lineTo(M + titleWidth, doc.y + 15)
        .lineWidth(1.5)
        .stroke(PINK);
      doc.y += 22;
    }

    function drawCard(title, fields, x, width) {
      const cardH = 18 + fields.length * 18 + 10;
      doc.rect(x, doc.y, width, cardH)
        .fillAndStroke(LILAC_LIGHT, LILAC);
      doc.fillColor(PLUM)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(title, x + 8, doc.y + 8);

      let fieldY = doc.y + 22;
      fields.forEach(([label, value]) => {
        doc.fillColor(PURPLE)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(`${sanitizeWinAnsi(label)}:`, x + 8, fieldY, { width: 70 });
        doc.fillColor(TEXT_DARK)
          .font("Helvetica")
          .fontSize(8)
          .text(sanitizeWinAnsi(value) || "—", x + 80, fieldY, { width: width - 90 });
        fieldY += 16;
      });
      return cardH;
    }

    function drawTableHeader(y) {
      const headerH = 26;
      const tableW = W - M * 2;
      const cols = [
        { key: "num", label: "#", width: 30, align: "center" },
        { key: "desc", label: "Descrição", width: 280, align: "left" },
        { key: "size", label: "Tamanho", width: 80, align: "left" },
        { key: "qty", label: "Qtd", width: 40, align: "center" },
        { key: "type", label: "Tipo", width: 80, align: "center" },
      ];

      doc.rect(M, y, tableW, headerH).fill(PLUM);
      let colX = M;
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9);
      cols.forEach((col) => {
        const tw = doc.widthOfString(col.label);
        const tx = col.align === "center" ? colX + (col.width - tw) / 2 : colX + 4;
        doc.text(col.label, tx, y + 8);
        colX += col.width;
      });
      return headerH;
    }

    function drawTableRow(item, index, y, isEven) {
      const rowH = 22;
      const tableW = W - M * 2;
      const cols = [
        { key: "num", width: 30, align: "center" },
        { key: "desc", width: 280, align: "left" },
        { key: "size", width: 80, align: "left" },
        { key: "qty", width: 40, align: "center" },
        { key: "type", width: 80, align: "center" },
      ];

      const bgColor = isEven ? WHITE : LILAC_LIGHT;
      doc.rect(M, y, tableW, rowH).fill(bgColor);

      const desc = sanitizeWinAnsi(String(item.manual_description || item.ai_description || "Peça"));
      const size = item.size ? sanitizeWinAnsi(String(item.size)) : "";
      const qty = String(Number(item.quantity) || 1);
      const type = item.is_avulso ? "Avulsa" : "Volume";

      let colX = M;
      doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9);

      const numText = String(index + 1);
      const numW = doc.widthOfString(numText);
      doc.text(numText, colX + (cols[0].width - numW) / 2, y + 6);
      colX += cols[0].width;

      doc.text(desc, colX + 4, y + 6, { width: cols[1].width - 8 });
      colX += cols[1].width;

      doc.fillColor(TEXT_MEDIUM).text(size, colX + 4, y + 6, { width: cols[2].width - 8 });
      colX += cols[2].width;

      doc.fillColor(TEXT_DARK);
      const qtyW = doc.widthOfString(qty);
      doc.text(qty, colX + (cols[3].width - qtyW) / 2, y + 6);
      colX += cols[3].width;

      doc.fillColor(PURPLE);
      const typeW = doc.widthOfString(type);
      doc.text(type, colX + (cols[4].width - typeW) / 2, y + 6);

      return rowH;
    }

    addPage();
    drawFullHeader(1, 1);

    doc.y = HEADER_H + 15;

    const cardW = (W - M * 2 - 10) / 2;

    const clientFields = [
      ["Nome", String(client.name || "")],
      ["WhatsApp", String(client.whatsapp || "")],
    ];
    if (client.address_city) {
      const addr = [client.address_street, client.address_number, client.address_city, client.address_state]
        .filter(Boolean).join(", ");
      clientFields.push(["Endereço", addr]);
    }
    if (client.preferences) clientFields.push(["Preferências", String(client.preferences)]);

    const employeeFields = [
      ["Nome", String(employee?.name || "—")],
    ];

    const cardH = Math.max(
      18 + clientFields.length * 18 + 10,
      18 + employeeFields.length * 18 + 10
    );

    drawCard("Cliente", clientFields, M, cardW);
    const clientCardBottom = doc.y + cardH;
    drawCard("Atendida por", employeeFields, M + cardW + 10, cardW);
    doc.y = Math.max(clientCardBottom, doc.y) + 20;

    section("Peças registradas");

    let tableY = doc.y;
    const headerH = drawTableHeader(tableY);
    tableY += headerH;

    items.forEach((item, i) => {
      if (tableY + 22 > H - 120) {
        addPage();
        drawCompactHeader(pageCountRef.count, 1);
        tableY = HEADER_H + 10;
        const newHeaderH = drawTableHeader(tableY);
        tableY += newHeaderH;
      }

      const rowH = drawTableRow(item, i, tableY, i % 2 === 0);
      tableY += rowH;
    });

    doc.y = tableY + 16;

    if (doc.y > H - 120) {
      addPage();
      drawCompactHeader(pageCountRef.count, 1);
    }

    section("Resumo do pedido");

    let volumes = [];
    try { volumes = JSON.parse(order.volumes_json || "[]"); } catch {}

    if (volumes.length > 0) {
      doc.fillColor(PLUM).font("Helvetica-Bold").fontSize(10).text("Volumes:", M, doc.y);
      doc.y += 18;
      volumes.forEach((v) => {
        if (Number(v.quantidade) > 0) {
          const label = `${sanitizeWinAnsi(String(v.nome))} × ${v.quantidade}`;
          doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9).text(`• ${label}`, M + 10, doc.y);
          doc.y += 16;
        }
      });
      doc.y += 6;
    }

    if (Number(order.avulsos) > 0) {
      doc.fillColor(TEXT_DARK).font("Helvetica").fontSize(9).text(`Peças avulsas × ${order.avulsos}`, M, doc.y);
      doc.y += 18;
    }

    const totalPages = pageCountRef.count;
    for (let i = 0; i < doc.bufferedPageRange().count; i++) {
      doc.switchToPage(i);
      if (i === 0) {
        drawFullHeader(1, totalPages);
      } else {
        drawCompactHeader(i + 1, totalPages);
      }
      drawFooter();
    }

    doc.end();
    stream.on("finish", () => resolve({ filePath, filename }));
    stream.on("error", reject);
  });
}

module.exports = { gerarPdf };