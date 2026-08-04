-- Migration: Add subscriptions table for Stripe billing
-- Run once against your PostgreSQL database

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "stripe_customer_id" varchar(100) UNIQUE,
  "stripe_subscription_id" varchar(100) UNIQUE,
  "stripe_price_id" varchar(100),
  "plan" varchar(20) NOT NULL DEFAULT 'free',
  "status" varchar(20) NOT NULL DEFAULT 'trialing',
  "trial_start" timestamp DEFAULT now(),
  "trial_end" timestamp,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "canceled_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_subscriptions_org_id" ON "subscriptions" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" ("status");
