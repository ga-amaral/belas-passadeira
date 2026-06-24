import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { authenticate } from "@/lib/server/auth.server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const { data: order } = await getDb().from("orders").select("pdf_path").eq("id", params.id).single();
  if (!order?.pdf_path) return NextResponse.json({ message: "PDF não encontrado." }, { status: 404 });

  const pdfPath = String(order.pdf_path);
  if (pdfPath.startsWith("http")) return NextResponse.redirect(pdfPath);
  return NextResponse.json({ message: "PDF não disponível." }, { status: 404 });
}
