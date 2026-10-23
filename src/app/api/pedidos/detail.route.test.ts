import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/pedidos/[id]/route.ts", "utf8");

test("GET authorizes admin and funcionaria without requireAdmin", () => {
  assert.doesNotMatch(routeSource, /requireAdmin/);
  assert.match(routeSource, /await authenticate\(req\)/);
  assert.match(routeSource, /isAllowedPedidoRole\(auth\.user\)/);
  assert.match(routeSource, /if \(!isAllowedPedidoRole\(auth\.user\)\)/);
});

test("validates the numeric id before touching the database", () => {
  const parseCall = routeSource.indexOf("parsePedidoId(params.id)");
  const detailCall = routeSource.indexOf("await getPedidoDetalhe(id)");
  assert.ok(parseCall > -1, "GET must validate params.id with parsePedidoId");
  assert.ok(detailCall > -1, "GET must load the order detail with getPedidoDetalhe");
  assert.ok(parseCall < detailCall, "id validation must run before any database access");
});

test("route module exports only the GET handler with the Next 14 params contract", () => {
  const exports = routeSource
    .split("\n")
    .filter((line) => /^export\s/.test(line))
    .map((line) => line.trim());
  assert.deepEqual(
    exports,
    ["export async function GET(req: NextRequest, { params }: { params: { id: string } }) {"],
  );
});

test("GET keeps the { message } failure contract and returns the pedido payload", () => {
  assert.match(routeSource, /NextResponse\.json\(\{ message: auth\.error \}, \{ status: auth\.status \}\)/);
  assert.match(routeSource, /message: "Acesso não permitido\." \}, \{ status: 403 \}/);
  assert.match(routeSource, /message: "ID de pedido inválido\." \}, \{ status: 400 \}/);
  assert.match(routeSource, /message: "Pedido não encontrado\." \}, \{ status: 404 \}/);
  assert.match(routeSource, /NextResponse\.json\(pedido\)/);
  assert.match(routeSource, /message: "Erro ao carregar pedido\." \}, \{ status: 500 \}/);
  assert.match(routeSource, /try \{[\s\S]*await getPedidoDetalhe\(id\)[\s\S]*\} catch \{/);
});

test("detail service loads item photos, descriptions and quantities for one order", () => {
  const serviceSource = readFileSync("src/lib/server/pedidos.server.ts", "utf8");
  assert.match(serviceSource, /export async function getPedidoDetalhe\(id: number\)/);
  assert.match(serviceSource, /\.eq\("id", id\)/);
  assert.match(serviceSource, /order_items\(quantity, manual_description, ai_description, size, image_url, image_path\)/);
  assert.match(serviceSource, /if \(!data\) return null;/);
});
