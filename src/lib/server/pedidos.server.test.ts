import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";

const load = createRequire(import.meta.url);
const { mapPedidoKanban, mapPedidoDetalhe, isAllowedPedidoRole } = load("./pedidos.server.ts") as typeof import("./pedidos.server");

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

test("maps order items with description, size, quantity and image url", () => {
  const detalhe = mapPedidoDetalhe({
    id: 42,
    clients: { name: "Maria" },
    users: { name: "Ana" },
    total_amount: "85.50",
    status: "passar",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: [
      {
        quantity: 2, size: "M",
        manual_description: "Lençol casal", ai_description: "Roupa de cama",
        image_url: "https://supabase.co/item-photos/a.jpg", image_path: "a.jpg",
      },
      { quantity: null, size: null, manual_description: null, ai_description: "Toalha de banho", image_url: null, image_path: "b.jpg" },
    ],
  });

  assert.equal(detalhe.id, 42);
  assert.equal(detalhe.clienteNome, "Maria");
  assert.equal(detalhe.quantidadePecas, 2);
  assert.deepEqual(detalhe.pecas, [
    { descricao: "Lençol casal", tamanho: "M", quantidade: 2, fotoUrl: "https://supabase.co/item-photos/a.jpg" },
    { descricao: "Toalha de banho", tamanho: null, quantidade: 1, fotoUrl: "/uploads/b.jpg" },
  ]);
});

test("detail mapping keeps zero-quantity kanban totals and defaults missing items", () => {
  const detalhe = mapPedidoDetalhe({
    id: 43,
    clients: null,
    users: null,
    total_amount: null,
    status: "entrada",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: null,
  });

  assert.equal(detalhe.quantidadePecas, 0);
  assert.equal(detalhe.totalGeral, 0);
  assert.deepEqual(detalhe.pecas, []);
});

test("detail mapping falls back to a generic description and null photo", () => {
  const detalhe = mapPedidoDetalhe({
    id: 44,
    status: "secar",
    order_items: [{ quantity: 0, manual_description: "", ai_description: "", image_url: "", image_path: "" }],
  });

  assert.deepEqual(detalhe.pecas, [
    { descricao: "Peça", tamanho: null, quantidade: 1, fotoUrl: null },
  ]);
});
