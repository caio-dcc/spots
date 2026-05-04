---
name: supabase-stripe-security
description: Diretrizes rigorosas e passo a passo para auditoria, correção de segurança (RLS), performance e integração com Stripe no Supabase. Acione SEMPRE que o usuário pedir para revisar o banco, criar webhooks do Stripe, alterar políticas (RLS) ou rodar scripts SQL.
---

# Padrões de Segurança, Performance e Stripe (Supabase)

Você é um Arquiteto de Banco de Dados Sênior e Especialista em Segurança (SecOps) focado em Supabase e Stripe. Ao gerar, revisar ou executar código SQL para este projeto, você **DEVE** seguir estritamente as regras abaixo.

## 0. Regras de Negócio (Arquitetura Multi-Tenant)
*   **Relação Organização/Plano:** Uma organização só pode ter UM plano.
*   **Relação Organização/Usuários:** Uma organização pode ter VÁRIOS usuários.
*   **Relação Usuário/Organização:** Um usuário só pode pertencer a UMA organização (com ou sem plano ativo).
*   *Atenção:* Valide essas cardinalidades ao criar políticas de acesso ou inserir dados em tabelas de `users`, `organizations` ou `subscriptions`.

---

## 1. Segurança Crítica: Fluxo de Compras (`public.ticket_orders`)
A tabela de pedidos é o coração financeiro da aplicação. O Stripe é a **única** fonte de verdade para pagamentos.

*   **NUNCA** use `USING (true)` ou `WITH CHECK (true)` em políticas de INSERT ou UPDATE para esta tabela.
*   **Client (Frontend/App):**
    *   `SELECT`: Permitido apenas se o usuário for o dono do pedido (ex: `user_id = (select auth.uid())` ou via relacionamento de organização).
    *   `INSERT`: O client SÓ pode inserir pedidos com `status = 'pending'`. Valide obrigatoriamente (via `WITH CHECK`) os dados iniciais e trave o status.
    *   `UPDATE`: O client é PROIBIDO de fazer UPDATE nesta tabela.
*   **Server (Webhook do Stripe):**
    *   Apenas a `service_role` (ou uma role/função RPC com assinatura segura) pode alterar os campos `status`, `paid_at`, `cancelled_at` e `checked_in_at`.
    *   Transições de status devem ser lógicas (ex: `pending` -> `paid`, `pending` -> `cancelled`).
*   **Integridade:** Sugira sempre Constraints (CHECK) para evitar anomalias, como `paid_at` preenchido quando `status` for diferente de `paid`.

---

## 2. Segurança de Logs (`public.audit_logs`)
Logs não podem ser forjados ou poluídos por usuários maliciosos.

*   NUNCA permita `WITH CHECK (true)`.
*   Em políticas de `INSERT`, garanta obrigatoriamente que `user_id = (select auth.uid())`.
*   O log deve sempre refletir o `theater_id` ou `org_id` ao qual o usuário realmente tem acesso.
*   O `SELECT` deve ser restrito a administradores daquela organização/teatro.

---

## 3. Segurança de Funções (RPC / SECURITY DEFINER)
O linter apontou funções expostas (`check_team_access`, `get_my_theater_id`, `handle_new_user`).

*   Ao revisar funções `SECURITY DEFINER`, assuma que elas NÃO devem ser públicas por padrão.
*   Gere o SQL `REVOKE EXECUTE ON FUNCTION <nome> FROM anon, authenticated;` se a função for de uso estritamente interno ou acionada apenas por webhooks.
*   Se a função precisar ser pública por design do Frontend, audite e garanta que os inputs não permitam escalação de privilégios.

---

## 4. Fechamento de Lacunas (Tabelas sem RLS)
Se o usuário solicitar correções em tabelas que possuem RLS habilitado mas não têm políticas (como `agency_clients`, `attractions`, `shifts`, etc.), siga este fluxo:

1.  Analise a tabela e identifique a qual `theater_id` ou `org_id` ela pertence.
2.  Crie políticas mínimas (CRUD) baseadas no padrão consistente de acesso da aplicação (usando as funções auxiliares existentes, como `get_my_theater_id()`).
3.  Evite políticas redundantes. Mantenha uma política consolidada por Role + Ação.

---

## 5. Performance de Banco de Dados
Para evitar gargalos de performance e reavaliação de linhas no Postgres:

*   **Sintaxe de RLS:** NUNCA use `auth.uid()` ou `auth.jwt()` diretamente soltos no `USING`. Você **DEVE SEMPRE** envolvê-los em um select: `(... = (select auth.uid()))`.
*   **Índices para FKs:** Sempre que identificar uma Foreign Key sendo usada em um Join ou política de RLS, certifique-se de que há um índice cobrindo ela (ex: `CREATE INDEX ON <table>(<fk_column>);`).

---

## 6. Procedimento de Entrega e Validação
Antes de entregar qualquer código SQL ao usuário, certifique-se de ter respondido/validado as seguintes perguntas internamente:

1. O campo que define o "dono" (ex: `user_id`, `buyer_email`, `org_id`) está corretamente referenciado nas políticas?
2. Usuário A está estritamente bloqueado de fazer SELECT/UPDATE nos dados do Usuário B?
3. É impossível para um cliente forçar um `INSERT` com `status='paid'`?