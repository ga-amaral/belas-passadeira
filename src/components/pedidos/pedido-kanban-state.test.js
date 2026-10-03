/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getBackgroundDragScrollLeft,
  groupPedidosByStatus,
  mergePollingPedidos,
  shouldApplyPollingResult,
} = require("./pedido-kanban-state");

test("calculates horizontal scroll while dragging the board background", () => {
  assert.equal(getBackgroundDragScrollLeft(240, 180, 130), 290);
  assert.equal(getBackgroundDragScrollLeft(240, 180, 225), 195);
});

test("polling does not overwrite a card with a pending local move", () => {
  const current = [{ id: 7, status: "passar" }];
  const server = [{ id: 7, status: "entrada" }, { id: 8, status: "secar" }];

  assert.deepEqual(mergePollingPedidos(current, server, new Set([7])), [
    { id: 7, status: "passar" },
    { id: 8, status: "secar" },
  ]);
});

test("polling accepts the server state after the pending move is cleared", () => {
  assert.deepEqual(mergePollingPedidos(
    [{ id: 7, status: "passar" }],
    [{ id: 7, status: "passar" }],
    new Set(),
  ), [{ id: 7, status: "passar" }]);
});

test("groups each order under its persisted status", () => {
  const grouped = groupPedidosByStatus([
    { id: 1, status: "entrada" },
    { id: 2, status: "passar" },
    { id: 3, status: "entrada" },
  ], ["entrada", "passar", "concluido"]);

  assert.deepEqual(grouped, {
    entrada: [{ id: 1, status: "entrada" }, { id: 3, status: "entrada" }],
    passar: [{ id: 2, status: "passar" }],
    concluido: [],
  });
});

test("discards a polling response that started before a move changed the epoch", () => {
  assert.equal(shouldApplyPollingResult(4, 5), false);
  assert.equal(shouldApplyPollingResult(5, 5), true);
});
