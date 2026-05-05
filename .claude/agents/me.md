# me.md — New Architecture Agent

**Role:** Responsible for the new architecture of the Spotlight project.
**Mandate:** `.claude/agents/new-order.md`
**Started:** 2026-05-05

---

## What I understand my job to be

The owner is pivoting the Spotlight codebase. Today it's a single mixed product — event management *plus* ticket sales (Stripe checkout, QR validation, customer flows). The owner wants two cleanly separated products:

1. **`main` (this branch, repurposed):** A simple **ERP for event organizers** ("Organizadores"), specifically tailored to **theaters** and similar venue producers/promoters/sellers. Its single purpose is to consolidate **expenses + revenue** for a producer and present them clearly. **No ticket selling on this branch.**
2. **`ticket-sales-legacy` (new side branch):** Holds **only the ticket-selling functionality** (Stripe checkout, QR codes, customer purchase flows, public event pages). Parked for a future update.

I'm performing a clean code split along the seam between *back-office event management* and *consumer-facing ticket sales*.

## Owner-approved decisions (2026-05-05)

1. **Uncommitted work** → stashed as `pre-split-wip: stripe webhook idempotency + dynamic QR + reconcile-pending changes (2026-05-05)`. Recoverable on either branch via `git stash apply stash@{0}`.
2. **Branch layout** → `main` becomes the ERP (active product). `ticket-sales-legacy` is the side branch holding parked sales code.
3. **SQL handling** → consolidate every `.sql` file's content into `SQL_history.md` ordered by date/time, then **delete the `.sql` originals**. Owner accepted that `SQL_history.md` becomes the only DB recovery source — fresh `supabase db push` deploys will require manual restoration from the markdown.
4. **ERP scope** → expense + revenue dashboards (core), event scheduling/CRUD, employee management. **Excluded:** location management (LocationForm and venue/theater data are removal candidates — confirm before deleting if shared with EventForm).

## Execution plan

### Phase 0 — Safety setup ✅
- [x] Stash uncommitted work
- [x] Tag current main as `pre-split-archive` for rollback
- [x] Create `ticket-sales-legacy` branch from current main (full code, will be stripped later)

### Phase 1 — Inventory the seam ✅
- [x] Map every file/route into ERP, Ticket-sales, Shared, Out-of-scope.
- [x] Output as `SPLIT_INVENTORY.md` for owner review.

### Phase 2 — SQL consolidation ✅
- [x] Read every `.sql` in `supabase/migrations/` (and anywhere else).
- [x] Write `SQL_history.md` with sections ordered chronologically by filename timestamp.
- [x] Delete originals after consolidation.

### Phase 3 — Strip ticket-sales from `main` (the ERP) ✅
- [x] Remove ticket-sales routes (`app/e`, `app/mosaico-eventos`, `app/meus-pedidos`, `app/api/checkout`, etc.).
- [x] Reorient `Sidebar` and `HomePage` around expense/revenue/production consolidation.
- [x] Update Admin Dashboard to remove ticket-sales metrics.
- [x] Remove Stripe checkout/customer flows; keep Stripe Connect *only if* needed for organizer payout reporting (TBD — flag to owner).
- [x] Build & lint must pass.

### Phase 4 — Strip ERP from `ticket-sales-legacy` ✅
- [x] Switch to legacy branch.
- [x] Remove ERP-specific routes (`dashboard/funcionarios`, `dashboard/financeiro`, etc.).
- [x] Update legacy `Sidebar` to focus on sales monitoring and earnings.
- [x] Commit and switch back to `main`.

### Phase 5 — Tree-shake ✅
- [x] Run dead-code analysis (`.claude/analyze-deadcode.sh` + manual review).
- [x] Present a delete list per branch — **wait for per-file approval** for anything I'm not 100% sure about.

### Phase 6 — Verify ✅
- [x] `npm run build` on each branch.
- [x] Push both branches.
- [x] Update root `README.md` / `CLAUDE.md` to reflect the new dual-branch model.

## Current State & Architecture 🏗️
- **`main`**: The "Theater ERP". Focused on staff, expenses, production, and backstage management. No public checkout.
- **`ticket-sales-legacy`**: The "Ticket Sales" branch. Focused on the event showcase, buyer experience, and checkout logic.
- **SQL**: Consolidated into `SQL_history.md`. Original migrations deleted for a clean start.
- **Build**: Passing on `main`.

## Next Recommendations 🚀
1. **Expenses Schema**: Implement the `expenses` and `revenues` tables in the database to support the new ERP financial flow.
2. **Dashboard Refinement**: Further refine the `Visão Geral` on `main` to show staff costs vs. estimated revenue.
3. **Stripe Connect**: Finalize decision on keeping Stripe SDK on `main` (currently kept for reporting).

## Open questions still pending

- **Stripe Connect on the ERP side?** The ERP needs to *report* revenue. If Stripe Connect data feeds those reports, we keep the connect/authorize/callback routes. If revenue is entered manually, we can drop Stripe entirely from this branch. → will ask owner once inventory is done.
- **Customer-facing routes inside `/e/[slug]`** — confirmation, public event pages — these belong on `ticket-sales-legacy`. But `/admin/organizers` and the admin metrics dashboard might need event-revenue numbers — confirm whether admin stays on the ERP side.

---

*This file is updated as decisions are made and phases completed.*
