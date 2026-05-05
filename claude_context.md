# Claude Context Cache

This file contains the content of key files from the `.claude` directory and other documentation files to provide context for the assistant.

## .claude/agents/new-order.md
```markdown
# You're the responsible for the new architecture of the project.

## Run a tree shaking to remove all obsolete files and unused components and functions and variables, do NOT delete any file unless you're sure it's not used in the project, if you're not sure, ask me before deleting.

## Create a .md file describing what you think you're you doing here called "me.md" in agents folder 

## You will cut out every .sql file that polutes and document them in to one file named SQL history .md that will serve as backup if necessary, you will order them by date and time

## You will turn this project into a simple ERP for producers, promoters, and sellers of festivals and events, specifically Teathers on this branch, so hide on a separate branch this version you're going to make because it will have no ticket sell , only the management of the event, the sale will be made by another branch in a future update

## Organize this code to show only the "Organizadores" as the whole system was made only for it and move all the ticket selling functionality to a separate branch, keeping this branch with only the event management functionality. do the same in the new branch for the ticket selling functionality
```

## .claude/agents/me.md
```markdown
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
- [ ] Tag current main as `pre-split-archive` for rollback
- [ ] Create `ticket-sales-legacy` branch from current main (full code, will be stripped later)

### Phase 1 — Inventory the seam
Map every file/route into:
- **ERP-only** (organizer dashboards, event CRUD, finance, employees, admin)
- **Ticket-sales-only** (`/api/checkout`, `/api/webhooks/stripe`, `/api/tickets/*`, `/e/[slug]`, `/meus-pedidos`, `/mosaico-eventos`, `/confirmacao`, `TicketPurchaseModal`, dynamic QR, Stripe Connect, etc.)
- **Shared** (auth, supabase clients, layout, Sidebar, design system)
- **Out-of-scope** (location management — flagged for removal)

Output as `SPLIT_INVENTORY.md` for owner review *before* cuts.

### Phase 2 — SQL consolidation
- Read every `.sql` in `supabase/migrations/` (and anywhere else).
- Write `SQL_history.md` with sections ordered chronologically by filename timestamp.
- Delete originals after consolidation.

### Phase 3 — Strip ticket-sales from `main` (the ERP)
- Remove ticket-sales routes, components, libs identified in inventory.
- Reorient `Sidebar` and dashboards around expense/revenue consolidation.
- Remove Stripe checkout/customer flows; keep Stripe Connect *only if* needed for organizer payout reporting (TBD — flag to owner).
- Build & lint must pass.

### Phase 4 — Strip ERP from `ticket-sales-legacy`
- Switch to that branch.
- Remove organizer admin/management UI not needed for the public sales flow.
- Build & lint must pass — owner confirmed both branches stay runnable.

### Phase 5 — Tree-shake
- Run dead-code analysis (`.claude/analyze-deadcode.sh` + manual review).
- Present a delete list per branch — **wait for per-file approval** for anything I'm not 100% sure about.

### Phase 6 — Verify
- `npm run build` on each branch.
- Push both branches.
- Update root `README.md` / `CLAUDE.md` to reflect the new dual-branch model.

## Open questions still pending

- **Stripe Connect on the ERP side?** The ERP needs to *report* revenue. If Stripe Connect data feeds those reports, we keep the connect/authorize/callback routes. If revenue is entered manually, we can drop Stripe entirely from this branch. → will ask owner once inventory is done.
- **Customer-facing routes inside `/e/[slug]`** — confirmation, public event pages — these belong on `ticket-sales-legacy`. But `/admin/organizers` and the admin metrics dashboard might need event-revenue numbers — confirm whether admin stays on the ERP side.
```

## .claude/INDEX.md
(Summarized) This file contains the documentation index, including core documentation (SYSTEM_SNAPSHOT.md, ROADMAP_IMPLEMENTACAO.md, etc.), development tools, and project structure.

## .claude/README.md
(Summarized) This file describes the development tools available in the `.claude` directory, such as `treeshake.sh`, `cleanup.sh`, and `analyze-deadcode.sh`.

## Current Git Status (2026-05-05)
Claude has already:
1. Consolidated SQL files into `SQL_history.md`.
2. Deleted the original SQL files in the working tree.
3. Staged changes in `new-order.md`.
4. Created `me.md` (untracked).

Next steps include tagging `main`, creating the `ticket-sales-legacy` branch, and performing the inventory of the code split.
