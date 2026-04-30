import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "./env";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const env = getServerEnv();
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "TerraFlow",
      version: "0.1.0",
    },
  });
  return _stripe;
}

export function platformFeeBps(): number {
  return getServerEnv().STRIPE_PLATFORM_FEE_BPS;
}

export function calculatePlatformFee(amountCents: number): number {
  const bps = platformFeeBps();
  if (bps <= 0) return 0;
  return Math.floor((amountCents * bps) / 10_000);
}
