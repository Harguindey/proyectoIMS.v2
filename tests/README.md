# Tests

Suite de integración con **Vitest + Supertest**. Arranca la app Express real
(auth + rutas, sin Vite) contra una base de datos PostgreSQL de test.

## ⚠️ Importante

Los tests **borran todas las tablas** de la base de datos apuntada por
`DATABASE_URL` antes de ejecutarse (para que cada corrida sea determinista).
**Nunca** apuntes `DATABASE_URL` a tu base de datos real/producción. Usa
siempre una base de datos de test aparte.

## Cómo ejecutarlos

1. Ten una PostgreSQL disponible y crea una base de datos de test vacía:

   ```bash
   createdb logipro_test
   ```

2. Exporta la conexión de test y un secreto de sesión:

   ```bash
   export DATABASE_URL="postgresql://usuario:password@localhost:5432/logipro_test"
   export SESSION_SECRET="cualquier_cadena_de_32_caracteres_o_mas_000"
   ```

3. Aplica el esquema a la base de datos de test:

   ```bash
   npm run db:push
   ```

4. Ejecuta la suite:

   ```bash
   npm test
   ```

## Qué cubre

- **auth.test.ts** — registro, email duplicado, contraseña corta, login
  correcto/incorrecto y protección de rutas por sesión.
- **tenant-isolation.test.ts** — una organización no puede ver ni modificar
  los datos de otra (aislamiento multi-tenant).
- **erp-employees.test.ts** — alta de empleado con campos vacíos (201),
  código duplicado (409) y campo obligatorio ausente (400). Regresión del
  error 500 al crear empleados.
- **pos.test.ts** — una venta del TPV descuenta stock (201) y una venta con
  stock insuficiente se rechaza sin descontar (409).

## Integración continua (opcional)

En GitHub Actions puedes levantar Postgres como *service* y ejecutar
`npm run db:push && npm test` con `DATABASE_URL` apuntando a ese service.
