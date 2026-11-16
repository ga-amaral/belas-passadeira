import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/perdidos/route.ts", "utf8");

test("GET authorizes admin and funcionaria without requireAdmin", () => {
  assert.doesNotMatch(routeSource, /requireAdmin/);
  assert.match(routeSource, /await authenticate\(req\)/);
  assert.match(routeSource, /isAllowedPedidoRole\(auth\.user\)/);
  assert.match(routeSource, /message: "Acesso não permitido\." \}, \{ status: 403 \}/);
});

test("GET treats clienteId as optional and only rejects a non-empty invalid value", () => {
  assert.match(routeSource, /req\.nextUrl\.searchParams\.get\("clienteId"\)\?\.trim\(\) \?\? ""/);
  assert.match(routeSource, /let clienteId: string \| null = null;/);
  assert.match(routeSource, /if \(clienteIdTexto\) \{/);
  assert.match(routeSource, /clienteId = parseClienteId\(clienteIdTexto\)/);
  assert.match(routeSource, /message: "clienteId inválido\." \}, \{ status: 400 \}/);
  assert.ok(
    routeSource.indexOf("const clienteIdTexto") < routeSource.indexOf("await listPecasPerdidas"),
    "clienteId validation must run before the query",
  );
});

test("GET reads q and searches all clients when clienteId is absent", () => {
  assert.match(routeSource, /const q = req\.nextUrl\.searchParams\.get\("q"\) \?\? ""/);
  assert.match(routeSource, /NextResponse\.json\(\{ pecas: await listPecasPerdidas\(clienteId, q\) \}\)/);
  assert.match(routeSource, /message: "Erro ao buscar peças\." \}, \{ status: 500 \}/);
});

test("GET never exposes monetary fields", () => {
  assert.doesNotMatch(routeSource, /totalGeral|total_amount|preco|price|valor/i);
});

test("route module exports only the GET handler", () => {
  const exports = routeSource
    .split("\n")
    .filter((line) => /^export\s/.test(line))
    .map((line) => line.trim());
  assert.deepEqual(exports, ["export async function GET(req: NextRequest) {"]);
});
