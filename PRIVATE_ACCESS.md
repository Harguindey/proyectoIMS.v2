# 🔐 Configuración de Acceso Privado - SportMax Pro

Esta guía te ayuda a implementar control de acceso privado para tu aplicación SportMax Pro.

## 🎯 Opciones de Control de Acceso

### 1. Lista de Emails Autorizados (Más Simple)

#### Implementación:
```typescript
// server/auth-config.ts
export const AUTHORIZED_EMAILS = [
  'admin@tuempresa.com',
  'gerente@tuempresa.com',
  'almacen@tuempresa.com',
  // Agregar más emails según necesites
];

export function isAuthorizedEmail(email: string): boolean {
  return AUTHORIZED_EMAILS.includes(email.toLowerCase());
}
```

#### Modificar en server/routes.ts:
```typescript
import { isAuthorizedEmail } from './auth-config';

app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const userEmail = req.user.claims.email;
    
    // Verificar si el email está autorizado
    if (!isAuthorizedEmail(userEmail)) {
      return res.status(403).json({ 
        message: "Acceso no autorizado. Contacta al administrador." 
      });
    }
    
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
```

### 2. Variable de Entorno (Más Flexible)

#### Configurar en .env:
```env
# Lista de emails separados por comas
AUTHORIZED_EMAILS=admin@empresa.com,gerente@empresa.com,almacen@empresa.com

# O usar un código de acceso
ACCESS_CODE=SPORTMAX_2025
ADMIN_EMAILS=admin@empresa.com,superadmin@empresa.com
```

#### Implementación:
```typescript
// server/auth-config.ts
export function isAuthorizedUser(email: string, accessCode?: string): boolean {
  const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',') || [];
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const validAccessCode = process.env.ACCESS_CODE;
  
  // Verificar si es admin (siempre autorizado)
  if (adminEmails.includes(email.toLowerCase())) {
    return true;
  }
  
  // Verificar email autorizado
  if (authorizedEmails.includes(email.toLowerCase())) {
    return true;
  }
  
  // Verificar código de acceso (si se proporciona)
  if (validAccessCode && accessCode === validAccessCode) {
    return true;
  }
  
  return false;
}
```

### 3. Sistema de Invitaciones (Más Profesional)

#### Base de datos de invitaciones:
```typescript
// shared/schema.ts - Agregar tabla
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  code: varchar("code").notNull().unique(),
  status: varchar("status").default("pending"), // pending, used, expired
  invitedBy: varchar("invited_by"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});
```

#### Página de invitación:
```typescript
// client/src/pages/AcceptInvitation.tsx
export default function AcceptInvitation() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  
  const acceptInvitation = async () => {
    const response = await fetch('/api/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email })
    });
    
    if (response.ok) {
      // Redirigir al login
      window.location.href = '/api/login';
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acceder a SportMax Pro</CardTitle>
          <CardDescription>
            Introduce tu código de invitación y email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Código de invitación"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={acceptInvitation} className="w-full">
              Acceder al Sistema
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🚀 Implementación Recomendada (Opción 1)

### Paso 1: Crear archivo de configuración
```bash
# Crear server/auth-config.ts
touch server/auth-config.ts
```

### Paso 2: Configurar emails autorizados
```typescript
// server/auth-config.ts
export const AUTHORIZED_EMAILS = [
  'tu-email@gmail.com',
  // Agregar emails del equipo
];

export function isAuthorizedEmail(email: string): boolean {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase());
}
```

### Paso 3: Modificar middleware de autenticación
```typescript
// server/routes.ts
import { isAuthorizedEmail } from './auth-config';

// Middleware personalizado para verificar autorización
export const requireAuthorization: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user?.claims?.email) {
    return res.status(401).json({ message: "Email no disponible" });
  }
  
  if (!isAuthorizedEmail(user.claims.email)) {
    return res.status(403).json({ 
      message: "Acceso no autorizado. Tu email no está en la lista de usuarios permitidos. Contacta al administrador del sistema." 
    });
  }
  
  next();
};

// Aplicar a todas las rutas protegidas
app.use('/api', isAuthenticated, requireAuthorization);
```

### Paso 4: Crear página de acceso denegado
```typescript
// client/src/pages/Unauthorized.tsx
export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Acceso No Autorizado</CardTitle>
          <CardDescription>
            Tu cuenta no tiene permisos para acceder a SportMax Pro
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/logout'}
            variant="outline"
            className="w-full"
          >
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Paso 5: Manejar errores en el frontend
```typescript
// client/src/lib/queryClient.ts - Actualizar
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 403) {
    // Acceso denegado - redirigir a página de error
    window.location.href = '/unauthorized';
    throw new Error('403: Acceso no autorizado');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  return response.json();
}
```

## 🔧 Configuración en Producción

### Variables de Entorno para Deploy:
```env
# Vercel/Netlify/Railway
AUTHORIZED_EMAILS=email1@empresa.com,email2@empresa.com,email3@empresa.com

# O usar archivo JSON para listas más complejas
AUTHORIZED_USERS='["email1@empresa.com","email2@empresa.com"]'
```

### Para listas más complejas (roles, permisos):
```typescript
// server/auth-config.ts
interface AuthorizedUser {
  email: string;
  role: 'admin' | 'manager' | 'employee';
  permissions: string[];
}

export const AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    email: 'admin@empresa.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'manage_users']
  },
  {
    email: 'gerente@empresa.com',
    role: 'manager',
    permissions: ['read', 'write', 'create_orders']
  },
  {
    email: 'empleado@empresa.com',
    role: 'employee',
    permissions: ['read']
  }
];

export function getUserPermissions(email: string): AuthorizedUser | null {
  return AUTHORIZED_USERS.find(user => 
    user.email.toLowerCase() === email.toLowerCase()
  ) || null;
}
```

## 📋 Checklist de Implementación

- [ ] Decidir método de control de acceso
- [ ] Crear lista de emails autorizados
- [ ] Implementar middleware de autorización
- [ ] Crear página de acceso denegado
- [ ] Manejar errores 403 en frontend
- [ ] Configurar variables de entorno
- [ ] Probar con email autorizado
- [ ] Probar con email NO autorizado
- [ ] Documentar proceso para agregar usuarios
- [ ] Configurar en producción

## 🚨 Consideraciones de Seguridad

1. **Emails en Minúsculas**: Siempre comparar emails en minúsculas
2. **Variables de Entorno**: Nunca hardcodear emails en el código
3. **Logs de Acceso**: Registrar intentos de acceso no autorizados
4. **Backup de Configuración**: Mantener backup de la lista de usuarios
5. **Proceso de Emergencia**: Tener forma de agregar usuarios urgentemente

---

¿Qué método prefieres implementar? La opción 1 (lista de emails) es la más simple para empezar.