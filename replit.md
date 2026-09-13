# LogiPro — Contexto y Arquitectura

> Este archivo describe la arquitectura y las convenciones del proyecto. Nació como memoria del agente de Replit; se puede renombrar a `ARCHITECTURE.md` con `git mv replit.md ARCHITECTURE.md` (solo lo enlaza el README, ninguna parte del código depende de él).

## Overview

LogiPro es un SaaS **multi-tenant** de gestión de inventario, almacén y operaciones para pymes. Un mismo despliegue sirve a múltiples organizaciones (tenants); cada organización tiene sus propios productos, clientes, pedidos, usuarios y configuración, aislados entre sí.

El producto cubre el ciclo completo de una operación logística/comercial: inventario y almacén (SGA), pedidos y clientes, punto de venta (TPV), aprovisionamiento, envíos y devoluciones, módulos de ERP (contabilidad, CRM, RRHH, facturación) y cumplimiento fiscal español (SII / Verifactu). Soporta un modelo de fulfillment híbrido que combina stock propio en almacén con dropshipping desde proveedores.

Estado actual: MVP en desarrollo activo.

## User Preferences

- Estilo de comunicación: lenguaje sencillo y directo.
- Idioma: **español** — toda la comunicación, sugerencias y explicaciones técnicas en español.

## System Architecture

### Core Technologies

- **Frontend:** React 18 + TypeScript, Vite, Wouter (routing), TanStack Query (estado de servidor).
- **Backend:** Express + TypeScript.
- **Base de datos:** PostgreSQL con Drizzle ORM.
- **Estilos:** Tailwind CSS con shadcn/ui (Radix) y Lucide Icons.

### Architectural Patterns

- **Monorepo:** frontend (`client/`), backend (`server/`) y código compartido (`shared/`) en un solo repositorio.
- **Multi-tenancy por columna:** cada tabla de negocio lleva `organizationId` con FK a `organizations` y `onDelete: cascade`; los índices y unique constraints son compuestos por organización (p. ej. `(organizationId, sku)`). El aislamiento entre tenants se valida además en `server/multi-tenant-guards.ts`.
- **API REST:** Express con middleware de logging, rate limiting y manejo de errores centralizado.
- **RBAC:** roles (`admin`, `supervisor`, `operador`, `viewer`) y permisos granulares por módulo/acción, sembrados en `server/init-security.ts`.
- **Type-safe end to end:** TypeScript en todo el stack; los esquemas de validación se derivan del esquema de BD con `drizzle-zod` + Zod.
- **Sincronización de estado:** TanStack Query en el cliente para consistencia de datos.

### Módulos principales

- **Inventario:** productos con SKU, categorías, stock mín/máx, punto de reorden, stock de seguridad; entrada rápida y búsqueda.
- **Almacén (SGA):** zonas con capacidad/ocupación, mapa de almacén, movimientos de stock (entrada/salida/transferencia).
- **Clientes y pedidos:** clientes con direcciones, pedidos con estados, reservas de producto, hojas de preparación en PDF.
- **TPV:** ventas en tienda con descuento de stock en tiempo real; fulfillment stock + dropshipping.
- **Aprovisionamiento:** proveedores con lead times, planes de compra y reposición.
- **Envíos:** agencias de transporte, tarifas por zona/peso, tracking y devoluciones.
- **ERP:** contabilidad, CRM, RRHH, facturas, compras y cumplimiento fiscal (SII / Verifactu).
- **Analítica:** dashboard, clasificación ABC, velocidad de venta, puntos de reorden dinámicos.
- **Administración:** organizaciones, usuarios, invitaciones, roles/permisos, emails autorizados, facturación Stripe.

### Autenticación

Email/contraseña con Passport local (bcrypt, cost 12), con OAuth opcional de Google y Microsoft, y OIDC de Replit opcional (activable con `USE_REPLIT_AUTH`). Incluye verificación de email, reset de contraseña e invitaciones de usuario por organización. Sesiones persistidas en PostgreSQL.

## External Dependencies

### UI/UX
- **shadcn/ui** (sobre Radix UI), **Tailwind CSS**, **Lucide Icons**, **Recharts** (gráficas), **jsPDF** (documentos).

### Datos
- **Drizzle ORM** (PostgreSQL), **TanStack Query**, **React Hook Form**, **Zod**.

### Servicios
- **Stripe:** suscripciones y facturación.
- **Resend:** email transaccional.
- **OpenAI (GPT-3.5-turbo):** expansión de consultas de búsqueda (opcional; hay fallback local y búsqueda directa).

### Herramientas de desarrollo
- **Vite**, **TypeScript**, **esbuild** (build del servidor), **tsx** (dev), **drizzle-kit** (migraciones).

## Notas de mantenimiento

- El repositorio arrastra restos de migraciones anteriores pendientes de eliminar: `backend/` (Python), `frontend/`, `.emergent/`, capturas `.png` en la raíz y páginas duplicadas (`dashboard-old.tsx`, `products-new.tsx`). No forman parte de la app en ejecución.
- No hay tests automatizados en el código TypeScript todavía; es la principal deuda técnica a cubrir.
