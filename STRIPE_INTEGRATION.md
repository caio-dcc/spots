# Integração Stripe - Spotlight

## 1. Setup Inicial Spotlight

### 1.1 Obter suas chaves Stripe
1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vá para **Developers → API Keys**
3. Copie suas chaves:
   - **Publishable Key** (começa com `pk_live_` ou `pk_test_`)
   - **Secret Key** (começa com `sk_live_` ou `sk_test_`)

### 1.2 Configurar variáveis de ambiente
Crie/atualize `.env.local`:

```env
# Stripe - Conta Spotlight (para receber as taxas)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_seu_publishable_key
STRIPE_SECRET_KEY=sk_live_seu_secret_key
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

# Stripe Connect (para pagamentos dos organizadores)
STRIPE_CONNECT_CLIENT_ID=ca_seu_connect_client_id
```

### 1.3 Obter Client ID do Stripe Connect
1. Em [dashboard.stripe.com](https://dashboard.stripe.com), vá para **Settings → Connect Settings**
2. Copie o **Client ID** (usa este para OAuth)
3. Configure **Redirect URI**: `https://seu-dominio.com/api/stripe/connect/callback`

---

## 2. Fluxo de Autenticação Stripe Connect para Organizadores

### 2.1 Estrutura do banco (já criada)
```sql
-- Adicionar campos na tabela profiles se não existirem:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_status TEXT; -- 'pending', 'active', 'restricted'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_link TEXT;
```

### 2.2 Criar endpoint de autenticação Stripe Connect
Arquivo: `src/app/api/stripe/connect/authorize/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`;

  const stripeAuthUrl = new URL('https://connect.stripe.com/oauth/authorize');
  stripeAuthUrl.searchParams.append('client_id', process.env.STRIPE_CONNECT_CLIENT_ID!);
  stripeAuthUrl.searchParams.append('state', 'random-state-123'); // Use crypto.randomUUID()
  stripeAuthUrl.searchParams.append('stripe_user[email]', 'user@example.com');
  stripeAuthUrl.searchParams.append('stripe_user[url]', 'https://seu-site.com');
  stripeAuthUrl.searchParams.append('redirect_uri', redirectUri);
  stripeAuthUrl.searchParams.append('scope', 'read_write');

  return NextResponse.redirect(stripeAuthUrl.toString());
}
```

### 2.3 Callback endpoint
Arquivo: `src/app/api/stripe/connect/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authorizationCode = searchParams.get('code');
  const { data: { session } } = await supabase.auth.getSession();

  if (!authorizationCode || !session?.user.id) {
    return NextResponse.redirect('/dashboard?error=invalid_auth');
  }

  try {
    // Trocar authorization code por access token
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code: authorizationCode,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await response.json();

    if (!data.stripe_user_id) {
      throw new Error('Stripe authentication failed');
    }

    // Salvar account ID no banco
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_account_id: data.stripe_user_id,
        stripe_account_status: 'active',
      })
      .eq('id', session.user.id);

    if (error) throw error;

    return NextResponse.redirect('/dashboard?success=stripe_connected');
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.redirect('/dashboard?error=stripe_failed');
  }
}
```

---

## 3. Processar Pagamentos com Split (Seu Recebimento + Organizador)

### 3.1 Criar endpoint de checkout
Arquivo: `src/app/api/checkout/route.ts` (modificado)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { eventId, email, quantity, amount, organizerId } = body;

  try {
    // 1. Buscar conta Stripe do organizador
    const { data: organizer } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', organizerId)
      .single();

    if (!organizer?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Organizador não conectado ao Stripe' },
        { status: 400 }
      );
    }

    // 2. Calcular taxa progressiva
    const getTaxRate = (total: number) => {
      if (total <= 10000) return 0.05; // 5%
      if (total <= 50000) return 0.04; // 4%
      return 0.03; // 3%
    };

    const taxRate = getTaxRate(amount);
    const spotlightFee = Math.round(amount * taxRate * 100); // Em centavos
    const organizerAmount = Math.round((amount * 100) - spotlightFee);

    // 3. Criar payment intent com application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Total em centavos
      currency: 'brl',
      stripe_account: organizer.stripe_account_id,
      application_fee_amount: spotlightFee, // Taxa Spotlight
      metadata: {
        event_id: eventId,
        customer_email: email,
        quantity: quantity.toString(),
        organizer_id: organizerId,
      },
      statement_descriptor: 'SPOTLIGHT INGRESSO',
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de pagamento' },
      { status: 500 }
    );
  }
}
```

---

## 4. Webhook para Confirmação de Pagamento

### 4.1 Endpoint webhook
Arquivo: `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Atualizar status do pedido para 'paid'
        const { error } = await supabase
          .from('ticket_orders')
          .update({
            status: 'paid',
            payment_intent: paymentIntent.id,
            paid_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', paymentIntent.id);

        if (error) throw error;

        // Log na auditoria
        await supabase.from('audit_logs').insert({
          user_id: paymentIntent.metadata?.organizer_id,
          action: 'PAYMENT_RECEIVED',
          entity_type: 'payment',
          entity_id: paymentIntent.id,
          before_value: null,
          after_value: {
            amount: paymentIntent.amount / 100,
            organizer_id: paymentIntent.metadata?.organizer_id,
          },
        });

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        
        await supabase
          .from('ticket_orders')
          .update({ status: 'refunded' })
          .eq('stripe_session_id', charge.payment_intent as string);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 400 });
  }
}
```

---

## 5. Dashboard para Organizadores Ver Ganhos

### 5.1 Endpoint de relatório financeiro
Arquivo: `src/app/api/organizer/earnings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Buscar todos os pedidos pagos
    const { data: orders } = await supabase
      .from('ticket_orders')
      .select('total_amount, platform_fee, event_id, paid_at')
      .eq('organizer_id', session.user.id)
      .eq('status', 'paid');

    // 2. Buscar account Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', session.user.id)
      .single();

    // 3. Pegar saldo disponível do Stripe Connect
    let availableBalance = 0;
    if (profile?.stripe_account_id) {
      const account = await stripe.accounts.retrieve(
        profile.stripe_account_id as string
      );
      availableBalance = account.balance?.available[0]?.amount || 0;
    }

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const totalFees = orders?.reduce((sum, o) => sum + (o.platform_fee || 0), 0) || 0;

    return NextResponse.json({
      total_revenue: totalRevenue / 100,
      total_fees: totalFees / 100,
      net_earnings: (totalRevenue - totalFees) / 100,
      available_balance: availableBalance / 100,
      pending_balance: (totalRevenue - totalFees - availableBalance) / 100,
    });
  } catch (error) {
    console.error('Earnings error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
  }
}
```

---

## 6. Fluxo Completo de Cliente Pagando

```
1. Cliente faz login → /login
2. Escolhe evento → /mosaico-eventos
3. Clica "Comprar Ingresso" → TicketPurchaseModal
4. Modal chama /api/checkout
5. Webhook recebe payment_intent.succeeded
6. Status do ticket muda para 'paid'
7. QR code enviado por email
8. Cliente vê ingresso em /meus-pedidos
```

---

## 7. Fluxo Completo de Organizador Recebendo

```
1. Organizador faz login → /house/login (registro)
2. Vai para /dashboard
3. Clica "Conectar ao Stripe"
4. OAuth → Stripe autoriza
5. Callback salva stripe_account_id no banco
6. Clientes pagam → Money entra na conta Stripe do organizador
7. Spotlight recebe taxa automaticamente
8. Organizador vê ganhos em /dashboard/financeiro
```

---

## 8. Checklist de Configuração

- [ ] Ter conta Stripe ativa (live ou test)
- [ ] Copiar Publishable Key e Secret Key
- [ ] Adicionar ao `.env.local`
- [ ] Criar endpoints: `/api/checkout`, `/api/stripe/connect/*`, `/api/webhooks/stripe`
- [ ] Testar com Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Usar cartão de teste: `4242 4242 4242 4242` (exp: 12/34, cvc: 123)
- [ ] Migrar para producão quando pronto
- [ ] Configurar CORS/Security nas rotas de API

---

## 9. Testes Locais com Stripe CLI

```bash
# Instalar Stripe CLI
# Fazer login
stripe login

# Escutar webhooks locais
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger manual de webhook
stripe trigger payment_intent.succeeded
```

---

## 10. Valores de Teste

**Cartões para teste (modo test):**
- ✅ Sucesso: `4242 4242 4242 4242`
- ❌ Falha: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**Valores de teste:**
- R$ 10 = 1000 centavos
- Taxa 5% em R$ 10 = R$ 0,50

