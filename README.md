# SportMax Pro - Sistema de Gestión de Inventario

Sistema completo de gestión de inventario para empresas deportivas desarrollado con React, Express.js y PostgreSQL.

## 📋 Descripción

SportMax Pro es una aplicación web completa para la gestión de inventario de productos deportivos que incluye:

- 📦 **Gestión de Productos**: CRUD completo con categorías, proveedores y zonas de almacén
- 🏢 **Gestión de Clientes**: Base de datos de clientes con historial de pedidos
- 📋 **Gestión de Pedidos**: Creación, seguimiento y conversión de reservas a pedidos
- 🚚 **Sistema de Envíos**: Integración con 12+ agencias de transporte españolas
- 📊 **Analytics Avanzados**: Dashboards interactivos con métricas en tiempo real
- 📄 **Generación de PDFs**: Hojas de preparación simplificadas para almacén
- 🔍 **Búsqueda Inteligente**: Sistema de filtrado por múltiples criterios
- 📱 **Diseño Responsive**: Interfaz optimizada para móviles y tablets

## 🚀 Tecnologías

### Frontend
- **React 18** con TypeScript
- **Vite** para desarrollo y build
- **Tailwind CSS** + **shadcn/ui** para estilos
- **TanStack Query** para manejo de estado del servidor
- **Wouter** para enrutado
- **Recharts** para visualización de datos
- **jsPDF** para generación de documentos

### Backend
- **Express.js** con TypeScript
- **Drizzle ORM** para base de datos
- **PostgreSQL** como base de datos principal
- **Replit Auth** para autenticación
- **Express Session** con almacenamiento en PostgreSQL

### Herramientas de Desarrollo
- **TypeScript** para type safety
- **ESLint** para linting
- **Prettier** para formateo de código

## 📦 Instalación

### Requisitos Previos
- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm o yarn

### Configuración Local

1. **Clonar el repositorio**
```bash
git clone [URL_DEL_REPOSITORIO]
cd sportmax-pro
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/sportmax_pro
SESSION_SECRET=tu_clave_secreta_muy_segura
NODE_ENV=development
```

4. **Configurar base de datos**
```bash
# Crear la base de datos
createdb sportmax_pro

# Ejecutar migraciones
npm run db:push
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo
npm run build        # Construye para producción
npm run start        # Inicia servidor de producción

# Base de datos
npm run db:push      # Aplica cambios del schema a la BD
npm run db:generate  # Genera migraciones
npm run db:studio    # Abre Drizzle Studio

# Calidad de código
npm run lint         # Ejecuta ESLint
npm run type-check   # Verifica tipos TypeScript
```

## 🗃️ Estructura del Proyecto

```
sportmax-pro/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilidades y configuración
│   │   └── index.tsx      # Punto de entrada
│   └── public/            # Archivos estáticos
├── server/                # Backend Express
│   ├── db.ts             # Configuración de base de datos
│   ├── routes.ts         # Rutas de la API
│   ├── storage.ts        # Capa de datos
│   └── index.ts          # Servidor principal
├── shared/               # Código compartido
│   └── schema.ts         # Esquemas de base de datos
└── README.md
```

## 🔐 Configuración de Autenticación

El sistema utiliza Replit Auth para autenticación. Para configurar en otro entorno:

1. **Configurar variables de entorno**:
```env
REPL_ID=tu_repl_id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=tu-dominio.com
SESSION_SECRET=clave_secreta_larga_y_segura
```

2. **Configurar usuarios autorizados** (opcional):
Editar `server/storage.ts` para incluir lista de emails autorizados.

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno** en el dashboard de Vercel
3. **Configurar PostgreSQL** (recomendado: Neon, Supabase)
4. **Deploy automático** desde main branch

### Railway

1. **Conectar repositorio GitHub a Railway**
2. **Agregar PostgreSQL addon**
3. **Configurar variables de entorno**
4. **Deploy automático**

### Render

1. **Crear nuevo Web Service**
2. **Conectar repositorio**
3. **Configurar PostgreSQL**
4. **Configurar variables de entorno**

## 📊 Funcionalidades Principales

### Gestión de Inventario
- ✅ CRUD de productos con categorías
- ✅ Control de stock mínimo/máximo
- ✅ Asignación a zonas de almacén
- ✅ Movimientos de stock (entrada/salida/transferencia)
- ✅ Alertas de stock bajo

### Gestión de Pedidos
- ✅ Creación de pedidos con múltiples productos
- ✅ Sistema de estados (pendiente, preparando, enviado, entregado)
- ✅ Conversión de reservas a pedidos
- ✅ Generación de hojas de preparación en PDF

### Sistema de Envíos
- ✅ Integración con 12+ transportistas españolas
- ✅ Cálculo automático de costes de envío
- ✅ Seguimiento de envíos con estados
- ✅ Zonas de envío configurables

### Analytics y Reportes
- ✅ Dashboard con métricas en tiempo real
- ✅ Gráficos interactivos de ventas y tendencias
- ✅ Análisis de rendimiento por zonas
- ✅ Productos más vendidos
- ✅ Temas de colores personalizables

## 🔧 Configuración Avanzada

### Personalización de Colores
El sistema incluye 8 temas de colores predefinidos:
- Default, Ocean, Sunset, Forest
- Monochrome, Vibrant, Pastel, Corporate

### Configuración de Zonas de Almacén
Las zonas se configuran por deporte:
- Fútbol, Baloncesto, Tenis, Natación
- Fitness, Running, Ciclismo, Deportes de Invierno

### Proveedores Configurados
- Nike España, Adidas Iberia, Puma España
- Decathlon Pro, Spalding Iberia, Wilson España

## 🐛 Troubleshooting

### Error de Conexión a Base de Datos
```bash
# Verificar que PostgreSQL está corriendo
pg_ctl status

# Verificar conexión
psql $DATABASE_URL
```

### Error de Compilación TypeScript
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Problemas de Autenticación
- Verificar variables de entorno `REPL_ID` y `SESSION_SECRET`
- Comprobar que `REPLIT_DOMAINS` coincide con tu dominio

## 📝 Changelog

Ver [replit.md](./replit.md) para un historial completo de cambios.

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es de uso privado. Todos los derechos reservados.

## 📞 Soporte

Para soporte técnico o consultas:
- Crear issue en GitHub
- Contactar al administrador del sistema

---

**SportMax Pro** - Sistema de gestión de inventario profesional para empresas deportivas.