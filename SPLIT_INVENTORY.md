# SPLIT_INVENTORY.md — Project Split Inventory

**Status:** Draft (for owner review)
**Created:** 2026-05-05

## 1. ERP-Only (STAY on `main`)
These files and routes belong to the back-office management system for event organizers.

### Routes
- `app/dashboard/*` (except potentially `vendas` sub-route if it's tied to active sales)
- `app/organizadores`
- `app/house` (venue management)
- `app/para-casas`
- `app/admin` (System administration)
- `app/api/admin/*`
- `app/api/organizer/*`

### Components
- `components/EventForm.tsx`
- `components/EmployeeForm.tsx`
- `components/EventDashboard.tsx`
- `components/FinancialCharts.tsx`
- `components/StripeConnectButton.tsx` / `StripeConnectPanel.tsx` (Needed for organizer payouts reporting)

---

## 2. Ticket-Sales-Only (MOVE to `ticket-sales-legacy`)
These files and routes belong to the consumer-facing ticket purchase and validation system.

### Routes
- `app/e/[slug]` (Public event pages)
- `app/mosaico-eventos` (Public event discovery)
- `app/meus-pedidos` (Customer portal)
- `app/clientes` (Customer management)
- `app/api/checkout` (Stripe Checkout sessions)
- `app/api/webhooks/stripe` (Webhook processing)
- `app/api/tickets/*` (Ticket generation and validation)
- `app/api/admin/reconcile-pending` (Specifically for sales reconciliation)

### Components
- `components/client/TicketPurchaseModal.tsx`
- `components/client/SeatMap.tsx`
- `components/client/RefundModal.tsx`
- `components/client/ReportProblemModal.tsx`
- `components/client/ClientNavbar.tsx`

### Libs
- `lib/platform-fee.ts` (Sales tax/fee logic)

---

## 3. Shared (KEEP on BOTH)
Core infrastructure and UI components shared by both products.

### Routes
- `app/auth-selection`
- `app/login`
- `app/esqueci-senha`
- `app/resetar-senha`
- `app/api/auth/*`
- `app/faq`
- `app/sobre`
- `app/reportar-problema`

### Components
- `components/ui/*` (Design system)
- `components/Sidebar.tsx` (Will need conditional logic or separate versions)
- `components/Layout.tsx`
- `components/ModuleNav.tsx`

### Libs
- `lib/supabase.ts` / `lib/supabase-server.ts`
- `lib/auth-context.ts` / `lib/auth-helpers.ts`
- `lib/database.types.ts`
- `lib/stripe.ts` (Core Stripe client)
- `lib/audit.ts`
- `lib/masks.ts`
- `lib/utils.ts`

---

## 4. Out-of-Scope (REMOVAL CANDIDATES)
Identified for removal to simplify the ERP focus.

- `components/LocationForm.tsx` (If shared venues are not the focus)
- Any legacy documentation or scripts not used in the new architecture.

---

## 5. Branch-Specific Tasks

### `main` (The ERP)
- [ ] Remove consumer-facing routes listed above.
- [ ] Simplify `Sidebar` to only show management links (Dashboard, Events, Staff, Finance).
- [ ] Update `Dashboard` to focus on revenue/expense reporting.
- [ ] Disable Stripe checkout; keep Stripe Connect for reporting if necessary.

### `ticket-sales-legacy`
- [ ] Remove management/admin UI routes.
- [ ] Simplify `Sidebar` or remove it entirely in favor of a customer `Navbar`.
- [ ] Focus purely on the checkout flow and ticket delivery.
