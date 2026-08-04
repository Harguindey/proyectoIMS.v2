# LogiPro ERP - PRD

## Architecture
- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Express.js + TypeScript + Drizzle ORM + PostgreSQL (50+ tables)
- Emergent: FastAPI proxy (8001) + Node proxy (3000) -> Express (5000)

## Implemented Modules

### ERP (6 modules)
- Facturacion (PDF legal + SII XML + Verifactu XML + QR)
- Compras (OC con workflow)
- Contabilidad (PGC, asientos, ejercicios)
- CRM (Pipeline, deals, actividades)
- RRHH (Empleados, departamentos, contratos)
- Cumplimiento Fiscal (Alertas SII 4 dias, bulk submit, % cumplimiento)

### SGA - Warehouse Management (4 submodules)
- Picking (ordenes con prioridad, progreso, workflow pending->in_progress->completed)
- Packing (embalaje, peso, dimensiones, tracking)
- Recepcion (muelles carga, proveedor, items esperados/recibidos)
- Ubicaciones (54 locations: shelf/dock/staging, pasillo/estanteria/nivel)

### Existing (from SportMax Pro)
- Products, warehouse zones, stock movements, suppliers, customers
- Orders, shipping, POS, analytics, roles, multi-tenant

## Backlog
### P0
- TMS Module: Routes, fleet, GPS tracking
### P1
- Real SII/AEAT API integration with certificates
- Picking item-level tracking (scan individual items)
- Cross-docking workflow
### P2
- Payroll, attendance
- Multi-warehouse support
- Audit trail
