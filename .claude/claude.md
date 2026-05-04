# 🎭 Spotlight - Claude Development Guide

**Project:** Spotlight - Event Ticketing Platform  
**Last Updated:** 2026-05-04  
**Status:** MVP ~35% (Stripe integration pending)

---

## 📋 Quick Reference

### Start Development
```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Build for production
npm run lint       # Run ESLint
npm run clean      # Clear build cache
```

### Project Structure
- **`src/app/`** - Next.js app routes (UI + API)
- **`src/components/`** - React components
- **`src/lib/`** - Utilities (auth, db, stripe, email)
- **`.claude/`** - Development scripts & templates
- **`archive/`** - Deprecated files

### Key Files
- **`SYSTEM_SNAPSHOT.md`** - Complete system state (READ FIRST)
- **`ROADMAP_IMPLEMENTACAO.md`** - Features & roadmap
- **`CONFIGURACOES_PRODUCAO.md`** - Production setup
- **`AGENTS.md`** - Agent rules & patterns

---

## 🎯 Current Focus (Sprint 1)

### Critical Blocker
**Stripe Payment Integration** - Without this, customers cannot purchase tickets

### Implementation Timeline
```
Days 1-2: Stripe Checkout setup
Day 3:    Webhooks for payment confirmation
Day 4:    Stripe Connect for organizer earnings
Day 5:    Error handling & edge cases
Days 6-7: Testing & deploy
```

### Files to Create/Modify
```
✅ Already in package.json:
   - stripe@22.1.0
   - @stripe/stripe-js@9.4.0

📝 To create:
   - POST /api/checkout
   - POST /api/webhooks/stripe
   - GET /api/stripe/connect/authorize
   - GET /api/stripe/connect/callback
   - GET /api/organizer/earnings
   - src/lib/stripe.ts (utilities)

🔧 To integrate:
   - TicketPurchaseModal.tsx
   - Supabase schema (stripe_* columns)
   - Environment variables
```

---

## 🏗️ Architecture Decisions

### Frontend
- **Framework:** Next.js 16.2.4 (App Router)
- **Styling:** Tailwind CSS 4 (with PostCSS)
- **UI Components:** shadcn/ui + Mantine
- **Icons:** lucide-react
- **Animations:** framer-motion
- **Charts:** recharts (for analytics)

### Backend
- **Runtime:** Node.js (Next.js API routes)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **Payments:** Stripe
- **Email:** Resend (pending)
- **PDFs:** jsPDF
- **QR Codes:** qrcode library

### Data Flow
```
User -> React Component -> Next.js API Route -> Supabase/Stripe -> Response
```

### Authentication
- Supabase handles sign-up/login/sessions
- User type: 'organizer' or 'customer'
- RLS policies enforce data isolation
- Session tokens in HTTP-only cookies

### Payment Flow (TO IMPLEMENT)
```
1. Customer buys ticket
   → POST /api/checkout (create payment intent)
   → Stripe.js handles payment securely
   
2. Payment succeeded
   → Stripe webhook: POST /api/webhooks/stripe
   → Mark ticket as 'paid'
   → Send QR code email
   
3. Organizer receives money
   → Stripe Connect OAuth flow
   → Stripe account linked to organizer
   → GET /api/organizer/earnings shows balance
```

---

## 🔒 Security Guidelines

### Database
- ✅ RLS policies enforced at database level
- ✅ Users see only their own data
- ❌ Input validation incomplete
- ❌ No rate limiting yet

### Authentication
- ✅ Supabase handles password hashing
- ✅ Email verification available
- ❌ 2FA not implemented
- ❌ Session timeout not configured

### Payments
- ⏳ Stripe handles PCI compliance
- ⏳ Never store card details directly
- ⏳ Idempotency keys prevent duplicate charges
- ⏳ Webhook signatures must be verified

### HTTPS/TLS
- ✅ Required in production (for Stripe)
- ❌ Not enforced in development

---

## 📝 Coding Standards

### TypeScript
- ✅ Strict mode enabled
- Use explicit types (avoid `any`)
- Export types for components

### React
- Functional components only
- Hooks for state management
- Use `useCallback` for optimization

### API Routes
- Request/response type safety
- Error handling with proper status codes
- Logging for debugging

### CSS
- Use Tailwind classes
- Responsive design (mobile-first)
- Color palette in tailwind config

### Git
- Commit messages: `type: brief description`
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code cleanup
  - `docs:` documentation
- One feature per commit when possible

---

## 🐛 Debugging

### Stripe Webhooks (Local)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Listen for Stripe events
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test events
stripe trigger payment_intent.succeeded
```

### Supabase Queries
```typescript
// Enable debug logging
const { data, error } = await supabase
  .from('table')
  .select()
  .debug()  // Shows SQL + response
```

### Database Schema
```
Supabase Dashboard > SQL Editor
→ View tables, indexes, policies
→ Run migrations
```

---

## 🚀 Deployment

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Build & Deploy
```bash
# Verify build
npm run build

# Check for errors
npm run lint

# Deploy (use your hosting platform)
# Vercel: Connected to Git, auto-deploys
# Other: Follow platform instructions
```

### Pre-Production Checklist
- [ ] All `.env.local` secrets NOT in git
- [ ] Stripe Live keys configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Email service configured
- [ ] HTTPS/TLS enabled
- [ ] Monitoring setup (errors, payments)

---

## 📚 Key Files Reference

### Database & Auth
- `src/lib/supabase.ts` - Browser client
- `src/lib/supabase-server.ts` - Server client
- `src/lib/database.types.ts` - Auto-generated types
- `src/lib/auth-context.ts` - Auth state management

### Payments (TO CREATE)
- `src/lib/stripe.ts` - Stripe utilities
- `src/app/api/checkout/route.ts` - Checkout API
- `src/app/api/webhooks/stripe/route.ts` - Webhook handler

### UI Components
- `src/components/Sidebar.tsx` - Main navigation
- `src/components/ModuleNav.tsx` - Module navigation
- `src/components/ui/LoginComponent.tsx` - Login form
- `src/components/ui/TicketPurchaseModal.tsx` - Ticket purchase

### API Routes
- `/api/auth/*` - Authentication
- `/api/checkout` - Payment initiation
- `/api/webhooks/stripe` - Stripe events
- `/api/stripe/connect/*` - Organizer connect
- `/api/tickets/*` - Ticket operations
- `/api/organizer/earnings` - Earnings

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```
(Note: No tests configured yet)

### Manual Testing Workflow
1. **Sign up/login:** Create test account
2. **Create event:** Add test event
3. **Purchase ticket:** Use card 4242 4242 4242 4242
4. **Verify webhook:** Check payment in Stripe dashboard
5. **Check email:** Verify QR code received

### Common Test Cards
```
Success:  4242 4242 4242 4242 (any future expiry + CVC)
Decline:  4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155
```

---

## 🗑️ Maintenance

### Weekly
- Check Stripe payment reports
- Review error logs
- Monitor database size

### Monthly
- Update dependencies: `npm update`
- Review security advisories: `npm audit`
- Archive old logs
- Backup database

### Quarterly
- Review unused code (use `analyze-deadcode.sh`)
- Cleanup with `treeshake.sh`
- Performance audit
- Security audit

### Scripts Available
```bash
bash .claude/treeshake.sh      # Remove deprecated files
bash .claude/cleanup.sh        # Clear caches
bash .claude/analyze-deadcode.sh  # Find unused code
```

---

## 📞 Common Issues

### Build fails with TypeScript errors
```bash
# Clear cache and rebuild
npm run clean
npm run build
```

### Stripe webhook not working
```bash
# Check endpoint configuration
# 1. Verify URL in Stripe Dashboard
# 2. Verify STRIPE_WEBHOOK_SECRET is correct
# 3. Check server logs for errors
# 4. Use Stripe CLI: stripe listen --events payment_intent.succeeded
```

### Database connection errors
```bash
# Check .env.local has correct credentials
# Verify Supabase project is active
# Check network connectivity
```

### Component not rendering
```bash
# Check console for errors
# Verify imports are correct
# Check RLS policies allow access
# Verify data exists in database
```

---

## 📖 Documentation

### Read First
1. **SYSTEM_SNAPSHOT.md** - Full system state
2. **COMECE_AQUI.md** - Quick start
3. **ROADMAP_IMPLEMENTACAO.md** - Feature roadmap

### Reference
- **CONFIGURACOES_PRODUCAO.md** - Production setup
- **AGENTS.md** - Development guidelines
- **STRIPE_INTEGRATION.md** - Payment details

### Status
- **STATUS_SPRINT_1.md** - Sprint checklist
- **DECISOES_SPRINT_1.md** - Decision log

---

## 🎓 Learning Resources

### Stripe
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Webhooks Documentation](https://stripe.com/docs/webhooks)

### Supabase
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Updates](https://supabase.com/docs/guides/realtime)

### Next.js
- [App Router Guide](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Deployment](https://nextjs.org/docs/deployment)

### TypeScript
- [React + TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [Next.js Types](https://nextjs.org/docs/basic-features/typescript)

---

## 🔗 Quick Links

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Supabase Console:** https://app.supabase.com
- **GitHub:** (add your repo)
- **Vercel:** (add deployment link)

---

## 📝 Notes for Future Devs

### What Works Well
- RLS policies provide strong data isolation
- Supabase Auth integrates seamlessly
- Component structure is modular

### What Needs Improvement
- Stripe integration incomplete
- No automated tests
- Email service not configured
- Some routes are stubs
- Dark mode not implemented

### Technical Debt
- Input validation incomplete
- Error handling could be more robust
- Some components could be optimized
- Documentation scattered (now consolidated in SYSTEM_SNAPSHOT.md)

### Next Priority
- ✅ Complete Stripe integration (Sprint 1)
- ⏳ Implement customer-facing event browse (mosaico-eventos)
- ⏳ Add email service integration
- ⏳ Build financial analytics dashboard

---

**Version:** 1.0  
**Last Updated:** 2026-05-04  
**Maintained by:** Development Team
