import fs from "fs";
import path from "path";

const PROMPT = `Você é um especialista em lavanderia e passadoria de roupas.
Analise a imagem e identifique a peça de roupa ou item têxtil visível (mesmo dobrada, estendida ou pendurada).

Retorne OBRIGATORIAMENTE um JSON válido com esta estrutura exata:
{
  "descricao": "Nome da peça com cor principal e características visíveis (ex: Camiseta preta, Calça jeans azul, Vestido estampado vermelho, Camisa social branca, Lençol casal bege, Toalha de banho azul)",
  "tipo": "lencol" | "toalha" | "outro",
  "tamanho_sugerido": "Solteiro" | "Casal" | "Queen" | "King" | "Rosto" | "Banho" | "Piso" | null
}

Regras:
1. Sempre descreva a cor e o tipo da peça quando for uma roupa ou têxtil reconhecível.
2. Se a imagem for totalmente preta, vazia ou irreconhecível, retorne "Peça de roupa".
3. Se for lençol ou toalha, sugira o tamanho provável em tamanho_sugerido; para outras peças, use null.`;

const MOCK = [
  { descricao: "Camisa social branca masculina", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Calça jeans azul", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Vestido floral colorido", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Lençol de casal bege", tipo: "lencol", tamanhoSugerido: "Casal" },
  { descricao: "Toalha de banho azul", tipo: "toalha", tamanhoSugerido: "Banho" },
];

function getApiKey(): string | undefined {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), "server/.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/OPENAI_API_KEY=([^\r\n]+)/);
      if (match) return match[1].trim();
    }
  } catch {}
  return undefined;
}

export async function identificarPeca(buffer: Buffer, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[OpenAI] Nenhuma OPENAI_API_KEY configurada. Usando mock.");
    return MOCK[Math.floor(Math.random() * MOCK.length)];
  }

  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const base64 = buffer.toString("base64");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 250,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
        ],
      }],
    });

    const text = res.choices[0]?.message?.content?.trim() ?? "{}";
    let json: { descricao?: string; tipo?: string; tamanho_sugerido?: string | null } = {};
    try {
      json = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json\n?|```/g, "").trim();
      json = JSON.parse(cleaned);
    }

    return {
      descricao: json.descricao || "Peça de roupa",
      tipo: ["lencol", "toalha", "outro"].includes(json.tipo || "") ? (json.tipo as string) : "outro",
      tamanhoSugerido: json.tamanho_sugerido || null,
    };
  } catch (err) {
    console.error("[OpenAI] Erro ao chamar gpt-4o-mini:", err instanceof Error ? err.message : err);
    return MOCK[Math.floor(Math.random() * MOCK.length)];
  }
}


const DETECT_PROMPT = `Veja a imagem de uma câmera apontada para uma mesa/bancada de lavanderia.
Responda OBRIGATORIAMENTE um JSON: {"tem_peca": true | false}
tem_peca = true somente se houver uma peça de roupa ou item têxtil (roupa, lençol, toalha, pano) claramente visível e posicionado para ser fotografado.
tem_peca = false se a imagem mostrar apenas bancada vazia, parede, mãos, pessoas, objetos sem tecido ou estiver escura/borrada.`;

// Verificação barata (imagem em baixa resolução) para decidir se vale iniciar a captura automática.
// Lança erro quando não há chave/falha na API: quem chama NÃO deve tratar isso como "tem peça".
export async function detectarPeca(buffer: Buffer, mimeType: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 20,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: DETECT_PROMPT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}`, detail: "low" } },
      ],
    }],
  });
  const json = JSON.parse(res.choices[0]?.message?.content?.trim() ?? "{}") as { tem_peca?: boolean };
  return json.tem_peca === true;
}
