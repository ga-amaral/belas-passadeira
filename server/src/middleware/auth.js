const jwt = require("jsonwebtoken");
const { getClient } = require("../database/db");

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido." });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await getClient()
      .from("users")
      .select("id, name, email, role, active")
      .eq("id", payload.id)
      .single();

    if (error || !user || !user.active) {
      return res.status(401).json({ message: "Usuário inativo ou não encontrado." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito a administradoras." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
