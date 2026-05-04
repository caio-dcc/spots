# Arquitetura Atual e Plano de Fechamento do MVP

## Objetivo deste documento

Este documento consolida a arquitetura end-to-end do sistema de bilheteria integrada com gestao de eventos, atualiza o estado real de implementacao (com base no codigo atual) e detalha o que falta para tornar o MVP seguro, escalavel e pronto para operacao.

Tambem responde perguntas de produto e plataforma:

- Como destravar pedidos que ficam `pending` apos checkout Stripe.
- Como fazer divisao de receita por organizador sem criar variavel de ambiente para cada um.
- Como conectar geracao de nota fiscal via eventos/webhooks.
- Como planejar integracoes com Ticketmaster e Google Drive.
- Como orientar um time senior vindo de .NET + Angular.

---

## Leitura rapida (executive summary)

- O checkout Stripe ja esta implementado e funcional, com criacao de pedido em `ticket_orders` e redirecionamento para Stripe Checkout.
- A confirmacao de pagamento depende de webhook (`/api/webhooks/stripe`). Se o webhook falhar, o pedido permanece `pending`.
- A plataforma ja usa Stripe Connect via OAuth por organizador; nao precisa criar uma `STRIPE_SECRET_KEY` por organizador.
- Divisao de receita atual e feita por `application_fee_amount` + `transfer_data.destination` (Destination Charge), com taxa da plataforma de 5%.
- Check-in por QR ja existe e atualiza estado do ingresso para `checked_in`.
- O principal gap para MVP pronto para escalar esta em robustez operacional: idempotencia forte, observabilidade, seguranca de rotas, validacao de payload, testes automatizados e consistencia de modelo de dados.

---

## Arquitetura end-to-end (estado real)

## 1) Camada Web (Next.js + React)

- Frontend com App Router e paginas separadas para:
  - descoberta de eventos (`/mosaico-eventos`);
  - checkout (`/e/[slug]/checkout`);
  - pedidos do cliente (`/meus-pedidos`);
  - dashboard organizador (ganhos, eventos, check-in e operacao).
- O frontend usa Supabase Auth para sessao e anexa `Bearer token` quando chama APIs sensiveis.

### Mapeamento para .NET/Angular

- `app/page.tsx` e `app/*` = equivalente a components + routing do Angular.
- `app/api/*/route.ts` = equivalente a controllers/minimal APIs no ASP.NET Core.
- `lib/*` = equivalente a services/helpers compartilhados.

## 2) Camada API (Route Handlers)

Principais endpoints:

- `POST /api/checkout`
  - valida autenticacao;
  - calcula valor;
  - cria sessao Stripe Checkout;
  - persiste pedido `pending`.
- `POST /api/webhooks/stripe`
  - valida assinatura Stripe;
  - marca pedido como `paid` em `checkout.session.completed`;
  - trata expiracao/cancelamento e reembolso.
- `POST /api/tickets/validate`
  - valida QR;
  - impede dupla entrada;
  - move para `checked_in`;
  - registra auditoria.
- `POST /api/tickets/refund`
  - valida elegibilidade;
  - tenta refund Stripe;
  - atualiza status no banco.
- `POST /api/stripe/connect/authorize` (com `Authorization: Bearer` do usuario) e `GET /api/stripe/connect/callback`
  - conectam conta Stripe do organizador sem expor `user_id` na URL.
- `GET /api/organizer/earnings`
  - agrega vendas, taxa plataforma e ganho liquido.

## 3) Dados e identidade (Supabase)

- Supabase Auth para usuarios.
- Tabelas funcionais no fluxo atual:
  - `profiles`
  - `events`
  - `event_benefits`
  - `ticket_orders`
  - `guests`
  - `audit_logs`
- Existe uso de cliente admin (`SUPABASE_SERVICE_ROLE_KEY`) no backend para operacoes que exigem privilegios e integracao.

---

## Fluxos de negocio (atual)

## Fluxo A: compra do cliente

1. Cliente autenticado inicia checkout.
2. API cria `ticket_orders.status = pending`.
3. Stripe Checkout captura pagamento.
4. Stripe envia webhook.
5. Webhook marca pedido como `paid`.
6. Cliente visualiza ingresso em `/meus-pedidos`.

## Fluxo B: check-in

1. Scanner le QR.
2. API valida status do pedido.
3. Se `paid`, marca `checked_in`.
4. Atualiza presenca e auditoria.

## Fluxo C: receita do organizador

1. Organizador conecta Stripe Connect via OAuth.
2. Checkout cria pagamento com taxa da plataforma e destino do repasse.
3. Dashboard agrega vendas liquidas por evento.

---

## Problema critico atual: pedido fica `pending`

## Diagnostico tecnico provavel

Se o checkout conclui no Stripe, mas o pedido nao sai de `pending`, o gargalo esta no webhook:

- endpoint local/prod nao configurado no Stripe;
- `STRIPE_WEBHOOK_SECRET` diferente do endpoint real;
- evento recebido diferente do esperado;
- erro na atualizacao do banco (join/chave/status/constraint);
- falta de idempotencia e tratamento de retry.

## Correcao recomendada (padrao de producao)

1. Tratar explicitamente estes eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.refunded`
2. No `checkout.session.completed`, validar `session.payment_status === "paid"` antes de confirmar.
3. Implementar idempotencia por `stripe_event_id` (tabela de eventos processados).
4. Log estruturado com `session.id`, `payment_intent`, `order.id`.
5. Monitorar falhas de webhook com alerta.
6. Manter fallback de reconciliacao por job:
   - buscar pedidos `pending` com `stripe_session_id`;
   - consultar Stripe API;
   - corrigir status quando necessario.

## Checklist de validacao imediata

- `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
- confirmar secret `whsec_...` correto no ambiente local
- validar recebimento de `checkout.session.completed`
- verificar logs da atualizacao em `ticket_orders`
- validar transicao `pending -> paid` em banco

---

## Divisao de receita por organizador (sem N variaveis de ambiente)

## Resposta direta

Nao e necessario criar uma variavel de ambiente Stripe por organizador.

## Modelo correto

- Uma unica conta Stripe da plataforma (com `STRIPE_SECRET_KEY` unica).
- Cada organizador conecta sua conta via Stripe Connect OAuth.
- Armazenar `stripe_account_id` por organizador em `profiles`.
- No checkout:
  - `application_fee_amount` = taxa da plataforma;
  - `transfer_data.destination` = conta do organizador.

## Alternativas de repasse

- **Destination Charges** (atual): simples para MVP e consolidacao de taxa.
- **Separate Charges and Transfers**: maior controle contabil, util em cenarios de split avancado.
- **On-behalf-of + transfer_data**: melhora conciliacao e compliance em alguns cenarios.

Para MVP, manter Destination Charge e evoluir para split avancado apenas quando houver necessidade fiscal/contabil/regulatoria.

## Seguranca de chaves Stripe (o que vai em variavel de ambiente)

Voce nao deve ter uma chave secreta por organizador.

### Variaveis da plataforma (unicas por ambiente)

- `STRIPE_SECRET_KEY`: chave secreta da sua plataforma (server-side).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: chave publica usada no frontend.
- `STRIPE_WEBHOOK_SECRET`: segredo do endpoint de webhook.
- `STRIPE_CONNECT_CLIENT_ID`: identificador OAuth da sua plataforma no Connect (publico no fluxo OAuth; nao e segredo como a secret key).

### Onde obter o `STRIPE_CONNECT_CLIENT_ID` e para que serve

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com) com a **conta da plataforma** (nao a conta do organizador).
2. Vá em **Settings** (Configuracoes) → **Connect** → **Connect settings** (ou equivalente na navegacao atual).
3. Copie o **Client ID** — costuma comecar com `ca_`.
4. Cadastre a **Redirect URI** exatamente como a app usa:  
   `{NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`  
   (sem barra final a mais/menos que a configurada no codigo).

**Para que serve:** o `ca_...` identifica **sua aplicacao** no fluxo OAuth do Connect. Quando o organizador clica em "Conectar", ele é enviado ao Stripe; ao autorizar, o Stripe devolve um `code` que o backend troca por `stripe_user_id` (`acct_...`) e grava no perfil. **Nao** é uma chave por organizador: é **uma por ambiente** (dev/staging/prod podem ter apps/Client IDs diferentes se voce separar projetos Stripe).

### `RECONCILE_INTERNAL_KEY` — o que é e onde "conseguir"

- **Nao vem da Stripe.** É um segredo **gerado por voce** para proteger endpoints internos (ex.: reconciliacao de pedidos `pending`).
- Gere algo forte, por exemplo: `openssl rand -hex 32`.
- Coloque em `.env.local` / secret manager como `RECONCILE_INTERNAL_KEY=...`.
- Chamadas a `POST /api/admin/reconcile-pending` devem enviar o header `x-reconcile-key` com o mesmo valor.

### Dados por organizador (no banco, nao em env)

- `stripe_account_id` (ex.: `acct_...`) salvo em `profiles`.
- status de onboarding (`pending`, `active`, `restricted`).

### Porque isso e seguro

- O organizador nunca recebe `STRIPE_SECRET_KEY`.
- O backend da plataforma cria checkout/pagamentos com segredo central.
- O repasse e feito por `transfer_data.destination` para o `acct_...` do organizador.

---

## Nota fiscal via webhook: e possivel?

## Resposta curta

Sim. O webhook e o gatilho ideal para orquestrar emissao fiscal apos confirmacao de pagamento.

## Arquitetura recomendada

1. Webhook confirma pagamento (`paid`).
2. Publica evento interno `ticket.paid`.
3. Worker/fila fiscal processa emissao em provedor NFSe/NFe (ex.: Focus NFe, Nuvem Fiscal, eNotas).
4. Persistir:
   - `fiscal_status`
   - `fiscal_document_id`
   - `fiscal_xml_url`/`fiscal_pdf_url`
5. Atualizar dashboard do organizador com status fiscal por venda.

## Boas praticas fiscais

- Emissao assincrona (nunca bloquear webhook).
- Retry com backoff em caso de indisponibilidade da prefeitura/provedor.
- Dead-letter queue para falhas permanentes.
- Auditoria completa de requisicoes/respostas fiscais.

---

## Integracao Ticketmaster no dashboard do organizador

## Objetivo

Enriquecer catalogo de eventos e dados de mercado (artistas, agenda, venues, categorias) para planejamento e comparativos.

## Estrategia de integracao

1. Criar `TicketmasterService` server-side.
2. Endpoint interno:
   - `GET /api/integrations/ticketmaster/events`
3. Campos normalizados em tabela staging:
   - `external_events` com `source=ticketmaster`.
4. Mapear dados para entidade interna de evento com processo de deduplicacao:
   - chave por `external_id` + data + venue.
5. Caching com TTL (ex.: 10-30 min) para reduzir custo e latencia.

## Riscos e cuidados

- Rate limit da API externa.
- Divergencia de timezone e disponibilidade.
- Campos incompletos em algumas regioes.

---

## Integracao Google Drive para exportacao de relatorios

## Objetivo

Exportar relatorios de eventos, funcionarios, auditoria e financeiro em PDF/CSV/XLSX para pasta do Drive da organizacao.

## Arquitetura sugerida

1. OAuth Google por organizador (escopo minimo de Drive File).
2. Endpoint:
   - `POST /api/integrations/google-drive/export`
3. Job assincrono gera arquivo e envia para Drive.
4. Persistir metadados:
   - nome arquivo
   - link compartilhavel
   - status de exportacao
5. Exibir historico de exportacoes no dashboard.

## Boas praticas

- Tokens criptografados em repouso.
- Escopos minimos.
- Rotacao/revogacao de token suportada no painel.

---

## Seguranca de rotas e dados (hardening necessario)

## Prioridade P0

- Padronizar autorizacao por papel/ownership em todas APIs.
- Trocar validacao manual por schema validation (Zod/Valibot) em 100% dos endpoints.
- Rate limiting (IP + user + rota sensivel).
- Idempotencia para checkout, webhook, refund.
- Revisao das consultas com `supabaseAdmin` para garantir principio de privilegio minimo.

## Prioridade P1

- CSRF strategy para endpoints stateful.
- Assinatura e expiracao de URLs sensiveis.
- Sanitizacao de campos livres (motivo reembolso, suporte).
- Segregacao de segredos por ambiente (dev/stg/prod).

---

## Performance e escalabilidade

## Frontend

- Fazer split de bundles por rota e remover libs nao usadas.
- Migrar partes data-heavy para Server Components quando possivel.
- Paginar listagens e usar virtualizacao para tabelas grandes.
- Caching inteligente de consultas e invalidacao por evento.
- Melhorar UX de polling (SSE/websocket para status de pagamento no medio prazo).

## Backend

- Criar camada de servico para pagamentos (evitar regra de negocio espalhada nos handlers).
- Filas para tarefas nao criticas: fiscal, email, exportacao.
- Indices de banco para queries de `ticket_orders`, `events`, `audit_logs`.
- Observabilidade completa:
  - logs estruturados;
  - traces;
  - metricas (latencia p95, erro 5xx, tempo de webhook, taxa de confirmacao).

---

## Assentos (seat map) performatico e responsivo

## Quando entrar

Colocar no roadmap como item de fase seguinte do MVP (ou MVP+), pois ele aumenta muito complexidade de concorrencia e UX.

## Requisitos tecnicos minimos

- Modelo de assentos por setor/lote.
- Lock transacional temporario de assento (timeout).
- Confirmacao atomica no pagamento.
- Rendering eficiente no front (canvas/SVG virtualizado).
- Acessibilidade e suporte mobile.

---

## Glossario para dev .NET + Angular

- **Route Handler (Next.js)**: equivalente a Minimal API/Controller no ASP.NET.
- **Server Component**: renderizacao no servidor sem enviar JS de interacao para cliente.
- **Client Component**: equivalente a componente Angular interativo no browser.
- **Webhook**: callback HTTP de evento externo (Stripe -> sua API).
- **RLS (Row-Level Security)**: politica de acesso por linha no banco.
- **Destination Charge**: cobranca Stripe onde a taxa fica com a plataforma e o restante vai para conta conectada.
- **Idempotencia**: processar repeticoes sem efeito duplicado.
- **Reconciliacao**: processo de corrigir estado interno comparando com estado da fonte (Stripe).
- **DLQ (Dead Letter Queue)**: fila de eventos que falharam apos tentativas.

---

## Decisoes arquiteturais recomendadas agora

1. Consolidar este documento como source of truth tecnico.
2. Criar `MVP_CHECKLIST_EXECUTAVEL.md` com backlog priorizado por sprint.
3. Refatorar modulo de pagamento para service layer unica.
4. Padronizar naming de colunas de ownership (`organizer_id` ou `user_id`, escolher uma).
5. Implementar observabilidade antes de aumentar volume de vendas.

---

## Definicao de pronto para MVP escalavel

O MVP sera considerado pronto para operacao escalavel quando:

- fluxo de pagamento estiver 100% confiavel (sem pedidos presos em `pending`);
- endpoints criticos tiverem seguranca, validacao e rate limit;
- testes de regressao cobrirem checkout/webhook/checkin/refund/connect;
- conciliacao e trilha de auditoria permitirem suporte rapido;
- integracoes externas (fiscal e exportacao) rodarem assincronamente com retry;
- dashboard do organizador tiver visao de receita liquida e status operacional.

---

## Ambiente local vs producao (Vercel) — pronto para escalar?

### Resposta direta

**Nao.** Um `.env.local` com chaves **Stripe de teste** (`sk_test_`, `pk_test_`), `NEXT_PUBLIC_APP_URL=http://localhost:3000` e `STRIPE_CONNECT_CLIENT_ID=ca_...` **placeholder** e ambiente de **desenvolvimento**, nao de producao.

Para o MVP em producao voce precisa, no minimo:

| Requisito | Local (dev) | Producao (Vercel) |
|-----------|-------------|-------------------|
| Stripe | Modo **test** | Modo **live** (`sk_live_`, `pk_live_`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://seu-dominio` (HTTPS) |
| Webhook | `stripe listen` ou endpoint de test | Endpoint publico `https://.../api/webhooks/stripe` + **novo** `whsec_` de producao |
| Connect | `ca_...` de **test** Connect | `ca_...` **live** + Redirect URI cadastrada para URL de producao |
| Supabase | Projeto dev (aceitavel) | **Recomendado:** projeto Supabase **dedicado** a producao + migrations aplicadas (ex.: `stripe_webhook_events`) |
| Reconciliacao | Opcional manual | `RECONCILE_INTERNAL_KEY` na Vercel + **Cron** chamando `/api/admin/reconcile-pending` |

### Seguranca: segredos expostos

Se algum segredo (Supabase `service_role`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, JWT anon, etc.) foi colado em chat, issue ou repositorio publico, trate como **vazado**: **revogue/rotacione** no Supabase e na Stripe e **gere novos** valores antes de ir a producao.

---

## Checklist — variaveis na Vercel para o MVP

Configure em **Vercel → Project → Settings → Environment Variables** (Production; opcional Preview).

| Variavel | Obrigatoria MVP? | Notas |
|----------|------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase de **producao** (ou o que usar em prod). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave `anon` desse projeto. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | `service_role`; apenas servidor. |
| `NEXT_PUBLIC_APP_URL` | Sim | URL **publica** do site (sem barra final inconsistente com redirects). |
| `STRIPE_SECRET_KEY` | Sim | **`sk_live_...`** em producao. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Recomendado | **`pk_live_...`** se o front usar Stripe.js; alinhar nome com `.env.example`. |
| `STRIPE_WEBHOOK_SECRET` | Sim | Criar webhook em prod apontando para `/api/webhooks/stripe`; copiar `whsec_` **desse** endpoint. |
| `STRIPE_CONNECT_CLIENT_ID` | Sim p/ repasse | **`ca_...` live** (Connect); redirect URI = `{NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`. |
| `RECONCILE_INTERNAL_KEY` | Fortemente recomendado | Valor **forte** e **unico** para prod (nao reutilizar o do dev se possivel). |
| `CRON_SECRET` | Recomendado na Vercel | Segredo que a Vercel envia como `Authorization: Bearer` no Cron; ver secao Cron abaixo. |

**Nao configurar na Vercel:** nada que nao exista no codigo; evite duplicar `NEXT_PUBLIC_*` com nomes alternativos sem o codigo ler (padronize `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; o nome `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` **nao** e lido pelo codigo atual).

### Cron na Vercel (reconciliacao)

O repositorio inclui `vercel.json` com um cron a cada **15 minutos** em  
`/api/admin/reconcile-pending`.

**Autenticacao (escolha um ou use os dois):**

1. **Vercel (recomendado):** defina `CRON_SECRET` no painel da Vercel. O Cron envia  
   `Authorization: Bearer <CRON_SECRET>` (comportamento documentado pela Vercel).
2. **Manual / scripts:** `POST` ou `GET` com header `x-reconcile-key: <RECONCILE_INTERNAL_KEY>`.

O handler aceita **GET e POST** para compatibilidade com o Cron (requisicao GET).

**Nota:** planos gratuitos da Vercel podem limitar frequencia de crons; ajuste o `schedule` em `vercel.json` ou use monitor externo com POST.

Isso reduz pedidos `pending` falsos quando o webhook falha pontualmente.

---

## Progresso de implementacao (2026-05-04)

Implementado nesta rodada:

- fluxo Connect **seguro**: `POST /api/stripe/connect/authorize` com JWT; fim do `user_id` na query string;
- painel **StripeConnectPanel** em **Ganhos** e **Configuracoes** (donos) com passos e texto sobre repasse encapsulado;
- arquivo **`.env.example`** com descricao de `STRIPE_CONNECT_CLIENT_ID` e `RECONCILE_INTERNAL_KEY`;
- constante compartilhada `src/lib/platform-fee.ts` para alinhar UI e backend;
- webhook com idempotencia por evento Stripe (`stripe_webhook_events`);
- tratamento de `checkout.session.async_payment_succeeded` e `async_payment_failed`;
- confirmacao de pedido somente com `payment_status` pago;
- protecao contra duplicidade de `guests` no webhook;
- endpoint interno de reconciliacao de pedidos pendentes:
  - `GET` e `POST /api/admin/reconcile-pending`;
  - `x-reconcile-key` + `RECONCILE_INTERNAL_KEY` **ou** `Authorization: Bearer` + `CRON_SECRET` (Vercel Cron);
- `vercel.json` com cron de exemplo para reconciliacao;
- migration de idempotencia:
  - `supabase/migrations/20260504164000_stripe_webhook_idempotency.sql`.

### Atualizacao (documentacao operacional)

- Secao **Ambiente local vs producao** e **Checklist Vercel** (chaves live, webhook de prod, Connect live, Cron + reconcile).
- Alerta de **rotacao de segredos** se expostos fora do `.env.local`.
