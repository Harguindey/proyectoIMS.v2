import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { createTestApp, registerOrg } from "./helpers/testApp";

let app: Express;
beforeAll(async () => { app = await createTestApp(); });

describe("Personalización de tema (por cuenta)", () => {
  it("guarda la paleta elegida y la devuelve en /api/auth/user", async () => {
    const { agent } = await registerOrg(app);
    const put = await agent.put("/api/me/theme").send({ theme: "indigo" });
    expect(put.status).toBe(200);
    expect(put.body.theme).toBe("indigo");
    const me = await agent.get("/api/auth/user");
    expect(me.status).toBe(200);
    expect(me.body.user.uiTheme).toBe("indigo");
  });
  it("rechaza un tema no válido con 400", async () => {
    const { agent } = await registerOrg(app);
    const r = await agent.put("/api/me/theme").send({ theme: "arcoiris" });
    expect(r.status).toBe(400);
  });
  it("guarda un tema personalizado con sus colores", async () => {
    const { agent } = await registerOrg(app);
    const put = await agent.put("/api/me/theme").send({ theme: "custom", custom: { primary: "#123456", accent: "#abcdef" } });
    expect(put.status).toBe(200);
    const me = await agent.get("/api/auth/user");
    expect(me.body.user.uiThemeCustom.primary).toBe("#123456");
  });
});
