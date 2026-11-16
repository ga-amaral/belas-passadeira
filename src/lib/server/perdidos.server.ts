import type { PecaPerdida } from "@/types";
import {
  pecaDescricao,
  pecaFotoUrl,
  pecaQuantidade,
  pecaTamanho,
} from "./pedidos.server.ts";

export const PECAS_PERDIDAS_LIMIT = 100;
export const PECAS_CANDIDATAS_IMAGEM_LIMIT = 200;
export const PECAS_BUSCA_PAGE_SIZE = 500;

export type PecaPerdidaRow = Record<string, unknown> & {
  orders?: Record<string, unknown> | null;
};

export function parseClienteId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 64) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
}

export function pecaClienteNome(row: PecaPerdidaRow): string {
  const pedido = row.orders as Record<string, unknown> | null | undefined;
  const cliente = pedido?.clients as Record<string, unknown> | null | undefined;
  return String(cliente?.name ?? "");
}

export function normalizarBusca(text: unknown): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function pecaCombinaBusca(row: PecaPerdidaRow, q: string, incluirClienteNome = false): boolean {
  const termo = normalizarBusca(q);
  if (!termo) return true;
  const bateDescricao =
    normalizarBusca(row.manual_description).includes(termo) ||
    normalizarBusca(row.ai_description).includes(termo);
  if (bateDescricao) return true;
  return incluirClienteNome && normalizarBusca(pecaClienteNome(row)).includes(termo);
}

export function pecasPerdidasSelect(): string {
  return [
    "id",
    "order_id",
    "quantity",
    "manual_description",
    "ai_description",
    "size",
    "image_url",
    "image_path",
    "orders!inner(client_id, status, created_at, clients:client_id(name))",
  ].join(", ");
}

export function mapPecaPerdida(row: PecaPerdidaRow): PecaPerdida {
  const pedido = row.orders as Record<string, unknown> | null | undefined;
  const clienteId = Number(pedido?.client_id);
  return {
    id: Number(row.id),
    pedidoId: Number(row.order_id),
    clienteId: Number.isFinite(clienteId) ? clienteId : 0,
    clienteNome: pecaClienteNome(row),
    descricao: pecaDescricao(row),
    tamanho: pecaTamanho(row),
    quantidade: pecaQuantidade(row),
    fotoUrl: pecaFotoUrl(row),
    pedidoData: String(pedido?.created_at ?? ""),
  };
}

export function mapPecasPerdidas(rows: PecaPerdidaRow[]): PecaPerdida[] {
  return rows.map(mapPecaPerdida);
}

export function filterPecasPorIds(pecas: PecaPerdida[], ids: number[]): PecaPerdida[] {
  const wanted = new Set(ids.filter((id) => Number.isSafeInteger(id)));
  return pecas.filter((peca) => wanted.has(peca.id));
}

async function fetchPecasRecentes(clienteId: string | null, limit: number): Promise<PecaPerdidaRow[]> {
  const { getDb } = await import("@/lib/server/db.server");
  let query = getDb()
    .from("order_items")
    .select(pecasPerdidasSelect())
    .eq("orders.status", "concluido");
  if (clienteId) query = query.eq("orders.client_id", clienteId);
  const { data, error } = await query
    .order("orders(created_at)", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PecaPerdidaRow[];
}

async function fetchPaginaPecas(clienteId: string | null, from: number): Promise<PecaPerdidaRow[]> {
  const { getDb } = await import("@/lib/server/db.server");
  let query = getDb()
    .from("order_items")
    .select(pecasPerdidasSelect())
    .eq("orders.status", "concluido");
  if (clienteId) query = query.eq("orders.client_id", clienteId);
  const { data, error } = await query
    .order("orders(created_at)", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PECAS_BUSCA_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []) as unknown as PecaPerdidaRow[];
}

export async function listPecasPerdidas(
  clienteId: string | null = null,
  q = "",
): Promise<PecaPerdida[]> {
  if (!normalizarBusca(q)) {
    const rows = await fetchPecasRecentes(clienteId, PECAS_PERDIDAS_LIMIT);
    return mapPecasPerdidas(rows.slice(0, PECAS_PERDIDAS_LIMIT));
  }

  const incluirClienteNome = !clienteId;
  const encontradas: PecaPerdidaRow[] = [];
  let from = 0;

  while (encontradas.length < PECAS_PERDIDAS_LIMIT) {
    const pagina = await fetchPaginaPecas(clienteId, from);
    for (const row of pagina) {
      if (pecaCombinaBusca(row, q, incluirClienteNome)) encontradas.push(row);
      if (encontradas.length >= PECAS_PERDIDAS_LIMIT) break;
    }
    if (pagina.length < PECAS_BUSCA_PAGE_SIZE) break;
    from += PECAS_BUSCA_PAGE_SIZE;
  }

  return mapPecasPerdidas(encontradas.slice(0, PECAS_PERDIDAS_LIMIT));
}

export async function listPecasPerdidasCandidatas(
  clienteId: string | null = null,
): Promise<{ pecas: PecaPerdida[]; limitado: boolean }> {
  const limite = clienteId ? PECAS_PERDIDAS_LIMIT : PECAS_CANDIDATAS_IMAGEM_LIMIT;
  const rows = await fetchPecasRecentes(clienteId, limite + 1);
  return {
    pecas: mapPecasPerdidas(rows.slice(0, limite)),
    limitado: rows.length > limite,
  };
}
