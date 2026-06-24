import axios from "axios";

const BASE = process.env.EVOLUTION_API_URL;
const KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE;

function headers() {
  return { apikey: KEY!, "Content-Type": "application/json" };
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function enviarPdf(whatsapp: string, pdfUrl: string, clientName: string): Promise<boolean> {
  if (!BASE || !KEY || !INSTANCE) return false;
  try {
    const phone = formatPhone(whatsapp);
    await axios.post(
      `${BASE}/message/sendText/${INSTANCE}`,
      { number: phone, text: `Olá ${clientName}! 👗✨ Seu comprovante de entrada na lavanderia Belas Passadeiras está pronto. Obrigada pela preferência!` },
      { headers: headers() }
    );
    await axios.post(
      `${BASE}/message/sendMedia/${INSTANCE}`,
      { number: phone, mediatype: "document", media: pdfUrl, fileName: "comprovante.pdf", caption: "Comprovante de entrada" },
      { headers: headers() }
    );
    return true;
  } catch (err) {
    console.error("[WhatsApp]", err);
    return false;
  }
}
