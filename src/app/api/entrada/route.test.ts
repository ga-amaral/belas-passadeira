import { strict as assert } from "node:assert";
import test from "node:test";

test("new Next order insert uses entrada", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/app/api/entrada/route.ts", "utf8"));
  assert.match(source, /status:\s*"entrada"/);
  assert.doesNotMatch(source, /status:\s*"recebido"/);
});
