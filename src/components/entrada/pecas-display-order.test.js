/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const { newestFirst } = require("./pecas-display-order");

test("shows the newest pieces first without mutating insertion order", () => {
  const pecas = [{ id: "first" }, { id: "second" }, { id: "newest" }];

  assert.deepEqual(newestFirst(pecas), [{ id: "newest" }, { id: "second" }, { id: "first" }]);
  assert.deepEqual(pecas, [{ id: "first" }, { id: "second" }, { id: "newest" }]);
});

test("keeps an empty piece list empty", () => {
  assert.deepEqual(newestFirst([]), []);
});

test("keeps a single piece unchanged", () => {
  const peca = { id: "only" };
  assert.deepEqual(newestFirst([peca]), [peca]);
});
