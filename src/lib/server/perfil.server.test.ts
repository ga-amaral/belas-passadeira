import { strict as assert } from "node:assert";
import test from "node:test";
import { createRequire } from "node:module";

const load = createRequire(import.meta.url);
const {
  NOME_MAX_LENGTH,
  NOME_MIN_LENGTH,
  SENHA_MIN_LENGTH,
  validarPerfilInput,
} = load("./perfil.server.ts") as typeof import("./perfil.server");

test("accepts a valid name, trims it and changes nothing else", () => {
  const result = validarPerfilInput({ name: "  Maria Silva  " });
  assert.deepEqual(result, { ok: true, alteracoes: { name: "Maria Silva" } });
});

test("rejects missing, empty, too short, too long and non-string names", () => {
  assert.deepEqual(validarPerfilInput({ name: "" }), {
    ok: false,
    message: "O nome deve ter entre 2 e 80 caracteres.",
    status: 400,
  });
  assert.deepEqual(validarPerfilInput({ name: "   " }), {
    ok: false,
    message: "O nome deve ter entre 2 e 80 caracteres.",
    status: 400,
  });
  assert.equal(validarPerfilInput({ name: "a".repeat(NOME_MIN_LENGTH - 1) }).ok, false);
  assert.equal(validarPerfilInput({ name: "a".repeat(NOME_MAX_LENGTH + 1) }).ok, false);
  assert.equal(validarPerfilInput({ name: 42 }).ok, false);
});

test("accepts names exactly on both length boundaries", () => {
  assert.deepEqual(validarPerfilInput({ name: "a".repeat(NOME_MIN_LENGTH) }), {
    ok: true,
    alteracoes: { name: "a".repeat(NOME_MIN_LENGTH) },
  });
  assert.deepEqual(validarPerfilInput({ name: "a".repeat(NOME_MAX_LENGTH) }), {
    ok: true,
    alteracoes: { name: "a".repeat(NOME_MAX_LENGTH) },
  });
});

test("requires the current password when a new password is sent", () => {
  assert.deepEqual(validarPerfilInput({ novaSenha: "nova123" }), {
    ok: false,
    message: "Senha atual incorreta.",
    status: 400,
  });
  assert.deepEqual(validarPerfilInput({ senhaAtual: "", novaSenha: "nova123" }), {
    ok: false,
    message: "Senha atual incorreta.",
    status: 400,
  });
  assert.equal(validarPerfilInput({ senhaAtual: 123, novaSenha: "nova123" }).ok, false);
});

test("requires a new password with at least 6 characters", () => {
  assert.deepEqual(
    validarPerfilInput({ senhaAtual: "atual123", novaSenha: "a".repeat(SENHA_MIN_LENGTH - 1) }),
    { ok: false, message: "A nova senha deve ter no mínimo 6 caracteres.", status: 400 },
  );
  assert.equal(SENHA_MIN_LENGTH, 6);
  assert.deepEqual(validarPerfilInput({ senhaAtual: "atual123", novaSenha: "123456", confirmarSenha: "123456" }), {
    ok: true,
    alteracoes: { novaSenha: "123456" },
  });
});

test("requires novaSenha and confirmarSenha to match exactly", () => {
  assert.deepEqual(
    validarPerfilInput({ senhaAtual: "atual123", novaSenha: "nova123", confirmarSenha: "nova124" }),
    { ok: false, message: "A confirmação da senha não confere.", status: 400 },
  );
  assert.deepEqual(
    validarPerfilInput({ senhaAtual: "atual123", novaSenha: "nova123" }),
    { ok: false, message: "A confirmação da senha não confere.", status: 400 },
  );
});

test("combines a name change and a password change in one request", () => {
  assert.deepEqual(
    validarPerfilInput({
      name: " Ana ",
      senhaAtual: "atual123",
      novaSenha: "nova123",
      confirmarSenha: "nova123",
    }),
    { ok: true, alteracoes: { name: "Ana", novaSenha: "nova123" } },
  );
});

test("rejects requests with nothing to change", () => {
  assert.deepEqual(validarPerfilInput({}), {
    ok: false,
    message: "Nenhum dado para atualizar.",
    status: 400,
  });
  assert.deepEqual(validarPerfilInput(null), {
    ok: false,
    message: "Nenhum dado para atualizar.",
    status: 400,
  });
  assert.deepEqual(validarPerfilInput({ senhaAtual: "atual123" }), {
    ok: false,
    message: "Nenhum dado para atualizar.",
    status: 400,
  });
});

test("ignores id, role and email from the body and never exposes the current password", () => {
  const bodyExtra = {
    id: 999,
    role: "admin",
    email: "outro@email.com",
    name: "Maria",
    senhaAtual: "atual123",
  };
  const result = validarPerfilInput(bodyExtra);
  assert.deepEqual(result, { ok: true, alteracoes: { name: "Maria" } });
  const chaves = Object.keys((result as { alteracoes: object }).alteracoes);
  assert.deepEqual(chaves, ["name"]);
  assert.equal(chaves.includes("senhaAtual"), false);
  assert.equal(chaves.includes("id"), false);
  assert.equal(chaves.includes("role"), false);
  assert.equal(chaves.includes("email"), false);
});
