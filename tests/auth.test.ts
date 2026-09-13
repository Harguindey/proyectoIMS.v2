import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, registerOrg } from "./helpers/testApp";

let app: Express;
beforeAll(async () => {
  app = await createTestApp();
});

describe("Autenticación", () => {
  it("registra una organización y un usuario nuevos", async () => {
    const { res } = await registerOrg(app);
    expect(res.status).toBe(201);
    expect(res.body.user.organizationId).toBeTruthy();
    expect(res.body.user.email).toContain("@test.local");
  });

  it("rechaza un email duplicado", async () => {
    const { email } = await registerOrg(app);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "password123", companyName: "Duplicada" });
    expect(res.status).toBe(400);
  });

  it("rechaza una contraseña de menos de 8 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: `short_${Date.now()}@test.local`, password: "123", companyName: "X" });
    expect(res.status).toBe(400);
  });

  it("login con contraseña incorrecta → 401", async () => {
    const { email } = await registerOrg(app);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "contraseña-mala" });
    expect(res.status).toBe(401);
  });

  it("login con credenciales correctas → 200", async () => {
    const { email, password } = await registerOrg(app);
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.organizationId).toBeTruthy();
  });

  it("ruta protegida sin sesión → 401", async () => {
    const res = await request(app).get("/api/auth/user");
    expect(res.status).toBe(401);
  });

  it("ruta protegida con sesión → 200", async () => {
    const { agent } = await registerOrg(app);
    const res = await agent.get("/api/auth/user");
    expect(res.status).toBe(200);
  });
});
