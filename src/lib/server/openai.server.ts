const PROMPT = `Você é um sistema de identificação de peças de roupa para lavanderia.
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

const MOCK = [
  { descricao: "Camisa social branca masculina", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Calça jeans azul", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Vestido floral colorido", tipo: "outro", tamanhoSugerido: null },
  { descricao: "Lençol de casal bege", tipo: "lencol", tamanhoSugerido: "Casal" },
  { descricao: "Toalha de banho azul", tipo: "toalha", tamanhoSugerido: "Banho" },
];

export async function identificarPeca(buffer: Buffer, mimeType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return MOCK[Math.floor(Math.random() * MOCK.length)];

  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const base64 = buffer.toString("base64");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
        ],
      }],
    });

    const text = res.choices[0]?.message?.content?.trim() ?? "{}";
    const json = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
    return {
      descricao: json.descricao || "Peça de roupa",
      tipo: ["lencol", "toalha", "outro"].includes(json.tipo) ? json.tipo : "outro",
      tamanhoSugerido: json.tamanho_sugerido || null,
    };
  } catch (err) {
    console.error("[OpenAI]", err);
    return MOCK[Math.floor(Math.random() * MOCK.length)];
  }
}
