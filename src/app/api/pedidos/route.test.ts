import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/pedidos/route.ts", "utf8");

test("GET authorizes admin and funcionaria without requireAdmin", () => {
  assert.doesNotMatch(routeSource, /requireAdmin/);
  assert.match(routeSource, /await authenticate\(req\)/);
  assert.match(routeSource, /isAllowedPedidoRole\(auth\.user\)/);
  assert.match(routeSource, /if \(!isAllowedPedidoRole\(auth\.user\)\)/);
});

test("GET keeps the { message } failure contract and the { pedidos } payload", () => {
  assert.match(routeSource, /NextResponse\.json\(\{ message: auth\.error \}, \{ status: auth\.status \}\)/);
  assert.match(routeSource, /message: "Acesso não permitido\." \}, \{ status: 403 \}/);
  assert.match(routeSource, /NextResponse\.json\(\{ pedidos: await listPedidosKanban\(\) \}\)/);
  assert.match(routeSource, /message: "Erro ao carregar pedidos\." \}, \{ status: 500 \}/);
  assert.match(routeSource, /try \{[\s\S]*await listPedidosKanban\(\)[\s\S]*\} catch \{/);
});
