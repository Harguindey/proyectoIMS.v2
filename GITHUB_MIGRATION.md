# 📋 Guía de Migración a GitHub - SportMax Pro

Esta guía te ayudará a migrar tu aplicación SportMax Pro desde Replit a GitHub paso a paso.

## 🚀 Pasos de Migración

### 1. Preparar el Código en Replit

#### Limpiar archivos temporales:
```bash
# Eliminar archivos no necesarios
rm -rf node_modules
rm -rf dist
rm -rf .replit.nix
rm -rf .upm
```

#### Verificar que estos archivos estén presentes:
- ✅ `.gitignore` - Configurado correctamente
- ✅ `README.md` - Documentación completa
- ✅ `.env.example` - Variables de entorno de ejemplo
- ✅ `DEPLOYMENT.md` - Guía de despliegue
- ✅ `package.json` - Configuración del proyecto

### 2. Crear Repositorio en GitHub

1. **Ir a GitHub.com**
   - Iniciar sesión en tu cuenta
   - Clic en "New repository"

2. **Configurar el repositorio**:
   ```
   Repository name: sportmax-pro
   Description: Sistema completo de gestión de inventario para empresas deportivas
   Privacy: ✅ Private (recomendado)
   Initialize with: ❌ No marcar nada (ya tienes el código)
   ```

3. **Crear el repositorio**
   - Clic en "Create repository"
   - Copiar la URL del repositorio (ejemplo: `https://github.com/tu-usuario/sportmax-pro.git`)

### 3. Subir Código desde Replit

#### Opción A: Export desde Replit (Recomendado)
1. **En Replit**:
   - Ir a tu proyecto SportMax Pro
   - Clic en el menú "..." (tres puntos)
   - Seleccionar "Export as ZIP"
   - Descargar el archivo

2. **En tu computadora**:
   ```bash
   # Descomprimir el archivo
   unzip sportmax-pro.zip
   cd sportmax-pro
   
   # Limpiar archivos de Replit
   rm -rf .replit .upm .replit.nix
   
   # Inicializar git
   git init
   git add .
   git commit -m "Initial commit - SportMax Pro migration from Replit"
   
   # Conectar con GitHub
   git remote add origin https://github.com/tu-usuario/sportmax-pro.git
   git branch -M main
   git push -u origin main
   ```

#### Opción B: Git desde Replit (Alternativa)
```bash
# En el terminal de Replit
git init
git add .
git commit -m "Initial commit - SportMax Pro"
git remote add origin https://github.com/tu-usuario/sportmax-pro.git
git branch -M main
git push -u origin main
```

### 4. Configurar el Repositorio en GitHub

#### Configurar Branch Protection:
1. **Ir a Settings > Branches**
2. **Add rule para 'main'**:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

#### Configurar Secrets (si usas GitHub Actions):
1. **Ir a Settings > Secrets and variables > Actions**
2. **Agregar estos secrets**:
   ```
   DATABASE_URL: tu_url_de_base_de_datos
   SESSION_SECRET: tu_clave_secreta
   VERCEL_TOKEN: tu_token_de_vercel (si usas Vercel)
   ```

### 5. Verificar la Migración

#### Comprobar que todos los archivos están presentes:
```bash
# Clonar el repositorio en un directorio nuevo
git clone https://github.com/tu-usuario/sportmax-pro.git test-migration
cd test-migration

# Verificar estructura
ls -la

# Instalar dependencias
npm install

# Verificar que no hay errores de TypeScript
npm run check
```

#### Archivos que deben estar presentes:
```
✅ client/                 # Frontend React
✅ server/                 # Backend Express
✅ shared/                 # Esquemas compartidos
✅ README.md              # Documentación
✅ .gitignore             # Archivos ignorados
✅ .env.example           # Variables de entorno
✅ DEPLOYMENT.md          # Guía de despliegue
✅ package.json           # Configuración del proyecto
✅ tsconfig.json          # Configuración TypeScript
✅ tailwind.config.ts     # Configuración Tailwind
✅ vite.config.ts         # Configuración Vite
✅ drizzle.config.ts      # Configuración Drizzle
```

### 6. Configurar Desarrollo Local

#### Instalar dependencias:
```bash
npm install
```

#### Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

#### Configurar base de datos:
```bash
# Crear base de datos local
createdb sportmax_pro

# Aplicar schema
npm run db:push
```

#### Probar la aplicación:
```bash
npm run dev
```

### 7. Preparar para Deploy

#### Elegir plataforma de hosting:
- **Vercel**: Mejor para proyectos medianos, fácil configuración
- **Railway**: Incluye PostgreSQL, configuración simple
- **Render**: Tier gratuito disponible
- **VPS propio**: Control total, más configuración

#### Configurar base de datos de producción:
- **Neon**: PostgreSQL serverless, fácil configuración
- **Supabase**: PostgreSQL con extras, interfaz gráfica
- **Railway**: PostgreSQL integrado con la aplicación

### 8. Deploy Automático

#### Configurar deploy desde GitHub:
1. **Conectar repositorio** a tu plataforma elegida
2. **Configurar variables de entorno** de producción
3. **Configurar build commands**:
   ```
   Build: npm run build
   Start: npm run start
   ```

#### Configurar CI/CD (opcional):
```yaml
# .github/workflows/deploy.yml
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
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
    - name: Deploy
      run: # comando de deploy específico
```

## 🔄 Flujo de Trabajo Post-Migración

### Desarrollo continuo:
1. **Hacer cambios** en tu editor local
2. **Commit y push** a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push
   ```
3. **Deploy automático** se ejecuta

### Colaboración:
1. **Invitar colaboradores** en GitHub Settings > Collaborators
2. **Crear branches** para nuevas funcionalidades:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   git push -u origin feature/nueva-funcionalidad
   ```
3. **Crear Pull Requests** para revisar cambios

### Backup y seguridad:
- ✅ Código respaldado en GitHub
- ✅ Variables sensibles en secrets
- ✅ Base de datos con backups automáticos
- ✅ Historial completo de cambios

## 📞 Soporte Post-Migración

### Si algo no funciona:
1. **Verificar variables de entorno** en la plataforma de hosting
2. **Revisar logs** de deploy y aplicación
3. **Comprobar conexión** a base de datos
4. **Verificar que el build** se ejecuta correctamente

### Comandos útiles:
```bash
# Ver logs de la aplicación
npm run dev

# Verificar tipos
npm run check

# Aplicar cambios de base de datos
npm run db:push

# Ver estado de git
git status

# Ver diferencias
git diff

# Ver historial
git log --oneline
```

## ✅ Checklist de Migración Completada

- [ ] Código subido a GitHub
- [ ] Repositorio configurado como privado
- [ ] Variables de entorno configuradas
- [ ] Base de datos de producción creada
- [ ] Deploy automático configurado
- [ ] Aplicación funcionando en producción
- [ ] Backup de datos importantes
- [ ] Documentación actualizada
- [ ] Colaboradores invitados (si aplica)

¡Felicitaciones! Tu aplicación SportMax Pro está ahora en GitHub y lista para el desarrollo continuo.