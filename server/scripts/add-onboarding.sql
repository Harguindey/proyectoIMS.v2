-- Migration: add onboarding_completed to organizations
-- Run once against the PostgreSQL database

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Also create user_invitations if not already done
CREATE TABLE IF NOT EXISTS user_invitations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  token VARCHAR(128) NOT NULL UNIQUE,
  invited_by VARCHAR NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_inv_org_email ON user_invitations(organization_id, email);
