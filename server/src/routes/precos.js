const express = require("express");
const { getClient } = require("../database/db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (_req, res) => {
  const { data, error } = await getClient().from("prices").select("*").eq("active", true).order("sort_order");
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data.map(mapPreco));
});

router.put("/", requireAdmin, async (req, res) => {
  const { precos } = req.body;
  if (!Array.isArray(precos)) return res.status(400).json({ message: "Campo 'precos' deve ser um array." });

  for (const p of precos) {
    if (p.id) {
      await getClient()
        .from("prices")
        .update({ name: p.nome || p.name, price: parseFloat(p.preco ?? p.price) || 0 })
        .eq("id", p.id);
    }
  }

  const { data } = await getClient().from("prices").select("*").eq("active", true).order("sort_order");
  return res.json((data || []).map(mapPreco));
});

function mapPreco(r) {
  return {
    id: String(r.id),
    nome: r.name,
    volume: r.volume || undefined,
    preco: parseFloat(r.price),
    tipo: r.type,
  };
}

module.exports = router;
