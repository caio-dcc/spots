import Stripe from "stripe";
import { PLATFORM_FEE_PERCENT } from "./platform-fee";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não configurada no .env.local");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export { PLATFORM_FEE_PERCENT };
