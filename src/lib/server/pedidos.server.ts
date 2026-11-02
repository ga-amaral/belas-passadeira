import type { PedidoDetalhe, PedidoKanban, PedidoStatus, PedidoStatusResponse } from "@/types";

type PedidoRow = Record<string, unknown> & {
  order_items?: Array<Record<string, unknown>> | null;
};

export function isAllowedPedidoRole(user: { role: string }): boolean {
  return user.role === "admin" || user.role === "funcionaria";
}

export function isAdminPedidoRole(user: { role: string }): boolean {
  return user.role === "admin";
}

export function parsePedidoId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function pedidoKanbanSelect(includeTotal: boolean): string {
  const columns = ["id", "status", "created_at", "clients:client_id(name)", "users:employee_id(name)", "order_items(quantity)"];
  if (includeTotal) columns.unshift("total_amount");
  return columns.join(", ");
}

export function mapPedidoKanban(row: PedidoRow, includeTotal: boolean): PedidoKanban {
  const client = row.clients as Record<string, unknown> | null;
  const employee = row.users as Record<string, unknown> | null;
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  const quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const pedido: PedidoKanban = {
    id: Number(row.id),
    clienteNome: String(client?.name ?? ""),
    quantidadePecas: quantity,
    funcionariaNome: String(employee?.name ?? ""),
    status: String(row.status) as PedidoKanban["status"],
    createdAt: String(row.created_at ?? ""),
  };

  if (includeTotal) pedido.totalGeral = Number(row.total_amount) || 0;

  return pedido;
}

export async function listPedidosKanban(user: { role: string }): Promise<PedidoKanban[]> {
  const includeTotal = isAdminPedidoRole(user);
  const { getDb } = await import("@/lib/server/db.server");
  const { data, error } = await getDb()
    .from("orders")
    .select(pedidoKanbanSelect(includeTotal))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as PedidoRow[]).map((row) => mapPedidoKanban(row, includeTotal));
}

export function pedidoDetalheSelect(includeTotal: boolean): string {
  const columns = ["id", "status", "created_at", "clients:client_id(name)", "users:employee_id(name)", "order_items(quantity, manual_description, ai_description, size, image_url, image_path)"];
  if (includeTotal) columns.unshift("total_amount");
  return columns.join(", ");
}

function pecaFotoUrl(item: Record<string, unknown>): string | null {
  if (typeof item.image_url === "string" && item.image_url) return item.image_url;
  if (typeof item.image_path === "string" && item.image_path) return `/uploads/${item.image_path}`;
  return null;
}

export function mapPedidoDetalhe(row: PedidoRow, includeTotal = true): PedidoDetalhe {
  const items = Array.isArray(row.order_items) ? row.order_items : [];

  return {
    ...mapPedidoKanban(row, includeTotal),
    pecas: items.map((item) => ({
      descricao: String(item.manual_description || item.ai_description || "Peça"),
      tamanho: item.size ? String(item.size) : null,
      quantidade: Math.max(1, Number(item.quantity) || 1),
      fotoUrl: pecaFotoUrl(item),
    })),
  };
}

export async function getPedidoDetalhe(id: number, user: { role: string }): Promise<PedidoDetalhe | null> {
  const includeTotal = isAdminPedidoRole(user);
  const { getDb } = await import("@/lib/server/db.server");
  const { data, error } = await getDb()
    .from("orders")
    .select(pedidoDetalheSelect(includeTotal))
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapPedidoDetalhe(data as unknown as PedidoRow, includeTotal);
}

export async function updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse | null> {
  const { getDb } = await import("@/lib/server/db.server");
  const { data, error } = await getDb()
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: Number(data.id), status: data.status as PedidoStatus };
}
