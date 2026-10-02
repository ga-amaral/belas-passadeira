import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";

const load = createRequire(import.meta.url);
const { mapPedidoKanban, isAllowedPedidoRole } = load("./pedidos.server.ts") as typeof import("./pedidos.server");

test("maps an order with integer id and sums item quantities", () => {
  assert.deepEqual(mapPedidoKanban({
    id: 42,
    clients: { name: "Maria" },
    users: { name: "Ana" },
    total_amount: "85.50",
    status: "passar",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: [{ quantity: 2 }, { quantity: 3 }],
  }), {
    id: 42,
    clienteNome: "Maria",
    quantidadePecas: 5,
    funcionariaNome: "Ana",
    totalGeral: 85.5,
    status: "passar",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});

test("uses empty names and zero quantity when relations/items are absent", () => {
  assert.deepEqual(mapPedidoKanban({
    id: 43,
    clients: null,
    users: null,
    total_amount: null,
    status: "entrada",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: null,
  }), {
    id: 43,
    clienteNome: "",
    quantidadePecas: 0,
    funcionariaNome: "",
    totalGeral: 0,
    status: "entrada",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});

test("allows admin and funcionaria, rejects every other role", () => {
  assert.equal(isAllowedPedidoRole({ role: "admin" }), true);
  assert.equal(isAllowedPedidoRole({ role: "funcionaria" }), true);
  assert.equal(isAllowedPedidoRole({ role: "superadmin" }), false);
  assert.equal(isAllowedPedidoRole({ role: "" }), false);
});
