import Stripe from "stripe";

// Platform fee is 5% by default
export const PLATFORM_FEE_PERCENT = 5;

export const platformFeeLabel = () => `${PLATFORM_FEE_PERCENT}%`;
export const organizerShareLabel = () => `${100 - PLATFORM_FEE_PERCENT}%`;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não configurada no .env.local");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});
