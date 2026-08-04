# Guía de Despliegue - SportMax Pro

Esta guía te ayudará a desplegar SportMax Pro en diferentes plataformas.

## 📋 Preparación Previa

### 1. Configuración del Repositorio
```bash
# Clonar desde GitHub
git clone https://github.com/tu-usuario/sportmax-pro.git
cd sportmax-pro

# Instalar dependencias
npm install
```

### 2. Variables de Entorno Requeridas
Copia `.env.example` a `.env` y configura:

```env
# Esenciales para producción
DATABASE_URL=postgresql://usuario:pass@host:5432/database
SESSION_SECRET=clave_secreta_muy_segura_minimo_32_caracteres
NODE_ENV=production

# Autenticación Replit (opcional si usas otro sistema)
REPL_ID=tu_repl_id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=tu-dominio.com
```

## 🚀 Opciones de Despliegue

### 1. Vercel (Recomendado)

**Ventajas**: Deploy automático, SSL gratis, CDN global
**Mejor para**: Aplicaciones medianas, equipos pequeños

#### Configuración:
1. **Conectar GitHub a Vercel**
   - Ir a [vercel.com](https://vercel.com)
   - Importar proyecto desde GitHub
   - Seleccionar tu repositorio

2. **Configurar Base de Datos**
   ```bash
   # Opciones recomendadas:
   # - Neon (PostgreSQL serverless)
   # - Supabase (PostgreSQL con extras)
   # - Railway (PostgreSQL managed)
   ```

3. **Variables de Entorno en Vercel**
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=clave_super_segura
   NODE_ENV=production
   ```

4. **Configuración de Build**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

#### Archivo `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "dist/public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Railway

**Ventajas**: PostgreSQL incluido, configuración simple
**Mejor para**: Aplicaciones que necesitan BD integrada

#### Configuración:
1. **Conectar GitHub a Railway**
   - Ir a [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Seleccionar repositorio

2. **Agregar PostgreSQL**
   - Add Service → Database → PostgreSQL
   - Railway creará automáticamente `DATABASE_URL`

3. **Variables de Entorno**
   ```
   SESSION_SECRET=clave_super_segura
   NODE_ENV=production
   PORT=5000
   ```

4. **Configuración Automática**
   - Railway detecta automáticamente Node.js
   - Build: `npm run build`
   - Start: `npm run start`

### 3. Render

**Ventajas**: Tier gratuito, fácil configuración
**Mejor para**: Proyectos personales, prototipos

#### Configuración:
1. **Crear Web Service**
   - Ir a [render.com](https://render.com)
   - New → Web Service
   - Conectar repositorio GitHub

2. **Configuración del Servicio**
   ```
   Name: sportmax-pro
   Environment: Node
   Build Command: npm run build
   Start Command: npm run start
   ```

3. **Agregar PostgreSQL**
   - Dashboard → New → PostgreSQL
   - Copiar `DATABASE_URL` a variables de entorno

4. **Variables de Entorno**
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=clave_super_segura
   NODE_ENV=production
   ```

### 4. VPS Propio (Avanzado)

**Ventajas**: Control total, costos predecibles
**Mejor para**: Aplicaciones empresariales, datos sensibles

#### Configuración en Ubuntu/Debian:
```bash
# 1. Preparar servidor
sudo apt update && sudo apt upgrade -y
sudo apt install nginx postgresql nodejs npm git -y

# 2. Configurar PostgreSQL
sudo -u postgres createdb sportmax_pro
sudo -u postgres createuser --pwprompt sportmax_user

# 3. Clonar y configurar aplicación
git clone https://github.com/tu-usuario/sportmax-pro.git
cd sportmax-pro
npm install
npm run build

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con configuración de producción

# 5. Configurar PM2 (Process Manager)
npm install -g pm2
pm2 start dist/index.js --name sportmax-pro
pm2 startup
pm2 save

# 6. Configurar Nginx (proxy reverso)
sudo nano /etc/nginx/sites-available/sportmax-pro
```

#### Configuración Nginx:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Configuración de Seguridad

### 1. Variables de Entorno Seguras
```bash
# Generar SESSION_SECRET seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Configurar CORS para producción
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com
```

### 2. Configuración de Base de Datos
```sql
-- Crear usuario específico para la aplicación
CREATE USER sportmax_app WITH PASSWORD 'contraseña_super_segura';
GRANT ALL PRIVILEGES ON DATABASE sportmax_pro TO sportmax_app;

-- Configurar SSL (recomendado)
-- Verificar que la conexión use SSL
```

### 3. Configuración de Autenticación
```env
# Para autenticación personalizada (sin Replit Auth)
JWT_SECRET=clave_jwt_super_segura
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=strict
```

## 📊 Monitoreo y Logs

### 1. Configuración de Logs
```javascript
// Agregar a server/index.ts
if (process.env.NODE_ENV === 'production') {
  console.log = (msg) => {
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] ${msg}\n`);
  };
}
```

### 2. Health Check Endpoint
```javascript
// Agregar a server/routes.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### 3. Monitoreo de Base de Datos
```sql
-- Verificar conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Verificar rendimiento de queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🔄 CI/CD (Integración Continua)

### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run type-check
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-args: '--prod'
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📝 Lista de Verificación Pre-Deploy

### Antes del Primer Deploy:
- [ ] Configurar base de datos PostgreSQL
- [ ] Configurar todas las variables de entorno
- [ ] Ejecutar `npm run build` localmente
- [ ] Verificar que no hay errores de TypeScript
- [ ] Probar conexión a base de datos
- [ ] Configurar dominio personalizado (opcional)

### Después del Deploy:
- [ ] Verificar que la aplicación carga correctamente
- [ ] Probar funcionalidad de login
- [ ] Verificar que la base de datos funciona
- [ ] Probar creación de productos/pedidos
- [ ] Configurar monitoreo y alertas
- [ ] Configurar backups de base de datos

## 🚨 Troubleshooting

### Errores Comunes:

1. **Error de conexión a base de datos**
   ```
   Verificar DATABASE_URL
   Comprobar que PostgreSQL acepta conexiones externas
   Verificar credenciales de usuario
   ```

2. **Error de compilación TypeScript**
   ```bash
   npm run type-check
   Revisar imports y tipos
   ```

3. **Error de variables de entorno**
   ```
   Verificar que todas las variables están configuradas
   Comprobar que SESSION_SECRET es suficientemente largo
   ```

4. **Error 404 en rutas**
   ```
   Verificar configuración de proxy en plataforma
   Comprobar que archivos estáticos se sirven correctamente
   ```

---

¿Necesitas ayuda con alguna plataforma específica? ¡Contáctanos!