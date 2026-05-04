# 📑 Spotlight Documentation Index

**Last Updated:** 2026-05-04  
**Complete System Reference**

---

## 🎯 START HERE

### For New Developers
1. Read **`SYSTEM_SNAPSHOT.md`** (5 min) - Complete system state
2. Read **`COMECE_AQUI.md`** (15 min) - Quick start
3. Read **`.claude/claude.md`** (10 min) - Development guide
4. Start: `npm install && npm run dev`

### For Project Managers
1. Read **`RESUMO_EXECUTIVO.md`** (10 min) - Executive summary
2. Review **`ROADMAP_IMPLEMENTACAO.md`** (15 min) - Feature roadmap
3. Check **`STATUS_SPRINT_1.md`** (5 min) - Sprint checklist

### For DevOps/Deployment
1. Read **`CONFIGURACOES_PRODUCAO.md`** (15 min) - Production setup
2. Review **`.claude/claude.md`** → Deployment section
3. Follow deployment checklist

---

## 📋 Core Documentation

| Document | Purpose | Read Time | Status |
|----------|---------|-----------|--------|
| **SYSTEM_SNAPSHOT.md** | Complete architecture & state | 20 min | ✅ Current |
| **ROADMAP_IMPLEMENTACAO.md** | 14 features, 5 sprints, priorities | 30 min | ✅ Current |
| **CONFIGURACOES_PRODUCAO.md** | Production setup, env vars, schema | 20 min | ✅ Current |
| **RESUMO_EXECUTIVO.md** | Executive summary, decisions, timeline | 15 min | ✅ 2026-05-03 |
| **COMECE_AQUI.md** | Quick start guide | 15 min | ✅ Current |
| **AGENTS.md** | Agent rules & patterns | 10 min | ✅ Core rules |
| **DECISOES_SPRINT_1.md** | Decision log & justifications | 15 min | ✅ Current |
| **STATUS_SPRINT_1.md** | Sprint 1 checklist | 5 min | ⏳ Living doc |
| **STRIPE_INTEGRATION.md** | Stripe technical details | 15 min | ⚠️ Needs review |

---

## 🛠️ Development Tools

### Scripts in `.claude/`

| Script | Purpose | When to Run |
|--------|---------|-------------|
| **treeshake.sh** | Remove deprecated files | Monthly |
| **cleanup.sh** | Clear caches & temp files | Weekly |
| **analyze-deadcode.sh** | Find unused files | Monthly |

### Configuration Files

| File | Purpose |
|------|---------|
| **.claude/claude.md** | Complete development guide |
| **.claude/README.md** | This directory guide |
| **.claude/INDEX.md** | Documentation index (this file) |

---

## 📁 Project Structure

```
DOCUMENTATION
├─ Core (READ FIRST)
│  ├─ SYSTEM_SNAPSHOT.md ............ Complete system state
│  ├─ COMECE_AQUI.md ............... Quick start
│  ├─ ROADMAP_IMPLEMENTACAO.md ...... Feature roadmap
│  ├─ CONFIGURACOES_PRODUCAO.md ..... Production setup
│  └─ AGENTS.md .................... Development rules
│
├─ Sprint Info
│  ├─ STATUS_SPRINT_1.md ........... Sprint checklist
│  ├─ DECISOES_SPRINT_1.md ......... Decision log
│  └─ RESUMO_EXECUTIVO.md .......... Executive summary
│
├─ Reference
│  ├─ STRIPE_INTEGRATION.md ........ Payment tech details
│  ├─ INDEX_DOCUMENTACAO.md ........ Older index (see SYSTEM_SNAPSHOT)
│  ├─ PROPOSTA_NEGOCIO.md .......... Business proposal
│  └─ CONTRATO_PLATAFORMA.md ....... Platform contract
│
└─ ARCHIVED (See archive/ folder)
   ├─ RELATORIO_IMPLEMENTACAO.md
   ├─ RELATORIO_FINAL_IMPLEMENTACAO.md
   └─ Various progress logs

TOOLS & CONFIG
├─ .claude/
│  ├─ claude.md .................... Development guide
│  ├─ README.md .................... This directory
│  ├─ INDEX.md ..................... Doc index
│  ├─ treeshake.sh ................. Remove dead code
│  ├─ cleanup.sh ................... Clear caches
│  ├─ analyze-deadcode.sh .......... Find unused files
│  └─ templates/ ................... Code templates (coming soon)
│
└─ ROOT CONFIG
   ├─ package.json ................. Dependencies
   ├─ tsconfig.json ................ TypeScript config
   ├─ tailwind.config.ts ........... Styling config
   ├─ next.config.ts ............... Next.js config
   └─ eslint.config.mjs ............ Linting rules
```

---

## 🎯 Quick Navigation

### By Role

**Frontend Developer**
- Start: `.claude/claude.md` (architecture)
- Build: Read relevant section in `SYSTEM_SNAPSHOT.md`
- Reference: Component files in `src/components/`

**Backend Developer**
- Start: `SYSTEM_SNAPSHOT.md` (API section)
- Implement: Follow `ROADMAP_IMPLEMENTACAO.md`
- Setup: `CONFIGURACOES_PRODUCAO.md`

**DevOps/Deployment**
- Setup: `CONFIGURACOES_PRODUCAO.md` (complete)
- Deploy: `.claude/claude.md` (deployment section)
- Monitor: `SYSTEM_SNAPSHOT.md` (system health)

**Project Manager**
- Status: `STATUS_SPRINT_1.md` (quick view)
- Timeline: `RESUMO_EXECUTIVO.md` (decisions)
- Roadmap: `ROADMAP_IMPLEMENTACAO.md` (all 14 features)

**Security/Compliance**
- Security: `SYSTEM_SNAPSHOT.md` (security section)
- Data: `CONFIGURACOES_PRODUCAO.md` (RLS, env vars)
- Audit: `src/lib/audit.ts` (audit logging)

---

## 📊 Current Status

### System Health
- ✅ Frontend: ~95% ready
- ✅ Database: ~95% ready
- ✅ Authentication: 100% working
- ❌ Payments: 0% (CRITICAL BLOCKER)
- ❌ Email Service: 0% (pending)
- ❌ Tests: 0% (not configured)
- ⚠️ Dark Mode: Stub only
- ⚠️ Audit Logs: Schema ready, UI missing

### Documentation Health
- ✅ Core docs complete (SYSTEM_SNAPSHOT.md)
- ✅ Roadmap clear (ROADMAP_IMPLEMENTACAO.md)
- ✅ Development guide written (.claude/claude.md)
- ✅ Production setup documented
- ⚠️ Archived old progress logs
- ⚠️ Some duplicate docs (marked for removal)

### Code Quality
- ✅ TypeScript strict mode enabled
- ✅ ESLint configured
- ❌ No test suite
- ⚠️ RLS policies complete but not audited
- ⚠️ Input validation incomplete
- ⚠️ Error handling basic

---

## 🚀 Next Actions

### Immediate (This Week)
- [ ] Read `SYSTEM_SNAPSHOT.md` completely
- [ ] Review `.claude/claude.md` for dev setup
- [ ] Run `npm install && npm run build` to verify
- [ ] Start Sprint 1: Stripe integration

### This Sprint (Days 2-7)
- [ ] Implement POST `/api/checkout`
- [ ] Implement webhooks handler
- [ ] Implement Stripe Connect OAuth
- [ ] Integrate TicketPurchaseModal
- [ ] Test end-to-end payment flow

### This Month
- [ ] Complete Stripe integration ✅ Stripe working
- [ ] Run `treeshake.sh` to clean repo
- [ ] Implement `mosaico-eventos` for customers
- [ ] Integrate email service

### This Quarter
- [ ] Complete all Tier Essencial features
- [ ] Begin Tier Profissional features
- [ ] Setup monitoring & alerts
- [ ] Performance optimization

---

## 📚 Learning Materials

### By Technology

**Stripe**
- Quick Start: [stripe.com/docs](https://stripe.com/docs)
- Checkout: [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- Connect: [Stripe Connect Docs](https://stripe.com/docs/connect)

**Supabase**
- Auth Guide: [supabase.com/auth](https://supabase.com/docs/guides/auth)
- RLS: [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- Realtime: [Realtime Docs](https://supabase.com/docs/guides/realtime)

**Next.js**
- Framework: [nextjs.org/docs](https://nextjs.org/docs)
- App Router: [App Router Guide](https://nextjs.org/docs/app)
- API Routes: [API Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

**React + TypeScript**
- Cheatsheet: [react-typescript-cheatsheet.netlify.app](https://react-typescript-cheatsheet.netlify.app/)
- Hooks: [React Hooks](https://react.dev/reference/react/hooks)

---

## 📞 Support & Issues

### If Build Fails
1. Run: `npm run clean`
2. Run: `npm install`
3. Run: `npm run build`
4. Check: `SYSTEM_SNAPSHOT.md` → System Health section

### If Payment Integration Fails
1. Check: `CONFIGURACOES_PRODUCAO.md` (setup)
2. Check: `STRIPE_INTEGRATION.md` (technical)
3. Run: Stripe CLI tests locally
4. Review: Error logs in console

### If Database Issues
1. Check: Supabase dashboard
2. Verify: RLS policies in database
3. Check: `.env.local` credentials
4. Review: SQL in browser console

### If Questions
1. Check relevant doc in this index
2. Search `SYSTEM_SNAPSHOT.md`
3. See `.claude/claude.md` → Common Issues
4. Review code comments in `src/lib/`

---

## 🔄 Keeping Docs Current

### After Each Sprint
1. Update `STATUS_SPRINT_1.md` with ✅ items
2. Update `SYSTEM_SNAPSHOT.md` → System Health
3. Add notes to `DECISOES_SPRINT_1.md`

### After Each Feature
1. Update `ROADMAP_IMPLEMENTACAO.md`
2. Add implementation notes to `SYSTEM_SNAPSHOT.md`
3. Document in `.claude/` if needed

### Monthly
1. Run `analyze-deadcode.sh`
2. Update statistics in `SYSTEM_SNAPSHOT.md`
3. Archive old logs

---

## 🎓 Document Relationships

```
START HERE
    ↓
SYSTEM_SNAPSHOT.md
    ├─ References: ROADMAP_IMPLEMENTACAO.md
    ├─ References: CONFIGURACOES_PRODUCAO.md
    ├─ References: AGENTS.md
    └─ References: COMECE_AQUI.md
        ├─ References: STATUS_SPRINT_1.md
        ├─ References: DECISOES_SPRINT_1.md
        └─ References: RESUMO_EXECUTIVO.md

DEVELOPMENT
    ↓
.claude/claude.md
    ├─ References: SYSTEM_SNAPSHOT.md
    ├─ References: ROADMAP_IMPLEMENTACAO.md
    ├─ References: AGENTS.md
    └─ References: CONFIGURACOES_PRODUCAO.md

DEPLOYMENT
    ↓
CONFIGURACOES_PRODUCAO.md
    ├─ References: SYSTEM_SNAPSHOT.md
    └─ References: .claude/claude.md

PAYMENT INTEGRATION
    ↓
STRIPE_INTEGRATION.md
    ├─ References: CONFIGURACOES_PRODUCAO.md
    └─ References: ROADMAP_IMPLEMENTACAO.md
```

---

## ✅ Verification Checklist

Before declaring system ready:

- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes all checks
- [ ] All environment variables documented
- [ ] RLS policies reviewed
- [ ] Stripe test mode working
- [ ] Payment flow end-to-end tested
- [ ] Documentation complete & current

---

**Version:** 1.0  
**Last Updated:** 2026-05-04  
**Maintained by:** Development Team

---

For complete system understanding, start with **SYSTEM_SNAPSHOT.md**
