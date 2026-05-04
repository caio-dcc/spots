# 🛠️ .claude Directory - Development Tools

This directory contains scripts, templates, and configuration for Spotlight development.

---

## 📂 Contents

### Scripts (`.claude/*.sh`)

#### `treeshake.sh` - Remove Deprecated Files
Archives obsolete components and documentation to keep codebase clean.

```bash
bash .claude/treeshake.sh
```

**What it does:**
- Archives deprecated React components
- Archives obsolete documentation
- Clears Next.js build cache
- Removes TypeScript build info
- Updates .gitignore

**Output:**
- Creates `archive/` folder with timestamped backups
- Safe to restore if needed

---

#### `cleanup.sh` - Clear Caches & Temp Files
Cleans up build cache and temporary files while keeping source code intact.

```bash
bash .claude/cleanup.sh
```

**What it does:**
- Removes `.next/` build cache
- Removes `tsconfig.tsbuildinfo`
- Clears npm cache
- Removes `.DS_Store`, `*.tmp`, `Thumbs.db`
- Shows disk space freed

**Safe to run:** Yes, anytime you need to clear caches

---

#### `analyze-deadcode.sh` - Find Unused Files
Analyzes codebase to find components, utilities, and routes that may be unused.

```bash
bash .claude/analyze-deadcode.sh
```

**What it checks:**
- Components with 0 imports
- Utility files not referenced
- Routes with no navigation links

**Warning:** Results are heuristic. Verify manually before deleting.

---

### Configuration

#### `claude.md` - Development Guide
Complete guide for working on Spotlight including:
- Quick start commands
- Architecture overview
- Coding standards
- Debugging tips
- Deployment checklist

**Read before:** Starting new development or debugging

---

### Templates (`.claude/templates/`)

Coming soon: Code templates for:
- API routes
- React components
- Database operations
- Email templates

---

## 🎯 Common Workflows

### Starting Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Before Committing
```bash
npm run lint
npm run build
```

### Cleaning Up (Weekly)
```bash
bash .claude/cleanup.sh
```

### Tree-Shaking (Monthly)
```bash
bash .claude/treeshake.sh
# Review archive/ folder
# Commit if satisfied with removal
```

### Analyzing Code Health
```bash
bash .claude/analyze-deadcode.sh
npm audit
npm outdated
```

---

## 📚 Documentation

### System Documentation
- **`SYSTEM_SNAPSHOT.md`** - Complete system state (architecture, components, dependencies)
- **`COMECE_AQUI.md`** - Quick start guide
- **`ROADMAP_IMPLEMENTACAO.md`** - 14 features, 5 sprints

### Configuration & Setup
- **`CONFIGURACOES_PRODUCAO.md`** - Production setup guide
- **`claude.md`** - Development guidelines

### Archived Documentation
- **`archive/`** - Old documentation moved here during tree-shaking

---

## 🚀 Sprint 1 Focus

**Goal:** Implement Stripe payment integration

**Timeline:** 7 days

**Key Files to Create:**
- `src/lib/stripe.ts` - Stripe utilities
- `src/app/api/checkout/route.ts` - Checkout endpoint
- `src/app/api/webhooks/stripe/route.ts` - Webhook handler
- `src/app/api/stripe/connect/*` - Organizer connect endpoints

**Key Files to Modify:**
- `src/components/ui/TicketPurchaseModal.tsx` - Integrate checkout
- Database schema - Add stripe_* columns

---

## ✅ Maintenance Checklist

- **Weekly:** Review error logs, check payment reports
- **Monthly:** Run `analyze-deadcode.sh`, update dependencies
- **Quarterly:** Security audit, performance review
- **After each sprint:** Update SYSTEM_SNAPSHOT.md

---

## 📝 How to Add New Scripts

1. Create `script-name.sh` in `.claude/`
2. Add shebang: `#!/bin/bash`
3. Add help comments at top
4. Make executable: `chmod +x .claude/script-name.sh`
5. Document in this README

---

## 🔗 Quick Links

- **View System State:** Read `SYSTEM_SNAPSHOT.md`
- **View Roadmap:** Read `ROADMAP_IMPLEMENTACAO.md`
- **View Dev Guide:** Read `.claude/claude.md`
- **View Sprint Status:** Read `STATUS_SPRINT_1.md`

---

**Last Updated:** 2026-05-04  
**Maintained by:** Development Team
