import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { createTestApp, registerOrg } from "./helpers/testApp";

let app: Express;
beforeAll(async () => {
  app = await createTestApp();
});

describe("ERP · alta de empleados (regresión del error 500)", () => {
  it("crea un empleado con campos de fecha/número vacíos → 201", async () => {
    const { agent, id } = await registerOrg(app);
    const res = await agent.post("/api/erp/employees").send({
      employeeCode: `E-${id}`,
      firstName: "Ana",
      lastName: "García",
      email: "",
      departmentId: "", // número vacío
      startDate: "", // fecha vacía
      endDate: "",
      salary: "", // número vacío
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.startDate).toBeNull();
  });

  it("rechaza un código de empleado duplicado → 409", async () => {
    const { agent, id } = await registerOrg(app);
    const code = `E-DUP-${id}`;
    const first = await agent
      .post("/api/erp/employees")
      .send({ employeeCode: code, firstName: "Uno", lastName: "X" });
    expect(first.status).toBe(201);

    const dup = await agent
      .post("/api/erp/employees")
      .send({ employeeCode: code, firstName: "Dos", lastName: "Y" });
    expect(dup.status).toBe(409);
  });

  it("rechaza un empleado sin código obligatorio → 400", async () => {
    const { agent } = await registerOrg(app);
    const res = await agent
      .post("/api/erp/employees")
      .send({ firstName: "Sin", lastName: "Codigo", employeeCode: "" });
    expect(res.status).toBe(400);
  });
});
