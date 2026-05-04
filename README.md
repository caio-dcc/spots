# Spotlight - Bilheteria + Gestao de Eventos

Sistema web para venda de ingressos (cliente) e operacao de eventos (organizador), com checkout Stripe, check-in por QR Code e painel financeiro.

## Variaveis de ambiente

- Veja `.env.example` para lista comentada (Stripe, Supabase, reconciliacao).

## Documentacao principal

- `ARQUITETURA_MVP_BILHETERIA_GESTAO.md`
  - arquitetura atual;
  - estado real do sistema;
  - seguranca, escalabilidade e integracoes.
- `MVP_CHECKLIST_EXECUTAVEL.md`
  - backlog priorizado para fechar MVP e preparar escala.

## Execucao local

```bash
npm install
npm run dev
```

Aplicacao local: `http://localhost:3000`

## Stack

- Next.js (App Router) + React + TypeScript
- Supabase (Auth + Postgres)
- Stripe (Checkout + Connect + Webhooks)

## Observacao importante

O fluxo de pagamento depende de webhook Stripe para confirmar pedidos.
Se o pedido ficar `pending`, revisar configuracao do endpoint e segredo do webhook conforme orientacoes em `ARQUITETURA_MVP_BILHETERIA_GESTAO.md`.
