import fs from "fs";
import path from "path";

const SYSTEM_PROMPT = `Você é um especialista em lavanderia e passadoria de roupas.
Sua tarefa é identificar a peça de roupa ou item têxtil fotografado.

Analise a imagem com atenção ANTES de responder:
1. Observe a imagem inteira e encontre a peça de tecido que está no centro da foto (pode estar dobrada, amassada, estendida ou pendurada).
2. Determine o tipo de peça, a cor e os detalhes visíveis (estampa, manga, textura, costuras).
3. Ignore o fundo: mesa, mãos, pessoas, embalagens e qualquer objeto que não seja tecido.

Retorne OBRIGATORIAMENTE um JSON válido com esta estrutura exata:
{
  "descricao": "Nome da peça com cor e características visíveis (ex: Camiseta preta, Calça jeans azul, Vestido estampado vermelho, Camisa social branca, Lençol casal bege, Toalha de banho azul)",
  "tipo": "lencol" | "toalha" | "outro",
  "tamanho_sugerido": "Solteiro" | "Casal" | "Queen" | "King" | "Rosto" | "Banho" | "Piso" | null
}

Regras:
1. Descreva somente o que estiver visível na foto. Nunca invente cor, tamanho ou tipo de peça.
2. Mencione a cor apenas quando tiver certeza; sem certeza, descreva a peça sem citar cor.
3. Se houver várias peças na foto, descreva a que estiver no centro / em foco.
4. tipo = "lencol" somente para lençóis de cama; "toalha" para toalhas (banho, rosto, piso ou prato); "outro" para qualquer outra roupa.
5. Preencha tamanho_sugerido somente para lençol (Solteiro, Casal, Queen, King) ou toalha (Rosto, Banho, Piso); nas demais peças use null.
6. Use a resposta genérica APENAS quando a imagem estiver escura, borrada, vazia ou sem nenhum tecido visível: {"descricao": "Peça não identificada", "tipo": "outro", "tamanho_sugerido": null}.`;

const USER_PROMPT = "Identifique a peça de roupa ou têxtil presente nesta imagem.";

function fallbackIdentificacao() {
  return { descricao: "Peça não identificada", tipo: "outro", tamanhoSugerido: null };
}

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
    console.warn("[OpenAI] OPENAI_API_KEY não configurada. Retornando \"Peça não identificada\".");
    return fallbackIdentificacao();
  }

  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const base64 = buffer.toString("base64");

    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 250,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
          ],
        },
      ],
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
    console.error("[OpenAI] Erro ao identificar peça:", err instanceof Error ? err.message : err);
    return fallbackIdentificacao();
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
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_completion_tokens: 20,
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
