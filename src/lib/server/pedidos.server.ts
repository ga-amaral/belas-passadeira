import type { PedidoKanban } from "@/types";

type PedidoRow = Record<string, unknown> & {
  order_items?: Array<Record<string, unknown>> | null;
};

export function isAllowedPedidoRole(user: { role: string }): boolean {
  return user.role === "admin" || user.role === "funcionaria";
}

export function mapPedidoKanban(row: PedidoRow): PedidoKanban {
  const client = row.clients as Record<string, unknown> | null;
  const employee = row.users as Record<string, unknown> | null;
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  const quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return {
    id: Number(row.id),
    clienteNome: String(client?.name ?? ""),
    quantidadePecas: quantity,
    funcionariaNome: String(employee?.name ?? ""),
    totalGeral: Number(row.total_amount) || 0,
    status: String(row.status) as PedidoKanban["status"],
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listPedidosKanban(): Promise<PedidoKanban[]> {
  const { getDb } = await import("@/lib/server/db.server");
  const { data, error } = await getDb()
    .from("orders")
    .select("id, total_amount, status, created_at, clients:client_id(name), users:employee_id(name), order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as PedidoRow[]).map(mapPedidoKanban);
}
