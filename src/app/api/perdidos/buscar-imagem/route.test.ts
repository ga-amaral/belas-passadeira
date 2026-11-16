import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/perdidos/buscar-imagem/route.ts", "utf8");

test("POST authorizes admin and funcionaria without requireAdmin", () => {
  assert.doesNotMatch(routeSource, /requireAdmin/);
  assert.match(routeSource, /await authenticate\(req\)/);
  assert.match(routeSource, /isAllowedPedidoRole\(auth\.user\)/);
  assert.match(routeSource, /message: "Acesso não permitido\." \}, \{ status: 403 \}/);
});

test("POST treats clienteId as optional and validates only when present", () => {
  assert.match(routeSource, /formData\.get\("clienteId"\)/);
  assert.match(routeSource, /let clienteId: string \| null = null;/);
  assert.match(routeSource, /if \(clienteIdTexto\) \{/);
  assert.match(routeSource, /clienteId = parseClienteId\(clienteIdTexto\)/);
  assert.match(routeSource, /message: "clienteId inválido\." \}, \{ status: 400 \}/);
});

test("POST validates image type and size before calling the AI", () => {
  assert.match(routeSource, /const file = formData\.get\("foto"\)/);
  assert.match(routeSource, /file\.type\.startsWith\("image\/"\)/);
  assert.match(routeSource, /file\.size > MAX_IMAGE_BYTES/);
  assert.match(routeSource, /const MAX_IMAGE_BYTES = 8 \* 1024 \* 1024/);
  assert.match(routeSource, /message: "Nenhuma imagem enviada\." \}, \{ status: 400 \}/);
  assert.match(routeSource, /message: "Arquivo de imagem inválido\." \}, \{ status: 400 \}/);
  assert.ok(
    routeSource.indexOf("const clienteIdTexto") < routeSource.indexOf("await encontrarPecasPorImagem"),
    "validation must run before the AI call",
  );
});

test("POST uses candidates that fall back to all clients and reports when the limit cut the set", () => {
  assert.match(routeSource, /await listPecasPerdidasCandidatas\(clienteId\)/);
  assert.match(routeSource, /const \{ pecas, limitado \} = candidatos;/);
  assert.match(routeSource, /NextResponse\.json\(\{ pecas: \[\] \}\)|NextResponse\.json\(\{ pecas: \[\], limitado \}\)/);
  assert.match(routeSource, /NextResponse\.json\(\{ pecas: filterPecasPorIds\(pecas, ids\), limitado \}\)/);
});

test("POST sends client names to the AI only when searching all clients", () => {
  assert.match(routeSource, /clienteId\s*\n?\s*\? \{ id: peca\.id, descricao: peca\.descricao \}/);
  assert.match(routeSource, /\{ id: peca\.id, descricao: peca\.descricao, clienteNome: peca\.clienteNome \}/);
});

test("POST returns 503 instead of the full list when the AI is unavailable", () => {
  assert.match(
    routeSource,
    /message: "Busca por imagem indisponível no momento\. Tente novamente mais tarde\." \},[\s\S]*\{ status: 503 \}/,
  );
  assert.doesNotMatch(routeSource, /catch \{[\s\S]*limitado: true \}/, "AI failure must not fall back to the full list");
});

test("route module exports only the POST handler and never exposes monetary fields", () => {
  const exports = routeSource
    .split("\n")
    .filter((line) => /^export\s/.test(line))
    .map((line) => line.trim());
  assert.deepEqual(exports, ["export async function POST(req: NextRequest) {"]);
  assert.doesNotMatch(routeSource, /totalGeral|total_amount|preco|price|valor/i);
});
