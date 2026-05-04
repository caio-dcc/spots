/** Taxa da plataforma sobre o valor bruto do ingresso (alinhado ao Stripe application_fee). */
export const PLATFORM_FEE_PERCENT = 0.05;

export function platformFeeLabel(): string {
  return `${Math.round(PLATFORM_FEE_PERCENT * 100)}%`;
}

export function organizerShareLabel(): string {
  return `${Math.round((1 - PLATFORM_FEE_PERCENT) * 100)}%`;
}
