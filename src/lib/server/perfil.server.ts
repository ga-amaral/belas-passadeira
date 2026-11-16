export type PerfilBody = {
  name?: unknown;
  senhaAtual?: unknown;
  novaSenha?: unknown;
  confirmarSenha?: unknown;
};

export type PerfilAlteracoes = {
  name?: string;
  novaSenha?: string;
};

export type PerfilValidation =
  | { ok: true; alteracoes: PerfilAlteracoes }
  | { ok: false; message: string; status: number };

export type PerfilUsuario = {
  id: number | string;
  name: string;
  email: string;
  role: string;
};

export type PerfilResponse = { user: PerfilUsuario };

export type PerfilError = { message: string; status: number };

export const NOME_MIN_LENGTH = 2;
export const NOME_MAX_LENGTH = 80;
export const SENHA_MIN_LENGTH = 6;

export function validarPerfilInput(input: PerfilBody | null | undefined): PerfilValidation {
  const body = input ?? {};
  const alteracoes: PerfilAlteracoes = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return { ok: false, message: "O nome deve ter entre 2 e 80 caracteres.", status: 400 };
    }
    const name = body.name.trim();
    if (name.length < NOME_MIN_LENGTH || name.length > NOME_MAX_LENGTH) {
      return { ok: false, message: "O nome deve ter entre 2 e 80 caracteres.", status: 400 };
    }
    alteracoes.name = name;
  }

  if (body.novaSenha !== undefined) {
    if (typeof body.senhaAtual !== "string" || body.senhaAtual.length === 0) {
      return { ok: false, message: "Senha atual incorreta.", status: 400 };
    }

    const novaSenha = typeof body.novaSenha === "string" ? body.novaSenha : "";
    if (novaSenha.length < SENHA_MIN_LENGTH) {
      return { ok: false, message: "A nova senha deve ter no mínimo 6 caracteres.", status: 400 };
    }
    if (body.confirmarSenha !== novaSenha) {
      return { ok: false, message: "A confirmação da senha não confere.", status: 400 };
    }

    alteracoes.novaSenha = novaSenha;
  }

  if (alteracoes.name === undefined && alteracoes.novaSenha === undefined) {
    return { ok: false, message: "Nenhum dado para atualizar.", status: 400 };
  }

  return { ok: true, alteracoes };
}

export async function atualizarPerfil(
  userId: number | string,
  input: PerfilBody | null | undefined,
): Promise<PerfilResponse | PerfilError> {
  const validacao = validarPerfilInput(input);
  if (!validacao.ok) return { message: validacao.message, status: validacao.status };

  const { name, novaSenha } = validacao.alteracoes;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;

  const { getDb } = await import("@/lib/server/db.server");
  const db = getDb();

  if (novaSenha !== undefined) {
    const { data: atual, error: selectError } = await db
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (selectError) return { message: "Erro ao atualizar perfil.", status: 500 };
    if (!atual) return { message: "Usuário não encontrado.", status: 404 };

    const { default: bcrypt } = await import("bcryptjs");
    const senhaAtualConfere = await bcrypt.compare((input as PerfilBody).senhaAtual as string, atual.password_hash);
    if (!senhaAtualConfere) return { message: "Senha atual incorreta.", status: 400 };

    const mesmaSenha = await bcrypt.compare(novaSenha, atual.password_hash);
    if (mesmaSenha) return { message: "A nova senha deve ser diferente da atual.", status: 400 };

    updateData.password_hash = await bcrypt.hash(novaSenha, 10);
  }

  const { data, error } = await db
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select("id, name, email, role")
    .maybeSingle();

  if (error) return { message: "Erro ao atualizar perfil.", status: 500 };
  if (!data) return { message: "Usuário não encontrado.", status: 404 };

  return {
    user: {
      id: data.id,
      name: String(data.name ?? ""),
      email: String(data.email ?? ""),
      role: String(data.role ?? ""),
    },
  };
}
