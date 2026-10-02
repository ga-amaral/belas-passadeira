import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/pedidos/[id]/status/route.ts", "utf8");

function extractParsePedidoId(): (raw: string) => number | null {
  const declaration = routeSource.match(
    /export function parsePedidoId\(raw: string\): number \| null \{[\s\S]*?\n\}/,
  );
  assert.ok(declaration, "status route must export parsePedidoId");
  const body = declaration[0]
    .replace(/^export /, "")
    .replace(/\(raw: string\): number \| null/, "(raw)");
  return new Function(`${body}\nreturn parsePedidoId;`)() as (raw: string) => number | null;
}

test("parses only positive integer order ids", () => {
  const parsePedidoId = extractParsePedidoId();
  assert.equal(parsePedidoId("42"), 42);
  assert.equal(parsePedidoId("0"), null);
  assert.equal(parsePedidoId("-1"), null);
  assert.equal(parsePedidoId("42.5"), null);
  assert.equal(parsePedidoId("abc"), null);
});

test("validates the numeric id before touching body or database", () => {
  const parseCall = routeSource.indexOf("parsePedidoId(params.id)");
  const bodyCall = routeSource.indexOf("await req.json()");
  const updateCall = routeSource.indexOf("updatePedidoStatus(id, body.status");
  assert.ok(parseCall > -1, "PATCH must validate params.id with parsePedidoId");
  assert.ok(bodyCall > -1 && updateCall > -1, "PATCH must parse the body and update the order");
  assert.ok(parseCall < bodyCall, "id validation must run before the request body is read");
  assert.ok(parseCall < updateCall, "id validation must run before any database access");
});

test("PATCH uses the Next 14 synchronous params contract", () => {
  assert.match(
    routeSource,
    /export async function PATCH\(req: NextRequest, \{ params \}: \{ params: \{ id: string \} \}\)/,
  );
});

test("PATCH keeps the { message } contract for every failure and has no requireAdmin", () => {
  assert.doesNotMatch(routeSource, /requireAdmin/);
  assert.match(routeSource, /await authenticate\(req\)/);
  assert.match(routeSource, /NextResponse\.json\(\{ message: auth\.error \}, \{ status: auth\.status \}\)/);
  assert.match(routeSource, /isAllowedPedidoRole\(auth\.user\)/);
  assert.match(routeSource, /message: "Acesso não permitido\." \}, \{ status: 403 \}/);
  assert.match(routeSource, /message: "ID de pedido inválido\." \}, \{ status: 400 \}/);
  assert.match(routeSource, /isPedidoStatus\(body\.status\)/);
  assert.match(routeSource, /message: "Status inválido\." \}, \{ status: 400 \}/);
  assert.match(routeSource, /message: "Pedido não encontrado\." \}, \{ status: 404 \}/);
  assert.match(routeSource, /NextResponse\.json\(updated\)/);
  assert.match(routeSource, /message: "Erro ao atualizar pedido\." \}, \{ status: 500 \}/);
});

test("service updates orders by integer id and returns { id: number, status }", () => {
  const serviceSource = readFileSync("src/lib/server/pedidos.server.ts", "utf8");
  assert.match(serviceSource, /export async function updatePedidoStatus\(id: number, status: PedidoStatus\)/);
  assert.match(serviceSource, /\.eq\("id", id\)/);
  assert.match(serviceSource, /return \{ id: Number\(data\.id\), status: data\.status as PedidoStatus \}/);
});
