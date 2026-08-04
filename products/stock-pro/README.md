# StockPro — Gestión de Stock e Inventario

**Producto independiente** extraído de la Suite LogiPro.

## Qué incluye

| Módulo | Ruta |
|---|---|
| Dashboard | `/` |
| Mapa del Almacén | `/warehouse-map` |
| Productos | `/products` |
| Gestión de Inventario | `/inventory-management` |
| Entrada Rápida (scanner) | `/quick-scan` |
| Importar Datos | `/data-import` |
| Movimientos | `/movements` |
| Reportes | `/reports` |
| Análisis de Inventario | `/inventory-analytics` |
| Configuración / Equipo / Facturación | `/settings` `/team` `/billing` |

## Cómo arrancar

```bash
# 1. Desde la raíz del proyecto, copia el .env de este producto
cp products/stock-pro/.env.example .env

# 2. Añade tus variables de entorno reales (DATABASE_URL, etc.)

# 3. Arranca normalmente
npm run dev
```

## Color de marca

- Primario: Azul `hsl(217, 84%, 56%)` — mismo que la suite completa
- Ideal para empresas de distribución, almacenamiento y logística ligera

## Despliegue independiente

Puedes desplegar StockPro como un microservicio independiente apuntando
a la misma base de datos. Solo necesitas el fichero `.env` correcto con
`VITE_PRODUCT=stock-pro` en el entorno de build.
