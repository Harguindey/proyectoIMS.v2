import { storage } from "./storage";
import { db } from "./db";
import { sessions } from "@shared/schema";

// Default roles and permissions configuration for production security
const DEFAULT_ROLES = [
  {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Acceso completo al sistema - gestión de usuarios, configuración y todos los módulos'
  },
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Supervisión de operaciones - acceso a reportes, analytics y gestión operativa'
  },
  {
    name: 'operador',
    displayName: 'Operador',
    description: 'Operaciones diarias - gestión de inventario, pedidos y movimientos de stock'
  },
  {
    name: 'viewer',
    displayName: 'Visualizador',
    description: 'Solo lectura - consulta de información sin permisos de modificación'
  }
];

const DEFAULT_PERMISSIONS = [
  // Admin permissions - full system access
  { module: 'admin', action: 'read', description: 'Ver configuración de administración' },
  { module: 'admin', action: 'write', description: 'Modificar configuración de administración' },
  { module: 'admin', action: 'delete', description: 'Eliminar configuración de administración' },
  { module: 'users', action: 'read', description: 'Ver usuarios del sistema' },
  { module: 'users', action: 'write', description: 'Crear y modificar usuarios' },
  { module: 'users', action: 'delete', description: 'Eliminar usuarios' },

  // Inventory management permissions
  { module: 'inventory', action: 'read', description: 'Ver productos e inventario' },
  { module: 'inventory', action: 'write', description: 'Crear y modificar productos' },
  { module: 'inventory', action: 'delete', description: 'Eliminar productos del inventario' },

  // Warehouse management permissions
  { module: 'warehouse', action: 'read', description: 'Ver zonas y layout del almacén' },
  { module: 'warehouse', action: 'write', description: 'Modificar zonas y configuración del almacén' },
  { module: 'warehouse', action: 'delete', description: 'Eliminar zonas del almacén' },

  // Stock movements permissions
  { module: 'movements', action: 'read', description: 'Ver movimientos de stock' },
  { module: 'movements', action: 'write', description: 'Registrar movimientos de stock' },
  { module: 'movements', action: 'delete', description: 'Eliminar movimientos de stock' },

  // Orders management permissions
  { module: 'orders', action: 'read', description: 'Ver pedidos y órdenes' },
  { module: 'orders', action: 'write', description: 'Crear y modificar pedidos' },
  { module: 'orders', action: 'delete', description: 'Cancelar y eliminar pedidos' },

  // Customer management permissions
  { module: 'customers', action: 'read', description: 'Ver información de clientes' },
  { module: 'customers', action: 'write', description: 'Crear y modificar clientes' },
  { module: 'customers', action: 'delete', description: 'Eliminar clientes' },

  // Suppliers management permissions
  { module: 'suppliers', action: 'read', description: 'Ver proveedores' },
  { module: 'suppliers', action: 'write', description: 'Crear y modificar proveedores' },
  { module: 'suppliers', action: 'delete', description: 'Eliminar proveedores' },

  // Procurement permissions
  { module: 'procurement', action: 'read', description: 'Ver planes de aprovisionamiento' },
  { module: 'procurement', action: 'write', description: 'Crear y modificar aprovisionamiento' },
  { module: 'procurement', action: 'delete', description: 'Eliminar planes de aprovisionamiento' },

  // Reports and analytics permissions
  { module: 'reports', action: 'read', description: 'Ver reportes y analytics' },
  { module: 'reports', action: 'write', description: 'Crear reportes personalizados' },
  { module: 'reports', action: 'delete', description: 'Eliminar reportes' },

  // Shipping and logistics permissions
  { module: 'shipping', action: 'read', description: 'Ver información de envíos' },
  { module: 'shipping', action: 'write', description: 'Gestionar envíos y logística' },
  { module: 'shipping', action: 'delete', description: 'Cancelar envíos' },
];

// Role-Permission mappings for enterprise-grade security
const ROLE_PERMISSIONS = {
  admin: [
    // Admin has full access to everything
    'admin:read', 'admin:write', 'admin:delete',
    'users:read', 'users:write', 'users:delete',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'warehouse:read', 'warehouse:write', 'warehouse:delete',
    'movements:read', 'movements:write', 'movements:delete',
    'orders:read', 'orders:write', 'orders:delete',
    'customers:read', 'customers:write', 'customers:delete',
    'suppliers:read', 'suppliers:write', 'suppliers:delete',
    'procurement:read', 'procurement:write', 'procurement:delete',
    'reports:read', 'reports:write', 'reports:delete',
    'shipping:read', 'shipping:write', 'shipping:delete'
  ],
  supervisor: [
    // Supervisor has read/write but limited delete access
    'inventory:read', 'inventory:write',
    'warehouse:read', 'warehouse:write',
    'movements:read', 'movements:write',
    'orders:read', 'orders:write', 'orders:delete',
    'customers:read', 'customers:write',
    'suppliers:read', 'suppliers:write',
    'procurement:read', 'procurement:write',
    'reports:read', 'reports:write',
    'shipping:read', 'shipping:write'
  ],
  operador: [
    // Operator has operational permissions
    'inventory:read', 'inventory:write',
    'warehouse:read',
    'movements:read', 'movements:write',
    'orders:read', 'orders:write',
    'customers:read',
    'suppliers:read',
    'procurement:read',
    'reports:read',
    'shipping:read', 'shipping:write'
  ],
  viewer: [
    // Viewer only has read permissions
    'inventory:read',
    'warehouse:read',
    'movements:read',
    'orders:read',
    'customers:read',
    'suppliers:read',
    'procurement:read',
    'reports:read',
    'shipping:read'
  ]
};

/**
 * Initialize security configuration with roles, permissions, and admin user
 * This is critical for production deployment
 */
export async function initializeSecurity(): Promise<void> {
  try {
    console.log('🔐 Initializing production security configuration...');

    // Validate critical environment variables
    if (!process.env.SESSION_SECRET) {
      throw new Error('CRITICAL: SESSION_SECRET environment variable must be set for production');
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('CRITICAL: DATABASE_URL environment variable must be set');
    }

    // Ensure sessions table exists
    await ensureSessionsTableExists();

    // Initialize permissions first (required for role assignments)
    console.log('📝 Creating default permissions...');
    const permissionMap = new Map<string, number>();
    
    for (const permission of DEFAULT_PERMISSIONS) {
      try {
        const existingPermission = await storage.getPermissionsByModule(permission.module);
        const exists = existingPermission.some(p => p.action === permission.action);
        
        if (!exists) {
          const created = await storage.createPermission(permission);
          permissionMap.set(`${permission.module}:${permission.action}`, created.id);
          console.log(`✅ Created permission: ${permission.module}:${permission.action}`);
        } else {
          const existing = existingPermission.find(p => p.action === permission.action);
          if (existing) {
            permissionMap.set(`${permission.module}:${permission.action}`, existing.id);
          }
        }
      } catch (error) {
        console.error(`❌ Error creating permission ${permission.module}:${permission.action}:`, error);
      }
    }

    // Initialize roles
    console.log('👥 Creating default roles...');
    const roleMap = new Map<string, number>();
    
    for (const role of DEFAULT_ROLES) {
      try {
        let existingRole = await storage.getRoleByName(role.name);
        
        if (!existingRole) {
          existingRole = await storage.createRole(role);
          console.log(`✅ Created role: ${role.name} - ${role.displayName}`);
        }
        
        roleMap.set(role.name, existingRole.id);
      } catch (error) {
        console.error(`❌ Error creating role ${role.name}:`, error);
      }
    }

    // Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) {
        console.error(`❌ Role ${roleName} not found, skipping permission assignment`);
        continue;
      }

      for (const permissionKey of permissions) {
        const permissionId = permissionMap.get(permissionKey);
        if (!permissionId) {
          console.error(`❌ Permission ${permissionKey} not found, skipping assignment`);
          continue;
        }

        try {
          // Check if permission is already assigned
          const existingRolePermissions = await storage.getRolePermissions(roleId);
          const alreadyAssigned = existingRolePermissions.some(rp => rp.permissionId === permissionId);
          
          if (!alreadyAssigned) {
            await storage.assignPermissionToRole({ roleId, permissionId });
            console.log(`✅ Assigned ${permissionKey} to ${roleName}`);
          }
        } catch (error) {
          console.error(`❌ Error assigning ${permissionKey} to ${roleName}:`, error);
        }
      }
    }

    // Create system admin user if no admin exists
    await ensureAdminUserExists(roleMap.get('admin'));

    // Initialize authorized emails for system access
    await initializeAuthorizedEmails();

    console.log('🚀 Security initialization completed successfully!');
    console.log('✅ Production-ready authentication system is now active');

  } catch (error) {
    console.error('🚨 CRITICAL: Security initialization failed:', error);
    throw error;
  }
}

/**
 * Ensure the sessions table exists for authentication
 */
async function ensureSessionsTableExists(): Promise<void> {
  try {
    // Test if sessions table exists by attempting a simple query
    await db.select().from(sessions).limit(1);
    console.log('✅ Sessions table exists and is accessible');
  } catch (error) {
    console.error('❌ Sessions table issue:', error);
    throw new Error('Sessions table is not properly configured. Run: npm run db:push');
  }
}

/**
 * Create a system admin user if no admin exists
 */
async function ensureAdminUserExists(adminRoleId?: number): Promise<void> {
  if (!adminRoleId) {
    console.error('❌ Admin role not found, cannot create admin user');
    return;
  }

  try {
    // Check if any user has admin role
    const existingAdmins = await storage.getUserRolesByRoleId(adminRoleId);
    
    if (existingAdmins.length === 0) {
      console.log('👤 No admin users found, system will assign admin role to first authenticated user');
      console.log('📋 To manually create admin users, use the admin panel after first login');
    } else {
      console.log(`✅ Found ${existingAdmins.length} admin user(s) in the system`);
    }
  } catch (error) {
    console.error('❌ Error checking admin users:', error);
  }
}

/**
 * Assign admin role to first user automatically if no admins exist
 */
export async function assignAdminToFirstUser(userId: string): Promise<boolean> {
  try {
    // Get admin role
    const adminRole = await storage.getRoleByName('admin');
    if (!adminRole) {
      console.error('❌ Admin role not found');
      return false;
    }

    // Check if any user already has admin role
    const existingAdmins = await storage.getUserRolesByRoleId(adminRole.id);
    
    if (existingAdmins.length === 0) {
      // No admins exist - assign admin role to this user
      await storage.assignRole({ userId, roleId: adminRole.id });
      console.log(`✅ Assigned admin role to first user: ${userId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error assigning admin role to first user:', error);
    return false;
  }
}

/**
 * Initialize authorized emails for system access
 * This automatically authorizes the first admin user and common test emails
 */
async function initializeAuthorizedEmails(): Promise<void> {
  try {
    console.log('📧 Initializing authorized emails...');

    // List of default authorized emails (these should be replaced in production)
    const defaultEmails = [
      'alexharg12@gmail.com', // Default admin/test user
    ];

    for (const email of defaultEmails) {
      try {
        // Check if email is already authorized
        const existingEmail = await storage.getAuthorizedEmailByEmail(email);
        
        if (!existingEmail) {
          // Create authorized email entry
          await storage.createAuthorizedEmail({
            email: email,
            plan: 'premium', // Default to premium plan for admin users
            isActive: true,
            createdBy: 'system'
          });
          console.log(`✅ Authorized email: ${email}`);
        } else {
          console.log(`✓ Email already authorized: ${email}`);
        }
      } catch (error) {
        console.error(`❌ Error authorizing email ${email}:`, error);
      }
    }

    console.log('✅ Authorized emails initialized');
  } catch (error) {
    console.error('❌ Error initializing authorized emails:', error);
    // Don't throw - this shouldn't prevent system startup
  }
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(): void {
  const requiredVars = ['SESSION_SECRET', 'DATABASE_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Production mode: Enhanced security validation enabled');
    
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters long in production');
    }
  }

  console.log('✅ Production configuration validation passed');
}