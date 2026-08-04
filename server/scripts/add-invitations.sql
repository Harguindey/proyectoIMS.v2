-- Migration: user_invitations table
-- Run once against your PostgreSQL database

CREATE TABLE IF NOT EXISTS user_invitations (
  id            SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  role_id       INTEGER REFERENCES roles(id),
  token         VARCHAR(128) NOT NULL UNIQUE,
  invited_by    VARCHAR NOT NULL REFERENCES users(id),
  expires_at    TIMESTAMP NOT NULL,
  accepted_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_token        ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_inv_org_email    ON user_invitations(organization_id, email);
