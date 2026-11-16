import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const load = createRequire(import.meta.url);
const {
  PECAS_BUSCA_PAGE_SIZE,
  PECAS_CANDIDATAS_IMAGEM_LIMIT,
  PECAS_PERDIDAS_LIMIT,
  filterPecasPorIds,
  mapPecaPerdida,
  mapPecasPerdidas,
  normalizarBusca,
  parseClienteId,
  pecaClienteNome,
  pecaCombinaBusca,
  pecasPerdidasSelect,
} = load("./perdidos.server.ts") as typeof import("./perdidos.server");

const rows = [
  {
    id: 30,
    order_id: 2,
    quantity: 2,
    manual_description: "Camisa social branca",
    ai_description: "Camisa branca",
    size: "M",
    image_url: "https://supabase.co/item-photos/a.jpg",
    image_path: "a.jpg",
    orders: {
      client_id: 15,
      created_at: "2026-10-10T12:00:00.000Z",
      clients: { name: "Maria Silva" },
    },
  },
  {
    id: 20,
    order_id: 2,
    quantity: 1,
    manual_description: null,
    ai_description: "Toalha de banho azul",
    size: null,
    image_url: null,
    image_path: "b.jpg",
    orders: {
      client_id: 15,
      created_at: "2026-10-10T12:00:00.000Z",
      clients: { name: "Maria Silva" },
    },
  },
  {
    id: 10,
    order_id: 1,
    quantity: null,
    manual_description: "",
    ai_description: "",
    size: null,
    image_url: null,
    image_path: null,
    orders: {
      client_id: 14,
      created_at: "2026-10-09T12:00:00.000Z",
      clients: { name: "João Pereira" },
    },
  },
];

test("maps completed pieces with client id and name plus description, size, quantity, photo and date", () => {
  assert.deepEqual(mapPecaPerdida(rows[0]), {
    id: 30,
    pedidoId: 2,
    clienteId: 15,
    clienteNome: "Maria Silva",
    descricao: "Camisa social branca",
    tamanho: "M",
    quantidade: 2,
    fotoUrl: "https://supabase.co/item-photos/a.jpg",
    pedidoData: "2026-10-10T12:00:00.000Z",
  });
  assert.deepEqual(mapPecaPerdida(rows[1]), {
    id: 20,
    pedidoId: 2,
    clienteId: 15,
    clienteNome: "Maria Silva",
    descricao: "Toalha de banho azul",
    tamanho: null,
    quantidade: 1,
    fotoUrl: "/uploads/b.jpg",
    pedidoData: "2026-10-10T12:00:00.000Z",
  });
});

test("missing relations still fill client id and name with safe defaults", () => {
  const peca = mapPecaPerdida({ id: 1, order_id: 1, orders: null });
  assert.equal(peca.clienteId, 0);
  assert.equal(peca.clienteNome, "");
});

test("mapping never includes monetary fields", () => {
  const peca = mapPecaPerdida(rows[0]);
  assert.deepEqual(Object.keys(peca).sort(), [
    "clienteId",
    "clienteNome",
    "descricao",
    "fotoUrl",
    "id",
    "pedidoData",
    "pedidoId",
    "quantidade",
    "tamanho",
  ]);
  assert.equal("totalGeral" in peca, false);
  assert.equal("total_amount" in peca, false);
  assert.equal("preco" in peca, false);
});

test("keeps the database order (newest to oldest) when mapping a list", () => {
  const pecas = mapPecasPerdidas(rows);
  assert.deepEqual(pecas.map((peca) => peca.id), [30, 20, 10]);
});

test("image matches only filter the list and never reorder it", () => {
  const pecas = mapPecasPerdidas(rows);
  assert.deepEqual(filterPecasPorIds(pecas, [10, 30]).map((peca) => peca.id), [30, 10]);
  assert.deepEqual(filterPecasPorIds(pecas, []), []);
});

test("query is the completed-order query with descending order and a 100-piece limit", () => {
  const source = readFileSync("src/lib/server/perdidos.server.ts", "utf8");
  assert.equal(PECAS_PERDIDAS_LIMIT, 100);
  assert.match(source, /\.eq\("orders\.status", "concluido"\)/);
  assert.match(source, /\.order\("orders\(created_at\)", \{ ascending: false \}\)/);
  assert.match(source, /\.order\("id", \{ ascending: false \}\)/);
  assert.match(source, /\.limit\(limit\)/);
  assert.match(source, /fetchPecasRecentes\(clienteId, PECAS_PERDIDAS_LIMIT\)/);
});

test("client filter is applied only when clienteId is provided", () => {
  const source = readFileSync("src/lib/server/perdidos.server.ts", "utf8");
  assert.match(source, /if \(clienteId\) query = query\.eq\("orders\.client_id", clienteId\);/);
  assert.equal(source.match(/\.eq\("orders\.client_id", clienteId\)/g)?.length, 2);
});

test("text search paginates before cutting the 100 newest matches", () => {
  const source = readFileSync("src/lib/server/perdidos.server.ts", "utf8");
  assert.equal(PECAS_BUSCA_PAGE_SIZE, 500);
  assert.match(source, /\.range\(from, from \+ PECAS_BUSCA_PAGE_SIZE - 1\)/);
  assert.match(source, /while \(encontradas\.length < PECAS_PERDIDAS_LIMIT\)/);
  assert.match(source, /const incluirClienteNome = !clienteId;/);
  assert.match(source, /pecaCombinaBusca\(row, q, incluirClienteNome\)/);
});

test("image candidates use the 200 newest for all clients and the 100 for one client", () => {
  const source = readFileSync("src/lib/server/perdidos.server.ts", "utf8");
  assert.equal(PECAS_CANDIDATAS_IMAGEM_LIMIT, 200);
  assert.match(source, /const limite = clienteId \? PECAS_PERDIDAS_LIMIT : PECAS_CANDIDATAS_IMAGEM_LIMIT;/);
  assert.match(source, /fetchPecasRecentes\(clienteId, limite \+ 1\)/);
  assert.match(source, /limitado: rows\.length > limite/);
});

test("selected columns include the client name and never monetary or price data", () => {
  const select = pecasPerdidasSelect();
  assert.doesNotMatch(select, /total_amount|total|price|preco|valor/i);
  assert.match(select, /manual_description/);
  assert.match(select, /ai_description/);
  assert.match(select, /orders!inner\(client_id, status, created_at, clients:client_id\(name\)\)/);
});

test("search ignores case and accents in manual and AI descriptions", () => {
  const algodao = {
    id: 1,
    manual_description: "Pijama de algodão",
    ai_description: null,
    orders: { client_id: 1, clients: { name: "Ana" } },
  };
  assert.equal(normalizarBusca("Algodão"), "algodao");
  assert.equal(pecaCombinaBusca(algodao, "ALGODAO"), true);
  assert.equal(pecaCombinaBusca(algodao, "pijama"), true);
  assert.equal(pecaCombinaBusca(algodao, "seda"), false);
  assert.equal(pecaCombinaBusca(algodao, ""), true);
  assert.equal(pecaCombinaBusca(rows[1], "TOALHA"), true);
  assert.equal(pecaCombinaBusca(rows[1], "banho"), true);
});

test("search by client name is accent-insensitive and only enabled without clienteId", () => {
  assert.equal(pecaClienteNome(rows[2]), "João Pereira");
  assert.equal(pecaCombinaBusca(rows[2], "joao", true), true);
  assert.equal(pecaCombinaBusca(rows[2], "PEREIRA", true), true);
  assert.equal(pecaCombinaBusca(rows[2], "maria", true), false);
  assert.equal(pecaCombinaBusca(rows[2], "joao"), false);
  assert.equal(pecaCombinaBusca(rows[2], "CAMISA", false), false);
  assert.equal(pecaCombinaBusca(rows[0], "maria", false), false);
  assert.equal(pecaCombinaBusca(rows[0], "maria", true), true);
});

test("requires a non-empty, safe client id", () => {
  assert.equal(parseClienteId("394bcb8c-f64a-4fe6-ad28-94aae34a7d9f"), "394bcb8c-f64a-4fe6-ad28-94aae34a7d9f");
  assert.equal(parseClienteId("  abc  "), "abc");
  assert.equal(parseClienteId(""), null);
  assert.equal(parseClienteId("   "), null);
  assert.equal(parseClienteId(null), null);
  assert.equal(parseClienteId(undefined), null);
  assert.equal(parseClienteId(42), null);
  assert.equal(parseClienteId("id com espaço"), null);
  assert.equal(parseClienteId("a".repeat(65)), null);
});
