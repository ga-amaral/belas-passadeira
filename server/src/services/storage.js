const fs = require("fs");
const path = require("path");
const { getClient } = require("../database/db");

const BUCKET = "item-photos";

async function uploadItemPhoto(filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const storageName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const { error } = await getClient()
    .storage
    .from(BUCKET)
    .upload(storageName, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error("Erro ao fazer upload da imagem: " + error.message);

  const { data } = getClient().storage.from(BUCKET).getPublicUrl(storageName);
  return data.publicUrl;
}

module.exports = { uploadItemPhoto };
