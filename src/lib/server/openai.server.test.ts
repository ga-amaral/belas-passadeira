import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";

const load = createRequire(import.meta.url);
const { formatarListaCandidatos } = load("./openai.server.ts") as typeof import("./openai.server");

test("formats candidates by id and description, preserving order", () => {
  const lista = formatarListaCandidatos([
    { id: 30, descricao: "Camisa branca" },
    { id: 20, descricao: "Toalha azul" },
  ]);
  assert.equal(lista, "- id 30: Camisa branca\n- id 20: Toalha azul");
});

test("includes the client name only when it is provided", () => {
  const lista = formatarListaCandidatos([
    { id: 1, descricao: "Lençol", clienteNome: "Maria" },
    { id: 2, descricao: "Toalha" },
  ]);
  assert.equal(lista, "- id 1: Lençol (cliente: Maria)\n- id 2: Toalha");
});
