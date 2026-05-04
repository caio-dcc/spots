# Claude Context Cache - ATUALIZADO (2026-05-04)
Consolidado com base no "Relatório de continuação — Spotlight (bilheteria/Stripe)".

## 🚀 Estado Atual (O que está pronto)

### Banco de Dados
- **Schema**: `supabase/MIGRATION_BUNDLE.sql` rodado com sucesso ✅.
- **Tabelas principais**:
  - `profiles`: Inclui `user_type`, Stripe Connect, `access_disabled`, `plan_tier`.
  - `events`: Gestão de eventos.
  - `event_benefits`: Categorias de ingressos/benefícios.
  - `guests`: QR code, `order_id`, `checked_in_at`.
  - `ticket_orders`: Status de pagamento e check-in.
  - `audit_logs`: Auditoria completa.
  - `super_admins` & `super_admin_sessions`: Auth de admin.
- **Admin**: Super-admin `altmarinscript@gmail.com` configurado.

### Backend Stripe
- **Endpoints**:
  - `/api/checkout`: Inicia pagamento.
  - `/api/webhooks/stripe`: Confirma pagamento e popula `guests`.
  - `/api/stripe/connect/`: OAuth para organizadores.
  - `/api/tickets/validate`: Scanner de check-in.
  - `/api/tickets/refund`: Estornos.
  - `/api/organizer/earnings`: Ganhos do organizador.

### Interface & Ferramentas
- **Painel Admin (`/admin/view`)**: Dashboard com métricas e controle de organizadores.
- **Check-in**: Scanner suporta UUID (Stripe) e legacy (`spotme_guest_*`).
- **Styles**: Sidebar dark e UI consistente.

---

## 🛠️ Pendentes (Próximos Passos)

1. **Remover Resend** (Finalizar limpeza):
   - Limpar `src/app/api/webhooks/stripe/route.ts` (linhas ~98-122).
   - Deletar `src/lib/email-service.ts`.
2. **Exigir Login no Checkout**:
   - Backend: Validar Bearer token em `/api/checkout`.
   - Frontend: Redirecionar para `/login` se deslogado ao comprar.
3. **Download de QR em `/meus-pedidos`**:
   - Adicionar botão de download usando `qrcode` lib.
   - Fix na query de confirmação (`.or()`) para aceitar ID ou `stripe_session_id`.
4. **Limpar Confirmação**:
   - Remover menção a envio de e-mail.
5. **Financeiro Admin**:
   - Criar `/admin/view/(protected)/financeiro/page.tsx`.
   - Criar `/api/admin/stripe/route.ts` para dados globais da plataforma.
6. **Build & TS**:
   - Corrigir erros de `npm run build`.

---

## 🔗 Arquivos-Chave
- `supabase/MIGRATION_BUNDLE.sql`: Schema idempotente.
- `src/lib/admin-auth.ts`: Gating de super-admin.
- `src/lib/supabase-server.ts`: Cliente com `service_role`.
- `src/lib/stripe.ts`: Configuração e taxas.
- `src/app/api/organizer/earnings/route.ts`: Exemplo de auth via token.

---

## ⚠️ Configuração Faltante
- `SUPABASE_SERVICE_ROLE_KEY`: Crítico (placeholder no .env.local).
- `STRIPE_CONNECT_CLIENT_ID`: Para OAuth.
