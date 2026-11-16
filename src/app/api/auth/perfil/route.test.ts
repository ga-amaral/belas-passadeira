import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";

const routeSource = readFileSync("src/app/api/auth/perfil/route.ts", "utf8");
const serviceSource = readFileSync("src/lib/server/perfil.server.ts", "utf8");

test("route module exports only the PUT handler", () => {
  const exports = routeSource
    .split("\n")
    .filter((line) => /^export\s/.test(line))
    .map((line) => line.trim());
  assert.deepEqual(exports, ["export async function PUT(req: NextRequest) {"]);
  assert.match(routeSource, /import \{ authenticate \} from "@\/lib\/server\/auth\.server"/);
  assert.match(routeSource, /import \{ atualizarPerfil \} from "@\/lib\/server\/perfil\.server"/);
});

test("route authenticates before reading the body and targets the token user", () => {
  const authCall = routeSource.indexOf("await authenticate(req)");
  const bodyCall = routeSource.indexOf("await req.json()");
  const updateCall = routeSource.indexOf("await atualizarPerfil(auth.user.id");
  assert.ok(authCall > -1, "route must call authenticate");
  assert.ok(bodyCall > -1 && updateCall > -1, "route must parse the body and update the profile");
  assert.ok(authCall < bodyCall, "authentication must run before the body is read");
  assert.ok(bodyCall < updateCall, "the update must run after the body is read");
});

test("route never reads id, role or email from the body", () => {
  assert.doesNotMatch(routeSource, /body\.id/);
  assert.doesNotMatch(routeSource, /body\.role/);
  assert.doesNotMatch(routeSource, /body\.email/);
  assert.doesNotMatch(routeSource, /params\.id/);
  assert.doesNotMatch(routeSource, /requireAdmin/);
});

test("route keeps the { message } failure contract and the user response contract", () => {
  assert.match(routeSource, /NextResponse\.json\(\{ message: auth\.error \}, \{ status: auth\.status \}\)/);
  assert.match(routeSource, /if \("message" in result\) return NextResponse\.json\(\{ message: result\.message \}, \{ status: result\.status \}\)/);
  assert.match(routeSource, /NextResponse\.json\(\{ user: result\.user \}\)/);
});

test("service only writes name and password_hash for the token user id", () => {
  assert.match(serviceSource, /export async function atualizarPerfil\(\s*userId: number \| string,/);
  assert.match(serviceSource, /if \(name !== undefined\) updateData\.name = name;/);
  assert.match(serviceSource, /updateData\.password_hash = await bcrypt\.hash\(novaSenha, 10\);/);
  assert.match(serviceSource, /\.eq\("id", userId\)/);
  assert.doesNotMatch(serviceSource, /input\.id/);
  assert.doesNotMatch(serviceSource, /input\.role/);
  assert.doesNotMatch(serviceSource, /\.eq\("role"/);
});

test("service compares the current password and rejects reusing it", () => {
  assert.match(serviceSource, /bcrypt\.compare\(\(input as PerfilBody\)\.senhaAtual as string, atual\.password_hash\)/);
  assert.match(serviceSource, /return \{ message: "Senha atual incorreta\.", status: 400 \}/);
  assert.match(serviceSource, /const mesmaSenha = await bcrypt\.compare\(novaSenha, atual\.password_hash\)/);
  assert.match(serviceSource, /return \{ message: "A nova senha deve ser diferente da atual\.", status: 400 \}/);
});

test("service response selects only id, name, email and role and never logs secrets", () => {
  assert.match(serviceSource, /\.select\("id, name, email, role"\)/);
  assert.doesNotMatch(serviceSource, /console\.(log|error|warn|info)/);
  assert.doesNotMatch(serviceSource, /select\("password_hash"\)[\s\S]*select\("id, name, email, role, password_hash"\)/);
});
