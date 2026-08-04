import {
  users, products, warehouseZones, stockMovements, suppliers, procurementPlans,
  customers, customerAddresses, customerOrders, orderItems, productReservations, shipmentTracking,
  returns, returnItems, salesAnalytics, shippingAgencies, shippingRates,
  orderShipping, shippingEvents, roles, userRoles, permissions, rolePermissions,
  authorizedEmails, sales, saleItems, organizations, organizationUsers,
  passwordResetTokens,
  emailVerificationTokens,
  subscriptions,
  userInvitations,
  type UserInvitation, type InsertUserInvitation,
  type Subscription, type InsertSubscription,
  type User, type InsertUser, type UpsertUser,
  type Product, type InsertProduct,
  type WarehouseZone, type InsertWarehouseZone,
  type StockMovement, type InsertStockMovement,
  type Supplier, type InsertSupplier,
  type ProcurementPlan, type InsertProcurementPlan,
  type Customer, type InsertCustomer,
  type CustomerAddress, type InsertCustomerAddress,
  type CustomerOrder, type InsertCustomerOrder,
  type OrderItem, type InsertOrderItem,
  type ProductReservation, type InsertProductReservation,
  type ShipmentTracking, type InsertShipmentTracking,
  type Return, type InsertReturn,
  type ReturnItem, type InsertReturnItem,
  type SalesAnalytics, type InsertSalesAnalytics,
  type ShippingAgency, type InsertShippingAgency,
  type ShippingRate, type InsertShippingRate,
  type OrderShipping, type InsertOrderShipping,
  type ShippingEvent, type InsertShippingEvent,
  type Role, type InsertRole,
  type UserRole, type InsertUserRole,
  type Permission, type InsertPermission,
  type RolePermission, type InsertRolePermission,
  type AuthorizedEmail, type InsertAuthorizedEmail,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem,
  type OrganizationUser, type InsertOrganizationUser,
  type Organization, type InsertOrganization
} from "@shared/schema";
import { db } from "./db";
import { eq, lte, and, gte, sql } from "drizzle-orm";
import { validateZoneOrg, validateProductOrg, validateCustomerOrg, validateSupplierOrg } from "./multi-tenant-guards";

export interface IStorage {
  // Users (Replit Auth integration)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // Multi-tenant: User Organizations
  getUserOrganizations(userId: string): Promise<OrganizationUser[]>;

  // Roles
  getAllRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<Role>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;

  // User Roles
  getUserRoles(userId: string): Promise<UserRole[]>;
  getUserRolesByRoleId(roleId: number): Promise<UserRole[]>;
  assignRole(userRole: InsertUserRole): Promise<UserRole>;
  removeUserRole(userId: string, roleId: number): Promise<boolean>;

  // Permissions
  getAllPermissions(): Promise<Permission[]>;
  getPermission(id: number): Promise<Permission | undefined>;
  getPermissionsByModule(module: string): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: number, permission: Partial<Permission>): Promise<Permission | undefined>;
  deletePermission(id: number): Promise<boolean>;

  // Role Permissions
  getRolePermissions(roleId: number): Promise<RolePermission[]>;
  getPermissionsByRole(roleId: number): Promise<Permission[]>;
  assignPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean>;

  // Advanced user methods
  getUserWithRoles(userId: string): Promise<User & { roles: (UserRole & { role: Role })[] } | undefined>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  checkUserPermission(userId: string, module: string, action: string): Promise<boolean>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  deletePasswordResetTokensByUserId(userId: string): Promise<void>;
  markPasswordResetTokenUsed(id: number): Promise<void>;

  // Email verification
  createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void>;
  getEmailVerificationToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markEmailVerificationTokenUsed(id: number): Promise<void>;
  deleteEmailVerificationTokensByUserId(userId: string): Promise<void>;

  // Warehouse Zones
  getAllWarehouseZones(organizationId: number): Promise<WarehouseZone[]>;
  getWarehouseZone(organizationId: number, id: number): Promise<WarehouseZone | undefined>;
  getWarehouseZoneByCode(organizationId: number, code: string): Promise<WarehouseZone | undefined>;
  createWarehouseZone(organizationId: number, zone: InsertWarehouseZone): Promise<WarehouseZone>;
  updateWarehouseZone(organizationId: number, id: number, zone: Partial<WarehouseZone>): Promise<WarehouseZone | undefined>;
  deleteWarehouseZone(organizationId: number, id: number): Promise<boolean>;

  // Products
  getAllProducts(organizationId: number): Promise<Product[]>;
  getProduct(organizationId: number, id: number): Promise<Product | undefined>;
  getProductBySku(organizationId: number, sku: string): Promise<Product | undefined>;
  getProductsByZone(organizationId: number, zoneId: number): Promise<Product[]>;
  getLowStockProducts(organizationId: number): Promise<Product[]>;
  getProductsNeedingReorder(organizationId: number): Promise<Product[]>;
  createProduct(organizationId: number, product: InsertProduct): Promise<Product>;
  updateProduct(organizationId: number, id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(organizationId: number, id: number): Promise<boolean>;

  // Stock Movements
  getAllStockMovements(organizationId: number): Promise<StockMovement[]>;
  getStockMovement(organizationId: number, id: number): Promise<StockMovement | undefined>;
  getStockMovementsByProduct(organizationId: number, productId: number): Promise<StockMovement[]>;
  getRecentStockMovements(organizationId: number, limit?: number): Promise<StockMovement[]>;
  createStockMovement(organizationId: number, movement: InsertStockMovement): Promise<StockMovement>;

  // Suppliers
  getAllSuppliers(organizationId: number): Promise<Supplier[]>;
  getSupplier(organizationId: number, id: number): Promise<Supplier | undefined>;
  createSupplier(organizationId: number, supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(organizationId: number, id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined>;
  deleteSupplier(organizationId: number, id: number): Promise<boolean>;

  // Procurement Plans
  getAllProcurementPlans(organizationId: number): Promise<ProcurementPlan[]>;
  getProcurementPlan(organizationId: number, id: number): Promise<ProcurementPlan | undefined>;
  getProcurementPlansByProduct(organizationId: number, productId: number): Promise<ProcurementPlan[]>;
  getUpcomingProcurementPlans(organizationId: number, days?: number): Promise<ProcurementPlan[]>;
  createProcurementPlan(organizationId: number, plan: InsertProcurementPlan): Promise<ProcurementPlan>;
  updateProcurementPlan(organizationId: number, id: number, plan: Partial<ProcurementPlan>): Promise<ProcurementPlan | undefined>;
  deleteProcurementPlan(organizationId: number, id: number): Promise<boolean>;

  // Customers
  getAllCustomers(organizationId: number): Promise<Customer[]>;
  getCustomer(organizationId: number, id: number): Promise<Customer | undefined>;
  createCustomer(organizationId: number, customer: InsertCustomer): Promise<Customer>;
  updateCustomer(organizationId: number, id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(organizationId: number, id: number): Promise<boolean>;

  // Customer Addresses
  getAllCustomerAddresses(organizationId: number): Promise<CustomerAddress[]>;
  getCustomerAddress(organizationId: number, id: number): Promise<CustomerAddress | undefined>;
  getAddressesByCustomer(organizationId: number, customerId: number): Promise<CustomerAddress[]>;
  createCustomerAddress(organizationId: number, address: InsertCustomerAddress): Promise<CustomerAddress>;
  updateCustomerAddress(organizationId: number, id: number, address: Partial<CustomerAddress>): Promise<CustomerAddress | undefined>;
  deleteCustomerAddress(organizationId: number, id: number): Promise<boolean>;
  setDefaultAddress(organizationId: number, customerId: number, addressId: number): Promise<void>;

  // Customer Orders
  getAllCustomerOrders(organizationId: number): Promise<CustomerOrder[]>;
  getCustomerOrder(organizationId: number, id: number): Promise<CustomerOrder | undefined>;
  getCustomerOrdersByCustomer(organizationId: number, customerId: number): Promise<CustomerOrder[]>;
  getCustomerOrderByNumber(organizationId: number, orderNumber: string): Promise<CustomerOrder | undefined>;
  createCustomerOrder(organizationId: number, order: InsertCustomerOrder): Promise<CustomerOrder>;
  updateCustomerOrder(organizationId: number, id: number, order: Partial<CustomerOrder>): Promise<CustomerOrder | undefined>;
  deleteCustomerOrder(organizationId: number, id: number): Promise<boolean>;
  updateOrderStatus(organizationId: number, id: number, status: string, shippedDate?: Date, deliveredDate?: Date): Promise<CustomerOrder | undefined>;

  // Order Items
  getAllOrderItems(organizationId: number): Promise<OrderItem[]>;
  getOrderItem(organizationId: number, id: number): Promise<OrderItem | undefined>;
  getOrderItemsByOrder(organizationId: number, orderId: number): Promise<OrderItem[]>;
  createOrderItem(organizationId: number, item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(organizationId: number, id: number, item: Partial<OrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(organizationId: number, id: number): Promise<boolean>;

  // Product Reservations
  getAllProductReservations(organizationId: number): Promise<ProductReservation[]>;
  getProductReservation(organizationId: number, id: number): Promise<ProductReservation | undefined>;
  getReservationsByCustomer(organizationId: number, customerId: number): Promise<ProductReservation[]>;
  getReservationsByProduct(organizationId: number, productId: number): Promise<ProductReservation[]>;
  getActiveReservations(organizationId: number): Promise<ProductReservation[]>;
  createProductReservation(organizationId: number, reservation: InsertProductReservation): Promise<ProductReservation>;
  updateReservationStatus(organizationId: number, id: number, status: string): Promise<ProductReservation | undefined>;
  deleteProductReservation(organizationId: number, id: number): Promise<boolean>;

  // Shipment Tracking
  getAllShipmentTracking(): Promise<ShipmentTracking[]>;
  getShipmentTracking(id: number): Promise<ShipmentTracking | undefined>;
  getShipmentByOrder(orderId: number): Promise<ShipmentTracking | undefined>;
  getShipmentsByCarrier(carrier: string): Promise<ShipmentTracking[]>;
  createShipmentTracking(shipment: InsertShipmentTracking): Promise<ShipmentTracking>;
  updateShipmentStatus(id: number, status: string, events?: any[]): Promise<ShipmentTracking | undefined>;
  deleteShipmentTracking(id: number): Promise<boolean>;

  // Returns
  getAllReturns(): Promise<Return[]>;
  getReturn(id: number): Promise<Return | undefined>;
  getReturnsByCustomer(customerId: number): Promise<Return[]>;
  getReturnsByOrder(orderId: number): Promise<Return[]>;
  getReturnByNumber(returnNumber: string): Promise<Return | undefined>;
  createReturn(returnData: InsertReturn): Promise<Return>;
  updateReturnStatus(id: number, status: string, approvedDate?: Date): Promise<Return | undefined>;
  deleteReturn(id: number): Promise<boolean>;

  // Return Items
  getAllReturnItems(): Promise<ReturnItem[]>;
  getReturnItem(id: number): Promise<ReturnItem | undefined>;
  getReturnItemsByReturn(returnId: number): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;
  updateReturnItem(id: number, item: Partial<ReturnItem>): Promise<ReturnItem | undefined>;
  deleteReturnItem(id: number): Promise<boolean>;

  // Sales Analytics
  getAllSalesAnalytics(): Promise<SalesAnalytics[]>;
  getSalesAnalytics(id: number): Promise<SalesAnalytics | undefined>;
  getSalesAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<SalesAnalytics[]>;
  getSalesAnalyticsByProduct(productId: number): Promise<SalesAnalytics[]>;
  getSalesAnalyticsByCategory(category: string): Promise<SalesAnalytics[]>;
  createSalesAnalytics(analytics: InsertSalesAnalytics): Promise<SalesAnalytics>;
  updateSalesAnalytics(id: number, analytics: Partial<SalesAnalytics>): Promise<SalesAnalytics | undefined>;
  deleteSalesAnalytics(id: number): Promise<boolean>;

  // Shipping Agencies
  getAllShippingAgencies(): Promise<ShippingAgency[]>;
  getShippingAgency(id: number): Promise<ShippingAgency | undefined>;
  getActiveShippingAgencies(): Promise<ShippingAgency[]>;
  createShippingAgency(agency: InsertShippingAgency): Promise<ShippingAgency>;
  updateShippingAgency(id: number, agency: Partial<ShippingAgency>): Promise<ShippingAgency | undefined>;
  deleteShippingAgency(id: number): Promise<boolean>;

  // Shipping Rates
  getAllShippingRates(): Promise<ShippingRate[]>;
  getShippingRate(id: number): Promise<ShippingRate | undefined>;
  getShippingRatesByAgency(agencyId: number): Promise<ShippingRate[]>;
  getShippingRatesByZone(zoneName: string): Promise<ShippingRate[]>;
  getBestShippingRate(weight: number, zoneName: string): Promise<ShippingRate | undefined>;
  createShippingRate(rate: InsertShippingRate): Promise<ShippingRate>;
  updateShippingRate(id: number, rate: Partial<ShippingRate>): Promise<ShippingRate | undefined>;
  deleteShippingRate(id: number): Promise<boolean>;

  // Order Shipping
  getAllOrderShipping(): Promise<OrderShipping[]>;
  getOrderShipping(id: number): Promise<OrderShipping | undefined>;
  getOrderShippingByOrder(orderId: number): Promise<OrderShipping | undefined>;
  getOrderShippingByTrackingNumber(trackingNumber: string): Promise<OrderShipping | undefined>;
  createOrderShipping(shipping: InsertOrderShipping): Promise<OrderShipping>;
  updateOrderShipping(id: number, shipping: Partial<OrderShipping>): Promise<OrderShipping | undefined>;
  deleteOrderShipping(id: number): Promise<boolean>;

  // Shipping Events
  getAllShippingEvents(): Promise<ShippingEvent[]>;
  getShippingEvent(id: number): Promise<ShippingEvent | undefined>;
  getShippingEventsByOrderShipping(orderShippingId: number): Promise<ShippingEvent[]>;
  createShippingEvent(event: InsertShippingEvent): Promise<ShippingEvent>;
  updateShippingEvent(id: number, event: Partial<ShippingEvent>): Promise<ShippingEvent | undefined>;
  deleteShippingEvent(id: number): Promise<boolean>;

  // Logistics Utilities
  calculateShippingCost(weight: number, zoneName: string, agencyId?: number): Promise<{ cost: number; agency: ShippingAgency; rate: ShippingRate } | undefined>;
  generateTrackingNumber(agencyCode: string): string;
  updateShippingStatus(orderShippingId: number, status: string, location?: string, description?: string): Promise<void>;

  // Authorized Emails - Access Control
  getAllAuthorizedEmails(): Promise<AuthorizedEmail[]>;
  getAuthorizedEmail(id: number): Promise<AuthorizedEmail | undefined>;
  getAuthorizedEmailByEmail(email: string): Promise<AuthorizedEmail | undefined>;
  isEmailAuthorized(email: string): Promise<boolean>;
  createAuthorizedEmail(email: InsertAuthorizedEmail): Promise<AuthorizedEmail>;
  updateAuthorizedEmail(id: number, data: Partial<AuthorizedEmail>): Promise<AuthorizedEmail | undefined>;
  deleteAuthorizedEmail(id: number): Promise<boolean>;

  // Sales - TPV / Point of Sale
  getAllSales(): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  getSaleWithItems(id: number): Promise<(Sale & { items: SaleItem[] }) | undefined>;
  getRecentSales(limit?: number): Promise<Sale[]>;
  getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
  getSalesByUser(userId: string): Promise<Sale[]>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale>;
  deleteSale(id: number): Promise<boolean>;

  // Sale Items
  getSaleItems(saleId: number): Promise<SaleItem[]>;

  // Password Reset
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  deletePasswordResetTokensByUserId(userId: string): Promise<void>;
  markPasswordResetTokenUsed(id: number): Promise<void>;

  // Email verification
  createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void>;
  getEmailVerificationToken(token: string): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markEmailVerificationTokenUsed(id: number): Promise<void>;
  deleteEmailVerificationTokensByUserId(userId: string): Promise<void>;

  // Billing / Subscriptions
  getSubscriptionByOrgId(organizationId: number): Promise<Subscription | undefined>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(organizationId: number, data: Partial<Subscription>): Promise<Subscription | undefined>;
  upsertSubscription(data: InsertSubscription): Promise<Subscription>;

  // User Invitations
  createInvitation(data: InsertUserInvitation): Promise<UserInvitation>;
  getInvitationByToken(token: string): Promise<UserInvitation | undefined>;
  getInvitationsByOrg(organizationId: number): Promise<UserInvitation[]>;
  acceptInvitation(id: number): Promise<void>;
  deleteInvitation(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // TireMax Pro: Los datos de llantas custom se inicializan mediante
    // el script de migración server/scripts/migrate-to-tires.ts
    // No se auto-inicializan datos al arrancar el servidor
  }

  // Users (Replit Auth integration)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upsertedUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date()
        }
      })
      .returning();
    return upsertedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async getUserOrganizations(userId: string): Promise<OrganizationUser[]> {
    return await db
      .select()
      .from(organizationUsers)
      .where(and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.isActive, true)
      ))
      .orderBy(organizationUsers.joinedAt);
  }

  async updateUser(id: string, userUpdates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userUpdates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Organizations
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).where(eq(organizations.isActive, true));
  }

  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.name, name));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

  // Organization Users
  async createOrganizationUser(insertOrgUser: InsertOrganizationUser): Promise<OrganizationUser> {
    const [orgUser] = await db.insert(organizationUsers).values(insertOrgUser).returning();
    return orgUser;
  }

  // User Roles
  async createUserRole(insertUserRole: InsertUserRole): Promise<UserRole> {
    const [userRole] = await db.insert(userRoles).values(insertUserRole).returning();
    return userRole;
  }

  // Roles
  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.isActive, true)).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [createdRole] = await db.insert(roles).values(role).returning();
    return createdRole;
  }

  async updateRole(id: number, roleUpdates: Partial<Role>): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set(roleUpdates)
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User Roles
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  }

  async getUserRolesByRoleId(roleId: number): Promise<UserRole[]> {
    return await db.select().from(userRoles).where(eq(userRoles.roleId, roleId));
  }

  async assignRole(userRole: InsertUserRole): Promise<UserRole> {
    const [assignedRole] = await db.insert(userRoles).values(userRole).returning();
    return assignedRole;
  }

  async removeUserRole(userId: string, roleId: number): Promise<boolean> {
    const result = await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    return (result.rowCount || 0) > 0;
  }

  // Permissions
  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.module, permissions.action);
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission || undefined;
  }

  async getPermissionsByModule(module: string): Promise<Permission[]> {
    return await db.select().from(permissions).where(eq(permissions.module, module));
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [createdPermission] = await db.insert(permissions).values(permission).returning();
    return createdPermission;
  }

  async updatePermission(id: number, permissionUpdates: Partial<Permission>): Promise<Permission | undefined> {
    const [permission] = await db
      .update(permissions)
      .set(permissionUpdates)
      .where(eq(permissions.id, id))
      .returning();
    return permission || undefined;
  }

  async deletePermission(id: number): Promise<boolean> {
    const result = await db.delete(permissions).where(eq(permissions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Role Permissions
  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  async getPermissionsByRole(roleId: number): Promise<Permission[]> {
    const rolePerms = await db
      .select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rolePerms.map(rp => rp.permission);
  }

  async assignPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [assigned] = await db.insert(rolePermissions).values(rolePermission).returning();
    return assigned;
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
    const result = await db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
    return (result.rowCount || 0) > 0;
  }

  // Advanced user methods
  async getUserWithRoles(userId: string): Promise<User & { roles: (UserRole & { role: Role })[] } | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;

    const userRolesWithRoles = await db
      .select({
        userRole: userRoles,
        role: roles
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return {
      ...user,
      roles: userRolesWithRoles.map(ur => ({
        ...ur.userRole,
        role: ur.role
      }))
    };
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userPerms = await db
      .select({ permission: permissions })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));
    
    // Remove duplicates
    const uniquePerms = userPerms.reduce((acc, curr) => {
      if (!acc.some(p => p.permission.id === curr.permission.id)) {
        acc.push(curr);
      }
      return acc;
    }, [] as typeof userPerms);

    return uniquePerms.map(up => up.permission);
  }

  async checkUserPermission(userId: string, module: string, action: string): Promise<boolean> {
    // Check if user has admin role - admins get all permissions
    const userRolesData = await this.getUserRoles(userId);
    const roles = await Promise.all(
      userRolesData.map(ur => this.getRole(ur.roleId))
    );
    const isAdmin = roles.some(role => role && role.name === 'admin');
    
    if (isAdmin) {
      return true; // Admin has all permissions
    }

    // Regular permission check for non-admin users
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.module === module && p.action === action);
  }

  // Additional helper methods for users
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, username));
    return user || undefined;
  }

  // Warehouse Zone methods
  async getAllWarehouseZones(organizationId: number): Promise<WarehouseZone[]> {
    return await db.select().from(warehouseZones).where(eq(warehouseZones.organizationId, organizationId));
  }

  async getWarehouseZone(organizationId: number, id: number): Promise<WarehouseZone | undefined> {
    const [zone] = await db.select().from(warehouseZones).where(
      and(
        eq(warehouseZones.id, id),
        eq(warehouseZones.organizationId, organizationId)
      )
    );
    return zone || undefined;
  }

  async getWarehouseZoneByCode(organizationId: number, code: string): Promise<WarehouseZone | undefined> {
    const [zone] = await db.select().from(warehouseZones).where(
      and(
        eq(warehouseZones.code, code),
        eq(warehouseZones.organizationId, organizationId)
      )
    );
    return zone || undefined;
  }

  async createWarehouseZone(organizationId: number, insertZone: InsertWarehouseZone): Promise<WarehouseZone> {
    const [zone] = await db
      .insert(warehouseZones)
      .values({ ...insertZone, organizationId, currentOccupancy: 0 })
      .returning();
    return zone;
  }

  async updateWarehouseZone(organizationId: number, id: number, updates: Partial<WarehouseZone>): Promise<WarehouseZone | undefined> {
    await validateZoneOrg(id, organizationId);
    
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [zone] = await db
      .update(warehouseZones)
      .set(safeUpdates)
      .where(
        and(
          eq(warehouseZones.id, id),
          eq(warehouseZones.organizationId, organizationId)
        )
      )
      .returning();
    return zone || undefined;
  }

  async deleteWarehouseZone(organizationId: number, id: number): Promise<boolean> {
    await validateZoneOrg(id, organizationId);
    const result = await db.delete(warehouseZones).where(
      and(
        eq(warehouseZones.id, id),
        eq(warehouseZones.organizationId, organizationId)
      )
    );
    return (result.rowCount || 0) > 0;
  }

  async recalculateZoneOccupancy(organizationId: number, zoneId: number): Promise<void> {
    const zoneProducts = await this.getProductsByZone(organizationId, zoneId);
    const totalOccupancy = zoneProducts.reduce((sum, product) => sum + product.currentStock, 0);
    
    await db
      .update(warehouseZones)
      .set({ currentOccupancy: totalOccupancy })
      .where(
        and(
          eq(warehouseZones.id, zoneId),
          eq(warehouseZones.organizationId, organizationId)
        )
      );
  }

  async recalculateAllZoneOccupancies(organizationId: number): Promise<void> {
    const allZones = await this.getAllWarehouseZones(organizationId);
    
    for (const zone of allZones) {
      await this.recalculateZoneOccupancy(organizationId, zone.id);
    }
  }

  // Product methods
  async getAllProducts(organizationId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.organizationId, organizationId));
  }

  async getProduct(organizationId: number, id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(
      and(
        eq(products.id, id),
        eq(products.organizationId, organizationId)
      )
    );
    return product || undefined;
  }

  async getProductBySku(organizationId: number, sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(
      and(
        eq(products.sku, sku),
        eq(products.organizationId, organizationId)
      )
    );
    return product || undefined;
  }

  async getProductsByZone(organizationId: number, zoneId: number): Promise<Product[]> {
    await validateZoneOrg(zoneId, organizationId);
    return await db.select().from(products).where(
      and(
        eq(products.warehouseZoneId, zoneId),
        eq(products.organizationId, organizationId)
      )
    );
  }

  async getLowStockProducts(organizationId: number): Promise<Product[]> {
    return await db.select().from(products).where(
      and(
        lte(products.currentStock, products.minStock),
        eq(products.organizationId, organizationId)
      )
    );
  }

  async createProduct(organizationId: number, insertProduct: InsertProduct): Promise<Product> {
    if (insertProduct.warehouseZoneId) {
      await validateZoneOrg(insertProduct.warehouseZoneId, organizationId);
    }
    const [product] = await db
      .insert(products)
      .values({ ...insertProduct, organizationId })
      .returning();
    return product;
  }

  async updateProduct(organizationId: number, id: number, updates: Partial<Product>): Promise<Product | undefined> {
    await validateProductOrg(id, organizationId);
    
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    if (safeUpdates.warehouseZoneId) {
      await validateZoneOrg(safeUpdates.warehouseZoneId, organizationId);
    }
    const [product] = await db
      .update(products)
      .set(safeUpdates)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, organizationId)
        )
      )
      .returning();
    return product || undefined;
  }

  async deleteProduct(organizationId: number, id: number): Promise<boolean> {
    await validateProductOrg(id, organizationId);
    const result = await db.delete(products).where(
      and(
        eq(products.id, id),
        eq(products.organizationId, organizationId)
      )
    );
    return (result.rowCount || 0) > 0;
  }

  // Stock Movement methods
  async getAllStockMovements(organizationId: number): Promise<StockMovement[]> {
    return await db.select().from(stockMovements)
      .where(eq(stockMovements.organizationId, organizationId))
      .orderBy(stockMovements.createdAt);
  }

  async getStockMovement(organizationId: number, id: number): Promise<StockMovement | undefined> {
    const [movement] = await db.select().from(stockMovements)
      .where(and(
        eq(stockMovements.id, id),
        eq(stockMovements.organizationId, organizationId)
      ));
    return movement || undefined;
  }

  async getStockMovementsByProduct(organizationId: number, productId: number): Promise<StockMovement[]> {
    await validateProductOrg(productId, organizationId);
    return await db.select().from(stockMovements)
      .where(and(
        eq(stockMovements.productId, productId),
        eq(stockMovements.organizationId, organizationId)
      ))
      .orderBy(stockMovements.createdAt);
  }

  async getRecentStockMovements(organizationId: number, limit: number = 10): Promise<StockMovement[]> {
    return await db.select().from(stockMovements)
      .where(eq(stockMovements.organizationId, organizationId))
      .orderBy(stockMovements.createdAt)
      .limit(limit);
  }

  async createStockMovement(organizationId: number, insertMovement: InsertStockMovement): Promise<StockMovement> {
    // Validate product belongs to organization
    await validateProductOrg(insertMovement.productId, organizationId);
    
    const [movement] = await db
      .insert(stockMovements)
      .values({ ...insertMovement, organizationId })
      .returning();

    // Update product stock based on movement
    const product = await this.getProduct(organizationId, movement.productId);
    if (product) {
      let newStock = product.currentStock;
      
      if (movement.type === 'entry') {
        newStock += movement.quantity;
      } else if (movement.type === 'exit') {
        newStock -= movement.quantity;
      }
      
      await this.updateProduct(organizationId, product.id, { currentStock: Math.max(0, newStock) });
      
      // Update zone occupancy if product is assigned to a zone
      if (product.warehouseZoneId) {
        await this.recalculateZoneOccupancy(organizationId, product.warehouseZoneId);
      }
    }

    return movement;
  }

  // Additional Product methods
  async getProductsNeedingReorder(organizationId: number): Promise<Product[]> {
    try {
      console.log('=== getProductsNeedingReorder START ===');
      
      const result = await db.select().from(products).where(eq(products.organizationId, organizationId));
      console.log('Products from database:', result.length);
      
      // Based on the curl data, we know products exist, so let's filter them properly
      const filtered = result.filter(product => {
        const currentStock = Number(product.currentStock) || 0;
        const minStock = Number(product.minStock) || 0;
        
        console.log(`Product ${product.id} (${product.name}): current=${currentStock}, min=${minStock}`);
        
        return currentStock <= minStock;
      });
      
      console.log(`Found ${filtered.length} products needing reorder`);
      return filtered;
    } catch (error) {
      console.error('=== ERROR in getProductsNeedingReorder ===');
      console.error('Error:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Supplier methods
  async getAllSuppliers(organizationId: number): Promise<Supplier[]> {
    return await db.select().from(suppliers)
      .where(eq(suppliers.organizationId, organizationId));
  }

  async getSupplier(organizationId: number, id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.organizationId, organizationId)
      ));
    return supplier || undefined;
  }

  async createSupplier(organizationId: number, insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliers)
      .values({ ...insertSupplier, organizationId })
      .returning();
    return supplier;
  }

  async updateSupplier(organizationId: number, id: number, updates: Partial<Supplier>): Promise<Supplier | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [supplier] = await db
      .update(suppliers)
      .set(safeUpdates)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.organizationId, organizationId)
      ))
      .returning();
    return supplier || undefined;
  }

  async deleteSupplier(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Procurement Plan methods
  async getAllProcurementPlans(organizationId: number): Promise<ProcurementPlan[]> {
    return await db.select().from(procurementPlans)
      .where(eq(procurementPlans.organizationId, organizationId))
      .orderBy(procurementPlans.plannedOrderDate);
  }

  async getProcurementPlan(organizationId: number, id: number): Promise<ProcurementPlan | undefined> {
    const [plan] = await db.select().from(procurementPlans)
      .where(and(
        eq(procurementPlans.id, id),
        eq(procurementPlans.organizationId, organizationId)
      ));
    return plan || undefined;
  }

  async getProcurementPlansByProduct(organizationId: number, productId: number): Promise<ProcurementPlan[]> {
    await validateProductOrg(productId, organizationId);
    return await db.select().from(procurementPlans)
      .where(and(
        eq(procurementPlans.productId, productId),
        eq(procurementPlans.organizationId, organizationId)
      ))
      .orderBy(procurementPlans.plannedOrderDate);
  }

  async getUpcomingProcurementPlans(organizationId: number, days: number = 30): Promise<ProcurementPlan[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return await db.select().from(procurementPlans)
      .where(
        and(
          eq(procurementPlans.organizationId, organizationId),
          gte(procurementPlans.plannedOrderDate, now),
          lte(procurementPlans.plannedOrderDate, futureDate),
          eq(procurementPlans.status, 'planned')
        )
      )
      .orderBy(procurementPlans.plannedOrderDate);
  }

  async createProcurementPlan(organizationId: number, insertPlan: InsertProcurementPlan): Promise<ProcurementPlan> {
    // Validate product and supplier belong to organization
    await validateProductOrg(insertPlan.productId, organizationId);
    if (insertPlan.supplierId) {
      await validateSupplierOrg(insertPlan.supplierId, organizationId);
    }
    
    const [plan] = await db
      .insert(procurementPlans)
      .values({ ...insertPlan, organizationId })
      .returning();
    return plan;
  }

  async updateProcurementPlan(organizationId: number, id: number, updates: Partial<ProcurementPlan>): Promise<ProcurementPlan | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [plan] = await db
      .update(procurementPlans)
      .set(safeUpdates)
      .where(and(
        eq(procurementPlans.id, id),
        eq(procurementPlans.organizationId, organizationId)
      ))
      .returning();
    return plan || undefined;
  }

  async deleteProcurementPlan(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(procurementPlans)
      .where(and(
        eq(procurementPlans.id, id),
        eq(procurementPlans.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Customers methods
  async getAllCustomers(organizationId: number): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(eq(customers.organizationId, organizationId))
      .orderBy(customers.name);
  }

  async getCustomer(organizationId: number, id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId)
      ));
    return customer || undefined;
  }

  async createCustomer(organizationId: number, insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers)
      .values({ ...insertCustomer, organizationId })
      .returning();
    return customer;
  }

  async updateCustomer(organizationId: number, id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [customer] = await db
      .update(customers)
      .set(safeUpdates)
      .where(and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId)
      ))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Customer Addresses methods
  async getAllCustomerAddresses(organizationId: number): Promise<CustomerAddress[]> {
    return await db.select().from(customerAddresses)
      .where(eq(customerAddresses.organizationId, organizationId))
      .orderBy(customerAddresses.createdAt);
  }

  async getCustomerAddress(organizationId: number, id: number): Promise<CustomerAddress | undefined> {
    const [address] = await db.select().from(customerAddresses)
      .where(and(
        eq(customerAddresses.id, id),
        eq(customerAddresses.organizationId, organizationId)
      ));
    return address || undefined;
  }

  async getAddressesByCustomer(organizationId: number, customerId: number): Promise<CustomerAddress[]> {
    await validateCustomerOrg(customerId, organizationId);
    return await db
      .select()
      .from(customerAddresses)
      .where(and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.organizationId, organizationId)
      ))
      .orderBy(customerAddresses.isDefault, customerAddresses.createdAt);
  }

  async createCustomerAddress(organizationId: number, insertAddress: InsertCustomerAddress): Promise<CustomerAddress> {
    // Validate customer belongs to organization
    if (insertAddress.customerId) {
      await validateCustomerOrg(insertAddress.customerId, organizationId);
    }
    
    const [address] = await db.insert(customerAddresses)
      .values({ ...insertAddress, organizationId })
      .returning();
    return address;
  }

  async updateCustomerAddress(organizationId: number, id: number, updates: Partial<CustomerAddress>): Promise<CustomerAddress | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [address] = await db
      .update(customerAddresses)
      .set(safeUpdates)
      .where(and(
        eq(customerAddresses.id, id),
        eq(customerAddresses.organizationId, organizationId)
      ))
      .returning();
    return address || undefined;
  }

  async deleteCustomerAddress(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(customerAddresses)
      .where(and(
        eq(customerAddresses.id, id),
        eq(customerAddresses.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async setDefaultAddress(organizationId: number, customerId: number, addressId: number): Promise<void> {
    await validateCustomerOrg(customerId, organizationId);
    
    await db.transaction(async (tx) => {
      // Primero, quitar default de todas las direcciones del cliente
      await tx
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(and(
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.organizationId, organizationId)
        ));

      // Luego, establecer la nueva dirección como default
      await tx
        .update(customerAddresses)
        .set({ isDefault: true })
        .where(and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.organizationId, organizationId)
        ));
    });
  }

  // Customer Orders methods
  async getAllCustomerOrders(organizationId: number): Promise<CustomerOrder[]> {
    return await db.select().from(customerOrders)
      .where(eq(customerOrders.organizationId, organizationId))
      .orderBy(customerOrders.orderDate);
  }

  async getCustomerOrder(organizationId: number, id: number): Promise<CustomerOrder | undefined> {
    const [order] = await db.select().from(customerOrders)
      .where(and(
        eq(customerOrders.id, id),
        eq(customerOrders.organizationId, organizationId)
      ));
    return order || undefined;
  }

  async getCustomerOrdersByCustomer(organizationId: number, customerId: number): Promise<CustomerOrder[]> {
    await validateCustomerOrg(customerId, organizationId);
    return await db
      .select()
      .from(customerOrders)
      .where(and(
        eq(customerOrders.customerId, customerId),
        eq(customerOrders.organizationId, organizationId)
      ))
      .orderBy(customerOrders.orderDate);
  }

  async getCustomerOrderByNumber(organizationId: number, orderNumber: string): Promise<CustomerOrder | undefined> {
    const [order] = await db
      .select()
      .from(customerOrders)
      .where(and(
        eq(customerOrders.orderNumber, orderNumber),
        eq(customerOrders.organizationId, organizationId)
      ));
    return order || undefined;
  }

  async createCustomerOrder(organizationId: number, insertOrder: InsertCustomerOrder): Promise<CustomerOrder> {
    // Validate customer belongs to organization
    await validateCustomerOrg(insertOrder.customerId, organizationId);
    
    const [order] = await db.insert(customerOrders)
      .values({ ...insertOrder, organizationId })
      .returning();
    return order;
  }

  async updateCustomerOrder(organizationId: number, id: number, updates: Partial<CustomerOrder>): Promise<CustomerOrder | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [order] = await db
      .update(customerOrders)
      .set(safeUpdates)
      .where(and(
        eq(customerOrders.id, id),
        eq(customerOrders.organizationId, organizationId)
      ))
      .returning();
    return order || undefined;
  }

  async deleteCustomerOrder(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(customerOrders)
      .where(and(
        eq(customerOrders.id, id),
        eq(customerOrders.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async updateOrderStatus(organizationId: number, id: number, status: string, shippedDate?: Date, deliveredDate?: Date): Promise<CustomerOrder | undefined> {
    const updates: any = { status };
    if (shippedDate) updates.shippedDate = shippedDate;
    if (deliveredDate) updates.deliveredDate = deliveredDate;

    const [order] = await db
      .update(customerOrders)
      .set(updates)
      .where(and(
        eq(customerOrders.id, id),
        eq(customerOrders.organizationId, organizationId)
      ))
      .returning();
    return order || undefined;
  }

  // Order Items methods
  async getAllOrderItems(organizationId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems)
      .where(eq(orderItems.organizationId, organizationId));
  }

  async getOrderItem(organizationId: number, id: number): Promise<OrderItem | undefined> {
    const [item] = await db.select().from(orderItems)
      .where(and(
        eq(orderItems.id, id),
        eq(orderItems.organizationId, organizationId)
      ));
    return item || undefined;
  }

  async getOrderItemsByOrder(organizationId: number, orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.organizationId, organizationId)
      ));
  }

  async createOrderItem(organizationId: number, insertItem: InsertOrderItem): Promise<OrderItem> {
    // Validate product belongs to organization
    await validateProductOrg(insertItem.productId, organizationId);
    
    const [item] = await db.insert(orderItems)
      .values({ ...insertItem, organizationId })
      .returning();
    return item;
  }

  async updateOrderItem(organizationId: number, id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    // Prevent organizationId changes for security
    const { organizationId: _, ...safeUpdates } = updates;
    
    const [item] = await db
      .update(orderItems)
      .set(safeUpdates)
      .where(and(
        eq(orderItems.id, id),
        eq(orderItems.organizationId, organizationId)
      ))
      .returning();
    return item || undefined;
  }

  async deleteOrderItem(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(orderItems)
      .where(and(
        eq(orderItems.id, id),
        eq(orderItems.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Product Reservations methods
  async getAllProductReservations(organizationId: number): Promise<ProductReservation[]> {
    return await db.select().from(productReservations)
      .where(eq(productReservations.organizationId, organizationId))
      .orderBy(productReservations.createdAt);
  }

  async getProductReservation(organizationId: number, id: number): Promise<ProductReservation | undefined> {
    const [reservation] = await db.select().from(productReservations)
      .where(and(
        eq(productReservations.id, id),
        eq(productReservations.organizationId, organizationId)
      ));
    return reservation || undefined;
  }

  async getReservationsByCustomer(organizationId: number, customerId: number): Promise<ProductReservation[]> {
    await validateCustomerOrg(customerId, organizationId);
    return await db
      .select()
      .from(productReservations)
      .where(and(
        eq(productReservations.customerId, customerId),
        eq(productReservations.organizationId, organizationId)
      ))
      .orderBy(productReservations.createdAt);
  }

  async getReservationsByProduct(organizationId: number, productId: number): Promise<ProductReservation[]> {
    await validateProductOrg(productId, organizationId);
    return await db
      .select()
      .from(productReservations)  
      .where(and(
        eq(productReservations.productId, productId),
        eq(productReservations.organizationId, organizationId)
      ))
      .orderBy(productReservations.createdAt);
  }

  async getActiveReservations(organizationId: number): Promise<ProductReservation[]> {
    return await db
      .select()
      .from(productReservations)
      .where(and(
        eq(productReservations.status, 'active'),
        eq(productReservations.organizationId, organizationId)
      ))
      .orderBy(productReservations.createdAt);
  }

  async createProductReservation(organizationId: number, insertReservation: InsertProductReservation): Promise<ProductReservation> {
    // Validate customer and product belong to organization
    await validateCustomerOrg(insertReservation.customerId, organizationId);
    await validateProductOrg(insertReservation.productId, organizationId);
    
    const [reservation] = await db.insert(productReservations)
      .values({ ...insertReservation, organizationId })
      .returning();
    return reservation;
  }

  async updateReservationStatus(organizationId: number, id: number, status: string): Promise<ProductReservation | undefined> {
    const [reservation] = await db
      .update(productReservations)
      .set({ status })
      .where(and(
        eq(productReservations.id, id),
        eq(productReservations.organizationId, organizationId)
      ))
      .returning();
    return reservation || undefined;
  }

  async deleteProductReservation(organizationId: number, id: number): Promise<boolean> {
    const result = await db.delete(productReservations)
      .where(and(
        eq(productReservations.id, id),
        eq(productReservations.organizationId, organizationId)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Shipment Tracking methods
  async getAllShipmentTracking(): Promise<ShipmentTracking[]> {
    return await db.select().from(shipmentTracking).orderBy(shipmentTracking.createdAt);
  }

  async getShipmentTracking(id: number): Promise<ShipmentTracking | undefined> {
    const [shipment] = await db.select().from(shipmentTracking).where(eq(shipmentTracking.id, id));
    return shipment || undefined;
  }

  async getShipmentByOrder(orderId: number): Promise<ShipmentTracking | undefined> {
    const [shipment] = await db
      .select()
      .from(shipmentTracking)
      .where(eq(shipmentTracking.orderId, orderId));
    return shipment || undefined;
  }

  async getShipmentsByCarrier(carrier: string): Promise<ShipmentTracking[]> {
    return await db
      .select()
      .from(shipmentTracking)
      .where(eq(shipmentTracking.carrier, carrier))
      .orderBy(shipmentTracking.createdAt);
  }

  async createShipmentTracking(insertShipment: InsertShipmentTracking): Promise<ShipmentTracking> {
    const [shipment] = await db.insert(shipmentTracking).values(insertShipment).returning();
    return shipment;
  }

  async updateShipmentStatus(id: number, status: string, events?: any[]): Promise<ShipmentTracking | undefined> {
    const updates: any = { status };
    if (events) updates.trackingEvents = events;

    const [shipment] = await db
      .update(shipmentTracking)
      .set(updates)
      .where(eq(shipmentTracking.id, id))
      .returning();
    return shipment || undefined;
  }

  async deleteShipmentTracking(id: number): Promise<boolean> {
    const result = await db.delete(shipmentTracking).where(eq(shipmentTracking.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Returns methods
  async getAllReturns(): Promise<Return[]> {
    return await db.select().from(returns).orderBy(returns.createdAt);
  }

  async getReturn(id: number): Promise<Return | undefined> {
    const [returnItem] = await db.select().from(returns).where(eq(returns.id, id));
    return returnItem || undefined;
  }

  async getReturnsByCustomer(customerId: number): Promise<Return[]> {
    return await db
      .select()
      .from(returns)
      .where(eq(returns.customerId, customerId))
      .orderBy(returns.createdAt);
  }

  async getReturnsByOrder(orderId: number): Promise<Return[]> {
    return await db
      .select()
      .from(returns)
      .where(eq(returns.orderId, orderId))
      .orderBy(returns.createdAt);
  }

  async getReturnByNumber(returnNumber: string): Promise<Return | undefined> {
    const [returnItem] = await db
      .select()
      .from(returns)
      .where(eq(returns.returnNumber, returnNumber));
    return returnItem || undefined;
  }

  async createReturn(insertReturn: InsertReturn): Promise<Return> {
    const [returnItem] = await db.insert(returns).values(insertReturn).returning();
    return returnItem;
  }

  async updateReturnStatus(id: number, status: string, approvedDate?: Date): Promise<Return | undefined> {
    const updates: any = { status };
    if (approvedDate) updates.approvedDate = approvedDate;

    const [returnItem] = await db
      .update(returns)
      .set(updates)
      .where(eq(returns.id, id))
      .returning();
    return returnItem || undefined;
  }

  async deleteReturn(id: number): Promise<boolean> {
    const result = await db.delete(returns).where(eq(returns.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Return Items methods
  async getAllReturnItems(): Promise<ReturnItem[]> {
    return await db.select().from(returnItems);
  }

  async getReturnItem(id: number): Promise<ReturnItem | undefined> {
    const [item] = await db.select().from(returnItems).where(eq(returnItems.id, id));
    return item || undefined;
  }

  async getReturnItemsByReturn(returnId: number): Promise<ReturnItem[]> {
    return await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, returnId));
  }

  async createReturnItem(insertItem: InsertReturnItem): Promise<ReturnItem> {
    const [item] = await db.insert(returnItems).values(insertItem).returning();
    return item;
  }

  async updateReturnItem(id: number, updates: Partial<ReturnItem>): Promise<ReturnItem | undefined> {
    const [item] = await db
      .update(returnItems)
      .set(updates)
      .where(eq(returnItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteReturnItem(id: number): Promise<boolean> {
    const result = await db.delete(returnItems).where(eq(returnItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Sales Analytics methods
  async getAllSalesAnalytics(): Promise<SalesAnalytics[]> {
    return await db.select().from(salesAnalytics).orderBy(salesAnalytics.date);
  }

  async getSalesAnalytics(id: number): Promise<SalesAnalytics | undefined> {
    const [analytics] = await db.select().from(salesAnalytics).where(eq(salesAnalytics.id, id));
    return analytics || undefined;
  }

  async getSalesAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<SalesAnalytics[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    return await db
      .select()
      .from(salesAnalytics)
      .where(and(gte(salesAnalytics.date, startDateStr), lte(salesAnalytics.date, endDateStr)))
      .orderBy(salesAnalytics.date);
  }

  async getSalesAnalyticsByProduct(productId: number): Promise<SalesAnalytics[]> {
    return await db
      .select()
      .from(salesAnalytics)
      .where(eq(salesAnalytics.productId, productId))
      .orderBy(salesAnalytics.date);
  }

  async getSalesAnalyticsByCategory(category: string): Promise<SalesAnalytics[]> {
    return await db
      .select()
      .from(salesAnalytics)
      .where(eq(salesAnalytics.categoryId, category))
      .orderBy(salesAnalytics.date);
  }

  async createSalesAnalytics(insertAnalytics: InsertSalesAnalytics): Promise<SalesAnalytics> {
    const [analytics] = await db.insert(salesAnalytics).values({
      ...insertAnalytics,
      date: insertAnalytics.date instanceof Date
        ? insertAnalytics.date.toISOString().split("T")[0]
        : insertAnalytics.date,
    }).returning();
    return analytics;
  }

  async updateSalesAnalytics(id: number, updates: Partial<SalesAnalytics>): Promise<SalesAnalytics | undefined> {
    const [analytics] = await db
      .update(salesAnalytics)
      .set(updates)
      .where(eq(salesAnalytics.id, id))
      .returning();
    return analytics || undefined;
  }

  async deleteSale(id: number): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id)).returning();
    return result.length > 0;
  }

  async deleteSalesAnalytics(id: number): Promise<boolean> {
    const result = await db.delete(salesAnalytics).where(eq(salesAnalytics.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Shipping Agencies methods
  async getAllShippingAgencies(): Promise<ShippingAgency[]> {
    return await db.select().from(shippingAgencies).where(eq(shippingAgencies.isActive, true)).orderBy(shippingAgencies.name);
  }

  async getShippingAgency(id: number): Promise<ShippingAgency | undefined> {
    const [agency] = await db.select().from(shippingAgencies).where(eq(shippingAgencies.id, id));
    return agency || undefined;
  }

  async getActiveShippingAgencies(): Promise<ShippingAgency[]> {
    return await db.select().from(shippingAgencies).where(eq(shippingAgencies.isActive, true)).orderBy(shippingAgencies.name);
  }

  async createShippingAgency(agency: InsertShippingAgency): Promise<ShippingAgency> {
    const [createdAgency] = await db.insert(shippingAgencies).values(agency).returning();
    return createdAgency;
  }

  async updateShippingAgency(id: number, agency: Partial<ShippingAgency>): Promise<ShippingAgency | undefined> {
    const [updatedAgency] = await db
      .update(shippingAgencies)
      .set(agency)
      .where(eq(shippingAgencies.id, id))
      .returning();
    return updatedAgency || undefined;
  }

  async deleteShippingAgency(id: number): Promise<boolean> {
    const result = await db.delete(shippingAgencies).where(eq(shippingAgencies.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Shipping Rates methods
  async getAllShippingRates(): Promise<ShippingRate[]> {
    return await db.select().from(shippingRates).where(eq(shippingRates.isActive, true)).orderBy(shippingRates.zoneName, shippingRates.weightMin);
  }

  async getShippingRate(id: number): Promise<ShippingRate | undefined> {
    const [rate] = await db.select().from(shippingRates).where(eq(shippingRates.id, id));
    return rate || undefined;
  }

  async getShippingRatesByAgency(agencyId: number): Promise<ShippingRate[]> {
    return await db.select().from(shippingRates)
      .where(and(eq(shippingRates.agencyId, agencyId), eq(shippingRates.isActive, true)))
      .orderBy(shippingRates.zoneName, shippingRates.weightMin);
  }

  async getShippingRatesByZone(zoneName: string): Promise<ShippingRate[]> {
    return await db.select().from(shippingRates)
      .where(and(eq(shippingRates.zoneName, zoneName), eq(shippingRates.isActive, true)))
      .orderBy(shippingRates.weightMin);
  }

  async getBestShippingRate(weight: number, zoneName: string): Promise<ShippingRate | undefined> {
    const rates = await db.select().from(shippingRates)
      .where(
        and(
          eq(shippingRates.zoneName, zoneName),
          eq(shippingRates.isActive, true),
          lte(sql`CAST(${shippingRates.weightMin} AS DECIMAL)`, weight),
          gte(sql`CAST(${shippingRates.weightMax} AS DECIMAL)`, weight)
        )
      )
      .orderBy(shippingRates.baseCost);
    return rates[0] || undefined;
  }

  async createShippingRate(rate: InsertShippingRate): Promise<ShippingRate> {
    const [createdRate] = await db.insert(shippingRates).values(rate).returning();
    return createdRate;
  }

  async updateShippingRate(id: number, rate: Partial<ShippingRate>): Promise<ShippingRate | undefined> {
    const [updatedRate] = await db
      .update(shippingRates)
      .set(rate)
      .where(eq(shippingRates.id, id))
      .returning();
    return updatedRate || undefined;
  }

  async deleteShippingRate(id: number): Promise<boolean> {
    const result = await db.delete(shippingRates).where(eq(shippingRates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order Shipping methods
  async getAllOrderShipping(): Promise<OrderShipping[]> {
    return await db.select().from(orderShipping).orderBy(orderShipping.createdAt);
  }

  async getOrderShipping(id: number): Promise<OrderShipping | undefined> {
    const [shipping] = await db.select().from(orderShipping).where(eq(orderShipping.id, id));
    return shipping || undefined;
  }

  async getOrderShippingByOrder(orderId: number): Promise<OrderShipping | undefined> {
    const [shipping] = await db.select().from(orderShipping).where(eq(orderShipping.orderId, orderId));
    return shipping || undefined;
  }

  async getOrderShippingByTrackingNumber(trackingNumber: string): Promise<OrderShipping | undefined> {
    const [shipping] = await db.select().from(orderShipping).where(eq(orderShipping.trackingNumber, trackingNumber));
    return shipping || undefined;
  }

  async createOrderShipping(shipping: InsertOrderShipping): Promise<OrderShipping> {
    const [createdShipping] = await db.insert(orderShipping).values(shipping).returning();
    return createdShipping;
  }

  async updateOrderShipping(id: number, shipping: Partial<OrderShipping>): Promise<OrderShipping | undefined> {
    const updates = { ...shipping, updatedAt: new Date() };
    const [updatedShipping] = await db
      .update(orderShipping)
      .set(updates)
      .where(eq(orderShipping.id, id))
      .returning();
    return updatedShipping || undefined;
  }

  async deleteOrderShipping(id: number): Promise<boolean> {
    const result = await db.delete(orderShipping).where(eq(orderShipping.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Shipping Events methods
  async getAllShippingEvents(): Promise<ShippingEvent[]> {
    return await db.select().from(shippingEvents).orderBy(shippingEvents.eventDate);
  }

  async getShippingEvent(id: number): Promise<ShippingEvent | undefined> {
    const [event] = await db.select().from(shippingEvents).where(eq(shippingEvents.id, id));
    return event || undefined;
  }

  async getShippingEventsByOrderShipping(orderShippingId: number): Promise<ShippingEvent[]> {
    return await db.select().from(shippingEvents)
      .where(eq(shippingEvents.orderShippingId, orderShippingId))
      .orderBy(shippingEvents.eventDate);
  }

  async createShippingEvent(event: InsertShippingEvent): Promise<ShippingEvent> {
    const [createdEvent] = await db.insert(shippingEvents).values(event).returning();
    return createdEvent;
  }

  async updateShippingEvent(id: number, event: Partial<ShippingEvent>): Promise<ShippingEvent | undefined> {
    const [updatedEvent] = await db
      .update(shippingEvents)
      .set(event)
      .where(eq(shippingEvents.id, id))
      .returning();
    return updatedEvent || undefined;
  }

  async deleteShippingEvent(id: number): Promise<boolean> {
    const result = await db.delete(shippingEvents).where(eq(shippingEvents.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Logistics Utilities methods
  async calculateShippingCost(weight: number, zoneName: string, agencyId?: number): Promise<{ cost: number; agency: ShippingAgency; rate: ShippingRate } | undefined> {
    let bestRate: ShippingRate | undefined;
    let selectedAgency: ShippingAgency | undefined;

    if (agencyId) {
      // Find best rate for specific agency
      const agencyRates = await this.getShippingRatesByAgency(agencyId);
      bestRate = agencyRates.find(rate => 
        rate.weightMin && rate.weightMax && parseFloat(rate.weightMin) <= weight && parseFloat(rate.weightMax) >= weight && rate.zoneName === zoneName
      );
      if (bestRate) {
        selectedAgency = await this.getShippingAgency(agencyId);
      }
    } else {
      // Find best rate across all agencies
      bestRate = await this.getBestShippingRate(weight, zoneName);
      if (bestRate) {
        selectedAgency = await this.getShippingAgency(bestRate.agencyId);
      }
    }

    if (!bestRate || !selectedAgency) {
      return undefined;
    }

    const baseCost = parseFloat(bestRate.baseCost || '0');
    const costPerKg = parseFloat(bestRate.costPerKg || '0');
    const totalCost = baseCost + (costPerKg * weight);

    return {
      cost: totalCost,
      agency: selectedAgency,
      rate: bestRate
    };
  }

  generateTrackingNumber(agencyCode: string): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${agencyCode}${timestamp}${random}`;
  }

  async updateShippingStatus(orderShippingId: number, status: string, location?: string, description?: string): Promise<void> {
    // Update the order shipping status
    await this.updateOrderShipping(orderShippingId, { status: status as any });

    // Create a new shipping event
    const eventDescription = description || `Status changed to ${status}`;
    await this.createShippingEvent({
      organizationId: 1,
      orderShippingId,
      eventType: status,
      eventDescription,
      eventLocation: location || 'Unknown',
      eventDate: new Date(),
      isPublic: true
    });
  }

  // Authorized Emails - Access Control
  async getAllAuthorizedEmails(): Promise<AuthorizedEmail[]> {
    return await db.select().from(authorizedEmails);
  }

  async getAuthorizedEmail(id: number): Promise<AuthorizedEmail | undefined> {
    const [email] = await db.select().from(authorizedEmails).where(eq(authorizedEmails.id, id));
    return email || undefined;
  }

  async getAuthorizedEmailByEmail(email: string): Promise<AuthorizedEmail | undefined> {
    const normalizedEmail = email.toLowerCase();
    const [result] = await db.select().from(authorizedEmails).where(eq(authorizedEmails.email, normalizedEmail));
    return result || undefined;
  }

  async isEmailAuthorized(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const [result] = await db.select().from(authorizedEmails)
      .where(and(eq(authorizedEmails.email, normalizedEmail), eq(authorizedEmails.isActive, true)));
    return !!result;
  }

  async createAuthorizedEmail(emailData: InsertAuthorizedEmail): Promise<AuthorizedEmail> {
    // Normalize email to lowercase to prevent case-sensitive bypass
    const normalizedData = {
      ...emailData,
      email: emailData.email.toLowerCase()
    };
    const [newEmail] = await db.insert(authorizedEmails).values(normalizedData).returning();
    return newEmail;
  }

  async updateAuthorizedEmail(id: number, data: Partial<AuthorizedEmail>): Promise<AuthorizedEmail | undefined> {
    const [updated] = await db
      .update(authorizedEmails)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(authorizedEmails.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAuthorizedEmail(id: number): Promise<boolean> {
    const result = await db.delete(authorizedEmails).where(eq(authorizedEmails.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Sales - TPV / Point of Sale
  async getAllSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(sales.createdAt);
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getSaleWithItems(id: number): Promise<(Sale & { items: SaleItem[] }) | undefined> {
    const sale = await this.getSale(id);
    if (!sale) return undefined;

    const items = await this.getSaleItems(id);
    return { ...sale, items };
  }

  async getRecentSales(limit: number = 10): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(sales.createdAt).limit(limit);
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return await db.select().from(sales)
      .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)))
      .orderBy(sales.createdAt);
  }

  async getSalesByUser(userId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.userId, userId)).orderBy(sales.createdAt);
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // Verificar cada producto y clasificar por tipo de fulfillment
      const itemsWithFulfillment: (InsertSaleItem & { fulfillmentType: 'stock' | 'dropshipping', supplierId?: number })[] = [];
      
      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }

        // Determinar tipo de fulfillment
        if (product.isDropshipping) {
          // Producto dropshipping - NO verificar stock
          // Verificar que tenga proveedor de dropshipping configurado
          if (!product.dropshippingSupplierId) {
            throw new Error(
              `Producto ${product.name} configurado como dropshipping pero sin proveedor asignado`
            );
          }
          
          itemsWithFulfillment.push({
            ...item,
            fulfillmentType: 'dropshipping',
            supplierId: product.dropshippingSupplierId
          });
        } else {
          // Producto normal - verificar stock disponible
          if (product.currentStock < item.quantity) {
            throw new Error(
              `Stock insuficiente para ${product.name}. ` +
              `Disponible: ${product.currentStock}, Solicitado: ${item.quantity}`
            );
          }
          
          itemsWithFulfillment.push({
            ...item,
            fulfillmentType: 'stock',
            supplierId: product.supplierId || undefined
          });
        }
      }

      // Determinar si la venta tiene items de dropshipping
      const hasDropshippingItems = itemsWithFulfillment.some(item => item.fulfillmentType === 'dropshipping');

      // Crear la venta
      const [newSale] = await tx.insert(sales).values({
        ...sale,
        hasDropshippingItems
      }).returning();

      // Insertar items, actualizar stock, y crear procurement plans automáticos
      for (const item of itemsWithFulfillment) {
        // Insertar item de venta con tipo de fulfillment
        await tx.insert(saleItems).values({
          ...item,
          saleId: newSale.id,
          fulfillmentType: item.fulfillmentType,
          supplierId: item.supplierId
        });

        if (item.fulfillmentType === 'stock') {
          // Producto de inventario normal: actualizar stock
          await tx
            .update(products)
            .set({
              currentStock: sql`${products.currentStock} - ${item.quantity}`
            })
            .where(eq(products.id, item.productId));
        } else if (item.fulfillmentType === 'dropshipping' && item.supplierId) {
          // Producto dropshipping: crear procurement plan automático
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (product) {
            const leadTime = product.dropshippingLeadTimeDays || 30;
            const plannedOrderDate = new Date();
            const expectedDeliveryDate = new Date();
            expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + leadTime);

            await tx.insert(procurementPlans).values({
              organizationId: sale.organizationId,
              productId: item.productId,
              supplierId: item.supplierId,
              plannedOrderDate,
              expectedDeliveryDate,
              quantity: item.quantity,
              status: 'ordered',
              notes: `Pedido automático por venta dropshipping #${newSale.id}. Cliente: ${sale.customerName || 'N/A'}. Dirección: ID ${sale.shippingAddressId || 'sin dirección'}.`
            });
          }
        }
      }

      return newSale;
    });
  }

  async getSaleItems(saleId: number): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  // ── Password Reset Tokens ───────────────────────────────────────────────────

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void> {
    await db.insert(passwordResetTokens).values(data);
  }

  async getPasswordResetToken(
    token: string
  ): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return row as any || undefined;
  }

  async deletePasswordResetTokensByUserId(userId: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  // ── Email Verification ──────────────────────────────────────────────────────

  async createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date }): Promise<void> {
    await db.insert(emailVerificationTokens).values(data);
  }

  async getEmailVerificationToken(
    token: string
  ): Promise<{ id: number; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return row as any || undefined;
  }

  async markEmailVerificationTokenUsed(id: number): Promise<void> {
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }

  async deleteEmailVerificationTokensByUserId(userId: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  }

  // ── Billing / Subscriptions ─────────────────────────────────────────────────

  async getSubscriptionByOrgId(organizationId: number): Promise<Subscription | undefined> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId));
    return row ?? undefined;
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
  }

  async updateSubscription(
    organizationId: number,
    data: Partial<Subscription>
  ): Promise<Subscription | undefined> {
    const [row] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.organizationId, organizationId))
      .returning();
    return row ?? undefined;
  }

  async upsertSubscription(data: InsertSubscription): Promise<Subscription> {
    const existing = await this.getSubscriptionByOrgId(data.organizationId);
    if (existing) {
      const updated = await this.updateSubscription(data.organizationId, data as Partial<Subscription>);
      return updated!;
    }
    return this.createSubscription(data);
  }

  // ── User Invitations ─────────────────────────────────────────────────────────────────────

  async createInvitation(data: InsertUserInvitation): Promise<UserInvitation> {
    const [inv] = await db.insert(userInvitations).values(data as any).returning();
    return inv;
  }

  async getInvitationByToken(token: string): Promise<UserInvitation | undefined> {
    const [inv] = await db.select().from(userInvitations).where(eq(userInvitations.token, token));
    return inv ?? undefined;
  }

  async getInvitationsByOrg(organizationId: number): Promise<UserInvitation[]> {
    return db.select().from(userInvitations)
      .where(eq(userInvitations.organizationId, organizationId));
  }

  async acceptInvitation(id: number): Promise<void> {
    await db.update(userInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitations.id, id));
  }

  async deleteInvitation(id: number): Promise<void> {
    await db.delete(userInvitations).where(eq(userInvitations.id, id));
  }
}

export const storage = new DatabaseStorage();
