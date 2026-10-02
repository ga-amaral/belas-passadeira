# Kanban de Pedidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um Kanban compartilhado de pedidos, com cinco status validados, leitura e movimentação por admin e funcionária, sem aplicar a migration de produção sem aprovação explícita.

**Architecture:** A camada Next expõe `GET /api/pedidos` e `PATCH /api/pedidos/:id/status`, usando um serviço server-side sobre Supabase e uma única constante de status. O front consome exclusivamente `src/lib/api.ts` e renderiza o mesmo `PedidosKanban` em `/admin/pedidos` e `/entrada/pedidos`, com polling de 30 segundos, drag-and-drop e botão alternativo. O servidor Express paralelo (`server/src`) não é alcançado pelo front em produção; o espelho Express (T10) é opcional e serve apenas à paridade do `npm run dev`.

**Tech Stack:** Next.js 14.2.35, React 18, TypeScript estrito, Supabase JS, Express 4, Node Test Runner (`node --test`), Tailwind CSS, `@dnd-kit/core`, `@dnd-kit/utilities` e `npm`.

**Spec:** `C:\Users\ga-am\Documents\Sites\BelasPassadeiras\docs\superpowers\specs\2026-10-02-kanban-pedidos-design.md`

## Global Constraints

- Os cinco valores persistidos são `entrada`, `molho_secagem`, `secar`, `passar` e `concluido`; os rótulos são Entrada, Molho e Secagem, Secar, Passar e Concluído, nessa ordem.
- `orders.id` é inteiro; tipos, DTOs, parâmetros numéricos validados e testes usam `number`, nunca `uuid`, `string` ou `string | number` para o id do pedido.
- Trabalhar somente em `C:\Users\ga-am\Documents\Sites\BelasPassadeiras`; não usar `Dev-Folder\\belaspassadeiras`.
- A migration SQL é somente arquivo versionado e **NÃO deve ser aplicada sem OK explícito do usuário**; nenhum passo executa SQL no Supabase de produção.
- Não criar tabelas novas, não alterar RLS, não adicionar histórico de quem moveu e não enviar WhatsApp a cada etapa.
- Todas as falhas de API preservam o contrato `{ "message": string }`.
- Admin e funcionária autenticados podem listar e mover qualquer pedido; `requireAdmin` não é usado nas novas rotas.
- Polling ocorre imediatamente no mount e a cada 30 segundos, sem realtime, e não sobrescreve um movimento pendente.
- A listagem retorna no máximo 200 pedidos e soma `order_items.quantity`; pedido sem itens retorna `quantidadePecas: 0`.
- A UI mantém os tokens existentes `brand-gold`, `brand-mint`, `brand-text`, `linen-bg` e `shadow-card`.
- Testes JavaScript existentes rodam com `node --test`; não há script `npm test`. O plano adiciona testes TypeScript apenas quando o runner já instalado suportar o arquivo, ou mantém o teste puro em `.js` para não introduzir um runner não solicitado.

## Review Focus

1. **Pedido sem itens:** a listagem deve retornar `quantidadePecas: 0`, sem erro ou `NaN`; teste do agregador em T3 fixa esse comportamento.
2. **Cliente ou funcionária nulos:** o DTO deve retornar `clienteNome: ""` e `funcionariaNome: ""`, sem acessar propriedade de `null`; teste de mapeamento em T3 fixa o fallback.
3. **Id não numérico no PATCH:** `PATCH /api/pedidos/abc/status` deve retornar `400` com `{ message: "ID de pedido inválido." }` e não consultar/alterar banco; teste do handler em T4 fixa a barreira.
4. **Polling durante movimento pendente:** uma resposta antiga do polling não pode desfazer a etapa otimista ou pendente; teste de estado em T7 fixa a proteção por `pendingIds`.
5. **Token expirado durante polling:** `request` deve manter o tratamento existente de `401`, interromper a atualização daquela rodada e redirecionar para login sem criar timers duplicados; teste de cliente/polling em T6 ou T7 fixa uma única chamada e cleanup.

## Diagnóstico de runtime e decisão sobre Express

A evidência do repositório é objetiva:

- `railway.json` define `deploy.startCommand` como `node server/src/server.js` e `healthcheckPath` como `/health`; Railway publica o Express, não `next start`.
- `package.json` inicia Next e Express juntos em `npm run dev` e `npm run start`, e oferece `start:api`/`dev:api` para o Express isolado.
- `src/lib/api.ts` faz `fetch(/api${path})` e não usa `NEXT_PUBLIC_API_URL`.
- `next.config.mjs` só cria rewrite de `/api/:path*` para `http://localhost:3001/:path*` quando `NODE_ENV === "development"`; em produção retorna rewrites vazios.
- `server/src/server.js` monta `/auth`, `/clientes`, `/entrada`, `/entradas`, `/precos` e `/dashboard`, sem `/api` e sem `/pedidos` no estado atual.

Conclusão para a execução (revisada pelo Maestro após conferir `src/lib/api.ts` e `next.config.mjs`): em produção o front chama `/api/...` com URL relativa e `next.config.mjs` não define rewrite fora de desenvolvimento; portanto quem responde em produção são as rotas Next em `src/app/api`. O Express publicado no Railway não é alcançado pelo front. T10 é **opcional** (paridade de `npm run dev`/`npm run start` e consistência do status inicial `entrada` no Express) e deve ser a última tarefa, executada somente se o usuário quiser manter o Express em dia.

## Mapa de arquivos e interfaces

| Tarefa | Arquivos principais | Responsável |
|---|---|---|
| T1 | `src/lib/domain/pedido-status.js`, teste Node, `src/types/index.ts` | Byte |
| T2 | `supabase/migrations/20261002_kanban_pedidos_status.sql` | Atlas |
| T3 | `src/lib/server/pedidos.server.ts`, `src/app/api/pedidos/route.ts`, testes | Byte |
| T4 | `src/app/api/pedidos/[id]/status/route.ts`, testes | Byte |
| T5 | `src/app/api/entrada/route.ts`, `server/src/routes/entradas.js`, testes | Byte |
| T6 | `src/lib/api.ts`, `src/types/index.ts`, testes | Byte |
| T7 | `src/components/pedidos/PedidoCard.tsx`, `PedidosKanban.tsx`, dependências, testes | Terra |
| T8 | páginas de pedidos e barras de navegação, teste/manual | Terra |
| T9 | build, testes e checklist | Octo |
| T10 | `server/src/routes/pedidos.js`, `server/src/server.js`, testes | Byte |

As interfaces abaixo são a fonte única de nomes e tipos entre tarefas. Todos os ids de pedidos são `number`.

```ts
export type PedidoStatus =
  | "entrada"
  | "molho_secagem"
  | "secar"
  | "passar"
  | "concluido";

export interface PedidoKanban {
  id: number;
  clienteNome: string;
  quantidadePecas: number;
  funcionariaNome: string;
  totalGeral: number;
  status: PedidoStatus;
  createdAt: string;
}

export interface PedidoStatusResponse {
  id: number;
  status: PedidoStatus;
}

export interface PedidosKanbanResponse {
  pedidos: PedidoKanban[];
}

export function getPedidosKanban(): Promise<PedidoKanban[]>;
export function updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse>;
```

## Tarefas

### T1: Constante e validador dos cinco status — Byte

**Files:**

- Create: `src/lib/domain/pedido-status.js`
- Modify: `src/types/index.ts`
- Test: `src/lib/domain/pedido-status.test.js`

**Interfaces:**

- Consumes: `unknown` recebido de JSON, formulário e banco.
- Produces: `PEDIDO_STATUSES: readonly string[]`, `PEDIDO_STATUS_LABELS: Readonly<Record<string, string>>`, `isPedidoStatus(value: unknown): value is PedidoStatus`, `PedidoStatus` e `PedidoStage` em `src/types/index.ts`.

- [ ] **Step 1: Write the failing test**

Criar o teste Node abaixo; ele deve cobrir valores válidos, `recebido`, vazio, `null`, número e valor acentuado.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PEDIDO_STATUSES,
  PEDIDO_STATUS_LABELS,
  isPedidoStatus,
} = require("./pedido-status");

test("exposes the five statuses in operational order and their labels", () => {
  assert.deepEqual(PEDIDO_STATUSES, [
    "entrada",
    "molho_secagem",
    "secar",
    "passar",
    "concluido",
  ]);
  assert.deepEqual(PEDIDO_STATUS_LABELS, {
    entrada: "Entrada",
    molho_secagem: "Molho e Secagem",
    secar: "Secar",
    passar: "Passar",
    concluido: "Concluído",
  });
});

test("accepts only the five persisted statuses", () => {
  for (const value of ["entrada", "molho_secagem", "secar", "passar", "concluido"]) {
    assert.equal(isPedidoStatus(value), true);
  }
  for (const value of ["recebido", "", null, 1, "concluído"]) {
    assert.equal(isPedidoStatus(value), false);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/domain/pedido-status.test.js`  
Expected: FAIL with `MODULE_NOT_FOUND` for `./pedido-status`.

- [ ] **Step 3: Write minimal implementation**

Criar o módulo CommonJS consumível pelo runner Node e pelo bundler TypeScript com `allowJs: true`, mantendo a lista em um único lugar.

```js
const PEDIDO_STATUSES = Object.freeze([
  "entrada",
  "molho_secagem",
  "secar",
  "passar",
  "concluido",
]);

const PEDIDO_STATUS_LABELS = Object.freeze({
  entrada: "Entrada",
  molho_secagem: "Molho e Secagem",
  secar: "Secar",
  passar: "Passar",
  concluido: "Concluído",
});

function isPedidoStatus(value) {
  return typeof value === "string" && PEDIDO_STATUSES.includes(value);
}

module.exports = { PEDIDO_STATUSES, PEDIDO_STATUS_LABELS, isPedidoStatus };
```

Adicionar em `src/types/index.ts`:

```ts
export type PedidoStatus =
  | "entrada"
  | "molho_secagem"
  | "secar"
  | "passar"
  | "concluido";

export interface PedidoKanban {
  id: number;
  clienteNome: string;
  quantidadePecas: number;
  funcionariaNome: string;
  totalGeral: number;
  status: PedidoStatus;
  createdAt: string;
}

export interface PedidoStatusResponse {
  id: number;
  status: PedidoStatus;
}

export interface PedidosKanbanResponse {
  pedidos: PedidoKanban[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/domain/pedido-status.test.js`  
Expected: PASS, 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/pedido-status.js src/lib/domain/pedido-status.test.js src/types/index.ts
git commit -m "feat: define kanban pedido statuses"
```

### T2: Migration SQL somente em arquivo — Atlas

**Files:**

- Create: `supabase/migrations/20261002_kanban_pedidos_status.sql`
- Modify: none
- Test: `supabase/migrations/20261002_kanban_pedidos_status.sql` (validação por inspeção e SQL de staging; nenhum teste de produto adicional é criado).

**Interfaces:**

- Consumes: tabela existente `public.orders` e status legados.
- Produces: status normalizado, `orders_status_check` e default `entrada`; não cria tabelas nem altera RLS.

- [ ] **Step 1: Write the failing test**

Antes de escrever o SQL, registrar a consulta de pré-validação no terminal de staging. O resultado deve mostrar a contagem de `recebido` e todos os status existentes; a validação falha se não houver acesso ao staging ou se houver status que não esteja mapeado.

```sql
select status, count(*)
from public.orders
group by status
order by status;
```

Run: executar a consulta no SQL Editor de staging/local, sem produção.  
Expected: os 11 pedidos atuais aparecem como `recebido`, e os demais status são conhecidos pelo contrato ou pela conversão explícita da migration.

- [ ] **Step 2: Run test to verify it fails**

Run: validar a consulta antes de criar o arquivo SQL.  
Expected: no estado inicial a checagem de contrato falha porque `recebido` ainda não pertence ao conjunto novo.

- [ ] **Step 3: Write minimal implementation**

Criar o arquivo com este conteúdo exato. O `DO` aborta quando houver valor desconhecido e a transação impede uma aplicação parcial. Não executar este bloco em produção nesta tarefa.

```sql
begin;

update public.orders
set status = 'entrada'
where status = 'recebido';

update public.orders
set status = 'concluido'
where status = 'concluído';

do $$
declare
  invalid_statuses text;
begin
  select string_agg(status, ', ' order by status)
    into invalid_statuses
  from (
    select distinct status
    from public.orders
    where status is null
       or status not in ('entrada', 'molho_secagem', 'secar', 'passar', 'concluido')
  ) invalid;

  if invalid_statuses is not null then
    raise exception 'orders.status contém valores não mapeados: %', invalid_statuses;
  end if;
end $$;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.orders'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('entrada', 'molho_secagem', 'secar', 'passar', 'concluido'));

alter table public.orders
  alter column status set default 'entrada';

commit;
```

- [ ] **Step 4: Run test to verify it passes**

Run: revisar o arquivo com `Get-Content -Raw supabase/migrations/20261002_kanban_pedidos_status.sql`; depois, somente em staging/local autorizado, executar e confirmar:

```sql
select status, count(*) from public.orders group by status order by status;
select column_default from information_schema.columns
where table_schema = 'public' and table_name = 'orders' and column_name = 'status';
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.orders'::regclass and conname = 'orders_status_check';
```

Expected: os 11 `recebido` viram `entrada`, default é `'entrada'`, o check contém exatamente os cinco valores e a migration não foi aplicada em produção.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261002_kanban_pedidos_status.sql
git commit -m "chore: add kanban status migration"
```

### T3: Serviço server-side e `GET /api/pedidos` — Byte

**Files:**

- Create: `src/lib/server/pedidos.server.ts`
- Create: `src/app/api/pedidos/route.ts`
- Test: `src/lib/server/pedidos.server.test.ts`, `src/app/api/pedidos/route.test.ts`

**Interfaces:**

- Consumes: `getDb()`, `PedidoKanban`, `PedidoStatus`, `isPedidoStatus` e `AuthUser`.
- Produces: `listPedidosKanban(): Promise<PedidoKanban[]>`; `isAllowedPedidoRole(user: AuthUser): boolean`; `GET(req: NextRequest): Promise<NextResponse>`.

- [ ] **Step 1: Write the failing test**

Criar teste puro do mapeamento para fixar ids inteiros, soma sem itens e nulos. O teste não acessa Supabase.

```ts
import { strict as assert } from "node:assert";
import test from "node:test";
import { mapPedidoKanban } from "./pedidos.server";

test("maps an order with integer id and sums item quantities", () => {
  assert.deepEqual(mapPedidoKanban({
    id: 42,
    clients: { name: "Maria" },
    users: { name: "Ana" },
    total_amount: "85.50",
    status: "passar",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: [{ quantity: 2 }, { quantity: 3 }],
  }), {
    id: 42,
    clienteNome: "Maria",
    quantidadePecas: 5,
    funcionariaNome: "Ana",
    totalGeral: 85.5,
    status: "passar",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});

test("uses empty names and zero quantity when relations/items are absent", () => {
  assert.deepEqual(mapPedidoKanban({
    id: 43,
    clients: null,
    users: null,
    total_amount: null,
    status: "entrada",
    created_at: "2026-10-02T13:45:00.000Z",
    order_items: null,
  }), {
    id: 43,
    clienteNome: "",
    quantidadePecas: 0,
    funcionariaNome: "",
    totalGeral: 0,
    status: "entrada",
    createdAt: "2026-10-02T13:45:00.000Z",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/lib/server/pedidos.server.test.ts`  
Expected: FAIL because `pedidos.server` and `mapPedidoKanban` do not exist.

- [ ] **Step 3: Write minimal implementation**

Implementar o serviço TypeScript com export nomeado para o teste JS via transpilação do app; se o Node Test Runner não carregar TypeScript diretamente no ambiente, manter o teste do mapper em `pedidos.server.test.ts` e executá-lo com `node --experimental-strip-types --test`. O serviço deve consultar relações e itens na mesma operação lógica, limitar 200 e converter o id para `number`.

```ts
import { getDb } from "@/lib/server/db.server";
import type { PedidoKanban } from "@/types";

type PedidoRow = Record<string, unknown> & {
  order_items?: Array<Record<string, unknown>> | null;
};

export function isAllowedPedidoRole(user: { role: string }): boolean {
  return user.role === "admin" || user.role === "funcionaria";
}

export function mapPedidoKanban(row: PedidoRow): PedidoKanban {
  const client = row.clients as Record<string, unknown> | null;
  const employee = row.users as Record<string, unknown> | null;
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  const quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return {
    id: Number(row.id),
    clienteNome: String(client?.name ?? ""),
    quantidadePecas: quantity,
    funcionariaNome: String(employee?.name ?? ""),
    totalGeral: Number(row.total_amount) || 0,
    status: String(row.status) as PedidoKanban["status"],
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listPedidosKanban(): Promise<PedidoKanban[]> {
  const { data, error } = await getDb()
    .from("orders")
    .select("id, total_amount, status, created_at, clients:client_id(name), users:employee_id(name), order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as PedidoRow[]).map(mapPedidoKanban);
}
```

Implementar a rota:

```ts
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole, listPedidosKanban } from "@/lib/server/pedidos.server";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }
  try {
    return NextResponse.json({ pedidos: await listPedidosKanban() });
  } catch {
    return NextResponse.json({ message: "Erro ao carregar pedidos." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/lib/server/pedidos.server.test.ts src/app/api/pedidos/route.test.ts` e `npx tsc --noEmit`.  
Expected: mapper PASS e TypeScript sem erros. Para o handler, usar mocks de `authenticate`/`listPedidosKanban` no teste e confirmar `200`, `401`, `403` e `500` com `{ message }`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/pedidos.server.ts src/lib/server/pedidos.server.test.ts src/app/api/pedidos/route.ts src/app/api/pedidos/route.test.ts
git commit -m "feat: add kanban pedido listing api"
```

### T4: `PATCH /api/pedidos/[id]/status` — Byte

**Files:**

- Create: `src/app/api/pedidos/[id]/status/route.ts`
- Modify: `src/lib/server/pedidos.server.ts`
- Test: `src/app/api/pedidos/status.route.test.ts`

**Interfaces:**

- Consumes: `isPedidoStatus`, `isAllowedPedidoRole`, `getDb`, `NextRequest` e `params: { id: string }`.
- Produces: `updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse | null>` e `PATCH(req, { params }): Promise<NextResponse>`.

- [ ] **Step 1: Write the failing test**

Criar casos para admin, funcionária, status inválido, id não numérico, sem token, papel desconhecido, pedido ausente e sucesso.

```ts
import { strict as assert } from "node:assert";
import test from "node:test";
import { parsePedidoId } from "./[id]/status/route";

test("parses only positive integer order ids", () => {
  assert.equal(parsePedidoId("42"), 42);
  assert.equal(parsePedidoId("0"), null);
  assert.equal(parsePedidoId("-1"), null);
  assert.equal(parsePedidoId("42.5"), null);
  assert.equal(parsePedidoId("abc"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/app/api/pedidos/status.route.test.ts`  
Expected: FAIL because `parsePedidoId` does not exist.

- [ ] **Step 3: Write minimal implementation**

Adicionar no serviço a atualização e na rota a validação numérica antes do Supabase. O corpo inválido, inclusive JSON quebrado, deve retornar `400` com `message`.

```ts
import { getDb } from "@/lib/server/db.server";
import type { PedidoStatus, PedidoStatusResponse } from "@/types";

export async function updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse | null> {
  const { data, error } = await getDb()
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: Number(data.id), status: data.status as PedidoStatus };
}
```

```ts
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/server/auth.server";
import { isAllowedPedidoRole, updatePedidoStatus } from "@/lib/server/pedidos.server";
import { isPedidoStatus } from "@/lib/domain/pedido-status";

export function parsePedidoId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticate(req);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  if (!isAllowedPedidoRole(auth.user)) {
    return NextResponse.json({ message: "Acesso não permitido." }, { status: 403 });
  }
  const id = parsePedidoId(params.id);
  if (id === null) return NextResponse.json({ message: "ID de pedido inválido." }, { status: 400 });
  const body = await req.json().catch(() => null) as { status?: unknown } | null;
  if (!body || !isPedidoStatus(body.status)) {
    return NextResponse.json({ message: "Status inválido." }, { status: 400 });
  }
  try {
    const updated = await updatePedidoStatus(id, body.status);
    if (!updated) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Erro ao atualizar pedido." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/app/api/pedidos/status.route.test.ts` e `npx tsc --noEmit`.  
Expected: id inválido e status inválido retornam `400`, pedido inexistente retorna `404`, ambos os papéis retornam `200` com `{ id: number, status }`, e nenhum caso usa `requireAdmin`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pedidos/[id]/status/route.ts src/app/api/pedidos/status.route.test.ts src/lib/server/pedidos.server.ts
git commit -m "feat: add kanban pedido status api"
```

### T5: Status inicial `entrada` na criação — Byte

**Files:**

- Modify: `src/app/api/entrada/route.ts:39-43`
- Modify: `server/src/routes/entradas.js:44-49`
- Test: `src/app/api/entrada/route.test.ts`, `server/src/routes/entradas.test.js`

**Interfaces:**

- Consumes: payload existente de criação de entrada e `PedidoStatus`.
- Produces: insert em `orders` com `status: "entrada"` tanto no handler Next quanto no Express.

- [ ] **Step 1: Write the failing test**

Criar teste de contrato que leia o objeto de insert capturado por mock e exija `status: "entrada"`.

```ts
import { strict as assert } from "node:assert";
import test from "node:test";

test("new Next order insert uses entrada", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/app/api/entrada/route.ts", "utf8"));
  assert.match(source, /status:\s*"entrada"/);
  assert.doesNotMatch(source, /status:\s*"recebido"/);
});
```

O teste Express deve usar a mesma asserção sobre `server/src/routes/entradas.js` e também verificar `status: "entrada"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test src/app/api/entrada/route.test.ts server/src/routes/entradas.test.js`  
Expected: FAIL porque os dois arquivos ainda contêm `status: "recebido"`.

- [ ] **Step 3: Write minimal implementation**

Alterar somente o campo do insert em cada backend:

```ts
const { data: order, error: orderErr } = await db.from("orders").insert({
  client_id: clienteId,
  employee_id: employee.id,
  total_amount: pricing.total,
  volumes_json: JSON.stringify(pricing.volumes),
  avulsos: Number(formData.get("avulsos")),
  status: "entrada",
}).select("*").single();
```

```js
const { data: order, error: orderErr } = await getClient()
  .from("orders")
  .insert({
    client_id: clienteId,
    employee_id: employee.id,
    total_amount: pricing.total,
    volumes_json: JSON.stringify(pricing.volumes),
    avulsos: Number(avulsos),
    status: "entrada",
  })
  .select("*")
  .single();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test src/app/api/entrada/route.test.ts server/src/routes/entradas.test.js`.  
Expected: PASS, nenhum insert novo contém `recebido`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/entrada/route.ts src/app/api/entrada/route.test.ts server/src/routes/entradas.js server/src/routes/entradas.test.js
git commit -m "feat: start new orders in entrada"
```

### T6: Tipos e cliente HTTP — Byte

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/lib/api.ts`
- Test: `src/lib/api.pedidos.test.js`

**Interfaces:**

- Consumes: `PedidoKanban`, `PedidoStatus`, `PedidoStatusResponse`, `PedidosKanbanResponse` de `src/types/index.ts` e helper `request<T>` existente.
- Produces: `getPedidosKanban(): Promise<PedidoKanban[]>`; `updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse>`.

- [ ] **Step 1: Write the failing test**

Criar teste de fonte/contrato que fixe o caminho relativo `/api`, o id numérico e o payload PATCH.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("API client defines integer-id kanban calls under /api/pedidos", () => {
  const source = fs.readFileSync("src/lib/api.ts", "utf8");
  assert.match(source, /getPedidosKanban\(\): Promise<PedidoKanban\[\]>/);
  assert.match(source, /updatePedidoStatus\(id: number, status: PedidoStatus\)/);
  assert.match(source, /request<PedidosKanbanResponse>\("\/pedidos"/);
  assert.match(source, /`\/pedidos\/${id}\/status`/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/api.pedidos.test.js`  
Expected: FAIL porque as funções e imports ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Atualizar o import e adicionar as funções ao bloco de Entradas/Pedidos:

```ts
import {
  AuthResponse,
  Cliente,
  Entrada,
  EntradaPayload,
  Funcionaria,
  HistoricoCliente,
  Preco,
  OpcaoPreco,
  DashboardResumo,
  PedidoKanban,
  PedidoStatus,
  PedidoStatusResponse,
  PedidosKanbanResponse,
} from "@/types";

export async function getPedidosKanban(): Promise<PedidoKanban[]> {
  const response = await request<PedidosKanbanResponse>("/pedidos");
  return response.pedidos;
}

export async function updatePedidoStatus(id: number, status: PedidoStatus): Promise<PedidoStatusResponse> {
  return request<PedidoStatusResponse>(`/pedidos/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/api.pedidos.test.js` e `npx tsc --noEmit`.  
Expected: PASS e tipos sem erro; nenhum id do novo contrato é `string`.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/api.ts src/lib/api.pedidos.test.js
git commit -m "feat: add kanban pedido api client"
```

### T7: Card, Kanban, polling e drag-and-drop — Terra

**Files:**

- Modify: `package.json`, `package-lock.json`
- Create: `src/components/pedidos/pedido-kanban-state.js`
- Create: `src/components/pedidos/pedido-kanban-state.test.js`
- Create: `src/components/pedidos/PedidoCard.tsx`
- Create: `src/components/pedidos/PedidosKanban.tsx`
- Test: `src/components/pedidos/pedido-kanban-state.test.js`

**Interfaces:**

- Consumes: `PedidoKanban`, `PedidoStatus`, `PEDIDO_STATUSES`, `PEDIDO_STATUS_LABELS`, `getPedidosKanban`, `updatePedidoStatus`, `formatCurrency` e APIs `@dnd-kit/core`.
- Produces: `PedidoCard({ pedido, busy, onMove }): JSX.Element`; `PedidosKanban(): JSX.Element` compartilhado pelas duas páginas.

- [ ] **Step 1: Write the failing test**

Fixar primeiro a regra de estado em uma função exportada sem DOM, para que o runner Node possa executá-la:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { mergePollingPedidos } = require("./pedido-kanban-state");

test("polling does not overwrite a card with a pending local move", () => {
  const current = [{ id: 7, status: "passar" }];
  const server = [{ id: 7, status: "entrada" }, { id: 8, status: "secar" }];
  assert.deepEqual(mergePollingPedidos(current, server, new Set([7])), [
    { id: 7, status: "passar" },
    { id: 8, status: "secar" },
  ]);
});

test("polling accepts the server state after the pending move is cleared", () => {
  assert.deepEqual(mergePollingPedidos(
    [{ id: 7, status: "passar" }],
    [{ id: 7, status: "passar" }],
    new Set(),
  ), [{ id: 7, status: "passar" }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/pedidos/pedido-kanban-state.test.js`  
Expected: FAIL because the state helper does not exist.

- [ ] **Step 3: Write minimal implementation**

Adicionar `src/components/pedidos/pedido-kanban-state.js`:

```js
function mergePollingPedidos(current, incoming, pendingIds) {
  const currentById = new Map(current.map((pedido) => [pedido.id, pedido]));
  return incoming.map((pedido) => pendingIds.has(pedido.id) ? (currentById.get(pedido.id) || pedido) : pedido);
}

module.exports = { mergePollingPedidos };
```

Instalar somente os pacotes pedidos:

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

Criar `PedidoCard.tsx` com id inteiro e ação alternativa:

```tsx
"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { PedidoKanban, PedidoStatus } from "@/types";
import { PEDIDO_STATUS_LABELS, PEDIDO_STATUSES } from "@/lib/domain/pedido-status";

type Props = { pedido: PedidoKanban; busy: boolean; onMove: (id: number, status: PedidoStatus) => void };

export default function PedidoCard({ pedido, busy, onMove }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: pedido.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.55 : 1 };
  return (
    <article ref={setNodeRef} style={style} {...listeners} {...attributes}
      className="rounded-xl border border-brand-gold/10 bg-white p-4 shadow-card focus-within:ring-2 focus-within:ring-brand-gold">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-poppins font-semibold text-brand-text">{pedido.clienteNome || "Cliente não informado"}</h3>
        <span className="text-xs text-brand-gold">{pedido.quantidadePecas} peças</span>
      </div>
      <p className="mt-2 text-xs text-brand-text/60">Registrado por {pedido.funcionariaNome || "Não informado"}</p>
      <p className="mt-1 text-sm font-semibold text-brand-gold">{pedido.totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
      <p className="mt-1 text-xs text-brand-text/50">{new Date(pedido.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      <button type="button" disabled={busy} aria-expanded={menuOpen} aria-haspopup="menu"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setMenuOpen((open) => !open)}
        className="mt-3 min-h-10 w-full rounded-lg border border-brand-gold/20 bg-white px-2 text-xs text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold">
        Mover
      </button>
      {menuOpen && <div role="menu" aria-label={`Mover pedido de ${pedido.clienteNome}`} className="mt-2 grid gap-1">
        {PEDIDO_STATUSES.filter((status) => status !== pedido.status).map((status) => (
          <button key={status} type="button" role="menuitem" disabled={busy}
            onClick={() => { setMenuOpen(false); onMove(pedido.id, status); }}
            className="rounded-lg px-2 py-2 text-left text-xs text-brand-text hover:bg-brand-mint/10 focus:outline-none focus:ring-2 focus:ring-brand-gold">
            {PEDIDO_STATUS_LABELS[status]}
          </button>
        ))}
      </div>}
    </article>
  );
}
```

Criar `PedidosKanban.tsx` com polling e proteção de pendências:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import type { PedidoKanban, PedidoStatus } from "@/types";
import { PEDIDO_STATUS_LABELS, PEDIDO_STATUSES } from "@/lib/domain/pedido-status";
import { getPedidosKanban, updatePedidoStatus } from "@/lib/api";
import PedidoCard from "./PedidoCard";
import { mergePollingPedidos } from "./pedido-kanban-state";

function Column({ status, children }: { status: PedidoStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return <section ref={setNodeRef} className={`min-w-[17rem] flex-1 rounded-2xl p-3 ${isOver ? "bg-brand-mint/15" : "bg-brand-bg/50"}`}>
    <header className="mb-3 flex items-center justify-between"><h2 className="font-poppins font-semibold text-brand-text">{PEDIDO_STATUS_LABELS[status]}</h2></header>
    <div className="space-y-3">{children}</div>
  </section>;
}

export default function PedidosKanban() {
  const [pedidos, setPedidos] = useState<PedidoKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const incoming = await getPedidosKanban();
      setPedidos((current) => mergePollingPedidos(current, incoming, pendingIds));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [pendingIds]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);

  const move = useCallback(async (id: number, status: PedidoStatus) => {
    const previous = pedidos;
    const old = pedidos.find((pedido) => pedido.id === id);
    if (!old || old.status === status || pendingIds.has(id)) return;
    setPendingIds((ids) => new Set(ids).add(id));
    setPedidos((items) => items.map((pedido) => pedido.id === id ? { ...pedido, status } : pedido));
    try { await updatePedidoStatus(id, status); }
    catch (cause) { setPedidos(previous); setError(cause instanceof Error ? cause.message : "Erro ao atualizar pedido."); }
    finally { setPendingIds((ids) => { const next = new Set(ids); next.delete(id); return next; }); }
  }, [pedidos, pendingIds]);

  const grouped = useMemo(() => new Map(PEDIDO_STATUSES.map((status) => [status, pedidos.filter((pedido) => pedido.status === status)])), [pedidos]);
  if (loading) return <div aria-label="Carregando pedidos" className="grid min-w-max grid-cols-5 gap-4">{PEDIDO_STATUSES.map((status) => <div key={status} className="h-64 animate-pulse rounded-2xl bg-white shadow-card" />)}</div>;
  if (error && pedidos.length === 0) return <div role="alert" className="rounded-xl bg-white p-8 text-center text-brand-text/60"><p>{error}</p><button className="mt-4 rounded-lg bg-brand-gold px-4 py-2 text-white" onClick={() => { setLoading(true); void load(); }}>Tentar novamente</button></div>;
  return <div className="flex flex-col gap-4">{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DndContext onDragEnd={(event: DragEndEvent) => { const id = Number(event.active.id); const status = event.over?.id; if (typeof status === "string" && PEDIDO_STATUSES.includes(status)) void move(id, status as PedidoStatus); }}><div className="flex min-w-max gap-4 overflow-x-auto pb-4">{PEDIDO_STATUSES.map((status) => <Column key={status} status={status}>{(grouped.get(status) || []).map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} busy={pendingIds.has(pedido.id)} onMove={move} />)}</Column>)}</div></DndContext>{pedidos.length === 0 && <p className="text-center text-brand-text/50">Nenhum pedido encontrado.</p>}</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/pedidos/pedido-kanban-state.test.js`; `npx tsc --noEmit`; `npm run build`.  
Expected: state tests PASS, TypeScript PASS, build PASS. Fazer revisão visual manual de toque, teclado, foco, overflow horizontal e estados skeleton/vazio/erro; ajustar o markup ao padrão aprovado pelo Terra sem trocar tokens de cor.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/pedidos
git commit -m "feat: add shared pedido kanban"
```

### T8: Páginas e navegação — Terra

**Files:**

- Create: `src/app/admin/pedidos/page.tsx`
- Create: `src/app/entrada/pedidos/page.tsx`
- Modify: `src/components/layout/AdminSidebar.tsx`
- Modify: `src/components/layout/FuncionariaTopbar.tsx`
- Test: `src/app/pedidos-pages.test.js`

**Interfaces:**

- Consumes: `PedidosKanban` sem props; layouts existentes `src/app/admin/layout.tsx` e `src/app/entrada/layout.tsx`.
- Produces: rotas `/admin/pedidos` e `/entrada/pedidos`; links ativos com rótulo “Pedidos”.

- [ ] **Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("both pages reuse the shared kanban", () => {
  assert.match(fs.readFileSync("src/app/admin/pedidos/page.tsx", "utf8"), /PedidosKanban/);
  assert.match(fs.readFileSync("src/app/entrada/pedidos/page.tsx", "utf8"), /PedidosKanban/);
});

test("both navigation components expose Pedidos links", () => {
  assert.match(fs.readFileSync("src/components/layout/AdminSidebar.tsx", "utf8"), /\/admin\/pedidos/);
  assert.match(fs.readFileSync("src/components/layout/FuncionariaTopbar.tsx", "utf8"), /\/entrada\/pedidos/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/pedidos-pages.test.js`  
Expected: FAIL because the pages and links do not exist.

- [ ] **Step 3: Write minimal implementation**

Criar as duas páginas, sem duplicar o Kanban:

```tsx
// src/app/admin/pedidos/page.tsx
"use client";
import PedidosKanban from "@/components/pedidos/PedidosKanban";
export default function AdminPedidosPage() { return <PedidosKanban />; }
```

```tsx
// src/app/entrada/pedidos/page.tsx
"use client";
import PedidosKanban from "@/components/pedidos/PedidosKanban";
export default function EntradaPedidosPage() { return <PedidosKanban />; }
```

Adicionar aos arrays/menus existentes:

```ts
{ href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
```

```tsx
<Link
  href="/entrada/pedidos"
  className={`px-3 py-1.5 rounded-lg text-sm font-poppins transition-colors ${
    pathname === "/entrada/pedidos"
      ? "bg-brand-gold/10 text-brand-gold font-semibold"
      : "text-brand-text/60 hover:text-brand-text"
  }`}
>
  Pedidos
</Link>
```

Importar `ClipboardList` de `lucide-react` e manter a expressão de classe já usada no arquivo para que o estado ativo tenha o mesmo estilo.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/pedidos-pages.test.js`; `npx tsc --noEmit`; `npm run build`.  
Expected: PASS, ambas as páginas importam o componente compartilhado, os links apontam para as rotas corretas e os layouts existentes continuam compilando.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/pedidos/page.tsx src/app/entrada/pedidos/page.tsx src/components/layout/AdminSidebar.tsx src/components/layout/FuncionariaTopbar.tsx src/app/pedidos-pages.test.js
git commit -m "feat: add pedido kanban navigation"
```

### T9: Verificação final, build e checklist manual — Octo

**Files:**

- Create: `docs/superpowers/checklists/2026-10-02-kanban-pedidos-verification.md`
- Modify: nenhum arquivo de produto
- Test: comandos abaixo e checklist manual

**Interfaces:**

- Consumes: todos os artefatos T1–T8, migration não aplicada em produção, ambiente local/staging e browsers desktop/tablet.
- Produces: evidência de testes/build e checklist preenchido; não altera contrato de produto.

- [ ] **Step 1: Write the failing test**

Criar checklist inicialmente com os itens abaixo marcados como `- [ ]`; a verificação só pode ser concluída quando cada item tiver evidência.

```md
# Verificação Kanban de Pedidos — 2026-10-02

- [ ] `node --test src/lib/capture-scheduler.test.js`
- [ ] `node --test server/src/services/pricing.test.js`
- [ ] `node --test src/lib/domain/pedido-status.test.js`
- [ ] `node --experimental-strip-types --test src/app/api/pedidos/status.route.test.ts`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] migration existe e não foi executada em produção
- [ ] admin vê `/admin/pedidos`
- [ ] funcionária vê `/entrada/pedidos`
- [ ] cinco colunas e rótulos na ordem aprovada
- [ ] card sem itens exibe zero peças
- [ ] drag com mouse e toque/tablet
- [ ] botão Mover funciona
- [ ] polling em 30 segundos sem desfazer movimento pendente
- [ ] token expirado redireciona para login sem timers duplicados
- [ ] nenhum RLS, tabela nova, histórico ou WhatsApp por etapa
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/domain/pedido-status.test.js src/lib/capture-scheduler.test.js server/src/services/pricing.test.js`.  
Expected: antes da implementação completa, pelo menos os testes dos artefatos ainda inexistentes falham; não marcar o checklist como concluído.

- [ ] **Step 3: Write minimal implementation**

Preencher somente o checklist, anexando saída dos comandos e observações dos navegadores. Não modificar código de produto nesta tarefa.

- [ ] **Step 4: Run test to verify it passes**

Run exatamente:

```bash
node --test src/lib/capture-scheduler.test.js server/src/services/pricing.test.js src/lib/domain/pedido-status.test.js
node --experimental-strip-types --test src/app/api/pedidos/status.route.test.ts
npx tsc --noEmit
npm run build
```

Expected: todos os testes PASS, TypeScript sem erros e build com exit code 0. Repetir o checklist manual em desktop e tablet; confirmar que o Express e as rotas Next respondem conforme a decisão de deploy.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/checklists/2026-10-02-kanban-pedidos-verification.md
git commit -m "test: verify pedido kanban delivery"
```

### T10: Espelho Express — Byte (OPCIONAL, só paridade de desenvolvimento; executar por último e só se o usuário confirmar)

**Files:**

- Create: `server/src/routes/pedidos.js`
- Modify: `server/src/server.js`
- Test: `server/src/routes/pedidos.test.js`

**Interfaces:**

- Consumes: `getClient`, `authenticate`, `req.user`, `orders`, `order_items`, `clients`, `users` e os cinco status.
- Produces: `GET /pedidos` com `{ pedidos: PedidoKanban[] }` e `PATCH /pedidos/:id/status` com `{ id: number, status: PedidoStatus }`; montagem em `server/src/server.js`.

- [ ] **Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Railway Express mounts pedidos and starts new orders in entrada", () => {
  const server = fs.readFileSync("server/src/server.js", "utf8");
  const entries = fs.readFileSync("server/src/routes/entradas.js", "utf8");
  assert.match(server, /app\.use\("\/pedidos", require\("\.\/routes\/pedidos"\)\)/);
  assert.match(entries, /status:\s*"entrada"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test server/src/routes/pedidos.test.js`  
Expected: FAIL because `/pedidos` is not mounted and `server/src/routes/pedidos.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Criar a rota Express usando o middleware de autenticação existente. A validação do id deve ser numérica e a regra de papel deve aceitar apenas `admin` e `funcionaria`.

```js
const express = require("express");
const { getClient } = require("../database/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function allowed(user) { return user.role === "admin" || user.role === "funcionaria"; }
function parseId(raw) { if (!/^\d+$/.test(raw)) return null; const id = Number(raw); return Number.isSafeInteger(id) && id > 0 ? id : null; }
function map(row) {
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    id: Number(row.id),
    clienteNome: row.clients?.name || "",
    quantidadePecas: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    funcionariaNome: row.users?.name || "",
    totalGeral: Number(row.total_amount) || 0,
    status: row.status,
    createdAt: row.created_at,
  };
}

router.get("/", async (req, res) => {
  if (!allowed(req.user)) return res.status(403).json({ message: "Acesso não permitido." });
  const { data, error } = await getClient().from("orders")
    .select("id, total_amount, status, created_at, clients:client_id(name), users:employee_id(name), order_items(quantity)")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return res.status(500).json({ message: "Erro ao carregar pedidos." });
  return res.json({ pedidos: (data || []).map(map) });
});

router.patch("/:id/status", async (req, res) => {
  if (!allowed(req.user)) return res.status(403).json({ message: "Acesso não permitido." });
  const id = parseId(req.params.id);
  const statuses = ["entrada", "molho_secagem", "secar", "passar", "concluido"];
  if (id === null) return res.status(400).json({ message: "ID de pedido inválido." });
  if (!statuses.includes(req.body?.status)) return res.status(400).json({ message: "Status inválido." });
  const { data, error } = await getClient().from("orders").update({ status: req.body.status }).eq("id", id).select("id, status").maybeSingle();
  if (error) return res.status(500).json({ message: "Erro ao atualizar pedido." });
  if (!data) return res.status(404).json({ message: "Pedido não encontrado." });
  return res.json({ id: Number(data.id), status: data.status });
});

module.exports = router;
```

Adicionar no servidor:

```js
app.use("/pedidos", require("./routes/pedidos"));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test server/src/routes/pedidos.test.js server/src/services/pricing.test.js`.  
Expected: montagem PASS; com mocks do Supabase, GET aceita os dois papéis, PATCH rejeita id/status inválidos e respostas seguem `{ message }`. Executar também `node server/src/server.js` em ambiente local com variáveis de teste e consultar `/health`, sem apontar para produção.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/pedidos.js server/src/routes/pedidos.test.js server/src/server.js
git commit -m "feat: mirror pedido kanban routes in express"
```

## Auto-revisão

- **Cobertura da spec:** T1 cobre os cinco status e validação; T2 cobre conversão/default/check sem aplicação produtiva; T3/T4 cobrem listagem e alteração com autenticação, erros e ids inteiros; T5 cobre `entrada` em Next e Express; T6 cobre DTO/client; T7 cobre card, botão, drag, polling, estados e responsividade; T8 cobre páginas/links; T9 cobre build/testes/checklist; T10 (opcional) mantém o Express paralelo consistente. Fora de escopo — RLS, tabelas novas, histórico e WhatsApp por etapa — está explicitamente preservado.
- **Consistência de nomes/tipos:** o id do pedido é `number` em `PedidoKanban`, `PedidoStatusResponse`, `getPedidosKanban`, `updatePedidoStatus`, `parsePedidoId`, mocks e respostas Express/Next. O status usa os mesmos cinco literais em runtime, TypeScript, SQL e testes. A listagem retorna `{ pedidos }`; o client desembrulha para `PedidoKanban[]`; PATCH retorna `{ id, status }`.
- **Runner e deploy:** os testes existentes permanecem em `node --test`, não foi inventado script `npm test`; `npx tsc --noEmit` e `npm run build` são as verificações TypeScript/Next. A evidência de `next.config.mjs` (sem rewrite em produção) e `src/lib/api.ts` (URL relativa) indica que produção usa as rotas Next; T10 (Express) é opcional.
- **Escopo de escrita:** este documento é o único artefato a criar nesta tarefa; nenhum commit, push, migration de produção ou código de produto deve ser executado durante a elaboração deste plano.
