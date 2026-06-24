import { getDb } from "./db.server";

export async function uploadBuffer(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<string> {
  const db = getDb();
  const { error } = await db.storage.from(bucket).upload(filename, buffer, { contentType, upsert: false });
  if (error) throw new Error("Erro no upload: " + error.message);
  const { data } = db.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

export async function uploadFile(bucket: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const mime = file.type || "image/jpeg";
  return uploadBuffer(bucket, name, buffer, mime);
}
