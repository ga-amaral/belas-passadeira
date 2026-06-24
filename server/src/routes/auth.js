const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getClient } = require("../database/db");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
  }

  const { data: user, error } = await getClient()
    .from("users")
    .select("id, name, email, role, password_hash, active")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !user) return res.status(401).json({ message: "E-mail ou senha inválidos." });
  if (!user.active) return res.status(401).json({ message: "Conta desativada. Contate a administradora." });

  const valid = await bcrypt.compare(senha, user.password_hash);
  if (!valid) return res.status(401).json({ message: "E-mail ou senha inválidos." });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

module.exports = router;
