const axios = require("axios");
const fs = require("fs");
const path = require("path");

// WAHA (WhatsApp HTTP API) – https://waha.devlike.pro
// Define WAHA_API_URL, WAHA_API_KEY e WAHA_SESSION no .env

function getWahaClient() {
  const baseURL = process.env.WAHA_API_URL;
  if (!baseURL) return null;
  const headers = { "Content-Type": "application/json" };
  if (process.env.WAHA_API_KEY) {
    headers["X-Api-Key"] = process.env.WAHA_API_KEY;
  }
  return axios.create({
    baseURL,
    headers,
    timeout: 30000,
  });
}

function normalizeChatId(numero) {
  const digits = String(numero || "").replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `${phone}@c.us`;
}

async function enviarPdf(whatsapp, pdfPath, clienteNome) {
  const wahaClient = getWahaClient();
  if (wahaClient) {
    const session = process.env.WAHA_SESSION || "default";
    const chatId = normalizeChatId(whatsapp);

    try {
      // 1. Mensagem de texto
      await wahaClient.post("/api/sendText", {
        session,
        chatId,
        text: `Olá, *${clienteNome}*! 👗✨\n\nSeu comprovante de entrada na *Belas Passadeiras* está pronto. Segue em anexo!\n\nAgradecemos pela preferência. 💛`,
      });

      // 2. PDF como documento
      const pdfBuffer = fs.readFileSync(pdfPath);
      const base64 = pdfBuffer.toString("base64");
      const filename = path.basename(pdfPath);

      await wahaClient.post("/api/sendFile", {
        session,
        chatId,
        file: {
          url: `data:application/pdf;base64,${base64}`,
          filename,
          mimetype: "application/pdf",
        },
        caption: "Comprovante de entrada",
      });

      return true;
    } catch (err) {
      console.error("[WhatsApp WAHA] Erro ao enviar:", err.response?.data ?? err.message);
      return false;
    }
  }

  // Fallback: Evolution API se configurada
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const evolutionInstance = process.env.EVOLUTION_INSTANCE;

  if (evolutionUrl && evolutionKey && evolutionInstance) {
    try {
      const evoClient = axios.create({
        baseURL: evolutionUrl,
        headers: { apikey: evolutionKey, "Content-Type": "application/json" },
        timeout: 15000,
      });
      const digits = String(whatsapp || "").replace(/\D/g, "");
      const numero = digits.startsWith("55") ? digits : `55${digits}`;

      await evoClient.post(`/message/sendText/${evolutionInstance}`, {
        number: numero,
        text: `Olá, *${clienteNome}*! 👗✨\n\nSeu comprovante de entrada na *Belas Passadeiras* está pronto. Segue em anexo!\n\nAgradecemos pela preferência. 💛`,
      });

      const pdfBuffer = fs.readFileSync(pdfPath);
      const base64 = pdfBuffer.toString("base64");
      const filename = path.basename(pdfPath);

      await evoClient.post(`/message/sendMedia/${evolutionInstance}`, {
        number: numero,
        mediatype: "document",
        mimetype: "application/pdf",
        caption: "Comprovante de entrada",
        media: base64,
        fileName: filename,
      });

      return true;
    } catch (err) {
      console.error("[WhatsApp Evolution] Erro ao enviar:", err.response?.data ?? err.message);
      return false;
    }
  }

  console.warn("[WhatsApp] Nenhuma API configurada (WAHA ou Evolution). PDF não enviado.");
  return false;
}

module.exports = { enviarPdf };
