"use client";

import { StripeConnectButton } from "@/components/StripeConnectButton";
import {
  organizerShareLabel,
  platformFeeLabel,
} from "@/lib/platform-fee";
import { CreditCard, Lock, Shield, Split, Wallet } from "lucide-react";

interface StripeConnectPanelProps {
  stripeAccountId: string | null;
  compact?: boolean;
}

/**
 * Painel orientado ao organizador: explica o repasse encapsulado pela plataforma
 * (sem expor chaves secretas Stripe ao cliente).
 */
export function StripeConnectPanel({
  stripeAccountId,
  compact = false,
}: StripeConnectPanelProps) {
  const fee = platformFeeLabel();
  const share = organizerShareLabel();

  if (stripeAccountId) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 md:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white">Recebimentos ativos</h3>
            <p className="text-sm text-white/65 mt-1">
              Sua conta Stripe está vinculada. O valor das vendas é repartido
              automaticamente: você recebe <strong className="text-white">{share}</strong> do
              valor do ingresso; a plataforma retém <strong className="text-white">{fee}</strong>{" "}
              como taxa de serviço — sem você precisar configurar chaves ou variáveis.
            </p>
            <p className="text-xs text-white/45 mt-2 font-mono break-all">
              Conta conectada: {stripeAccountId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4">
        <p className="text-sm text-white/80 mb-3">
          Conecte o Stripe para receber vendas direto na sua conta, com a taxa da
          plataforma já descontada pelo sistema.
        </p>
        <StripeConnectButton stripeAccountId={null} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4 bg-white/5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-ruby" />
          Recebimentos com Stripe
        </h3>
        <p className="text-sm text-white/55 mt-1">
          Um fluxo seguro: você autoriza a conexão uma vez; o Spotlight nunca pede sua{" "}
          <code className="text-white/70">secret key</code> do Stripe.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <ol className="space-y-4 text-sm text-white/75">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ruby/20 text-ruby text-xs font-black">
              1
            </span>
            <div>
              <p className="font-semibold text-white">Clique em conectar</p>
              <p className="text-white/60 mt-0.5">
                Você será levado ao site oficial da Stripe para criar ou vincular sua conta
                de recebimento (cadastro KYC quando necessário).
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ruby/20 text-ruby text-xs font-black">
              2
            </span>
            <div>
              <p className="font-semibold text-white flex items-center gap-2">
                <Split className="h-4 w-4 text-ruby" />
                Repasse automático
              </p>
              <p className="text-white/60 mt-0.5">
                Em cada venda, o cliente paga o ingresso; a plataforma retém{" "}
                <strong className="text-white">{fee}</strong> e o restante (
                <strong className="text-white">{share}</strong>) segue para a sua conta
                Stripe conectada — tudo encapsulado no checkout.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ruby/20 text-ruby text-xs font-black">
              3
            </span>
            <div>
              <p className="font-semibold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                Sem chave por organizador
              </p>
              <p className="text-white/60 mt-0.5">
                Não existe variável de ambiente Stripe por produtor. Só a equipe da
                plataforma configura as chaves no servidor; você só conecta sua conta via
                OAuth.
              </p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-2 rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-white/55">
          <Shield className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
          <span>
            Dúvidas sobre extrato ou saques: use o{" "}
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ruby underline underline-offset-2 hover:text-ruby/90"
            >
              painel Stripe
            </a>{" "}
            da conta que você conectou.
          </span>
        </div>

        <StripeConnectButton stripeAccountId={null} />
      </div>
    </div>
  );
}
