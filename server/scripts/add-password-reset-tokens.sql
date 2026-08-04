-- Migration: Add password_reset_tokens table
-- Run this once against your PostgreSQL database

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" varchar(128) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_prt_token" ON "password_reset_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_prt_user_id" ON "password_reset_tokens" ("user_id");
