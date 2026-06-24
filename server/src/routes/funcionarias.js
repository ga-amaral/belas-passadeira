const express = require("express");
const bcrypt = require("bcryptjs");
const { getClient } = require("../database/db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/", async (_req, res) => {
  const { data, error } = await getClient()
    .from("users")
    .select("id, name, email, active, created_at")
    .eq("role", "funcionaria")
    .eq("active", true)
    .order("name");
  if (error) return res.status(500).json({ message: error.message });
  return res.json(data.map((r) => ({ ...r, ativo: r.active })));
});

router.post("/", async (req, res) => {
  const { name, email, senha } = req.body;
  if (!name || !email || !senha) return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
  if (senha.length < 6) return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres." });

  const { data: exists } = await getClient().from("users").select("id").eq("email", email.toLowerCase().trim()).single();
  if (exists) return res.status(409).json({ message: "E-mail já cadastrado." });

  const hash = await bcrypt.hash(senha, 10);
  const { data, error } = await getClient()
    .from("users")
    .insert({ name: name.trim(), email: email.toLowerCase().trim(), password_hash: hash, role: "funcionaria" })
    .select("id, name, email, active, created_at")
    .single();
  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json({ ...data, ativo: true });
});

router.delete("/:id", async (req, res) => {
  const { data: user } = await getClient().from("users").select("id, role").eq("id", req.params.id).single();
  if (!user) return res.status(404).json({ message: "Funcionária não encontrada." });
  if (user.role === "admin") return res.status(403).json({ message: "Não é possível remover a admin." });

  const { error } = await getClient().from("users").update({ active: false }).eq("id", req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: "Funcionária desativada." });
});

module.exports = router;
