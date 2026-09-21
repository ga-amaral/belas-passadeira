const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateOrderPricing } = require("./pricing");

test("calculates the order total from server-side prices instead of a client-supplied amount", () => {
  const result = calculateOrderPricing(
    [
      { id: 1, name: "Saco 20L", price: 25, type: "volume" },
      { id: 2, name: "Peça avulsa", price: 8, type: "avulso" },
    ],
    [{ precoId: "1", quantidade: 2, preco: 0 }],
    3,
  );

  assert.deepEqual(result.volumes, [{ precoId: "1", nome: "Saco 20L", quantidade: 2 }]);
  assert.equal(result.total, 74);
});

test("rejects an unknown price option instead of accepting a manipulated payload", () => {
  assert.throws(
    () => calculateOrderPricing([], [{ precoId: "999", quantidade: 1 }], 0),
    /Opção de precificação inválida/,
  );
});
