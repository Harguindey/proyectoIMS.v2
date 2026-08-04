/**
 * stripeService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps all Stripe operations for LogiPro billing.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe CLI or Dashboard)
 *
 * Optional env vars (set after creating products in Stripe Dashboard):
 *   STRIPE_PRICE_STARTER_MONTHLY   — price_...
 *   STRIPE_PRICE_STARTER_YEARLY    — price_...
 *   STRIPE_PRICE_PRO_MONTHLY       — price_...
 *   STRIPE_PRICE_PRO_YEARLY        — price_...
 *   STRIPE_PRICE_ENTERPRISE_MONTHLY— price_...
 *   STRIPE_PRICE_ENTERPRISE_YEARLY — price_...
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";

// Lazy-init: only crash if Stripe is actually called without the key
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your .env file to enable billing."
      );
    }
    _stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
  }
  return _stripe;
}

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    currency: "eur",
    features: [
      "Hasta 3 usuarios",
      "1 almacén",
      "Todos los módulos IMS",
      "Soporte por email",
    ],
    maxUsers: 3,
    maxWarehouses: 1,
  },
  pro: {
    name: "Pro",
    monthlyPrice: 79,
    yearlyPrice: 790,
    currency: "eur",
    features: [
      "Hasta 10 usuarios",
      "3 almacenes",
      "Módulos ERP + SGA completos",
      "SII / Verifactu (España)",
      "Soporte prioritario",
    ],
    maxUsers: 10,
    maxWarehouses: 3,
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    currency: "eur",
    features: [
      "Usuarios ilimitados",
      "Almacenes ilimitados",
      "API pública + webhooks",
      "SSO / SAML",
      "SLA 99.9% + soporte dedicado",
    ],
    maxUsers: -1,
    maxWarehouses: -1,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ── Price ID helpers ──────────────────────────────────────────────────────────
export function getPriceId(plan: PlanKey, interval: "monthly" | "yearly"): string | null {
  const map: Record<string, string | undefined> = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  };
  return map[`${plan}_${interval}`] ?? null;
}

// ── Create or retrieve Stripe Customer ───────────────────────────────────────
export async function getOrCreateCustomer(
  organizationId: number,
  orgName: string,
  email: string
): Promise<string> {
  const stripe = getStripe();
  // Search by metadata in case we lost the customerId
  const existing = await stripe.customers.search({
    query: `metadata['organization_id']:'${organizationId}'`,
    limit: 1,
  });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    name: orgName,
    email,
    metadata: { organization_id: String(organizationId) },
  });
  return customer.id;
}

// ── Create Checkout Session ───────────────────────────────────────────────────
export async function createCheckoutSession(opts: {
  stripeCustomerId: string;
  priceId: string;
  organizationId: number;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: opts.stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: opts.trialDays ?? 14,
      metadata: { organization_id: String(opts.organizationId) },
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });

  return session.url!;
}

// ── Create Customer Portal Session ───────────────────────────────────────────
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ── Verify webhook signature and parse event ──────────────────────────────────
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

// ── Map Stripe subscription status to our internal status ────────────────────
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  const map: Record<Stripe.Subscription.Status, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "paused",
  };
  return map[stripeStatus] ?? stripeStatus;
}

// ── Map Stripe price ID to our plan key ──────────────────────────────────────
export function mapPriceIdToPlan(priceId: string): PlanKey {
  if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY ||
      priceId === process.env.STRIPE_PRICE_STARTER_YEARLY) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
      priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
      priceId === process.env.STRIPE_PRICE_ENTERPRISE_YEARLY) return "enterprise";
  return "starter";
}

export { getStripe };
