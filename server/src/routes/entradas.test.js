const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("new Express order insert uses entrada", () => {
  const source = fs.readFileSync("server/src/routes/entradas.js", "utf8");
  assert.match(source, /status:\s*"entrada"/);
  assert.doesNotMatch(source, /status:\s*"recebido"/);
});
