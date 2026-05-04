# 🎭 SPOTLIGHT - System Snapshot & Complete Documentation

**Generated:** 2026-05-04  
**Project Status:** MVP ~35% (Core infrastructure ready, Stripe integration pending)  
**Total Artifacts:** 87 TypeScript files + 22 Markdown docs

---

## 📊 Executive Summary

### Current State
- **Product:** Event ticketing platform (Spotlight) with payment processing
- **Tech Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS 4, Supabase
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **Payment:** Stripe (pending implementation)
- **Email:** Resend (pending, currently Supabase auth only)

### Critical Blockers
1. **Stripe Checkout** - Customers cannot purchase tickets
2. **Stripe Connect** - Organizers cannot receive payments
3. **Fee structure mismatch** - Marketing says 10%, code implements 5%

### Next Phase (Sprint 1: 7 days)
- Implement Stripe payment system
- Setup webhooks for payment confirmation
- Stripe Connect for organizer earnings
- Email service integration (QR codes)

---

## 🏗️ Architecture Overview

### Frontend Stack
```
next.js 16.2.4
├─ React 19.2.4
├─ TypeScript 5
├─ Tailwind CSS 4 (@tailwindcss/postcss)
├─ shadcn/ui (via components.json)
└─ UI Libraries
   ├─ @mantine/core 9.1.1
   ├─ @base-ui/react 1.4.1
   ├─ lucide-react 1.9.0
   ├─ framer-motion 12.38.0
   └─ recharts 3.8.1 (analytics)
```

### Backend Stack
```
Next.js API Routes
├─ Authentication (Supabase)
├─ Payments (Stripe - pending)
├─ Webhooks
│  ├─ Stripe payment confirmations
│  └─ Payment refunds
└─ CRUD operations via Supabase RLS
```

### Database Schema (Supabase PostgreSQL)
```
Profiles
├─ id (UUID, PK)
├─ email (STRING)
├─ user_type (ENUM: 'organizer', 'customer')
├─ stripe_account_id (STRING, pending)
├─ stripe_account_status (ENUM: pending/active/restricted)
├─ plan_tier (ENUM: essencial/profissional/enterprise)
└─ max_concurrent_events (INT, default: 2)

Events
├─ id (BIGINT, PK)
├─ user_id (UUID, FK → profiles)
├─ title (STRING)
├─ description (TEXT)
├─ date (TIMESTAMP)
├─ location (STRING)
├─ capacity (INT)
├─ ticket_price (DECIMAL)
└─ status (ENUM: draft/published/closed)

Tickets
├─ id (BIGINT, PK)
├─ event_id (BIGINT, FK → events)
├─ user_id (UUID, FK → profiles)
├─ price (DECIMAL)
├─ status (ENUM: available/sold/refunded)
├─ qr_code (STRING, pending)
└─ created_at (TIMESTAMP)

AuditLogs
├─ id (BIGINT, PK)
├─ user_id (UUID, FK)
├─ action (STRING)
├─ resource (STRING)
├─ details (JSONB)
└─ created_at (TIMESTAMP)

StripeAccountLinks (pending)
├─ id (BIGINT, PK)
├─ user_id (UUID, FK)
├─ stripe_account_id (STRING)
└─ status (ENUM: pending/active/restricted)
```

### Row-Level Security (RLS) Policies
- Users can only see/edit their own data
- Organizers see events they created
- Customers see their purchases
- Admin routes are protected

---

## 📁 Project Directory Structure

```
d:/spots/
├─ .agents/                          # Agent coordination files
│  ├─ CLAUDE.md                     # Agent instructions (NEXT: Review & Update)
│  ├─ IMPLEMENTACAO_AUTH_COMPLETA.md
│  ├─ PROGRESSO_HOJE_04_05.md
│  ├─ PROGRESSO_STRIPE_CONNECT.md
│  ├─ RESUMO_EXECUTIVO_COMPLETO.md
│  ├─ SPRINT_1_RESUMO_DECISOES.md
│  └─ STATUS_BILHETERIA_REAL.md
├─ .next/                            # Next.js build output
├─ .git/                             # Version control
├─ node_modules/                     # Dependencies (527 packages)
├─ public/                           # Static assets
├─ src/
│  ├─ app/                          # Next.js app directory (14 routes)
│  │  ├─ api/                       # API endpoints
│  │  │  ├─ auth/
│  │  │  │  ├─ forgot-password/route.ts
│  │  │  │  └─ reset-password/route.ts
│  │  │  ├─ checkout/route.ts       # PENDING: Stripe checkout
│  │  │  ├─ tickets/
│  │  │  │  ├─ validate/route.ts    # QR code validation
│  │  │  │  └─ refund/route.ts      # Refund processing
│  │  │  ├─ support/report/route.ts # Support tickets
│  │  │  ├─ webhooks/stripe/route.ts # PENDING: Stripe webhooks
│  │  │  ├─ stripe/
│  │  │  │  ├─ connect/authorize/route.ts  # PENDING
│  │  │  │  └─ connect/callback/route.ts   # PENDING
│  │  │  └─ organizer/earnings/route.ts    # PENDING
│  │  │
│  │  ├─ dashboard/                # Organizer routes (protected)
│  │  │  ├─ page.tsx               # Dashboard home
│  │  │  ├─ eventos/               # Event management
│  │  │  │  ├─ [id]/page.tsx
│  │  │  │  └─ listar/page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ configuracoes/
│  │  │  ├─ financeiro/            # PENDING: Financial dashboard
│  │  │  ├─ ganhos/                # Organizer earnings
│  │  │  ├─ vendas/                # Sales reports
│  │  │  └─ (other routes - mostly stubs)
│  │  │
│  │  ├─ (other routes - client-facing)
│  │  │  ├─ page.tsx               # Landing page
│  │  │  ├─ login/page.tsx          # Login (organizers)
│  │  │  ├─ faq/page.tsx            # FAQ section
│  │  │  ├─ mosaico-eventos/        # PENDING: Event mosaic for customers
│  │  │  ├─ meus-pedidos/           # Customer orders (stub)
│  │  │  ├─ esqueci-senha/page.tsx   # Password recovery
│  │  │  ├─ e/                      # Email verification routes
│  │  │  ├─ house/                  # PENDING: Theater login
│  │  │  └─ (other stubs)
│  │  │
│  │  ├─ layout.tsx                # Root layout
│  │  └─ globals.css               # Global styles
│  │
│  ├─ components/                  # Reusable React components
│  │  ├─ EventForm.tsx
│  │  ├─ FeaturesSection.tsx
│  │  ├─ Footer.tsx
│  │  ├─ ModuleNav.tsx             # Module navigation (sidebar)
│  │  ├─ Sidebar.tsx               # Main sidebar navigation
│  │  ├─ ui/
│  │  │  ├─ LoginComponent.tsx
│  │  │  ├─ AdminRegisterComponent.tsx  # PENDING
│  │  │  ├─ SplitAuthComponent.tsx      # PENDING
│  │  │  ├─ TicketPurchaseModal.tsx     # PENDING: Integrate with Stripe
│  │  │  └─ (other UI components)
│  │  ├─ client/                   # Client components
│  │  ├─ CookieBanner.tsx          # PENDING
│  │  ├─ DarkModeToggle.tsx         # PENDING
│  │  ├─ EventMosaic.tsx            # PENDING
│  │  ├─ StripeConnectButton.tsx    # PENDING
│  │  └─ KillExcelSection.tsx       # DEPRECATED: Remove
│  │
│  └─ lib/                         # Utilities
│     ├─ supabase.ts               # Supabase client (browser)
│     ├─ supabase-server.ts        # Supabase client (server)
│     ├─ database.types.ts         # TypeScript types (auto-generated)
│     ├─ stripe.ts                 # PENDING: Stripe utilities
│     ├─ auth-helpers.ts           # PENDING: Auth utilities
│     ├─ email-service.ts          # PENDING: Email service
│     ├─ auth-context.ts           # Auth context provider
│     ├─ dark-mode.ts              # PENDING: Dark mode utilities
│     ├─ audit.ts                  # Audit logging
│     ├─ masks.ts                  # Input masks (CPF, phone)
│     └─ utils.ts                  # General utilities
│
├─ supabase/
│  ├─ migrations/                  # DB migrations
│  └─ .temp/cli-latest             # CLI cache
│
├─ tests/                          # Test files (empty)
├─ scratch/                        # Temporary/experimental files
├─ brain/                          # Documentation notes
│
├─ DOCUMENTATION FILES:
├─ COMECE_AQUI.md                  # Quick start guide
├─ README.md                       # Project overview
├─ AGENTS.md                       # Agent rules and patterns
├─ CLAUDE.md                       # Claude instructions (sparse)
├─ ROADMAP_IMPLEMENTACAO.md        # 14 features, 5 sprints
├─ RESUMO_EXECUTIVO.md             # Executive summary (2026-05-03)
├─ STATUS_SPRINT_1.md              # Sprint 1 checklist
├─ CONFIGURACOES_PRODUCAO.md       # Production setup guide
├─ DECISOES_SPRINT_1.md            # Decision log
├─ INDEX_DOCUMENTACAO.md           # Documentation index
├─ STRIPE_INTEGRATION.md           # Stripe technical details
├─ RELATORIO_IMPLEMENTACAO.md      # Implementation report
├─ RELATORIO_FINAL_IMPLEMENTACAO.md # Final report
├─ PROPOSTA_NEGOCIO.md             # Business proposal
├─ CONTRATO_PLATAFORMA.md          # Platform contract
│
├─ CONFIG FILES:
├─ next.config.ts                 # Next.js configuration
├─ tailwind.config.ts             # Tailwind CSS config
├─ tsconfig.json                  # TypeScript config
├─ components.json                # shadcn/ui config
├─ eslint.config.mjs              # ESLint rules
├─ package.json                   # Dependencies
└─ package-lock.json              # Locked versions
```

---

## 📊 Key Statistics

| Metric | Value |
|--------|-------|
| TypeScript Files | 87 |
| React Components | ~35 |
| API Routes | 11 |
| Database Tables | 6+ |
| Documentation Files | 22 |
| Dependencies | 527 (package.json) |
| Project Size | ~1.2 GB (with node_modules) |
| Git Commits | 676663c (latest) |

---

## 🔌 API Endpoints (Routes)

### Authentication
- `GET /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Payments & Tickets (PENDING)
- `POST /api/checkout` - Create payment intent for tickets
- `GET /api/tickets/validate` - Validate QR code at entry
- `POST /api/tickets/refund` - Process ticket refunds
- `POST /api/webhooks/stripe` - Stripe webhook receiver

### Stripe Connect (PENDING)
- `GET /api/stripe/connect/authorize` - Initiate Stripe Connect OAuth
- `GET /api/stripe/connect/callback` - Handle OAuth callback
- `GET /api/organizer/earnings` - Get organizer balance

### Support
- `POST /api/support/report` - Report issues/support tickets

---

## 📦 Dependencies by Category

### UI & Components (16 packages)
- `@mantine/core@9.1.1`, `@mantine/hooks@9.1.1`
- `@base-ui/react@1.4.1`
- `@radix-ui/react-dropdown-menu@2.1.16`
- `@radix-ui/react-slot@1.2.4`
- `lucide-react@1.9.0`
- `class-variance-authority@0.7.1`
- `clsx@2.1.1`
- `framer-motion@12.38.0`, `motion@12.38.0`
- `canvas-confetti@1.9.4`
- `sonner@2.0.7` (toast notifications)
- `shadcn@4.4.0` (CLI for shadcn/ui)
- `tailwind-merge@3.5.0`
- `tw-animate-css@1.4.0`

### Data & Charts (2 packages)
- `recharts@3.8.1` (charts/analytics)
- `date-fns@4.1.0` (date utilities)

### Payments & Documents (4 packages)
- `stripe@22.1.0` (Stripe backend)
- `@stripe/stripe-js@9.4.0` (Stripe frontend)
- `jspdf@4.2.1` (PDF generation)
- `jspdf-autotable@5.0.7` (PDF tables)

### Data Processing (2 packages)
- `qrcode@1.5.4` (QR code generation)
- `xlsx@0.18.5` (Excel export)

### Backend & Database (2 packages)
- `@supabase/supabase-js@2.104.1` (Database/Auth)
- `resend@6.12.2` (Email service - pending)

### Framework & Core (3 packages)
- `next@16.2.4`
- `react@19.2.4`
- `react-dom@19.2.4`

### 3D Graphics (1 package)
- `ogl@1.0.11` (WebGL rendering)

---

## 🔐 Security & Data Protection

### Row-Level Security (RLS) ✅
- Supabase RLS policies configured
- Users see only their own data
- Organizers see only their events
- Database-level enforcement

### Authentication ✅
- Supabase Auth (email + password)
- Session management
- Password recovery flow
- Email verification (pending)

### Payment Security (PENDING)
- Stripe integration for PCI compliance
- No direct card storage
- Webhook signature verification needed
- Idempotency keys for payment retry

### Audit Logging ⚠️
- Audit log table exists
- Schema ready but visualization pending
- Audit trails for CRUD operations
- Payment history tracking

### Missing/Pending
- HTTPS/TLS in production (needed for Stripe)
- Rate limiting on API endpoints
- CSRF protection
- Input validation/sanitization (partially done)

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All `.env.local` secrets NOT in git
- [ ] Stripe Live keys obtained
- [ ] Supabase production database configured
- [ ] Email service (Resend/SendGrid) configured
- [ ] Domain DNS setup
- [ ] SSL/TLS certificate configured

### Deployment Steps
- [ ] Build verification: `npm run build` ✅
- [ ] Run tests: `npm test` (no tests configured)
- [ ] Deploy to staging
- [ ] E2E testing with real Stripe (test mode)
- [ ] Deploy to production
- [ ] Monitor Stripe webhook delivery
- [ ] Verify email delivery

### Post-Deployment
- [ ] Monitor error logs (Sentry/DataDog - not configured)
- [ ] Monitor Stripe payments
- [ ] Monitor API response times
- [ ] Alert setup for failures

---

## 🎯 Sprint 1 Implementation Plan (7 Days)

### Days 1-2: Stripe Checkout Setup
```typescript
// Files to create/modify:
- POST /api/checkout
- TicketPurchaseModal.tsx integration
- Supabase schema updates (stripe_* columns)
- Environment variables setup

// Tasks:
- [x] Add Stripe packages (already in package.json)
- [ ] Create checkout API endpoint
- [ ] Integrate with payment modal
- [ ] Test with card: 4242 4242 4242 4242
```

### Day 3: Webhooks Implementation
```typescript
// Files to create:
- POST /api/webhooks/stripe

// Tasks:
- [ ] Receive payment_intent.succeeded
- [ ] Mark ticket as 'paid'
- [ ] Trigger email with QR code
- [ ] Test with Stripe CLI
```

### Day 4: Stripe Connect
```typescript
// Files to create:
- GET /api/stripe/connect/authorize
- GET /api/stripe/connect/callback
- GET /api/organizer/earnings

// Tasks:
- [ ] OAuth flow setup
- [ ] Save stripe_account_id
- [ ] Display organizer earnings
```

### Day 5: Error Handling & Edge Cases
- [ ] Retry logic (3x timeout)
- [ ] Duplicate payment detection (idempotency)
- [ ] Rate limiting
- [ ] Concurrent transaction handling

### Days 6-7: Testing & Documentation
- [ ] End-to-end flow testing
- [ ] Deploy to staging
- [ ] Update documentation
- [ ] Production readiness check

---

## 🗑️ Files Marked for Removal (Tree-Shaking)

### Deprecated Components
1. `src/components/KillExcelSection.tsx` - Old feature, no references
2. `.agents/rules/cleanup.md` - Obsolete rules
3. `.agents/rules/correct-modals.md` - Obsolete
4. `.agents/rules/corrections.md` - Obsolete
5. `.agents/rules/fluxo.md` - Obsolete
6. `.agents/rules/styles.md` - Obsolete
7. `.agents/rules/togit.md` - Obsolete

### Duplicate/Redundant Documentation
1. `RELATORIO_IMPLEMENTACAO.md` - Superseded by RESUMO_EXECUTIVO.md
2. `RELATORIO_FINAL_IMPLEMENTACAO.md` - Superseded by RESUMO_EXECUTIVO.md
3. `.agents/PROGRESSO_HOJE_04_05.md` - Daily log (can archive)
4. `.agents/PROGRESSO_STRIPE_CONNECT.md` - Superseded by ROADMAP_IMPLEMENTACAO.md
5. `.agents/RESUMO_EXECUTIVO_COMPLETO.md` - Superseded by RESUMO_EXECUTIVO.md
6. `.agents/SPRINT_1_RESUMO_DECISOES.md` - Superseded by DECISOES_SPRINT_1.md
7. `.agents/STATUS_BILHETERIA_REAL.md` - Superseded by STATUS_SPRINT_1.md

### Stubs/Empty Routes (can remove or stub properly)
1. `src/app/dashboard/financeiro/` - Empty (Tier Profissional, future)
2. `src/app/dashboard/ganhos/` - Empty (future feature)
3. `src/app/dashboard/vendas/` - Empty (future feature)
4. `src/app/meus-pedidos/` - Stub (needs implementation)
5. `src/app/organizadores/` - Stub (future)
6. `src/app/para-casas/` - Stub (future)
7. `src/app/mosaico-eventos/` - Stub (CRITICAL - needs implementation)
8. `src/app/house/` - Stub (future)
9. `src/app/e/` - Stub (future - email verification?)
10. `src/app/clientes/` - Stub (future)
11. `src/app/resetar-senha/` - Stub (duplicate of esqueci-senha logic?)

### Cache & Temp Files
1. `supabase/.temp/cli-latest` - Temporary file
2. `tsconfig.tsbuildinfo` - Rebuild cache (can be gitignored)
3. `.next/` - Build cache (should be gitignored)

---

## 📝 Documentation Consolidation Guide

### Primary Documents (KEEP)
1. **SYSTEM_SNAPSHOT.md** (this file) - Complete system state
2. **ROADMAP_IMPLEMENTACAO.md** - Features and priority
3. **CONFIGURACOES_PRODUCAO.md** - Production setup
4. **RESUMO_EXECUTIVO.md** - Executive decisions
5. **AGENTS.md** - Agent rules (core)
6. **COMECE_AQUI.md** - Quick start

### Secondary Documents (REFERENCE)
1. **STATUS_SPRINT_1.md** - Sprint checklist (living document)
2. **DECISOES_SPRINT_1.md** - Decision log
3. **STRIPE_INTEGRATION.md** - Stripe technical details

### Archive (NO LONGER NEEDED)
- All `.agents/*.md` progress files
- Duplicate reports and summaries
- Daily progress logs

### Next Steps
- Move `.agents/` files to `archive/` folder
- Create `.claude/` folder with proper structure
- Setup automation scripts for tree-shaking

---

## 🔮 Next Phase Priorities

### Critical Path (Sprint 1)
1. ✅ **Understand current state** (this snapshot)
2. ⏳ **Stripe Checkout** → Can purchase tickets
3. ⏳ **Stripe Connect** → Organizers can be paid
4. ⏳ **Webhooks** → Real-time payment confirmation
5. ⏳ **Email/QR codes** → Customers receive tickets

### High Value (Sprint 2-3)
1. **Mosaico-eventos** → Customer event browsing
2. **Meus-pedidos** → Customer order history
3. **Financial Dashboard** → Advanced analytics
4. **Dark Mode** → UI polish
5. **Audit Log Visualization** → Compliance

### Nice-to-Have (Sprint 4+)
1. Support ticket system
2. Advanced reporting
3. White-label infrastructure
4. Custom integrations

---

## 📞 System Health

| Component | Status | Notes |
|-----------|--------|-------|
| Build | ✅ Passing | No TypeScript errors |
| Database | ✅ Connected | Supabase production |
| Authentication | ✅ Working | Supabase Auth |
| Stripe | ❌ Pending | No checkout/connect |
| Email | ❌ Pending | Supabase auth only |
| Testing | ❌ None | No test suite configured |
| Monitoring | ❌ None | No Sentry/DataDog |
| Dark Mode | ❌ Not implemented | Stub component exists |
| Audit Logs | ⚠️ Partial | Schema ready, UI missing |
| Mobile-Ready | ✅ Partial | Responsive but not tested |

---

## 📚 How to Use This Document

### For Developers
1. Start with **Architecture Overview** → understand tech stack
2. Review **Directory Structure** → find files
3. Check **API Endpoints** → understand integrations
4. Follow **Sprint 1 Plan** → implement next features

### For Project Managers
1. Review **Executive Summary** → understand progress
2. Check **Critical Blockers** → priorities
3. Follow **Sprint 1 Implementation Plan** → timeline
4. Review **Next Phase Priorities** → roadmap

### For Security/Ops
1. Review **Security & Data Protection** → compliance status
2. Check **Deployment Checklist** → production readiness
3. Monitor **System Health** → component status

### Maintenance
- Update this file after each sprint
- Mark completed items with ✅
- Add blockers as ❌
- Review dependencies quarterly

---

**Last Updated:** 2026-05-04  
**Next Review:** After Sprint 1 completion  
**Maintained by:** Development team
