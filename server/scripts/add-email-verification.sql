-- Email verification: add column to users + new tokens table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(128) NOT NULL UNIQUE,
  expires_at    TIMESTAMP NOT NULL,
  used_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evt_token   ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);
