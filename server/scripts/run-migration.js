#!/usr/bin/env node
/**
 * run-migration.js
 * Ejecutar desde la raíz del proyecto:
 *   node server/scripts/run-migration.js
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no encontrada en .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const MIGRATION = `
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

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
`;

const client = await pool.connect();
try {
  console.log("🔄 Ejecutando migración...");
  await client.query(MIGRATION);
  console.log("✅ Migración completada:");
  console.log("   • organizations.onboarding_completed — añadida");
  console.log("   • user_invitations — creada");
  console.log("   • idx_inv_token, idx_inv_org_email — creados");
} catch (err) {
  console.error("❌ Error en migración:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
