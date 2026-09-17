import axios from "axios";

// WAHA (WhatsApp HTTP API) – preferencial
const WAHA_URL = process.env.WAHA_API_URL;
const WAHA_KEY = process.env.WAHA_API_KEY;
const WAHA_SESSION = process.env.WAHA_SESSION || "default";

// Evolution API – legado/fallback
const EVO_BASE = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE;

function formatChatId(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `${phone}@c.us`;
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function enviarPdf(whatsapp: string, pdfUrl: string, clientName: string): Promise<boolean> {
  // 1. Tenta envio via WAHA
  if (WAHA_URL) {
    try {
      const chatId = formatChatId(whatsapp);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (WAHA_KEY) {
        headers["X-Api-Key"] = WAHA_KEY;
      }

      // Mensagem de texto
      await axios.post(
        `${WAHA_URL}/api/sendText`,
        {
          session: WAHA_SESSION,
          chatId,
          text: `Olá ${clientName}! 👗✨ Seu comprovante de entrada na lavanderia Belas Passadeiras está pronto. Obrigada pela preferência!`,
        },
        { headers }
      );

      // Envio do arquivo PDF
      await axios.post(
        `${WAHA_URL}/api/sendFile`,
        {
          session: WAHA_SESSION,
          chatId,
          file: {
            url: pdfUrl,
            filename: "comprovante.pdf",
            mimetype: "application/pdf",
          },
          caption: "Comprovante de entrada",
        },
        { headers }
      );

      return true;
    } catch (err) {
      console.error("[WhatsApp WAHA]", err);
      return false;
    }
  }

  // 2. Fallback Evolution API
  if (EVO_BASE && EVO_KEY && EVO_INSTANCE) {
    try {
      const phone = formatPhone(whatsapp);
      const evoHeaders = { apikey: EVO_KEY, "Content-Type": "application/json" };

      await axios.post(
        `${EVO_BASE}/message/sendText/${EVO_INSTANCE}`,
        { number: phone, text: `Olá ${clientName}! 👗✨ Seu comprovante de entrada na lavanderia Belas Passadeiras está pronto. Obrigada pela preferência!` },
        { headers: evoHeaders }
      );
      await axios.post(
        `${EVO_BASE}/message/sendMedia/${EVO_INSTANCE}`,
        { number: phone, mediatype: "document", media: pdfUrl, fileName: "comprovante.pdf", caption: "Comprovante de entrada" },
        { headers: evoHeaders }
      );
      return true;
    } catch (err) {
      console.error("[WhatsApp Evolution]", err);
      return false;
    }
  }

  return false;
}
