require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const bcrypt = require("bcryptjs");

const { initDb } = require("./database/db");

const app = express();
const PORT = process.env.PORT || 3001;

// Segurança e parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: (origin, callback) => {
    // Permite qualquer localhost em desenvolvimento, mais a URL de produção configurada
    const allowed = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origem: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Arquivos estáticos – uploads e PDFs
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use("/pdfs-static", express.static(path.resolve(__dirname, "../pdfs")));

// Health check (sem autenticação)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas
app.use("/auth", require("./routes/auth"));
app.use("/funcionarias", require("./routes/funcionarias"));
app.use("/clientes", require("./routes/clientes"));
app.use("/entrada", require("./routes/entradas"));   // POST /entrada
app.use("/entradas", require("./routes/entradas"));  // GET /entradas, GET/POST /entradas/:id/*
app.use("/precos", require("./routes/precos"));
app.use("/dashboard", require("./routes/dashboard"));

// Erro 404
app.use((_req, res) => res.status(404).json({ message: "Rota não encontrada." }));

// Handler global de erros
app.use((err, _req, res, _next) => {
  console.error("[Erro]", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Arquivo muito grande (máx 10 MB)." });
  }
  res.status(500).json({ message: err.message || "Erro interno do servidor." });
});

// Inicialização
async function start() {
  await initDb();
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`\n✨ Belas Passadeiras API rodando em http://localhost:${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Health:   http://localhost:${PORT}/health\n`);
  });
}

async function seedAdmin() {
  const { getClient } = require("./database/db");
  const db = getClient();

  async function seedUser(email, name, password, role) {
    const { data: existing } = await db.from("users").select("id").eq("email", email).single();
    if (existing) return;
    const hash = await bcrypt.hash(password, 10);
    await db.from("users").insert({ name, email, password_hash: hash, role });
    console.log(`👤 Criado: ${email} / ${password}`);
  }

  await seedUser(
    (process.env.ADMIN_EMAIL || "admin@belas.com").toLowerCase(),
    process.env.ADMIN_NAME || "Admin",
    process.env.ADMIN_PASSWORD || "admin123",
    "admin"
  );
  await seedUser(
    (process.env.FUNC_EMAIL || "func@belas.com").toLowerCase(),
    process.env.FUNC_NAME || "Carla Souza",
    process.env.FUNC_PASSWORD || "func123",
    "funcionaria"
  );
}

start().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
