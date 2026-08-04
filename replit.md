# TireMax Pro - Sistema de Gestión de Inventario

## Overview
TireMax Pro es un sistema completo de gestión de inventario especializado en la importación y distribución de llantas custom para automóviles desde China. El sistema optimiza el control de inventario, gestión de almacén, aprovisionamiento internacional, procesamiento de pedidos, reservas de productos y análisis logístico. Está diseñado para importadores de llantas personalizadas con múltiples variantes de productos y gestión de proveedores internacionales con largos tiempos de entrega.

El modelo de negocio se centra en la importación directa desde fabricantes chinos, ofreciendo llantas de aleación deportiva con diseños exclusivos y acabados premium, distribuidas en cinco categorías principales. El sistema soporta un catálogo de 810 productos activos con múltiples combinaciones de estilo, medida y acabado.

TireMax Pro implementa un modelo de fulfillment dual que combina inventario tradicional en almacén con dropshipping directo desde proveedores chinos, optimizando costos y manteniendo una amplia disponibilidad de catálogo.

## User Preferences
Preferred communication style: Simple, everyday language.
Preferred language: Spanish - all communication should be in Spanish, including suggestions and technical explanations.

## System Architecture

### Core Technologies
- **Frontend**: React con TypeScript, Vite, Wouter, TanStack Query.
- **Backend**: Express.js con TypeScript.
- **Database**: PostgreSQL con Drizzle ORM.
- **Styling**: Tailwind CSS con shadcn/ui y Lucide Icons.

### Architectural Patterns
- **Monorepo Structure**: Frontend y backend en un solo repositorio.
- **RESTful API**: Backend con API clara y middleware para logging y manejo de errores.
- **Component-Based UI**: Componentes React reutilizables.
- **Type-Safe Development**: TypeScript en todo el stack.
- **Data Validation**: React Hook Form con Zod.
- **Real-time Synchronization**: Gestión de estado optimizada con TanStack Query para consistencia de datos.

### Key Features
- **Gestión de Inventario**: Control de stock, movimientos, entrada rápida y categorización de 810 llantas custom con SKUs autogenerados.
- **Punto de Venta (TPV)**: Sistema completo para transacciones en tienda con gestión de stock en tiempo real.
- **Warehouse Management**: Gestión integral de zonas de almacén (8 zonas preconfiguradas) y movimientos de stock, optimizado para llantas.
- **International Procurement**: Gestión de proveedores chinos, planificación de aprovisionamiento con lead times de 35-50 días y seguimiento de contenedores.
- **Customer & Orders**: Gestión de clientes, procesamiento de pedidos con numeración personalizada y sistema de reservas.
- **Advanced Analytics**: Dashboard interactivo, simulación de datos históricos, Sales Velocity Analysis, ABC Classification y Dynamic Reorder Points.
- **Intelligent Search**: Sistema de búsqueda global de tres niveles (expansión semántica local, expansión AI y búsqueda directa) optimizado para llantas.
- **Alerts System**: Notificaciones en tiempo real para bajo stock, capacidad de zona y movimientos inusuales.
- **Dropshipping Híbrido**: Modelo que combina inventario físico y dropshipping directo desde China para productos premium o de baja rotación. Incluye lógica de negocio para identificar productos dropshipping, tablas de base de datos (`products`, `customer_addresses`, `sales`, `sale_items`, `procurement_plans`) y lógica de backend para validación de stock diferencial y creación automática de planes de aprovisionamiento.
- **UI/UX Design**: Interfaz modernizada, navegación mejorada y optimizaciones móviles (WCAG 2.1 Level AAA).
- **Tire-Specific Features**: Gestión multi-variante de productos (estilo, tamaño, acabado), seguimiento de lead times de importación, gestión de contenedores y proveedores chinos, y procesamiento de pedidos personalizados.

## External Dependencies

### UI/UX Libraries
- **shadcn/ui**: Librería de componentes basada en Radix UI.
- **Tailwind CSS**: Framework CSS utility-first.
- **Lucide Icons**: Librería de íconos.

### Data Management
- **Drizzle ORM**: ORM de TypeScript para PostgreSQL.
- **TanStack Query**: Gestión de estado del servidor y sincronización de datos.
- **React Hook Form**: Gestión de formularios con validación.
- **Zod**: Librería de validación de esquemas.

### Development Tools
- **Vite**: Herramienta de construcción rápida.
- **TypeScript**: Superset de JavaScript para seguridad de tipos.
- **OpenAI GPT-3.5-turbo**: Utilizado para expansión de consultas de búsqueda impulsada por IA.