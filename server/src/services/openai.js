const fs = require("fs");
const path = require("path");

const SYSTEM_PROMPT = `Você é um sistema de identificação de peças de roupa para lavanderia.
Analise a imagem e identifique a peça de roupa ou têxtil visível.

Retorne APENAS um JSON válido com estas chaves (sem markdown, sem texto extra):
{
  "descricao": "descrição objetiva da peça com cor e tipo (ex: Blusa feminina azul, Calça jeans preta, Lençol casal branco)",
  "tipo": "lencol" | "toalha" | "outro",
  "tamanho_sugerido": "Solteiro" | "Casal" | "Queen" | "King" | "Rosto" | "Banho" | "Piso" | null
}

Regras:
- Se não conseguir identificar nenhuma peça, use descricao: "Peça não identificada"
- tamanho_sugerido só é preenchido para lencol ou toalha, caso contrário null
- descricao deve sempre mencionar a cor quando visível`;

async function identificarPeca(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback sem API key
  if (!apiKey) {
    return mockIdentificacao();
  }

  try {
    const { OpenAI } = require("openai");
    const openai = new OpenAI({ apiKey });

    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(imagePath).slice(1).toLowerCase() || "jpeg";
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
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
    return mockIdentificacao();
  }
}

function mockIdentificacao() {
  const itens = [
    { descricao: "Camisa social branca masculina", tipo: "outro", tamanhoSugerido: null },
    { descricao: "Calça jeans azul", tipo: "outro", tamanhoSugerido: null },
    { descricao: "Vestido floral colorido", tipo: "outro", tamanhoSugerido: null },
    { descricao: "Lençol de casal bege", tipo: "lencol", tamanhoSugerido: "Casal" },
    { descricao: "Toalha de banho azul", tipo: "toalha", tamanhoSugerido: "Banho" },
    { descricao: "Toalha de rosto branca", tipo: "toalha", tamanhoSugerido: "Rosto" },
    { descricao: "Bermuda xadrez", tipo: "outro", tamanhoSugerido: null },
    { descricao: "Lençol king size branco", tipo: "lencol", tamanhoSugerido: "King" },
  ];
  return itens[Math.floor(Math.random() * itens.length)];
}

module.exports = { identificarPeca };
