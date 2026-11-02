import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const load = createRequire(import.meta.url);
const { mapPedidoKanban, isAllowedPedidoRole, isAdminPedidoRole, pedidoKanbanSelect } =
  load("./pedidos.server.ts") as typeof import("./pedidos.server");

const row = {
  id: 42,
  clients: { name: "Maria" },
  users: { name: "Ana" },
  total_amount: "85.50",
  status: "passar",
  created_at: "2026-10-02T13:45:00.000Z",
  order_items: [{ quantity: 2 }, { quantity: 3 }],
};

test("maps an order with integer id and sums item quantities", () => {
  assert.deepEqual(mapPedidoKanban(row, true), {
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
  }, true), {
    id: 43,
    clienteNome: "",
    quantidadePecas: 0,
    funcionariaNome: "",
    totalGeral: 0,
    status: "entrada",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});

test("funcionaria mapping omits totalGeral entirely instead of returning 0 or null", () => {
  const pedido = mapPedidoKanban(row, false);
  assert.equal("totalGeral" in pedido, false);
  assert.equal(pedido.totalGeral, undefined);
  assert.deepEqual(pedido, {
    id: 42,
    clienteNome: "Maria",
    quantidadePecas: 5,
    funcionariaNome: "Ana",
    status: "passar",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});

test("admin query selects total_amount, funcionaria query never does", () => {
  assert.match(pedidoKanbanSelect(true), /total_amount/);
  assert.doesNotMatch(pedidoKanbanSelect(false), /total_amount/);
  assert.match(pedidoKanbanSelect(false), /order_items\(quantity\)/);
});

test("allows admin and funcionaria, rejects every other role", () => {
  assert.equal(isAllowedPedidoRole({ role: "admin" }), true);
  assert.equal(isAllowedPedidoRole({ role: "funcionaria" }), true);
  assert.equal(isAllowedPedidoRole({ role: "superadmin" }), false);
  assert.equal(isAllowedPedidoRole({ role: "" }), false);
});

test("only admin is treated as a paid-amount role", () => {
  assert.equal(isAdminPedidoRole({ role: "admin" }), true);
  assert.equal(isAdminPedidoRole({ role: "funcionaria" }), false);
  assert.equal(isAdminPedidoRole({ role: "" }), false);
});

test("listPedidosKanban derives the amount rule from the server-validated user", () => {
  const serviceSource = readFileSync("src/lib/server/pedidos.server.ts", "utf8");
  assert.match(serviceSource, /export async function listPedidosKanban\(user: \{ role: string \}\)/);
  assert.match(serviceSource, /const includeTotal = isAdminPedidoRole\(user\)/);
  assert.match(serviceSource, /\.select\(pedidoKanbanSelect\(includeTotal\)\)/);
  assert.doesNotMatch(serviceSource, /req\.(json|body|headers)/);
});
