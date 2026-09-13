# LogiPro

SaaS multi-tenant de gestión de inventario, almacén y operaciones para pymes. Combina control de stock, gestión de almacén (SGA), módulos de ERP, punto de venta (TPV), aprovisionamiento, envíos y facturación electrónica española en una sola aplicación.

> **Estado del proyecto:** MVP en desarrollo activo. La base (multi-tenancy, RBAC, esquema de datos) es sólida; la cobertura de tests y el pulido de algunas integraciones siguen en curso. No usar en producción con datos reales sin una revisión de seguridad previa.

## Qué hace

LogiPro está organizado por módulos. Cada dato pertenece a una **organización** (tenant), y el acceso se controla por roles y permisos.

- **Inventario** — CRUD de productos con SKU autogenerado, categorías, stock mínimo/máximo, punto de reorden y stock de seguridad.
- **Almacén (SGA)** — zonas con capacidad y ocupación, mapa de almacén, movimientos de stock (entrada / salida / transferencia).
- **Pedidos y clientes** — clientes con direcciones, pedidos con estados (pendiente → preparando → enviado → entregado), reservas de producto y hojas de preparación en PDF.
- **TPV / Punto de venta** — ventas en tienda con descuento de stock en tiempo real y modelo de fulfillment híbrido (stock propio + dropshipping).
- **Aprovisionamiento** — proveedores con lead times, planes de compra y reposición.
- **Envíos** — agencias de transporte, tarifas por zona/peso, tracking de envíos y devoluciones.
- **ERP** — contabilidad, CRM, RRHH, facturas, compras y **cumplimiento fiscal español (SII / Verifactu)**.
- **Analítica** — dashboard, clasificación ABC, análisis de velocidad de venta y puntos de reorden dinámicos.
- **Administración** — organizaciones, usuarios, invitaciones por email, roles y permisos, emails autorizados, facturación con Stripe.

## Stack

**Frontend:** React 18 + TypeScript, Vite, Wouter (routing), TanStack Query (estado de servidor), Tailwind CSS + shadcn/ui (Radix), Recharts (gráficas), jsPDF (documentos).

**Backend:** Express + TypeScript, Drizzle ORM sobre PostgreSQL, validación con Zod (drizzle-zod), sesiones en PostgreSQL (`connect-pg-simple`).

**Autenticación:** email/contraseña (Passport local, bcrypt), OAuth opcional con Google y Microsoft, y OIDC de Replit opcional (`USE_REPLIT_AUTH`). Verificación de email y reset de contraseña incluidos.

**Integraciones:** Stripe (suscripciones), Resend (email transaccional), OpenAI (expansión de búsqueda, opcional).

**Seguridad de base:** Helmet, rate limiting diferenciado (login vs API general), bcrypt (cost 12), guards de aislamiento multi-tenant.

## Estructura

```
LogiPro/
├── client/          # Frontend React (Vite)
│   └── src/
│       ├── components/   # Componentes y modales
│       ├── pages/        # Páginas (dashboard, inventario, erp/, sga/, admin/…)
│       ├── hooks/        # Custom hooks
│       └── lib/          # Utilidades y cliente de queries
├── server/          # Backend Express
│   ├── index.ts          # Arranque, middleware, seguridad
│   ├── routes.ts         # Rutas principales de la API
│   ├── erp-routes.ts     # Rutas del módulo ERP
│   ├── sga-routes.ts     # Rutas del módulo de almacén
│   ├── storage.ts        # Capa de acceso a datos
│   ├── replitAuth.ts     # Setup de auth (local + OAuth + OIDC)
│   ├── init-security.ts  # Seed de roles, permisos y admin
│   ├── multi-tenant-guards.ts  # Validación de aislamiento por organización
│   └── services/         # email, stripe, export, import, IA, analítica, SII
├── shared/          # Código compartido cliente/servidor
│   ├── schema.ts         # Esquema Drizzle principal (multi-tenant)
│   ├── erp-schema.ts     # Esquema del ERP
│   └── sga-schema.ts     # Esquema del almacén
├── drizzle.config.ts
├── docker-compose.yml
└── Dockerfile
```

> **Nota de limpieza:** el repo aún arrastra restos de migraciones anteriores (`backend/` en Python, `frontend/`, `.emergent/`, capturas `.png` en la raíz, páginas duplicadas como `dashboard-old.tsx` / `products-new.tsx`). No forman parte de la app en ejecución y están pendientes de eliminar.

## Puesta en marcha (local)

**Requisitos:** Node.js 20+, PostgreSQL 14+.

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Editar `.env`. Las mínimas para arrancar en desarrollo son `DATABASE_URL`, `SESSION_SECRET`, `PORT` y `NODE_ENV`. El resto (Resend, Stripe, OAuth) habilitan módulos concretos y son opcionales en local.

3. Aplicar el esquema a la base de datos:

   ```bash
   npm run db:push
   ```

4. Arrancar en desarrollo:

   ```bash
   npm run dev
   ```

   La app queda en `http://localhost:5000` (API + cliente servidos juntos).

## Scripts

```bash
npm run dev        # Servidor de desarrollo (tsx)
npm run build      # Build de cliente (Vite) + servidor (esbuild)
npm run start      # Servidor de producción (dist/index.js)
npm run check      # Comprobación de tipos (tsc)
npm run db:push    # Aplica el esquema Drizzle a la BD
```

## Variables de entorno

Ver `.env.example` para la lista completa y comentada. Resumen:

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | Sí |
| `SESSION_SECRET` | Firma de sesiones (≥32 chars en prod) | Sí |
| `PORT` / `NODE_ENV` | Servidor | Sí |
| `RESEND_API_KEY` / `FROM_EMAIL` / `APP_URL` | Email transaccional | Para emails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `VITE_STRIPE_PUBLIC_KEY` | Facturación | Para billing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google | Para OAuth Google |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Login con Microsoft | Para OAuth Microsoft |
| `OPENAI_API_KEY` | Expansión de búsqueda con IA | Opcional |

## Despliegue

Incluye `Dockerfile` (multi-stage, usuario no-root, healthcheck en `/api/health`) y `docker-compose.yml` (app + PostgreSQL). Con las variables de entorno configuradas:

```bash
docker compose up --build
```

Ver `DEPLOYMENT.md` para el detalle. La arquitectura y las decisiones técnicas están en `replit.md` (pendiente de renombrar a `ARCHITECTURE.md`).

## Licencia

Proyecto privado. Todos los derechos reservados.
