import type { PedidoKanban, PedidoStatus, PedidoStatusResponse } from "@/types";

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
