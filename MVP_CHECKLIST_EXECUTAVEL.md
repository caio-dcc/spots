# Checklist Executavel - MVP Bilheteria + Gestao de Eventos

## Como usar

- Marcar `[x]` somente com evidencia (PR, log, teste ou screenshot).
- Sempre anexar owner e prazo no item.
- Priorizar P0 antes de evolucoes de produto.

---

## Deploy Vercel (MVP producao)

- [ ] Criar projeto na Vercel e conectar repositorio.
- [ ] Preencher **todas** as variaveis da tabela em `ARQUITETURA_MVP_BILHETERIA_GESTAO.md` (secao Checklist Vercel) em **Production**, incl. `CRON_SECRET` se usar Cron da Vercel.
- [ ] Usar Stripe **live** (`sk_live_`, `pk_live_`, webhook `whsec_` do endpoint de producao, `ca_` live do Connect).
- [ ] Definir `NEXT_PUBLIC_APP_URL` com URL **HTTPS** final do app.
- [ ] Aplicar migrations Supabase em **producao** (incl. `stripe_webhook_events`).
- [ ] Configurar **Cron**: `vercel.json` + `CRON_SECRET` na Vercel **ou** job externo chamando `GET/POST /api/admin/reconcile-pending` com `x-reconcile-key` / `Authorization: Bearer`.
- [ ] Se algum segredo vazou (chat/repo), **rotacionar** Supabase + Stripe antes do go-live.

---

## P0 - Estabilizacao de pagamento e seguranca (bloqueador de escala)

- [ ] Confirmar webhook Stripe em todos ambientes (`dev/stg/prod`) com segredo correto.
- [x] Tratar `checkout.session.completed` + `async_payment_succeeded` + `async_payment_failed`.
- [x] Validar `payment_status=paid` antes de confirmar pedido.
- [x] Implementar idempotencia por `stripe_event_id` (tabela de eventos processados).
- [x] Implementar reconciliacao de pedidos `pending` via job (consulta Stripe API).
- [ ] Criar alerta para webhook com erro/retry excessivo.
- [ ] Aplicar schema validation (Zod/Valibot) em `checkout`, `refund`, `validate`, `earnings`.
- [ ] Implementar rate limit em rotas sensiveis.
- [ ] Revisar autorizacao por ownership/papel em todas as APIs.
- [ ] Revisar e padronizar ownership de eventos (`organizer_id` vs `user_id`).
- [x] Stripe Connect: iniciar OAuth apenas com sessao valida (`POST /authorize` + Bearer), sem `user_id` na URL.

---

## P1 - Confiabilidade operacional e auditoria

- [ ] Estruturar logs JSON com `request_id`, `order_id`, `session_id`, `event_id`.
- [ ] Definir SLOs: latencia p95, erro 5xx, webhook success rate.
- [ ] Instrumentar metricas no backend.
- [ ] Criar painel operacional de pedidos presos em `pending`.
- [ ] Padronizar trilha de auditoria para compra, refund, check-in e alteracoes financeiras.
- [ ] Implementar politica de retry com backoff para integracoes externas.
- [ ] Criar runbook de incidente (pagamento, webhook, refund).

---

## P1 - Financeiro e divisao de lucros

- [ ] Manter Stripe Connect com uma unica chave de plataforma (sem chave por organizador).
- [ ] Formalizar regra de taxa por plano (ex.: Essencial 5%, Pro 4%, Enterprise custom).
- [ ] Salvar snapshot da regra aplicada por pedido (para auditoria historica).
- [ ] Implementar conciliacao financeira diaria (Stripe x `ticket_orders`).
- [ ] Exibir no dashboard: bruto, taxa plataforma, liquido, estornos, saldo pendente.
- [ ] Adicionar trilha de payout por organizador.

---

## P1 - Frontend performance e UX

- [ ] Auditar bundles por rota e remover dependencia nao usada.
- [ ] Paginar e virtualizar listas grandes (pedidos, auditoria, financeiro).
- [ ] Evitar polling excessivo; migrar status de pagamento para SSE/websocket (fase 2).
- [ ] Implementar skeletons padronizados e estados de erro/retry.
- [ ] Reduzir overfetch no dashboard com endpoints agregados server-side.
- [ ] Validar responsividade mobile nas rotas de checkout, pedidos e check-in.

---

## P2 - Integracoes estrategicas

### Nota fiscal (via eventos de pagamento)
- [ ] Escolher provedor fiscal (Focus NFe / Nuvem Fiscal / eNotas).
- [ ] Implementar worker assinc para emissao fiscal a partir de `ticket.paid`.
- [ ] Persistir status fiscal por pedido (`fiscal_status`, `fiscal_id`, urls de DANFE/XML).
- [ ] Adicionar painel fiscal no dashboard da organizacao.

### Ticketmaster
- [ ] Criar integracao server-to-server com API Ticketmaster.
- [ ] Criar `external_events` (source, external_id, payload normalizado, ttl_cache).
- [ ] Implementar importacao/sincronizacao de eventos no dashboard.
- [ ] Tratar deduplicacao com eventos internos.

### Google Drive
- [ ] Implementar OAuth Google por organizador.
- [ ] Criar exportacao assinc de relatorios (eventos, funcionarios, auditoria, financeiro).
- [ ] Subir arquivos no Drive com historico e link por exportacao.
- [ ] Implementar controle de escopos e revogacao.

---

## P2 - Produto e capacidade de venda

- [ ] Implementar escolha de assentos (seat map) performatica e responsiva.
- [ ] Lock temporario de assento com expiracao.
- [ ] Confirmacao atomica de assento no pagamento.
- [ ] Politica de overbooking = zero.
- [ ] Adicionar suporte a lotes dinamicos e virada automatica de lote.

---

## Qualidade e testes (transversal)

- [ ] Criar testes de integracao para `checkout`, `webhook`, `check-in`, `refund`.
- [ ] Criar testes E2E para jornada completa cliente + organizador.
- [ ] Criar massa de dados de teste previsivel.
- [ ] Rodar testes em CI com gate de merge.
- [ ] Definir matriz de testes manuais para release candidate.

---

## Criterios de aceite do MVP pronto para escalar

- [ ] Taxa de confirmacao de pagamento >= 99.9%.
- [ ] Nenhum pedido `pending` sem conciliacao por mais de X minutos (SLO definido).
- [ ] Cobertura automatizada dos fluxos criticos ativa em CI.
- [ ] Monitoramento e alertas ativos em producao.
- [ ] Operacao consegue rastrear qualquer transacao ponta a ponta.
- [ ] Seguranca de rotas auditada e validada.
