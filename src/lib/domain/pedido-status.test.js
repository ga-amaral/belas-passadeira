/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PEDIDO_STATUSES,
  PEDIDO_STATUS_LABELS,
  isPedidoStatus,
} = require("./pedido-status");

test("exposes the five statuses in operational order and their labels", () => {
  assert.deepEqual(PEDIDO_STATUSES, [
    "entrada",
    "molho_secagem",
    "secar",
    "passar",
    "concluido",
  ]);
  assert.deepEqual(PEDIDO_STATUS_LABELS, {
    entrada: "Entrada",
    molho_secagem: "Molho e Secagem",
    secar: "Secar",
    passar: "Passar",
    concluido: "Concluído",
  });
});

test("accepts only the five persisted statuses", () => {
  for (const value of ["entrada", "molho_secagem", "secar", "passar", "concluido"]) {
    assert.equal(isPedidoStatus(value), true);
  }
  for (const value of ["recebido", "", null, 1, "concluído"]) {
    assert.equal(isPedidoStatus(value), false);
  }
});
