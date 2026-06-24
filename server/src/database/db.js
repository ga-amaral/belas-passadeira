const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env");
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

async function initDb() {
  const { error } = await getClient().from("users").select("id").limit(1);
  if (error) throw new Error("Falha ao conectar ao Supabase: " + error.message);
  console.log("✅ Supabase conectado");
}

module.exports = { getClient, initDb };
