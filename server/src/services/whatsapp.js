const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Evolution API – https://evolution-api.com
// Define EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no .env

function getClient() {
  const baseURL = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseURL || !apiKey) return null;
  return axios.create({
    baseURL,
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    timeout: 15000,
  });
}

function normalizeWhatsapp(numero) {
  const digits = numero.replace(/\D/g, "");
  // Adiciona código do Brasil se ausente
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function enviarPdf(whatsapp, pdfPath, clienteNome) {
  const client = getClient();
  if (!client) {
    console.warn("[WhatsApp] Evolution API não configurada. PDF não enviado.");
    return false;
  }

  const instance = process.env.EVOLUTION_INSTANCE;
  const numero = normalizeWhatsapp(whatsapp);

  try {
    // 1. Mensagem de texto
    await client.post(`/message/sendText/${instance}`, {
      number: numero,
      text: `Olá, *${clienteNome}*! 👗✨\n\nSeu comprovante de entrada na *Belas Passadeiras* está pronto. Segue em anexo!\n\nAgradecemos pela preferência. 💛`,
    });

    // 2. PDF como documento
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64 = pdfBuffer.toString("base64");
    const filename = path.basename(pdfPath);

    await client.post(`/message/sendMedia/${instance}`, {
      number: numero,
      mediatype: "document",
      mimetype: "application/pdf",
      caption: "Comprovante de entrada",
      media: base64,
      fileName: filename,
    });

    return true;
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar:", err.response?.data ?? err.message);
    return false;
  }
}

module.exports = { enviarPdf };
