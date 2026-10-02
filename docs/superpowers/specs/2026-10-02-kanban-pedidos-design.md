# Especificação: Kanban de pedidos

**Data:** 2026-10-02  
**Projeto:** Belas Passadeiras (`ga-amaral/belas-passadeira`)  
**Branch de referência:** `feat/kanban-pedidos`  
**Banco:** Supabase, projeto `gdsnfrfxvqxueubytoeb`

## Objetivo

Depois que uma funcionária registra o cliente e as peças, o pedido deve aparecer em um Kanban com cinco etapas operacionais. Administradoras e funcionárias devem consultar os mesmos pedidos e as mesmas informações, e ambas as funções devem poder mover qualquer card entre as etapas.

## Contexto atual

- A entrada de pedidos é iniciada em `src/app/entrada/page.tsx` e enviada por `createEntrada` em `src/lib/api.ts` para `POST /api/entrada`.
- `src/app/api/entrada/route.ts` grava em `orders` com `status: "recebido"`; o espelho Express faz a mesma gravação em `server/src/routes/entradas.js`.
- `GET /api/entradas` em `src/app/api/entradas/route.ts` exige `requireAdmin`; o espelho Express também aplica `requireAdmin` em `server/src/routes/entradas.js`.
- As respostas existentes mapeiam `clients:client_id`, `users:employee_id`, `total_amount`, `volumes_json`, `avulsos` e `created_at`. Os itens são armazenados em `order_items`, com `quantity` em `src/app/api/entrada/route.ts`.
- A autenticação server-side está centralizada em `src/lib/server/auth.server.ts`: `authenticate` aceita usuários ativos com token Bearer e `AuthUser.role` distingue `admin` e `funcionaria`. `requireAdmin` não deve ser usado nas novas rotas do Kanban.
- O layout administrativo usa `src/components/layout/AdminSidebar.tsx` e `src/app/admin/layout.tsx`. O layout de entrada usa `src/components/layout/FuncionariaTopbar.tsx` e `src/app/entrada/layout.tsx`.
- `src/types/index.ts` contém `Entrada`, mas não contém um tipo restrito para as etapas do Kanban.
- O projeto usa Next.js 14, React 18, Supabase JS e Tailwind. `@dnd-kit` ainda não está listado em `package.json`.
- Existe um servidor Express paralelo em `server/src/server.js`, montando `/entrada` e `/entradas`; ele precisa manter o mesmo contrato quando usado por `npm run dev`/`npm run start`.

## Problema a resolver

O fluxo atual registra o pedido, mas não oferece uma visão operacional compartilhada nem permite que uma funcionária avance o pedido. A listagem existente é administrativa e usa um status legado (`recebido`), enquanto a operação precisa de um conjunto fechado de cinco estados e atualização segura para ambos os papéis.

## Escopo incluído

- Migrar `orders.status` para exatamente `entrada`, `molho_secagem`, `secar`, `passar` e `concluido`.
- Converter os 11 pedidos atuais em `recebido` para `entrada` e definir `entrada` como default.
- Criar listagem autenticada do Kanban para admin e funcionária.
- Criar alteração autenticada de etapa para admin e funcionária, com rejeição de valores inválidos.
- Criar um componente Kanban compartilhado por `/admin/pedidos` e `/entrada/pedidos`.
- Exibir no card cliente, quantidade de peças, funcionária que registrou, valor e hora de entrada.
- Permitir arrastar com `@dnd-kit`, inclusive em toque/tablet, e oferecer botão de mover como alternativa.
- Fazer polling automático a cada 30 segundos, sem WebSocket ou Supabase Realtime.
- Adicionar o link “Pedidos” à navegação administrativa e à navegação da funcionária.
- Preservar o estilo dourado/menta existente e os padrões de autenticação, erro e componentes do app.

## Escopo não incluído

- Histórico/auditoria de quem moveu cada pedido.
- Envio de WhatsApp a cada mudança de etapa.
- Alteração de RLS, políticas ou modelo de permissões do Supabase.
- Tabelas novas.
- Detalhes completos do pedido, edição de peças, filtros avançados ou visualização alternativa em tabela.
- Aplicação automática da migration em produção.

## Requisitos funcionais

### Etapas

| Valor persistido | Rótulo exibido | Ordem |
|---|---|---:|
| `entrada` | Entrada | 1 |
| `molho_secagem` | Molho e Secagem | 2 |
| `secar` | Secar | 3 |
| `passar` | Passar | 4 |
| `concluido` | Concluído | 5 |

O valor persistido deve ser ASCII estável; o acento existe somente no rótulo. Nenhum outro valor pode ser aceito pela API ou pelo banco.

### Visibilidade e alteração

- Qualquer usuário autenticado e ativo com papel `admin` ou `funcionaria` pode carregar o Kanban.
- Qualquer usuário autenticado e ativo com papel `admin` ou `funcionaria` pode mover qualquer pedido para qualquer uma das cinco etapas.
- Usuário sem token recebe `401`; token inválido, expirado ou usuário inativo também recebe `401`; papel diferente dos dois papéis suportados recebe `403`.
- Não haverá filtragem por funcionária: as duas telas exibem a mesma coleção e os mesmos campos.

## Arquitetura e arquivos

### Arquivos a criar

- `supabase/migrations/20261002_kanban_pedidos_status.sql`: migration manual, transacional, sem criação de tabelas.
- `src/app/api/pedidos/route.ts`: `GET` da listagem do Kanban.
- `src/app/api/pedidos/[id]/status/route.ts`: `PATCH` da etapa de um pedido.
- `src/app/admin/pedidos/page.tsx`: página administrativa que renderiza o componente compartilhado.
- `src/app/entrada/pedidos/page.tsx`: página da funcionária que renderiza o mesmo componente.
- `src/components/pedidos/PedidosKanban.tsx`: estado de carregamento, polling, agrupamento, drag-and-drop, botão alternativo e feedback de erro/sucesso.
- `src/components/pedidos/PedidoCard.tsx`: apresentação de um card e ações acessíveis de movimentação.
- `src/components/pedidos/pedido-status.ts`: constante `PEDIDO_STAGES`, rótulos e validação compartilhada entre UI e código de domínio.
- `src/lib/server/pedidos.server.ts`: consulta/mapeamento e atualização de status para evitar duplicação entre rotas Next.
- `src/lib/domain/pedido-status.ts`: tipo `PedidoStatus`, `isPedidoStatus` e regra pura de validação.
- `src/app/api/pedidos/__tests__/status.test.ts`: testes unitários da validação e do handler de mudança de etapa, conforme o padrão de testes já usado no projeto, se aplicável.
- `server/src/routes/pedidos.js`: espelho Express das duas rotas, caso o servidor Express continue sendo usado nos scripts de desenvolvimento/produção atuais.

### Arquivos a alterar

- `src/app/api/entrada/route.ts`: gravar novos pedidos com `status: "entrada"`.
- `server/src/routes/entradas.js`: espelho da gravação com `status: "entrada"`; a rota antiga de listagem administrativa não deve ser reutilizada pelo Kanban.
- `src/types/index.ts`: adicionar `PedidoStatus`/DTO do Kanban ou importar o tipo de módulo sem criar uma segunda lista de valores.
- `src/lib/api.ts`: adicionar funções `getPedidosKanban` e `updatePedidoStatus` usando `/api/pedidos`.
- `src/components/layout/AdminSidebar.tsx`: item “Pedidos” apontando para `/admin/pedidos`.
- `src/components/layout/FuncionariaTopbar.tsx`: link “Pedidos” apontando para `/entrada/pedidos`.
- `package.json` e lockfile correspondente: adicionar `@dnd-kit/core` e `@dnd-kit/utilities` (e outro pacote oficial do mesmo ecossistema somente se a implementação precisar de sortable; não adicionar biblioteca de drag-and-drop concorrente).
- `server/src/server.js`: montar `app.use("/pedidos", require("./routes/pedidos"))` se o Express for o backend ativo nos scripts `dev`/`start`.

Antes da implementação, o FrontEnd Designer deve validar responsividade, densidade dos cards, estados de foco/erro e interação por toque; o Especialista em Layouts Futuristas só precisa revisar se a equipe optar por alterar significativamente a linguagem visual existente. A direção base permanece a já aprovada: dourado/menta, superfícies brancas, bordas suaves e sombras do app.

## Contrato das rotas

### `GET /api/pedidos`

Autenticação: Bearer obrigatório; permitido para `admin` e `funcionaria` ativos. O endpoint deve retornar no máximo 200 pedidos, ordenados por `created_at` descendente, sem filtros de papel.

Resposta `200`:

```json
{
  "pedidos": [
    {
      "id": "uuid-ou-id",
      "clienteNome": "Maria Silva",
      "quantidadePecas": 4,
      "funcionariaNome": "Ana",
      "totalGeral": 85.5,
      "status": "molho_secagem",
      "createdAt": "2026-10-02T13:45:00.000Z"
    }
  ]
}
```

`quantidadePecas` deve ser a soma de `order_items.quantity` do pedido; quando não houver itens, deve ser `0`. `totalGeral` deve refletir `orders.total_amount`. `createdAt` é `orders.created_at` em ISO. A consulta deve trazer `clients.name`, `users.name` e `order_items.quantity` em uma única operação lógica; não expor WhatsApp, caminhos de arquivo ou dados que a tela não usa.

Erros:

- `401` e `{ "message": "..." }` para ausência/invalidez do token.
- `403` e `{ "message": "Acesso não permitido." }` para papel não suportado.
- `500` e `{ "message": "Erro ao carregar pedidos." }` para falha de banco, sem vazar SQL.

### `PATCH /api/pedidos/:id/status`

Autenticação: igual à listagem. Corpo obrigatório:

```json
{ "status": "passar" }
```

Resposta `200`:

```json
{
  "id": "uuid-ou-id",
  "status": "passar"
}
```

Erros:

- `400` `{ "message": "Status inválido." }` quando o corpo não for JSON, não contiver `status` ou usar valor fora dos cinco permitidos.
- `401` para autenticação ausente/inválida.
- `403` para papel não suportado.
- `404` `{ "message": "Pedido não encontrado." }` quando o id não existir.
- `500` `{ "message": "Erro ao atualizar pedido." }` para falha de banco.

A atualização deve usar `eq("id", params.id)` e confirmar a linha afetada. O banco continua sendo a segunda barreira de validação via `CHECK`.

### Espelho Express

Quando `server/src/server.js` estiver ativo, `server/src/routes/pedidos.js` deve expor o mesmo contrato em `/pedidos` e usar o middleware `authenticate` existente. A regra de papel deve aceitar explicitamente `admin` e `funcionaria`, sem chamar `requireAdmin`. A aplicação Next continua consumindo `/api/...`; o espelho existe para não deixar `npm run dev` e `npm run start` com comportamentos divergentes.

## SQL da migration

O arquivo deve conter o SQL abaixo, com revisão do usuário antes de qualquer execução no projeto Supabase de produção. A migration é somente um artefato versionado; a implementação não deve executá-la automaticamente.

```sql
begin;

-- Normaliza os valores legados conhecidos antes de instalar o CHECK.
update public.orders
set status = 'entrada'
where status = 'recebido';

update public.orders
set status = 'concluido'
where status = 'concluído';

-- Interrompe a migration se existir qualquer status fora do contrato novo.
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

-- Remove somente CHECK constraints da tabela orders cuja definição valida status.
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
    execute format(
      'alter table public.orders drop constraint %I',
      constraint_row.conname
    );
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('entrada', 'molho_secagem', 'secar', 'passar', 'concluido'));

alter table public.orders
  alter column status set default 'entrada';

commit;
```

Resultado esperado: os 11 pedidos atualmente em `recebido` ficam em `entrada`; nenhum valor fora do conjunto é aceito; novos inserts sem `status` recebem `entrada`. A migration não cria tabela nem modifica RLS.

## Comportamento da tela

- `/admin/pedidos` e `/entrada/pedidos` devem renderizar exatamente `PedidosKanban`, sem duplicar regra de negócio ou markup de card.
- A tela exibe cinco colunas na ordem definida, com rótulo, contagem de cards e área de drop.
- Cada card mostra cliente, “N peças”, funcionária que registrou, valor formatado em moeda local e hora de entrada formatada a partir de `createdAt`.
- O card é arrastável com `@dnd-kit`; o alvo de drop deve ter indicação visual clara. O toque deve funcionar sem depender de hover ou de precisão de mouse.
- Cada card também tem botão acessível “Mover” que abre uma seleção/popover ou menu com os cinco rótulos. O botão deve permitir a mesma operação quando arrastar não for possível.
- Ao iniciar uma mudança, o card deve ficar em estado de atualização e impedir submissões duplicadas. Após `200`, atualizar a posição local imediatamente e manter a resposta do servidor como fonte de verdade; após erro, restaurar a posição anterior e exibir mensagem não bloqueante.
- O polling executa imediatamente no mount e depois a cada 30 segundos. Deve limpar o timer no unmount, não iniciar múltiplos timers e não sobrescrever uma movimentação enquanto ela estiver pendente.
- A atualização manual não é requisito; o polling é suficiente para refletir mudanças feitas por outra pessoa.
- Estados obrigatórios: carregando com skeleton, vazio com mensagem objetiva, erro com ação de tentar novamente, atualização de card e erro de mudança.
- Em telas estreitas, a área deve permitir rolagem horizontal das colunas sem quebrar o card; em tablet, manter alvos de toque confortáveis. Foco visível, nomes acessíveis e operação por teclado devem existir além do toque.
- Usar tokens/classes já presentes (`brand-gold`, `brand-mint`, `brand-text`, `linen-bg`, `shadow-card`) e evitar nova paleta.

## Dependências

- Aprovação explícita do usuário antes de aplicar `supabase/migrations/20261002_kanban_pedidos_status.sql` em qualquer ambiente de produção.
- Acesso às tabelas existentes `orders`, `order_items`, `clients` e `users` pelo cliente Supabase já usado pelo projeto.
- Instalação de `@dnd-kit/core` e `@dnd-kit/utilities`; manter versões compatíveis com React 18 e Next 14.
- Definição final de responsividade e acessibilidade revisada pelo FrontEnd Designer antes do desenvolvimento da UI.
- Se o Express permanecer no fluxo executado, implementar e testar o espelho `server/src/routes/pedidos.js` junto das rotas Next.

## Riscos

- Status legado não documentado pode impedir a criação do `CHECK`; a migration deve abortar explicitamente e listar os valores não mapeados, sem fazer conversão silenciosa.
- Aplicar a migration sem revisão pode alterar dados de produção; por isso o arquivo deve ser entregue sem execução automática e com prévia de contagem/status.
- A listagem pode ficar pesada ao somar `order_items`; limitar a 200 pedidos e retornar somente campos do card reduz o risco. Se a consulta relacional não suportar a soma diretamente, agregar os itens no servidor sem N+1.
- Next e Express podem divergir em contrato ou status inicial; os testes devem cobrir ambos quando o espelho estiver habilitado.
- Polling concorrente pode recolocar um card em etapa antiga; proteger requests pendentes e tratar resposta do servidor como fonte de verdade.
- Drag-and-drop pode prejudicar toque, teclado ou leitores de tela; o botão alternativo e estados de foco são obrigatórios.
- `@dnd-kit` aumenta o bundle; importar apenas os módulos necessários e evitar pacotes adicionais sem necessidade.

## Testes necessários

- Unitário para `isPedidoStatus`: aceita exatamente os cinco valores e rejeita `recebido`, strings vazias, `null`, números e valores com acento.
- Unitário do handler `PATCH`: aceita admin e funcionária; rejeita corpo inválido com `400`; rejeita papel não suportado com `403`; retorna `404` para pedido inexistente; atualiza e retorna o novo status em caso válido.
- Unitário da listagem: verifica mapeamento de cliente, funcionária, soma de `order_items.quantity`, total, status e data; confirma que a rota não chama `requireAdmin`.
- Teste da criação de entrada: novos pedidos usam `entrada` tanto em `src/app/api/entrada/route.ts` quanto no espelho Express.
- Teste da migration em ambiente de staging/local: confirma conversão dos 11 `recebido`, default, `CHECK` e falha explícita para status desconhecido antes do `CHECK`.
- Verificação manual em `/admin/pedidos` e `/entrada/pedidos`: mesmas informações, acesso nos dois papéis, cinco colunas na ordem correta, drag-and-drop com mouse e toque/tablet, botão alternativo, feedback de erro e polling após 30 segundos.
- Verificação manual de foco/teclado e leitura dos rótulos dos controles de mover.

## Critérios de aceite

- A migration está salva, revisável e não foi aplicada automaticamente; quando executada com aprovação, transforma os 11 pedidos `recebido` em `entrada`, define o default e instala o `CHECK` dos cinco valores.
- Um pedido recém-criado aparece na coluna Entrada sem depender de atualização manual.
- Admin e funcionária autenticados veem a mesma coleção, os mesmos cinco estados e os campos de card definidos.
- Admin e funcionária conseguem mover qualquer card para qualquer etapa por arrastar e pelo botão alternativo.
- A API rejeita etapa inválida com `400` e não grava valor inválido mesmo se o cliente tentar contornar a UI.
- A listagem existente restrita a admin não é usada como endpoint do Kanban; as novas rotas aceitam os dois papéis.
- O estado do Kanban é atualizado automaticamente a cada 30 segundos, sem realtime.
- Os links “Pedidos” aparecem em `AdminSidebar` e `FuncionariaTopbar`, com estado ativo correto.
- A implementação prevista não cria tabelas, não altera RLS, não registra histórico de movimentação e não envia WhatsApp por etapa.
- Os testes unitários de status e rota passam, e a verificação manual documentada é concluída antes da entrega.

## Plano de implementação

1. Validar no Supabase de staging/local os status existentes e revisar a migration; obter aprovação do usuário antes de qualquer execução em produção.
2. Criar a constante/tipo/validador de etapas e os testes unitários, mantendo uma única fonte de verdade para os cinco valores.
3. Implementar o serviço server-side e as rotas Next de listagem e atualização, incluindo autenticação para ambos os papéis e o contrato de erros.
4. Atualizar a criação de pedidos para `entrada`, implementar o espelho Express e montar `/pedidos` se o servidor paralelo continuar ativo.
5. Adicionar os tipos/clients da API e criar o componente compartilhado, os cards, polling, drag-and-drop e ação alternativa de mover.
6. Adicionar as páginas `/admin/pedidos` e `/entrada/pedidos` e os links de navegação; submeter a UI à revisão do FrontEnd Designer.
7. Executar testes unitários, revisar o diff para garantir que somente a migration/spec e os arquivos previstos foram alterados durante a implementação, e realizar a verificação manual da tela.

## Orientações para o Programador

- Trabalhe exclusivamente em `C:\Users\ga-am\Documents\Sites\BelasPassadeiras`; não use a cópia em `Dev-Folder\\belaspassadeiras`.
- Não aplique a migration no Supabase de produção sem autorização explícita do usuário.
- Reutilize `authenticate` em todas as rotas server-side e não enfraqueça a validação de usuário ativo.
- Não copie a implementação de `requireAdmin`; a permissão desta feature é deliberadamente `admin` ou `funcionaria`.
- Não espalhe strings de status pela UI, API e banco: importe a constante/validador compartilhado e preserve os valores persistidos exatamente como especificados.
- Não faça N+1 consultas para somar peças; planeje a consulta de `order_items` e confirme o comportamento com dados reais de staging.
- Preserve o contrato `{ message: string }` usado pelo `request` em `src/lib/api.ts`.
- O componente compartilhado deve ser a única implementação visual do Kanban; as páginas de admin e entrada devem apenas fornecer o contexto de rota/layout.
- Antes de considerar a UI pronta, peça a revisão do FrontEnd Designer para touch, teclado, foco, overflow horizontal e consistência dourado/menta.
- Não inclua histórico de movimentações, notificações WhatsApp, RLS, novas tabelas ou alterações de escopo nesta entrega.
