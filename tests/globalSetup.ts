/**
 * Setup global de la suite (se ejecuta una vez antes de todos los tests).
 * - Asegura las variables de entorno mínimas.
 * - Deja la base de datos de test limpia.
 * - Siembra roles, permisos y datos de seguridad (initializeSecurity).
 *
 * Requisito previo: el esquema debe estar aplicado en la BD de test
 * (`DATABASE_URL`) con `drizzle-kit push`. Ver README de tests.
 */
export async function setup() {
  process.env.DATABASE_URL ||= "postgresql://postgres@localhost:5433/logipro_vitest";
  process.env.SESSION_SECRET ||= "test_secret_at_least_32_characters_long_000";
  process.env.NODE_ENV ||= "test";

  const { pool } = await import("../server/db");

  // Limpiar todas las tablas para una corrida determinista.
  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  if (rows.length > 0) {
    const names = rows.map((r: any) => `"${r.tablename}"`).join(", ");
    await pool.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
  }

  // Sembrar roles/permisos/admin (necesario para registro y hasPermission).
  const { initializeSecurity } = await import("../server/init-security");
  await initializeSecurity();
}
