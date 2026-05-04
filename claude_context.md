# 🎭 Spotlight - Claude Context Cache

**Last Updated:** 2026-05-04
**Project Status:** MVP ~35% (Stripe integration pending)

## 📋 System Overview
- **Core:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5.
- **UI:** Tailwind CSS 4, shadcn/ui, Mantine, Framer Motion.
- **Backend:** Supabase (PostgreSQL + Auth), Next.js API Routes.
- **Payments:** Stripe (Current blocker/focus).

## 🎯 Current Sprint: Sprint 1 (Stripe Integration)
- **Goal:** Enable ticket purchases and organizer payouts.
- **Key Tasks:** 
  - Stripe Checkout setup.
  - Webhooks for payment confirmation.
  - Stripe Connect for organizer earnings.
- **Important Files:**
  - `src/lib/stripe.ts`
  - `/api/checkout`
  - `/api/webhooks/stripe`

## 🛠️ Development Tools (.claude/)
- `treeshake.sh`: Archives deprecated files and clears caches.
- `cleanup.sh`: Clears build artifacts and temp files.
- `analyze-deadcode.sh`: Finds unused code.
- `claude.md`: Main development guide.

## 📚 Documentation Reference
- `SYSTEM_SNAPSHOT.md`: Complete system state (3,000+ lines).
- `ROADMAP_IMPLEMENTACAO.md`: Feature roadmap (14 features, 5 sprints).
- `CONFIGURACOES_PRODUCAO.md`: Production setup and environment variables.
- `INDEX.md`: Documentation navigation.

## 🔒 Security & Standards
- RLS policies enforced in Supabase.
- Commit pattern: `type: brief description` (e.g., `feat:`, `fix:`, `refactor:`, `docs:`).
- Strict TypeScript mode enabled.

---
*This file is a cache of the context found in the `.claude` directory, generated to assist development.*
