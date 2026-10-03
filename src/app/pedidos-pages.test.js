/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("both pages reuse the shared kanban", () => {
  assert.match(fs.readFileSync("src/app/admin/pedidos/page.tsx", "utf8"), /PedidosKanban/);
  assert.match(fs.readFileSync("src/app/entrada/pedidos/page.tsx", "utf8"), /PedidosKanban/);
});

test("both navigation components expose Pedidos links", () => {
  assert.match(fs.readFileSync("src/components/layout/AdminSidebar.tsx", "utf8"), /\/admin\/pedidos/);
  assert.match(fs.readFileSync("src/components/layout/FuncionariaTopbar.tsx", "utf8"), /\/entrada\/pedidos/);
});
