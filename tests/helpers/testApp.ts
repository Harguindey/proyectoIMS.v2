import express, { type Express } from "express";
import request from "supertest";

/**
 * Construye la app Express real (auth + todas las rutas) sin Vite ni servidor
 * de estáticos, para usarla con Supertest.
 */
export async function createTestApp(): Promise<Express> {
  const { registerRoutes } = await import("../../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app); // monta sesiones, passport y todas las rutas /api
  return app;
}

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now().toString(36)}${counter}`;
}

/**
 * Registra una organización + usuario admin nuevos y devuelve un agente
 * Supertest con la sesión ya iniciada (cookies persistidas).
 */
export async function registerOrg(
  app: Express,
  overrides: Record<string, any> = {},
) {
  const id = unique();
  const email = overrides.email ?? `user_${id}@test.local`;
  const password = overrides.password ?? "password123";
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({
    email,
    password,
    firstName: "Test",
    lastName: "User",
    companyName: `Org ${id}`,
    country: "Spain",
    ...overrides,
  });
  const organizationId = res.body?.user?.organizationId;
  return { agent, res, email, password, organizationId, id };
}
