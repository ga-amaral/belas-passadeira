const express = require("express");
const path = require("path");
const fs = require("fs");
const { getClient } = require("../database/db");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { identificarPeca } = require("../services/openai");
const { gerarPdf } = require("../services/pdf");
const { enviarPdf } = require("../services/whatsapp");
const { uploadItemPhoto } = require("../services/storage");
const { calculateOrderPricing } = require("../services/pricing");

const router = express.Router();
router.use(authenticate);

// POST /entrada
router.post("/", upload.any(), async (req, res) => {
  const { clienteId, volumes, avulsos } = req.body;
  if (!clienteId) return res.status(400).json({ message: "clienteId é obrigatório." });

  const { data: client, error: clientErr } = await getClient()
    .from("clients").select("*").eq("id", clienteId).single();
  if (clientErr || !client) return res.status(404).json({ message: "Cliente não encontrado." });

  const employee = req.user;
  const files = req.files || [];

  let volumesData = [];
  try { volumesData = typeof volumes === "string" ? JSON.parse(volumes) : (volumes || []); } catch { /**/ }

  const { data: prices, error: pricesErr } = await getClient()
    .from("prices").select("id, name, price, type").eq("active", true);
  if (pricesErr) return res.status(500).json({ message: pricesErr.message });

  let pricing;
  try {
    pricing = calculateOrderPricing(prices || [], volumesData, avulsos);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  // Cria o pedido
  const { data: order, error: orderErr } = await getClient()
    .from("orders")
    .insert({
      client_id: clienteId, employee_id: employee.id,
      total_amount: pricing.total, volumes_json: JSON.stringify(pricing.volumes),
      avulsos: Number(avulsos), status: "recebido",
    })
    .select("*")
    .single();
  if (orderErr) return res.status(500).json({ message: orderErr.message });

  const orderId = order.id;
  const pecasFields = extractPecasFields(req.body);

  // Identifica peças com IA e grava order_items
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const descricaoManual = pecasFields[i]?.descricao || null;
    const tamanhoManual = pecasFields[i]?.tamanho || null;

    let aiResult = { descricao: "Peça de roupa", tipo: "outro", tamanhoSugerido: null };
    try { aiResult = await identificarPeca(file.path); } catch (err) { console.error("[IA] Erro:", err.message); }

    let imageUrl = null;
    try { imageUrl = await uploadItemPhoto(file.path, file.filename); } catch (err) { console.error("[Storage] Erro:", err.message); }

    await getClient().from("order_items").insert({
      order_id: orderId, image_path: file.filename, image_url: imageUrl,
      ai_description: aiResult.descricao, manual_description: descricaoManual,
      item_type: aiResult.tipo, size: tamanhoManual || aiResult.tamanhoSugerido || null,
    });
  }

  const { data: items } = await getClient().from("order_items").select("*").eq("order_id", orderId);

  let pdfPath = null;
  let whatsappSent = false;
  try {
    const pdfOrder = { ...order, volumes_json: JSON.stringify(pricing.pdfVolumes) };
    const { filePath } = await gerarPdf({ order: pdfOrder, client, items: items || [], employee });
    pdfPath = filePath;
    await getClient().from("orders").update({ pdf_path: path.basename(filePath) }).eq("id", orderId);
    whatsappSent = await enviarPdf(client.whatsapp, filePath, client.name);
    await getClient().from("orders").update({ whatsapp_sent: whatsappSent }).eq("id", orderId);
  } catch (err) { console.error("[PDF/WhatsApp] Erro:", err.message); }

  return res.status(201).json({
    id: orderId, success: whatsappSent, pdfGerado: !!pdfPath,
    message: whatsappSent ? "Pedido registrado e PDF enviado pelo WhatsApp." : "Pedido registrado. Falha ao enviar WhatsApp.",
  });
});

// GET /entradas
router.get("/", requireAdmin, async (req, res) => {
  const { dataInicio, dataFim, clienteId, funcionariaId, search } = req.query;

  let q = getClient()
    .from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (dataInicio) q = q.gte("created_at", dataInicio);
  if (dataFim)    q = q.lte("created_at", dataFim + "T23:59:59");
  if (clienteId)  q = q.eq("client_id", clienteId);
  if (funcionariaId) q = q.eq("employee_id", funcionariaId);

  const { data, error } = await q;
  if (error) return res.status(500).json({ message: error.message });

  let rows = data || [];
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) =>
      r.clients?.name?.toLowerCase().includes(s) || r.users?.name?.toLowerCase().includes(s)
    );
  }

  return res.json(rows.map(mapOrder));
});

// GET /entradas/:id
router.get("/:id", requireAdmin, async (req, res) => {
  const { data: order, error } = await getClient()
    .from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .eq("id", req.params.id)
    .single();
  if (error || !order) return res.status(404).json({ message: "Pedido não encontrado." });

  const { data: items } = await getClient().from("order_items").select("*").eq("order_id", order.id);

  return res.json({
    ...mapOrder(order),
    pecas: (items || []).map((i) => ({
      descricao: i.manual_description || i.ai_description,
      tamanho: i.size,
      fotoUrl: i.image_url || (i.image_path ? `/uploads/${i.image_path}` : null),
    })),
  });
});

// GET /entradas/:id/pdf
router.get("/:id/pdf", requireAdmin, async (req, res) => {
  const { data: order } = await getClient().from("orders").select("pdf_path").eq("id", req.params.id).single();
  if (!order?.pdf_path) return res.status(404).json({ message: "PDF não encontrado." });

  const filePath = path.join(path.resolve(__dirname, "../../pdfs"), order.pdf_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Arquivo PDF não encontrado." });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="pedido_${req.params.id}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// POST /entradas/:id/reenviar-pdf
router.post("/:id/reenviar-pdf", requireAdmin, async (req, res) => {
  const { data: order, error } = await getClient()
    .from("orders")
    .select("*, clients:client_id(name, whatsapp), users:employee_id(name)")
    .eq("id", req.params.id)
    .single();
  if (error || !order) return res.status(404).json({ message: "Pedido não encontrado." });

  const pdfDir = path.resolve(__dirname, "../../pdfs");
  let filePath = order.pdf_path ? path.join(pdfDir, order.pdf_path) : null;

  if (!filePath || !fs.existsSync(filePath)) {
    const { data: client } = await getClient().from("clients").select("*").eq("id", order.client_id).single();
    const { data: employee } = await getClient().from("users").select("*").eq("id", order.employee_id).single();
    const { data: items } = await getClient().from("order_items").select("*").eq("order_id", order.id);
    try {
      const result = await gerarPdf({ order, client, items: items || [], employee });
      filePath = result.filePath;
      await getClient().from("orders").update({ pdf_path: path.basename(filePath) }).eq("id", order.id);
    } catch (err) {
      return res.status(500).json({ message: "Erro ao gerar PDF: " + err.message });
    }
  }

  const clientWhatsapp = order.clients?.whatsapp || order.client_id;
  const clientName = order.clients?.name || "Cliente";
  const sent = await enviarPdf(clientWhatsapp, filePath, clientName);
  if (sent) await getClient().from("orders").update({ whatsapp_sent: true }).eq("id", order.id);

  return res.json({ success: sent, message: sent ? "PDF reenviado!" : "Falha ao enviar WhatsApp." });
});

// POST /entradas/identificar-peca
router.post("/identificar-peca", upload.single("foto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Nenhuma imagem enviada." });
  try {
    const resultado = await identificarPeca(req.file.path);
    return res.json({
      descricao: resultado.descricao, tipo: resultado.tipo,
      tamanhoSugerido: resultado.tamanhoSugerido, fotoPath: req.file.filename,
    });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao identificar peça: " + err.message });
  }
});

function mapOrder(r) {
  return {
    id: r.id,
    clienteId: r.client_id,
    clienteNome: r.clients?.name || "",
    clienteWhatsapp: r.clients?.whatsapp || "",
    funcionariaId: r.employee_id,
    funcionariaNome: r.users?.name || "",
    totalGeral: r.total_amount,
    status: r.status,
    avulsos: r.avulsos,
    volumes: tryParse(r.volumes_json, []),
    pecas: [],
    createdAt: r.created_at,
  };
}

function extractPecasFields(body) {
  const pecas = [];
  let i = 0;
  while (body[`pecas[${i}][descricao]`] !== undefined) {
    pecas.push({ descricao: body[`pecas[${i}][descricao]`], tamanho: body[`pecas[${i}][tamanho]`] || null });
    i++;
  }
  return pecas;
}

function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
