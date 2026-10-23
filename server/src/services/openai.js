const fs = require("fs");
const path = require("path");

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

async function identificarPeca(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback sem API key: nunca inventa descrição
  if (!apiKey) {
    console.warn("[OpenAI] OPENAI_API_KEY não configurada. Retornando \"Peça não identificada\".");
    return fallbackIdentificacao();
  }

  try {
    const { OpenAI } = require("openai");
    const openai = new OpenAI({ apiKey });

    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(imagePath).slice(1).toLowerCase() || "jpeg";
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "{}";
    console.log("[OpenAI] Resposta bruta:", text);
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const json = JSON.parse(cleaned);
    const result = {
      descricao: json.descricao || "Peça de roupa",
      tipo: ["lencol","toalha","outro"].includes(json.tipo) ? json.tipo : "outro",
      tamanhoSugerido: json.tamanho_sugerido || null,
    };
    console.log("[OpenAI] Identificado:", result);
    return result;
  } catch (err) {
    console.error("[OpenAI] Erro ao identificar peça:", err.message);
    return fallbackIdentificacao();
  }
}

function fallbackIdentificacao() {
  return { descricao: "Peça não identificada", tipo: "outro", tamanhoSugerido: null };
}

module.exports = { identificarPeca };
