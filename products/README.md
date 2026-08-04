# Productos — Cómo funciona el sistema multi-producto

Este directorio contiene las definiciones de cada producto independiente
que puedes ofrecer por separado. Todos comparten exactamente el mismo código,
estética y base de datos. Lo único que cambia es **qué módulos se muestran**
y el **color de marca**.

---

## Los 5 productos disponibles

| Producto | Variable | Color | Módulos principales |
|---|---|---|---|
| **StockPro** | `VITE_PRODUCT=stock-pro` | 🔵 Azul | Inventario, Almacén, Movimientos, Analíticas |
| **CompraPro** | `VITE_PRODUCT=compras-pro` | 🟣 Morado | Proveedores, Aprovisionamiento, Facturas de compra |
| **VentasPro** | `VITE_PRODUCT=ventas-pro` | 🟢 Verde | TPV, Clientes, Pedidos, Reservas, CRM |
| **LogiPro** | `VITE_PRODUCT=logi-pro` | 🟠 Naranja | SGA, Picking/Packing, Envíos, Transportistas |
| **ERPSuite** | `VITE_PRODUCT=erp-suite` | 🔷 Índigo | Contabilidad, RRHH, Fiscal, CRM, Facturación |
| **Suite Completa** | *(sin variable)* | Azul+Verde | Todo lo anterior junto |

---

## Cómo arrancar un producto

```bash
# Desde la raíz del proyecto

# 1. Copia el .env del producto que quieres activar
cp products/stock-pro/.env.example .env

# 2. Edita .env con tus credenciales reales (DATABASE_URL, etc.)

# 3. Arranca la app
npm run dev
```

La app se mostrará con el nombre, color y módulos del producto seleccionado.
El resto de rutas quedan bloqueadas (muestran 404).

---

## Cómo desplegar cada producto de forma independiente

Cada producto es el mismo código desplegado con una variable de entorno distinta.
En Vercel / Railway / cualquier PaaS, crea un proyecto por producto y pon:

```
VITE_PRODUCT=stock-pro        # para StockPro
VITE_PRODUCT=compras-pro      # para CompraPro
VITE_PRODUCT=ventas-pro       # para VentasPro
VITE_PRODUCT=logi-pro         # para LogiPro
VITE_PRODUCT=erp-suite        # para ERPSuite
```

Todos pueden apuntar a la misma base de datos PostgreSQL. El multi-tenant
se maneja a nivel de usuario/organización en la propia app.

---

## Cómo añadir un nuevo producto

1. Crea una carpeta en `products/mi-nuevo-producto/`
2. Añade `config.ts`, `.env.example` y `README.md`
3. Registra el producto en `products/_shared/product-registry.ts`:
   - Añade el `ProductId` al type
   - Define el `ProductConfig` completo
   - Añégalo al `PRODUCT_REGISTRY`

No necesitas tocar nada del código principal (`client/src/`, `server/`).

---

## Estructura de carpetas

```
products/
  _shared/
    product-types.ts       ← Tipos TypeScript
    product-registry.ts    ← Definición de todos los productos
  stock-pro/
    config.ts
    .env.example
    README.md
  compras-pro/
    config.ts
    .env.example
    README.md
  ventas-pro/
    config.ts
    .env.example
    README.md
  logi-pro/
    config.ts
    .env.example
    README.md
  erp-suite/
    config.ts
    .env.example
    README.md
```
