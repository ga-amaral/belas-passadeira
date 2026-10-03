/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("API client defines integer-id kanban calls under /api/pedidos", () => {
  const source = fs.readFileSync("src/lib/api.ts", "utf8");
  assert.match(source, /getPedidosKanban\(\): Promise<PedidoKanban\[\]>/);
  assert.match(source, /updatePedidoStatus\(id: number, status: PedidoStatus\)/);
  assert.match(source, /request<PedidosKanbanResponse>\("\/pedidos"/);
  assert.match(source, /`\/pedidos\/\$\{id\}\/status`/);
});

test("request keeps the single 401 path that an expired token during polling relies on", () => {
  const source = fs.readFileSync("src/lib/api.ts", "utf8");
  assert.match(source, /if \(res\.status === 401\) \{/);
  assert.match(source, /window\.location\.href = "\/login";/);
  assert.match(source, /throw new Error\("Sessão expirada\. Faça login novamente\."\)/);
  assert.match(source, /localStorage\.removeItem\("bp_token"\);/);
});
