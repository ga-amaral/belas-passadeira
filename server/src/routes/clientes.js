const express = require("express");
const { getClient } = require("../database/db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const search = req.query.search?.trim() || "";
  let q = getClient().from("clients").select("*").order("name").limit(50);
  if (search.length >= 2) {
    q = getClient()
      .from("clients")
      .select("*")
      .or(`name.ilike.%${search}%,whatsapp.ilike.%${search}%,doc_number.ilike.%${search}%`)
      .order("name")
      .limit(30);
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data.map(mapCliente));
});

router.get("/:id/historico", requireAdmin, async (req, res) => {
  const { data: pedidos } = await getClient()
    .from("orders")
    .select("id, created_at, total_amount, pdf_path, users:employee_id(name)")
    .eq("client_id", req.params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!pedidos || pedidos.length === 0) {
    return res.json({ pedidos: [], itensEmpresa: { sacos: 0, cabides: 0 } });
  }

  const orderIds = pedidos.map((p) => p.id);
  const { data: allItems } = await getClient()
    .from("order_items")
    .select("order_id, ai_description, manual_description, size, image_url, image_path")
    .in("order_id", orderIds);

  const itemsByOrder = {};
  for (const item of allItems || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push({
      descricao: item.manual_description || item.ai_description || "Peça",
      tamanho: item.size || null,
      fotoUrl: item.image_url || (item.image_path ? `/uploads/${item.image_path}` : null),
    });
  }

  return res.json({
    pedidos: pedidos.map((p) => ({
      id: p.id,
      data: p.created_at,
      total: p.total_amount,
      funcionaria: p.users?.name || null,
      pdfUrl: p.pdf_path ? `/pdfs-static/${p.pdf_path}` : null,
      pecas: itemsByOrder[p.id] || [],
    })),
    itensEmpresa: { sacos: 0, cabides: 0 },
  });
});

router.get("/:id", async (req, res) => {
  const { data, error } = await getClient().from("clients").select("*").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ message: "Cliente não encontrado." });
  return res.json(mapCliente(data));
});

router.post("/", async (req, res) => {
  const { nome, cpfCnpj, whatsapp, logradouro, numero, complemento, bairro, cidade, estado, cep, preferencias } = req.body;
  if (!nome || !whatsapp) return res.status(400).json({ message: "Nome e WhatsApp são obrigatórios." });

  const docType = cpfCnpj ? (cpfCnpj.replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj") : null;
  const prefStr = Array.isArray(preferencias) ? preferencias.join(", ") : (preferencias || null);

  const { data, error } = await getClient()
    .from("clients")
    .insert({
      name: nome.trim(), doc_type: docType, doc_number: cpfCnpj || null,
      address_street: logradouro || null, address_number: numero || null,
      address_complement: complemento || null, address_neighborhood: bairro || null,
      address_city: cidade || null, address_state: estado || null,
      address_zip: cep || null, whatsapp: whatsapp.trim(), preferences: prefStr,
    })
    .select("*")
    .single();
  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(mapCliente(data));
});

router.put("/:id", async (req, res) => {
  const { nome, cpfCnpj, whatsapp, logradouro, numero, complemento, bairro, cidade, estado, cep, preferencias } = req.body;
  const docType = cpfCnpj ? (cpfCnpj.replace(/\D/g, "").length <= 11 ? "cpf" : "cnpj") : null;
  const prefStr = Array.isArray(preferencias) ? preferencias.join(", ") : (preferencias || null);

  const { data, error } = await getClient()
    .from("clients")
    .update({
      name: nome, doc_type: docType, doc_number: cpfCnpj || null,
      address_street: logradouro || null, address_number: numero || null,
      address_complement: complemento || null, address_neighborhood: bairro || null,
      address_city: cidade || null, address_state: estado || null,
      address_zip: cep || null, whatsapp, preferences: prefStr,
    })
    .eq("id", req.params.id)
    .select("*")
    .single();
  if (error) return res.status(500).json({ message: error.message });
  return res.json(mapCliente(data));
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const db = getClient();
  const clientId = req.params.id;

  // Remove order_items de todos os pedidos do cliente
  const { data: orders } = await db.from("orders").select("id").eq("client_id", clientId);
  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    await db.from("order_items").delete().in("order_id", orderIds);
    await db.from("orders").delete().eq("client_id", clientId);
  }

  const { error } = await db.from("clients").delete().eq("id", clientId);
  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: "Cliente removido." });
});

function mapCliente(c) {
  return {
    id: c.id, nome: c.name, cpfCnpj: c.doc_number, whatsapp: c.whatsapp,
    logradouro: c.address_street, numero: c.address_number, complemento: c.address_complement,
    bairro: c.address_neighborhood, cidade: c.address_city, estado: c.address_state,
    cep: c.address_zip,
    preferencias: c.preferences ? c.preferences.split(",").map((s) => s.trim()) : [],
    createdAt: c.created_at,
  };
}

module.exports = router;
