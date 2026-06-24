const express = require("express");
const { getClient } = require("../database/db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/resumo", async (_req, res) => {
  const { data, error } = await getClient().rpc("get_dashboard_resumo");
  if (error) return res.status(500).json({ message: error.message });
  const d = data || {};
  return res.json({
    pedidosHoje:   Number(d.pedidosHoje   ?? 0),
    pedidosSemana: Number(d.pedidosSemana ?? 0),
    pedidosMes:    Number(d.pedidosMes    ?? 0),
    totalHoje:     Number(d.totalHoje     ?? 0),
    totalSemana:   Number(d.totalSemana   ?? 0),
    totalMes:      Number(d.totalMes      ?? 0),
  });
});

module.exports = router;
