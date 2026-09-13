import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { registerErpRoutes } from "./erp-routes";
import { registerSgaRoutes } from "./sga-routes";
import { 
  insertProductSchema, 
  insertStockMovementSchema, 
  insertWarehouseZoneSchema,
  insertSupplierSchema,
  insertProcurementPlanSchema,
  insertProductReservationSchema,
  insertSaleSchema,
  insertSaleItemSchema,
  shippingAgencies,
  shippingRates,
  orderShipping,
  shippingEvents,
  insertRoleSchema,
  insertUserRoleSchema,
  authorizedEmails,
  insertAuthorizedEmailSchema,
  stockMovements,
  products,
  organizations
} from "@shared/schema";
import { z } from "zod";
import { eq, and, lte, gte } from "drizzle-orm";
import { isAuthenticated, hasRole, hasPermission, adminOnly, hasAnyPermission, getUserPermissionsHandler, setupAuth, getSession } from "./replitAuth";
import passport from "passport";
import { assignAdminToFirstUser } from "./init-security";
import { OrganizationMismatchError } from "./multi-tenant-guards";
import { ExportService } from "./services/exportService";
import { importService } from "./services/importService";
import { aiPredictiveService } from "./services/aiPredictiveService";
import { inventoryAnalyticsService } from "./services/inventoryAnalytics";
import multer from 'multer';
import OpenAI from 'openai';
import bcrypt from "bcryptjs";
import express from "express";
import {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
  sendInvitationEmail,
  sendLowStockAlertEmail,
  sendInvoiceEmail,
  sendTrialExpiryEmail,
} from "./services/emailService";
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  mapStripeStatus,
  mapPriceIdToPlan,
  getPriceId,
  PLANS,
} from "./services/stripeService";

// Initialize OpenAI - make it optional
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Local semantic expansion dictionary for common search terms
const semanticExpansions: Record<string, string[]> = {
  'clientes': ['cliente', 'clientes', 'empresa', 'empresas', 'comprador', 'compradores', 'cuenta', 'cuentas', 'destinatario'],
  'cliente': ['cliente', 'clientes', 'empresa', 'comprador', 'cuenta', 'destinatario'],
  'productos': ['producto', 'productos', 'artículo', 'artículos', 'material', 'referencia', 'referencias', 'sku', 'item', 'items'],
  'producto': ['producto', 'productos', 'artículo', 'artículos', 'material', 'referencia', 'sku', 'item'],
  'proveedores': ['proveedor', 'proveedores', 'supplier', 'fabricante', 'distribuidor', 'suministrador'],
  'proveedor': ['proveedor', 'proveedores', 'supplier', 'fabricante', 'distribuidor'],
  'stock': ['stock', 'inventario', 'existencias', 'almacén', 'disponible', 'unidades'],
  'inventario': ['inventario', 'stock', 'existencias', 'almacén', 'disponible'],
  'almacen': ['almacén', 'almacen', 'bodega', 'depósito', 'zona', 'ubicación'],
  'zona': ['zona', 'zonas', 'ubicación', 'ubicaciones', 'estantería', 'pasillo', 'almacén'],
  'movimientos': ['movimiento', 'movimientos', 'entrada', 'salida', 'transferencia', 'ajuste'],
  'compras': ['compra', 'compras', 'aprovisionamiento', 'procurement', 'reposición'],
  'devoluciones': ['devolución', 'devoluciones', 'devolucion', 'return', 'retorno', 'reembolso'],
  'envio': ['envío', 'envio', 'envíos', 'entrega', 'expedición', 'transporte', 'tracking', 'paquete'],
  'pedido': ['pedido', 'pedidos', 'orden', 'ordenes', 'compra', 'venta'],
  'pedidos': ['pedido', 'pedidos', 'orden', 'ordenes', 'compra', 'venta', 'envío']
};

// AI-powered search query expansion with local fallback
async function expandSearchQuery(query: string): Promise<string[]> {
  const queryLower = query.toLowerCase().trim();
  
  // Try local semantic expansion first (fast and no API cost)
  const localExpansion = semanticExpansions[queryLower];
  if (localExpansion) {
    console.log(`[Local Search] Query "${query}" expanded locally to: [${localExpansion.join(', ')}]`);
    return [...new Set([query, ...localExpansion])];
  }
  
  // Try AI expansion if OpenAI is available
  if (process.env.OPENAI_API_KEY && openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Eres un asistente que ayuda a expandir consultas de búsqueda en un sistema de gestión de inventario y logística.
            Dado un término de búsqueda, proporciona palabras relacionadas y sinónimos relevantes en español.
            Responde SOLO con una lista de términos separados por comas, sin explicaciones adicionales.
            Incluye el término original y sus variaciones.`
          },
          {
            role: "user",
            content: `Término de búsqueda: "${query}". Proporciona términos relacionados para buscar en: productos (referencias, SKU), clientes (empresas y compradores), proveedores, pedidos, zonas de almacén, y movimientos de stock.`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const expandedTerms = completion.choices[0]?.message?.content
        ?.split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0) || [query];

      console.log(`[AI Search] Query "${query}" expanded by AI to: [${expandedTerms.join(', ')}]`);
      return [...new Set([query, ...expandedTerms])];
    } catch (error: any) {
      if (error?.status === 429) {
        console.log(`[AI Search] OpenAI quota exceeded, using standard search for "${query}"`);
      } else {
        console.error("[AI Search] Error expanding search query with AI:", error);
      }
      // Fall through to standard search
    }
  }
  
  // Standard search as final fallback
  console.log(`[Standard Search] Using direct search for "${query}"`);
  return [query];
}

// Configurar multer para manejar archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB límite
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos Excel (.xlsx, .xls) y CSV (.csv)'));
    }
  }
});

/**
 * Extract organizationId from authenticated user session
 * Throws 400 error if not found
 */
function getOrganizationId(req: any, res: any): number | null {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    res.status(400).json({ message: "Organization ID not found in session" });
    return null;
  }
  return organizationId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // setupAuth handles sessions, passport, local login/logout routes.
  // Replit OIDC is only wired when USE_REPLIT_AUTH=true (see replitAuth.ts).
  await setupAuth(app);

  // ── Authentication Routes ─────────────────────────────────────────────────

  /** GET /api/auth/user — returns current user + permissions */
  app.get("/api/auth/user", isAuthenticated, getUserPermissionsHandler);

  /**
   * POST /api/auth/register
   * Creates a brand-new organization + admin user in a single transaction.
   * Body: { email, password, firstName, lastName, companyName, country? }
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, companyName, country } = req.body;

      if (!email || !password || !companyName) {
        return res.status(400).json({ message: "Email, contraseña y nombre de empresa son obligatorios" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Ya existe una cuenta con ese email" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName: firstName?.trim() || "",
        lastName: lastName?.trim() || "",
      } as any);

      // Generate unique slug for the new organization
      const baseSlug = String(companyName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      // Create organization owned exclusively by this user
      const org = await storage.createOrganization({
        name: companyName.trim(),
        slug: uniqueSlug,
        country: country || "Spain",
        currency: "EUR",
        language: "es",
        plan: "free",
        isActive: true,
      } as any);

      // Link user ↔ org as owner/admin
      await storage.createOrganizationUser({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
        isActive: true,
      } as any);

      // Assign admin RBAC role
      const adminRole = await storage.getRoleByName("admin");
      if (adminRole) {
        await storage.createUserRole({
          userId: user.id,
          roleId: adminRole.id,
          assignedBy: user.id,
        } as any);
      }

      // Auto-create 14-day trial subscription (no Stripe key required yet)
      try {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        await storage.createSubscription({
          organizationId: org.id,
          plan: "starter",
          status: "trialing",
          trialStart: new Date(),
          trialEnd,
        } as any);
      } catch (subErr) {
        // Non-fatal: subscription can be created later
        console.warn("Could not create trial subscription:", subErr);
      }

      // Send email verification (non-fatal)
      try {
        const { randomUUID } = await import("crypto");
        const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
        const verifyToken = randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await storage.createEmailVerificationToken({ userId: user.id, token: verifyToken, expiresAt });
        const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
        await sendEmailVerificationEmail(
          user.email!,
          verifyUrl,
          (user as any).firstName ?? user.email!.split("@")[0]
        );
      } catch (emailErr) {
        console.warn("Could not send verification email:", emailErr);
      }

      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: org.id,
      };

      req.login(sessionUser, (err) => {
        if (err) return res.status(500).json({ message: "Error creando sesión" });
        res.status(201).json({ success: true, user: sessionUser });
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Error registrando usuario" });
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña obligatorios" });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail) as any;

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const userOrgs = await storage.getUserOrganizations(user.id);
      const organizationId = userOrgs[0]?.organizationId;

      if (!organizationId) {
        return res.status(403).json({ message: "Usuario sin organización asignada" });
      }

      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId,
      };

      req.login(sessionUser, (err) => {
        if (err) return res.status(500).json({ message: "Error iniciando sesión" });
        res.json({ success: true, user: sessionUser });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error iniciando sesión" });
    }
  });

  /**
   * GET /api/auth/verify-email?token=xxx
   * Public endpoint — verifies email and marks user as verified.
   */
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query as { token?: string };
      if (!token) return res.status(400).json({ message: "Token requerido" });

      const record = await storage.getEmailVerificationToken(token);
      if (!record) return res.status(400).json({ message: "Token inválido o ya usado" });
      if (record.usedAt) return res.status(400).json({ message: "Este enlace ya fue utilizado" });
      if (new Date() > record.expiresAt) return res.status(400).json({ message: "El enlace ha caducado. Solicita uno nuevo." });

      // Mark email as verified
      await storage.updateUser(record.userId, { emailVerified: true } as any);
      await storage.markEmailVerificationTokenUsed(record.id);

      // Send welcome email now that email is confirmed
      try {
        const user = await storage.getUser(record.userId);
        if (user) {
          const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
          const orgUsers = await storage.getUserOrganizations(user.id);
          const orgId = orgUsers?.[0]?.organizationId;
          const allOrgs = await storage.getAllOrganizations();
          const org = orgId ? allOrgs.find(o => o.id === orgId) : null;
          const orgName = org?.name ?? "tu empresa";
          await sendWelcomeEmail(
            user.email!,
            (user as any).firstName ?? user.email!.split("@")[0],
            orgName,
            `${appUrl}/`
          );
        }
      } catch { /* non-fatal */ }

      res.json({ success: true, message: "Email verificado correctamente. ¡Bienvenido a LogiPro!" });
    } catch (err) {
      console.error("verify-email error:", err);
      res.status(500).json({ message: "Error verificando email" });
    }
  });

  /**
   * POST /api/auth/resend-verification
   * Authenticated — resends the verification email to the logged-in user.
   */
  app.post("/api/auth/resend-verification", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      if ((user as any).emailVerified) return res.status(400).json({ message: "El email ya está verificado" });

      // Delete old tokens and create new one
      const { randomUUID: newUUID } = await import("crypto");
      await storage.deleteEmailVerificationTokensByUserId(userId);
      const verifyToken = newUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createEmailVerificationToken({ userId, token: verifyToken, expiresAt });

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;
      await sendEmailVerificationEmail(
        user.email!,
        verifyUrl,
        (user as any).firstName ?? user.email!.split("@")[0]
      );

      res.json({ success: true, message: "Email de verificación reenviado" });
    } catch (err) {
      console.error("resend-verification error:", err);
      res.status(500).json({ message: "Error reenviando verificación" });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Generates a one-time reset token and (in production) sends an email.
   * Body: { email }
   */
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email obligatorio" });

      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail) as any;

      // Always return 200 to avoid user enumeration attacks
      if (!user) {
        return res.json({ message: "Si existe una cuenta con ese email recibirás instrucciones en breve." });
      }

      // Generate secure random token (32 bytes hex = 64 chars)
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate old tokens for this user first
      await storage.deletePasswordResetTokensByUserId(user.id);

      // Store new token
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      // Send email (non-fatal: always return 200 to avoid user enumeration)
      const emailResult = await sendPasswordResetEmail(
        normalizedEmail,
        resetUrl,
        user.firstName ?? undefined
      );

      if (!emailResult.success && process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Password reset URL for ${normalizedEmail}: ${resetUrl}`);
        return res.json({
          message: "Token generado. Email no enviado (RESEND_API_KEY no configurado).",
          resetUrl,
        });
      }

      res.json({ message: "Si existe una cuenta con ese email recibirás instrucciones en breve." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Error procesando solicitud" });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Body: { token, newPassword }
   */
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token y nueva contraseña obligatorios" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "Este enlace ya fue utilizado" });
      }
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "El enlace ha expirado. Solicita uno nuevo." });
      }

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await storage.updateUserPassword(resetToken.userId, passwordHash);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ success: true, message: "Contraseña actualizada correctamente" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Error actualizando contraseña" });
    }
  });

  // Quick suggestions endpoint (no AI - instant responses for autocomplete)
  app.get("/api/search/suggestions", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ 
          query: q || '',
          total: 0,
          results: {
            products: [],
            customers: [],
            orders: [],
            suppliers: [],
            zones: [],
            movements: [],
            all: []
          }
        });
      }

      const query = q.toLowerCase();
      
      const results: any = {
        products: [],
        customers: [],
        orders: [],
        suppliers: [],
        zones: [],
        movements: []
      };
      
      // Get quick suggestions from products (names, SKUs, categories)
      const products = await storage.getAllProducts(orgId);
      results.products = products
        .filter((p: any) => 
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
        )
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          type: 'product',
          title: p.name,
          subtitle: `SKU: ${p.sku} | Stock: ${p.stockActual}`,
          category: p.category,
          url: `/product/${p.id}`
        }));
      
      // TODO: Uncomment when Customers slice is completed
      // Get customer suggestions
      // const customers = await storage.getAllCustomers(orgId);
      // results.customers = customers
      //   .filter((c: any) => c.name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query))
      //   .slice(0, 3)
      //   .map((c: any) => ({
      //     id: c.id,
      //     type: 'customer',
      //     title: c.name,
      //     subtitle: c.email,
      //     category: 'Cliente',
      //     url: `/customers`
      //   }));
      
      // TODO: Uncomment when Suppliers slice is completed
      // Get supplier suggestions
      // const suppliers = await storage.getAllSuppliers(orgId);
      // results.suppliers = suppliers
      //   .filter((s: any) => s.name?.toLowerCase().includes(query))
      //   .slice(0, 3)
      //   .map((s: any) => ({
      //     id: s.id,
      //     type: 'supplier',
      //     title: s.name,
      //     subtitle: s.contactEmail,
      //     category: s.category || 'Proveedor',
      //     url: `/suppliers`
      //   }));
      
      // Flatten all results
      const allResults = [
        ...results.products
        // TODO: Uncomment when Customers and Suppliers slices are completed
        // ...results.customers,
        // ...results.suppliers
      ];
      
      res.json({ 
        query,
        total: allResults.length,
        results: {
          ...results,
          all: allResults.slice(0, 10)
        }
      });
    } catch (error) {
      console.error('[Suggestions Error]:', error);
      res.status(500).json({ message: "Error al obtener sugerencias" });
    }
  });

  // Search Routes with AI-powered query expansion (now only uses AI as fallback)
  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const { q, type } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const query = q.toLowerCase();
      
      const results: {
        products: any[],
        customers: any[],
        orders: any[],
        suppliers: any[],
        zones: any[],
        movements: any[]
      } = {
        products: [],
        customers: [],
        orders: [],
        suppliers: [],
        zones: [],
        movements: []
      };
      
      // STEP 1: First try direct search (no AI - fast and free)
      console.log(`[Direct Search] Searching for "${query}" in database...`);
      
      // Helper function to search with a single term
      const searchWithTerm = async (searchTerm: string) => {
        const localResults = { ...results };
        
        // Search in products
        if (!type || type === 'products') {
          const products = await storage.getAllProducts(orgId);
          localResults.products = products.filter((product: any) => 
            product.name?.toLowerCase().includes(searchTerm) ||
            product.sku?.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm)
          ).slice(0, 5).map((product: any) => ({
            id: product.id,
            type: 'product',
            title: product.name,
            subtitle: `SKU: ${product.sku} | Stock: ${product.stockActual}`,
            category: product.category,
            url: `/product/${product.id}`
          }));
        }

        // TODO: Uncomment when Customers slice is completed
        // Search in customers
        // if (!type || type === 'customers') {
        //   const customers = await storage.getAllCustomers(orgId);
        //   localResults.customers = customers.filter((customer: any) => 
        //     customer.name?.toLowerCase().includes(searchTerm) ||
        //     customer.email?.toLowerCase().includes(searchTerm) ||
        //     customer.phone?.toLowerCase().includes(searchTerm)
        //   ).slice(0, 5).map((customer: any) => ({
        //     id: customer.id,
        //     type: 'customer',
        //     title: customer.name,
        //     subtitle: customer.email,
        //     category: 'Cliente',
        //     url: `/customers`
        //   }));
        // }

        // TODO: Uncomment when Suppliers slice is completed
        // Search in suppliers
        // if (!type || type === 'suppliers') {
        //   const suppliers = await storage.getAllSuppliers(orgId);
        //   localResults.suppliers = suppliers.filter((supplier: any) => 
        //     supplier.name?.toLowerCase().includes(searchTerm) ||
        //     supplier.contactEmail?.toLowerCase().includes(searchTerm)
        //   ).slice(0, 5).map((supplier: any) => ({
        //     id: supplier.id,
        //     type: 'supplier',
        //     title: supplier.name,
        //     subtitle: supplier.contactEmail,
        //     category: supplier.category || 'Proveedor',
        //     url: `/suppliers`
        //   }));
        // }

        // Search in zones
        if (!type || type === 'zones') {
          const zones = await storage.getAllWarehouseZones(orgId);
          localResults.zones = zones.filter((zone: any) => 
            zone.name?.toLowerCase().includes(searchTerm) ||
            zone.code?.toLowerCase().includes(searchTerm) ||
            zone.description?.toLowerCase().includes(searchTerm)
          ).slice(0, 5).map((zone: any) => ({
            id: zone.id,
            type: 'zone',
            title: zone.name,
            subtitle: `Código: ${zone.code} | Ocupación: ${zone.currentOccupancy}/${zone.capacity}`,
            category: 'Zona',
            url: `/zone/${zone.id}`
          }));
        }
        
        return localResults;
      };
      
      // Try direct search first
      const directResults = await searchWithTerm(query);
      const totalDirectResults = Object.values(directResults).flat().length;
      
      // If we found results with direct search, use them!
      if (totalDirectResults > 0) {
        console.log(`[Direct Search] ✓ Found ${totalDirectResults} results without AI`);
        Object.assign(results, directResults);
      } else {
        // STEP 2: No direct results - try AI expansion as fallback
        console.log(`[Direct Search] ✗ No results found, trying AI expansion...`);
        const searchTerms = await expandSearchQuery(query);
        console.log(`[AI Search] Original: "${query}" -> Expanded: [${searchTerms.join(', ')}]`);
        
        // Detect if user is searching for a category
        const isCategorySearch = {
          products: searchTerms.some(t => ['producto', 'productos', 'artículo', 'material', 'equipo'].includes(t)),
          customers: searchTerms.some(t => ['cliente', 'clientes'].includes(t)),
          suppliers: searchTerms.some(t => ['proveedor', 'proveedores', 'supplier', 'fabricante'].includes(t)),
          zones: searchTerms.some(t => ['zona', 'zonas', 'almacén', 'bodega'].includes(t)),
          orders: searchTerms.some(t => ['pedido', 'pedidos', 'orden', 'ordenes'].includes(t)),
          movements: searchTerms.some(t => ['movimiento', 'movimientos', 'stock'].includes(t))
        };

        // Search in products with expanded terms
        if (!type || type === 'products') {
          const products = await storage.getAllProducts(orgId);
          
          // If searching for "productos" category, return all products
          if (isCategorySearch.products) {
          results.products = products.slice(0, 5).map((product: any) => ({
            id: product.id,
            type: 'product',
            title: product.name,
            subtitle: `SKU: ${product.sku} | Stock: ${product.stockActual}`,
            category: product.category,
            url: `/product/${product.id}`
          }));
        } else {
          // Otherwise, filter by search terms
          results.products = products.filter((product: any) => 
            searchTerms.some(term => 
              product.name?.toLowerCase().includes(term) ||
              product.sku?.toLowerCase().includes(term) ||
              product.category?.toLowerCase().includes(term)
            )
          ).slice(0, 5).map((product: any) => ({
            id: product.id,
            type: 'product',
            title: product.name,
            subtitle: `SKU: ${product.sku} | Stock: ${product.stockActual}`,
            category: product.category,
            url: `/product/${product.id}`
          }));
          }
        }

        // TODO: Uncomment when Customers slice is completed
        // Search in customers with expanded terms
        // if (!type || type === 'customers') {
        // const customers = await storage.getAllCustomers(orgId);
        // 
        // // If searching for "clientes" category, return all customers
        // if (isCategorySearch.customers) {
        //   results.customers = customers.slice(0, 5).map((customer: any) => ({
        //     id: customer.id,
        //     type: 'customer',
        //     title: customer.name,
        //     subtitle: customer.email,
        //     category: 'Cliente',
        //     url: `/customers`
        //   }));
        // } else {
        //   // Otherwise, filter by search terms
        //   results.customers = customers.filter((customer: any) => 
        //     searchTerms.some(term =>
        //       customer.name?.toLowerCase().includes(term) ||
        //       customer.email?.toLowerCase().includes(term) ||
        //       customer.phone?.toLowerCase().includes(term) ||
        //       customer.address?.toLowerCase().includes(term)
        //     )
        //   ).slice(0, 5).map((customer: any) => ({
        //     id: customer.id,
        //     type: 'customer',
        //     title: customer.name,
        //     subtitle: customer.email,
        //     category: 'Cliente',
        //     url: `/customers`
        //   }));
        //   }
        // }

        // TODO: Uncomment when Orders slice is completed
        // Search in orders with expanded terms
        // if (!type || type === 'orders') {
        // const orders = await storage.getAllCustomerOrders(orgId);
        // 
        // // If searching for "pedidos" category, return all orders
        // if (isCategorySearch.orders) {
        //   results.orders = orders.slice(0, 5).map((order: any) => ({
        //     id: order.id,
        //     type: 'order',
        //     title: `Pedido ${order.orderNumber}`,
        //     subtitle: `Estado: ${order.status} | Total: €${order.totalAmount}`,
        //     category: 'Pedido',
        //     url: `/orders`
        //   }));
        // } else {
        //   // Otherwise, filter by search terms
        //   results.orders = orders.filter((order: any) => 
        //     searchTerms.some(term =>
        //       order.orderNumber?.toLowerCase().includes(term) ||
        //       order.status?.toLowerCase().includes(term)
        //     )
        //   ).slice(0, 5).map((order: any) => ({
        //     id: order.id,
        //     type: 'order',
        //     title: `Pedido ${order.orderNumber}`,
        //     subtitle: `Estado: ${order.status} | Total: €${order.totalAmount}`,
        //     category: 'Pedido',
        //     url: `/orders`
        //   }));
        //   }
        // }

        // TODO: Uncomment when Suppliers slice is completed
        // Search in suppliers with expanded terms
        // if (!type || type === 'suppliers') {
        // const suppliers = await storage.getAllSuppliers(orgId);
        // 
        // // If searching for "proveedores" category, return all suppliers
        // if (isCategorySearch.suppliers) {
        //   results.suppliers = suppliers.slice(0, 5).map((supplier: any) => ({
        //     id: supplier.id,
        //     type: 'supplier',
        //     title: supplier.name,
        //     subtitle: supplier.contactEmail,
        //     category: supplier.category || 'Proveedor',
        //     url: `/suppliers`
        //   }));
        // } else {
        //   // Otherwise, filter by search terms
        //   results.suppliers = suppliers.filter((supplier: any) => 
        //     searchTerms.some(term =>
        //       supplier.name?.toLowerCase().includes(term) ||
        //       supplier.contactEmail?.toLowerCase().includes(term) ||
        //       supplier.category?.toLowerCase().includes(term) ||
        //       supplier.contactPerson?.toLowerCase().includes(term)
        //     )
        //   ).slice(0, 5).map((supplier: any) => ({
        //     id: supplier.id,
        //     type: 'supplier',
        //     title: supplier.name,
        //     subtitle: supplier.contactEmail,
        //     category: supplier.category || 'Proveedor',
        //     url: `/suppliers`
        //   }));
        //   }
        // }

        // Search in warehouse zones with expanded terms
        if (!type || type === 'zones') {
        const zones = await storage.getAllWarehouseZones(orgId);
        
        // If searching for "zonas" category, return all zones
        if (isCategorySearch.zones) {
          results.zones = zones.slice(0, 5).map((zone: any) => ({
            id: zone.id,
            type: 'zone',
            title: zone.name,
            subtitle: `Código: ${zone.code} | Ocupación: ${zone.currentOccupancy}/${zone.capacity}`,
            category: 'Zona',
            url: `/zone/${zone.id}`
          }));
        } else {
          // Otherwise, filter by search terms
          results.zones = zones.filter((zone: any) => 
            searchTerms.some(term =>
              zone.name?.toLowerCase().includes(term) ||
              zone.code?.toLowerCase().includes(term) ||
              zone.description?.toLowerCase().includes(term)
            )
          ).slice(0, 5).map((zone: any) => ({
            id: zone.id,
            type: 'zone',
            title: zone.name,
            subtitle: `Código: ${zone.code} | Ocupación: ${zone.currentOccupancy}/${zone.capacity}`,
            category: 'Zona',
            url: `/zone/${zone.id}`
          }));
          }
        }

        // TODO: Uncomment when StockMovements slice is completed
        // Search in stock movements
        // if (!type || type === 'movements') {
        // const movements = await storage.getAllStockMovements(orgId);
        // const productsMap = new Map();
        // const products = await storage.getAllProducts(orgId);
        // products.forEach((p: any) => productsMap.set(p.id, p));
        //
        // results.movements = movements.filter((movement: any) => {
        //   const product = productsMap.get(movement.productId);
        //   return product && searchTerms.some(term =>
        //     product.name?.toLowerCase().includes(term) ||
        //     movement.type?.toLowerCase().includes(term) ||
        //     movement.reason?.toLowerCase().includes(term)
        //   );
        // }).slice(0, 5).map((movement: any) => {
        //   const product = productsMap.get(movement.productId);
        //   return {
        //     id: movement.id,
        //     type: 'movement',
        //     title: `${movement.type} - ${product?.name || 'Producto'}`,
        //     subtitle: `Cantidad: ${movement.quantity} | ${movement.date}`,
        //     category: 'Movimiento',
        //     url: `/movements`
        //   };
        // });
        // }
      }

      // Flatten all results for quick access
      const allResults = [
        ...results.products,
        ...results.customers,
        ...results.orders,
        ...results.suppliers,
        ...results.zones,
        ...results.movements
      ];

      res.json({
        query,
        total: allResults.length,
        results: {
          ...results,
          all: allResults.slice(0, 10) // Top 10 overall results
        }
      });

    } catch (error: unknown) {
      console.error("Error in search:", error);
      res.status(500).json({ message: "Error performing search" });
    }
  });

  // Admin Routes - User Management
  app.get("/api/admin/users", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          const userWithRoles = await storage.getUserWithRoles(user.id);
          return userWithRoles;
        })
      );
      res.json(usersWithRoles);
    } catch (error: unknown) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.post("/api/admin/users/:userId/roles", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = z.object({ roleId: z.number() }).parse(req.body);
      
      const userRole = await storage.assignRole({ userId, roleId });
      res.status(201).json(userRole);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error assigning role:", error);
      res.status(500).json({ message: "Error assigning role" });
    }
  });

  app.delete("/api/admin/users/:userId/roles/:roleId", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      const success = await storage.removeUserRole(userId, parseInt(roleId));
      
      if (!success) {
        return res.status(404).json({ message: "User role not found" });
      }
      
      res.json({ message: "Role removed successfully" });
    } catch (error: unknown) {
      console.error("Error removing role:", error);
      res.status(500).json({ message: "Error removing role" });
    }
  });

  // Authorized Emails - Access Control
  app.get("/api/admin/authorized-emails", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const emails = await storage.getAllAuthorizedEmails();
      res.json(emails);
    } catch (error: unknown) {
      console.error("Error fetching authorized emails:", error);
      res.status(500).json({ message: "Error fetching authorized emails" });
    }
  });

  app.post("/api/admin/authorized-emails", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const user = (req.user as any);
      const userId = user?.claims?.sub;
      
      const emailData = insertAuthorizedEmailSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const newEmail = await storage.createAuthorizedEmail(emailData);
      res.status(201).json(newEmail);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating authorized email:", error);
      res.status(500).json({ message: "Error creating authorized email" });
    }
  });

  app.patch("/api/admin/authorized-emails/:id", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive, plan } = req.body;
      
      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (plan !== undefined) updateData.plan = plan;
      
      const updated = await storage.updateAuthorizedEmail(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Authorized email not found" });
      }
      
      res.json(updated);
    } catch (error: unknown) {
      console.error("Error updating authorized email:", error);
      res.status(500).json({ message: "Error updating authorized email" });
    }
  });

  app.delete("/api/admin/authorized-emails/:id", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAuthorizedEmail(id);
      
      if (!success) {
        return res.status(404).json({ message: "Authorized email not found" });
      }
      
      res.status(204).send();
    } catch (error: unknown) {
      console.error("Error deleting authorized email:", error);
      res.status(500).json({ message: "Error deleting authorized email" });
    }
  });

  // Data Simulation - Generate historical stock movements
  app.post("/api/admin/simulate-data", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const { daysBack = 180, intensity = 'medium', productIds } = req.body;
      
      console.log(`🎲 Starting data simulation: ${daysBack} days, intensity: ${intensity}`);
      
      // Get all products or specific ones
      const allProducts = await storage.getAllProducts(orgId);
      const productsToSimulate = productIds && productIds.length > 0
        ? allProducts.filter((p: any) => productIds.includes(p.id))
        : allProducts;
      
      if (productsToSimulate.length === 0) {
        return res.status(400).json({ message: "No products found for simulation" });
      }

      // Intensity configuration
      const intensityConfig = {
        low: { exitChance: 0.3, exitQtyMin: 1, exitQtyMax: 5 },
        medium: { exitChance: 0.5, exitQtyMin: 2, exitQtyMax: 10 },
        high: { exitChance: 0.7, exitQtyMin: 5, exitQtyMax: 20 }
      };
      
      const config = intensityConfig[intensity as keyof typeof intensityConfig] || intensityConfig.medium;
      
      let movementsCreated = 0;
      const productStocks: { [key: number]: number } = {};
      const movementsToInsert: any[] = [];
      
      // Initialize stock tracking
      productsToSimulate.forEach((p: any) => {
        productStocks[p.id] = p.currentStock;
      });
      
      // Generate movements for each day from past to present
      const now = new Date();
      for (let dayOffset = daysBack; dayOffset >= 0; dayOffset--) {
        const movementDate = new Date(now);
        movementDate.setDate(movementDate.getDate() - dayOffset);
        
        for (const product of productsToSimulate) {
          const currentStock = productStocks[product.id];
          
          // Random chance of exit (sale)
          if (Math.random() < config.exitChance && currentStock > 0) {
            const maxExit = Math.min(currentStock, config.exitQtyMax);
            const exitQty = Math.floor(Math.random() * (maxExit - config.exitQtyMin + 1)) + config.exitQtyMin;
            
            if (exitQty > 0 && exitQty <= currentStock) {
              movementsToInsert.push({
                productId: product.id,
                type: 'exit',
                quantity: exitQty,
                reason: 'Venta simulada',
                notes: `Simulación automática - ${movementDate.toLocaleDateString()}`,
                createdAt: movementDate
              });
              
              productStocks[product.id] -= exitQty;
              movementsCreated++;
            }
          }
          
          // Check if we need to restock (below reorder point)
          const reorderPoint = product.reorderPoint || Math.floor(product.minStock * 1.5);
          if (productStocks[product.id] < reorderPoint) {
            const orderQty = product.orderQuantity || Math.floor(product.maxStock * 0.6);
            
            movementsToInsert.push({
              productId: product.id,
              type: 'entry',
              quantity: orderQty,
              reason: 'Reposición automática',
              notes: `Simulación - Reorden por bajo stock (${productStocks[product.id]} < ${reorderPoint})`,
              createdAt: movementDate
            });
            
            productStocks[product.id] += orderQty;
            movementsCreated++;
          }
        }
      }
      
      // Insert all movements at once (much more efficient)
      if (movementsToInsert.length > 0) {
        // Insert in batches of 1000 to avoid query size limits
        const batchSize = 1000;
        for (let i = 0; i < movementsToInsert.length; i += batchSize) {
          const batch = movementsToInsert.slice(i, i + batchSize);
          await db.insert(stockMovements).values(batch);
        }
      }
      
      // Update product stocks to final values
      for (const product of productsToSimulate) {
        const finalStock = productStocks[product.id];
        await db.update(products)
          .set({ currentStock: Math.max(0, finalStock) })
          .where(eq(products.id, product.id));
      }
      
      console.log(`✅ Simulation complete: ${movementsCreated} movements created`);
      
      res.json({
        success: true,
        movementsCreated,
        productsAffected: productsToSimulate.length,
        daysSimulated: daysBack,
        intensity
      });
      
    } catch (error: unknown) {
      console.error("Error simulating data:", error);
      res.status(500).json({ message: "Error simulating data" });
    }
  });

  // User Plan - Get current user's plan
  app.get("/api/user/plan", isAuthenticated, async (req, res) => {
    try {
      const user = (req.user as any);
      const plan = user?.plan || 'free';
      res.json({ plan });
    } catch (error: unknown) {
      console.error("Error fetching user plan:", error);
      res.status(500).json({ message: "Error fetching user plan" });
    }
  });

  // Roles Management
  app.get("/api/roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error: unknown) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Error fetching roles" });
    }
  });

  app.post("/api/roles", isAuthenticated, adminOnly, async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Error creating role" });
    }
  });

  // Permissions Management
  app.get("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error: unknown) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Error fetching permissions" });
    }
  });

  // Warehouse Zones
  app.get("/api/warehouse-zones", isAuthenticated, hasPermission('warehouse', 'read'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const zones = await storage.getAllWarehouseZones(orgId);
      res.json(zones);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching warehouse zones" });
    }
  });

  app.get("/api/warehouse-zones/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const zone = await storage.getWarehouseZone(orgId, id);
      if (!zone) {
        return res.status(404).json({ message: "Warehouse zone not found" });
      }
      res.json(zone);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching warehouse zone" });
    }
  });

  app.post("/api/warehouse-zones", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const zoneData = insertWarehouseZoneSchema.parse(req.body);
      const zone = await storage.createWarehouseZone(orgId, zoneData);
      res.status(201).json(zone);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating warehouse zone" });
    }
  });

  // Products
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const products = await storage.getAllProducts(orgId);
      res.json(products);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products/suggest-sku", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const { name, category } = req.query;
      
      if (!name || !category) {
        return res.status(400).json({ message: "Se requiere nombre y categoría" });
      }

      // Extraer primera palabra del nombre (generalmente la marca)
      const words = (name as string).trim().split(/\s+/);
      const firstWord = words[0] || 'PRO';
      const prefix = firstWord.substring(0, 3).toUpperCase();
      
      // Extraer primeras dos letras de la categoría
      const catPrefix = (category as string).substring(0, 2).toUpperCase();
      
      // Obtener todos los productos existentes para calcular el siguiente número
      const existingProducts = await storage.getAllProducts(orgId);
      
      // Filtrar productos con el mismo prefijo
      const skuPattern = `${prefix}-${catPrefix}`;
      const matchingSkus = existingProducts
        .filter(p => p.sku.startsWith(skuPattern))
        .map(p => p.sku);
      
      // Encontrar el número más alto
      let maxNumber = 0;
      matchingSkus.forEach(sku => {
        const match = sku.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNumber) maxNumber = num;
        }
      });
      
      // Generar el siguiente número
      const nextNumber = maxNumber + 1;
      const suggestedSku = `${prefix}-${catPrefix}-${String(nextNumber).padStart(4, '0')}`;
      
      // Verificar si ya existe (por si acaso)
      const exists = existingProducts.some(p => p.sku === suggestedSku);
      
      res.json({
        suggested: suggestedSku,
        exists,
        pattern: skuPattern,
        nextNumber
      });
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      console.error("Error generating SKU suggestion:", error);
      res.status(500).json({ message: "Error al generar sugerencia de SKU" });
    }
  });

  app.get("/api/products/low-stock", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const products = await storage.getLowStockProducts(orgId);
      res.json(products);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching low stock products" });
    }
  });

  // Special product routes first (before :id route)
  app.get("/api/products/needing-reorder", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      console.log("=== Starting /api/products/needing-reorder endpoint ===");
      const products = await storage.getProductsNeedingReorder(orgId);
      console.log("Products needing reorder result:", products);
      res.json(products);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      console.error("=== ERROR in /api/products/needing-reorder ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : undefined);
      res.status(500).json({ message: "Error fetching products needing reorder", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(orgId, id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // Stock history endpoint for inventory flow charts
  app.get("/api/products/:id/stock-history", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const id = parseInt(req.params.id);
      const rangeDays = parseInt(req.query.rangeDays as string) || 30;
      
      // Get product
      const product = await storage.getProduct(orgId, id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get all stock movements for this product, ordered by date
      const movements = await storage.getStockMovementsByProduct(orgId, id);
      const sortedMovements = movements.sort((a, b) => 
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      );

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - rangeDays);

      // Build daily balance history
      const dailyData: Array<{
        date: string;
        stock: number;
        day: string;
      }> = [];

      // Start with current stock and work backwards
      let runningStock = product.currentStock;
      const dateMap = new Map<string, number>();

      // Process movements in reverse to reconstruct history
      for (let i = sortedMovements.length - 1; i >= 0; i--) {
        const movement = sortedMovements[i];
        const movementDate = new Date(movement.createdAt!);
        
        if (movementDate >= startDate && movementDate <= endDate) {
          const dateKey = movementDate.toISOString().split('T')[0];
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, runningStock);
          }
        }

        // Reverse the movement to go back in time
        if (movement.type === 'entry') {
          runningStock -= movement.quantity;
        } else if (movement.type === 'exit') {
          runningStock += movement.quantity;
        } else if (movement.type === 'adjustment') {
          // For adjustments, we need to reverse the change
          // This is tricky without knowing the before/after, so we'll skip for now
          // or handle based on quantity sign
          runningStock -= movement.quantity;
        }
      }

      // Fill in dates with stock levels
      const currentDate = new Date(startDate);
      let lastKnownStock = runningStock;

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const stockForDay = dateMap.get(dateKey) ?? lastKnownStock;
        lastKnownStock = stockForDay;

        dailyData.push({
          date: dateKey,
          stock: stockForDay,
          day: currentDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        productId: product.id,
        productName: product.name,
        currentStock: product.currentStock,
        reorderPoint: product.reorderPoint || null,
        safetyStock: product.safetyStock || null,
        minStock: product.minStock,
        rangeDays,
        history: dailyData
      });
    } catch (error: unknown) {
      console.error("Error fetching stock history:", error);
      res.status(500).json({ message: "Error fetching stock history" });
    }
  });

  app.get("/api/stock-movements/product/:productId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const productId = parseInt(req.params.productId);
      const movements = await storage.getStockMovementsByProduct(orgId, productId);
      res.json(movements);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching product stock movements" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(orgId, productData);
      res.status(201).json(product);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      const product = await storage.updateProduct(orgId, id, updates);
      if (product) {
        res.json(product);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteProduct(orgId, id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // Stock Movements
  app.get("/api/stock-movements", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const movements = await storage.getAllStockMovements(orgId);
      res.json(movements);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching stock movements" });
    }
  });

  app.get("/api/stock-movements/recent", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const movements = await storage.getRecentStockMovements(organizationId, limit);
      res.json(movements);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching recent stock movements" });
    }
  });

  app.get("/api/stock-movements/product/:productId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const productId = parseInt(req.params.productId);
      const movements = await storage.getStockMovementsByProduct(orgId, productId);
      res.json(movements);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching product stock movements" });
    }
  });

  app.post("/api/stock-movements", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const movementData = insertStockMovementSchema.parse(req.body);
      const movement = await storage.createStockMovement(orgId, movementData);
      res.status(201).json(movement);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating stock movement" });
    }
  });

  app.patch("/api/warehouse-zones/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      const zone = await storage.updateWarehouseZone(orgId, id, updates);
      if (!zone) {
        return res.status(404).json({ message: "Warehouse zone not found" });
      }
      res.json(zone);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating warehouse zone" });
    }
  });

  app.post("/api/warehouse-zones/recalculate-occupancy", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      await storage.recalculateAllZoneOccupancies(orgId);
      res.json({ message: "Zone occupancies recalculated successfully" });
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error recalculating zone occupancies" });
    }
  });

  app.get("/api/warehouse-zones/:id/products", isAuthenticated, async (req, res) => {
    try {
      // Extract organizationId from authenticated user session
      const organizationId = (req.user as any).organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID not found in session" });
      }
      
      const zoneId = parseInt(req.params.id);
      const products = await storage.getProductsByZone(organizationId, zoneId);
      res.json(products);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching products for zone" });
    }
  });

  // Suppliers
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const suppliers = await storage.getAllSuppliers(orgId);
      res.json(suppliers);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching suppliers" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      console.log('Received supplier data:', req.body);
      const supplierData = insertSupplierSchema.parse(req.body);
      console.log('Parsed supplier data:', supplierData);
      const supplier = await storage.createSupplier(orgId, supplierData);
      console.log('Created supplier:', supplier);
      res.status(201).json(supplier);
    } catch (error: unknown) {
      console.error('Error creating supplier:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating supplier", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      const supplier = await storage.updateSupplier(orgId, id, updates);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating supplier" });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteSupplier(orgId, id);
      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ message: "Supplier deleted successfully" });
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting supplier" });
    }
  });

  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(orgId, id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching supplier" });
    }
  });

  // Procurement Plans
  app.get("/api/procurement-plans", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const plans = await storage.getAllProcurementPlans(orgId);
      res.json(plans);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching procurement plans" });
    }
  });

  app.get("/api/procurement-plans/upcoming", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const plans = await storage.getUpcomingProcurementPlans(orgId, days);
      res.json(plans);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching upcoming procurement plans" });
    }
  });

  app.post("/api/procurement-plans", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      console.log('Received procurement plan data:', req.body);
      const planData = insertProcurementPlanSchema.parse(req.body);
      console.log('Parsed plan data:', planData);
      const plan = await storage.createProcurementPlan(orgId, planData);
      res.status(201).json(plan);
    } catch (error: unknown) {
      console.error('Error creating procurement plan:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating procurement plan" });
    }
  });

  app.put("/api/procurement-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      const plan = await storage.updateProcurementPlan(orgId, id, updates);
      if (!plan) {
        return res.status(404).json({ message: "Procurement plan not found" });
      }
      res.json(plan);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating procurement plan" });
    }
  });

  // Bulk procurement analysis endpoint
  app.get("/api/procurement/analyze-bulk", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const products = await storage.getAllProducts(orgId);
      const recentMovements = await storage.getRecentStockMovements(orgId, 100);
      
      const analyses = await Promise.all(products.map(async (product) => {
        const supplier = product.supplierId ? await storage.getSupplier(orgId, product.supplierId) : null;
        const leadTimeDays = supplier?.leadTimeDays || product.leadTimeDays || 7;
        const reliability = supplier ? parseFloat(supplier.reliability || "95") : 95;
        
        // Calculate average daily usage from recent movements
        const productMovements = recentMovements.filter(m => m.productId === product.id);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentOutbound = productMovements
          .filter(m => m.type === 'exit' && new Date(m.createdAt!) > thirtyDaysAgo)
          .reduce((sum, m) => sum + m.quantity, 0);
        
        const avgDailyUsage = recentOutbound / 30;
        
        // Calculate safety stock and reorder point
        const safetyStock = Math.ceil(Math.max(product.minStock * 0.3, avgDailyUsage * leadTimeDays * 0.5));
        const reorderPoint = product.minStock + safetyStock;
        
        // Determine urgency based on current stock level
        const daysUntilStockout = avgDailyUsage > 0 ? Math.floor(product.currentStock / avgDailyUsage) : 999;
        const needsReorder = product.currentStock <= reorderPoint;
        
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (product.currentStock === 0) priority = 'critical';
        else if (daysUntilStockout <= 3) priority = 'critical';
        else if (daysUntilStockout <= 7) priority = 'high';
        else if (needsReorder) priority = 'medium';
        
        // Suggest order quantity based on economic order quantity principles
        const suggestedQuantity = Math.max(
          product.orderQuantity || (product.minStock * 2),
          Math.ceil(avgDailyUsage * leadTimeDays * 2)
        );
        
        const suggestedOrderDate = needsReorder ? new Date() : null;
        const expectedDeliveryDate = suggestedOrderDate 
          ? new Date(suggestedOrderDate.getTime() + (leadTimeDays * 24 * 60 * 60 * 1000))
          : null;

        return {
          product,
          supplier,
          avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
          daysUntilStockout,
          leadTimeDays,
          reliability,
          safetyStock,
          reorderPoint,
          needsReorder,
          priority,
          suggestedQuantity,
          suggestedOrderDate: suggestedOrderDate?.toISOString(),
          expectedDeliveryDate: expectedDeliveryDate?.toISOString(),
          estimatedCost: suggestedQuantity * parseFloat(product.unitPrice || '0'),
          category: product.category
        };
      }));
      
      // Sort by priority and group by category
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      analyses.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      res.json(analyses);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error analyzing bulk procurement" });
    }
  });

  // Procurement calculation endpoint
  app.get("/api/procurement/calculate/:productId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const productId = parseInt(req.params.productId);
      const product = await storage.getProduct(orgId, productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const supplier = product.supplierId ? await storage.getSupplier(orgId, product.supplierId) : null;
      const leadTimeDays = supplier?.leadTimeDays || product.leadTimeDays || 7;
      const reliability = supplier ? parseFloat(supplier.reliability || "95") : 95;
      
      // Calculate safety stock (simple formula)
      const safetyStock = Math.ceil(product.minStock * (1 - reliability / 100) * 2);
      
      // Calculate reorder point
      const reorderPoint = product.minStock + safetyStock;
      
      // Suggested order date (if current stock <= reorder point)
      const needsReorder = product.currentStock <= reorderPoint;
      const suggestedOrderDate = needsReorder ? new Date() : null;
      
      // Expected delivery date
      const expectedDeliveryDate = suggestedOrderDate 
        ? new Date(suggestedOrderDate.getTime() + (leadTimeDays * 24 * 60 * 60 * 1000))
        : null;

      // Calculate suggested order quantity (Economic Order Quantity simplified)
      const suggestedQuantity = product.orderQuantity || Math.max(product.minStock * 2, 10);

      const calculation = {
        product,
        supplier,
        leadTimeDays,
        reliability,
        safetyStock,
        reorderPoint,
        needsReorder,
        suggestedOrderDate,
        expectedDeliveryDate,
        suggestedQuantity,
        currentStock: product.currentStock,
        daysUntilStockout: product.currentStock > 0 ? Math.floor(product.currentStock / (product.minStock / 30)) : 0
      };

      res.json(calculation);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error calculating procurement" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const products = await storage.getAllProducts(orgId);
      const lowStockProducts = await storage.getLowStockProducts(orgId);
      const recentMovements = await storage.getRecentStockMovements(orgId, 100);
      const zones = await storage.getAllWarehouseZones(orgId);

      const todayMovements = recentMovements.filter(movement => {
        const today = new Date();
        const movementDate = new Date(movement.createdAt!);
        return movementDate.toDateString() === today.toDateString();
      });

      const activeZones = zones.filter(zone => zone.currentOccupancy > 0);

      const metrics = {
        totalProducts: products.length,
        lowStock: lowStockProducts.length,
        todayMovements: todayMovements.length,
        activeZones: `${activeZones.length}/${zones.length}`,
        utilizationRate: Math.round((activeZones.length / zones.length) * 100)
      };

      res.json(metrics);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching dashboard metrics" });
    }
  });

  // Advanced Analytics routes
  app.get("/api/analytics/sales-by-period", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const { period = "daily", days = 30 } = req.query;
      const orders = await storage.getAllCustomerOrders(orgId);
      const orderItems = await storage.getAllOrderItems(orgId);

      // Filter orders from the last N days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate || order.createdAt || new Date());
        return orderDate >= startDate && order.status !== 'cancelled';
      });

      // Group sales by period
      const salesData: Record<string, { date: string; orders: number; revenue: number; items: number }> = {};
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.orderDate || order.createdAt || new Date());
        let key;
        
        if (period === "daily") {
          key = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (period === "weekly") {
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else { // monthly
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!salesData[key]) {
          salesData[key] = {
            date: key,
            orders: 0,
            revenue: 0,
            items: 0
          };
        }

        salesData[key].orders += 1;
        salesData[key].revenue += parseFloat(order.totalAmount || "0");
        
        // Count items for this order
        const orderItemsCount = orderItems
          .filter(item => item.orderId === order.id)
          .reduce((sum, item) => sum + item.quantity, 0);
        salesData[key].items += orderItemsCount;
      });

      const result = Object.values(salesData).sort((a: any, b: any) => a.date.localeCompare(b.date));
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching sales data" });
    }
  });

  app.get("/api/analytics/top-products", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const { limit = 10, metric = "sales" } = req.query;
      const products = await storage.getAllProducts(orgId);
      const orderItems = await storage.getAllOrderItems(orgId);
      const stockMovements = await storage.getAllStockMovements(orgId);

      let productStats;

      if (metric === "sales") {
        // Top products by sales quantity
        productStats = products.map(product => {
          const sales = orderItems
            .filter(item => item.productId === product.id)
            .reduce((sum, item) => sum + item.quantity, 0);
          
          const revenue = orderItems
            .filter(item => item.productId === product.id)
            .reduce((sum, item) => sum + (parseFloat(item.totalPrice || "0")), 0);

          return {
            ...product,
            salesQuantity: sales,
            revenue: revenue
          };
        }).sort((a, b) => b.salesQuantity - a.salesQuantity);
      } else {
        // Top products by stock movements
        productStats = products.map(product => {
          const movements = stockMovements
            .filter(movement => movement.productId === product.id)
            .length;

          return {
            ...product,
            movementCount: movements
          };
        }).sort((a, b) => b.movementCount - a.movementCount);
      }

      res.json(productStats.slice(0, parseInt(limit as string)));
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching top products" });
    }
  });

  app.get("/api/analytics/zone-performance", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const zones = await storage.getAllWarehouseZones(orgId);
      const products = await storage.getAllProducts(orgId);
      const orderItems = await storage.getAllOrderItems(orgId);
      const stockMovements = await storage.getAllStockMovements(orgId);

      const zoneStats = zones.map(zone => {
        const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
        
        const totalStock = zoneProducts.reduce((sum, p) => sum + p.currentStock, 0);
        const totalValue = zoneProducts.reduce((sum, p) => sum + (p.currentStock * parseFloat(p.unitPrice || "0")), 0);
        
        const salesFromZone = zoneProducts.reduce((sum, product) => {
          const productSales = orderItems
            .filter(item => item.productId === product.id)
            .reduce((itemSum, item) => itemSum + item.quantity, 0);
          return sum + productSales;
        }, 0);

        const movementsFromZone = zoneProducts.reduce((sum, product) => {
          const productMovements = stockMovements
            .filter(movement => movement.productId === product.id)
            .length;
          return sum + productMovements;
        }, 0);

        const utilizationPercentage = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;

        return {
          ...zone,
          productCount: zoneProducts.length,
          totalStock,
          totalValue,
          salesQuantity: salesFromZone,
          movementCount: movementsFromZone,
          utilizationPercentage
        };
      });

      res.json(zoneStats);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching zone performance" });
    }
  });

  app.get("/api/analytics/inventory-trends", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const { days = 30 } = req.query;
      const stockMovements = await storage.getAllStockMovements(orgId);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const filteredMovements = stockMovements.filter(movement => {
        const movementDate = new Date(movement.createdAt!);
        return movementDate >= startDate;
      });

      // Group movements by day
      const trendsData: Record<string, { date: string; entries: number; exits: number; transfers: number; netChange: number }> = {};
      filteredMovements.forEach(movement => {
        const date = new Date(movement.createdAt!).toISOString().split('T')[0];
        
        if (!trendsData[date]) {
          trendsData[date] = {
            date,
            entries: 0,
            exits: 0,
            transfers: 0,
            netChange: 0
          };
        }

        if (movement.type === 'entry') {
          trendsData[date].entries += movement.quantity;
          trendsData[date].netChange += movement.quantity;
        } else if (movement.type === 'exit') {
          trendsData[date].exits += movement.quantity;
          trendsData[date].netChange -= movement.quantity;
        } else {
          trendsData[date].transfers += movement.quantity;
        }
      });

      const result = Object.values(trendsData).sort((a: any, b: any) => a.date.localeCompare(b.date));
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching inventory trends" });
    }
  });

  // Inventory Analytics - Sales Velocity
  app.get("/api/analytics/sales-velocity", isAuthenticated, hasPermission('reports', 'read'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const products = await storage.getAllProducts(orgId);
      const movements = await storage.getAllStockMovements(orgId);
      
      const results = inventoryAnalyticsService.calculateSalesVelocity(products, movements);
      res.json(results);
    } catch (error: unknown) {
      console.error('[Analytics] Error calculating sales velocity:', error);
      res.status(500).json({ message: "Error calculating sales velocity" });
    }
  });

  // Inventory Analytics - ABC Classification
  app.get("/api/analytics/abc-classification", isAuthenticated, hasPermission('reports', 'read'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const products = await storage.getAllProducts(orgId);
      
      const results = inventoryAnalyticsService.calculateABCClassification(products);
      res.json(results);
    } catch (error: unknown) {
      console.error('[Analytics] Error calculating ABC classification:', error);
      res.status(500).json({ message: "Error calculating ABC classification" });
    }
  });

  // Inventory Analytics - Dynamic Reorder Points
  app.get("/api/analytics/reorder-points", isAuthenticated, hasPermission('reports', 'read'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const products = await storage.getAllProducts(orgId);
      const movements = await storage.getAllStockMovements(orgId);
      const suppliers = await storage.getAllSuppliers(orgId);
      
      const results = inventoryAnalyticsService.calculateDynamicReorderPoints(products, movements, suppliers);
      res.json(results);
    } catch (error: unknown) {
      console.error('[Analytics] Error calculating reorder points:', error);
      res.status(500).json({ message: "Error calculating reorder points" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const customers = await storage.getAllCustomers(orgId);
      res.json(customers);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(orgId, id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const customer = await storage.createCustomer(orgId, req.body);
      res.status(201).json(customer);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const customer = await storage.updateCustomer(orgId, id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomer(orgId, id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting customer" });
    }
  });

  // Customer Addresses routes
  app.get("/api/customer-addresses", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const addresses = await storage.getAllCustomerAddresses(orgId);
      res.json(addresses);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching addresses" });
    }
  });

  app.get("/api/customer-addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const address = await storage.getCustomerAddress(orgId, id);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching address" });
    }
  });

  app.get("/api/customers/:customerId/addresses", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const customerId = parseInt(req.params.customerId);
      const addresses = await storage.getAddressesByCustomer(orgId, customerId);
      res.json(addresses);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching customer addresses" });
    }
  });

  app.post("/api/customer-addresses", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const address = await storage.createCustomerAddress(orgId, req.body);
      res.status(201).json(address);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating address" });
    }
  });

  app.patch("/api/customer-addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const address = await storage.updateCustomerAddress(orgId, id, req.body);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating address" });
    }
  });

  app.delete("/api/customer-addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomerAddress(orgId, id);
      if (!success) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting address" });
    }
  });

  app.post("/api/customers/:customerId/addresses/:addressId/set-default", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const customerId = parseInt(req.params.customerId);
      const addressId = parseInt(req.params.addressId);
      await storage.setDefaultAddress(orgId, customerId, addressId);
      res.status(200).json({ message: "Default address updated" });
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error setting default address" });
    }
  });

  // Customer Orders routes
  app.get("/api/customer-orders", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const orders = await storage.getAllCustomerOrders(orgId);
      res.json(orders);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/customer-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const order = await storage.getCustomerOrder(orgId, id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  app.get("/api/customer-orders/by-customer/:customerId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const customerId = parseInt(req.params.customerId);
      const orders = await storage.getCustomerOrdersByCustomer(orgId, customerId);
      res.json(orders);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching customer orders" });
    }
  });

  app.post("/api/customer-orders", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      // Use provided order number or generate unique one
      const orderNumber = req.body.orderNumber || `ORD-${Date.now()}`;
      const orderData = { ...req.body, orderNumber };
      
      const order = await storage.createCustomerOrder(orgId, orderData);
      res.status(201).json(order);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating order" });
    }
  });

  app.patch("/api/customer-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const order = await storage.updateCustomerOrder(orgId, id, req.body);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating order" });
    }
  });

  app.patch("/api/customer-orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const { status, createStockMovements } = req.body;
      
      let shippedDate, deliveredDate;
      if (status === 'shipped') shippedDate = new Date();
      if (status === 'delivered') deliveredDate = new Date();
      
      const order = await storage.updateOrderStatus(orgId, id, status, shippedDate, deliveredDate);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Create stock movements when order is shipped
      if (status === 'shipped' && createStockMovements) {
        const orderItems = await storage.getOrderItemsByOrder(orgId, id);
        
        for (const item of orderItems) {
          const product = await storage.getProduct(orgId, item.productId);
          if (product) {
            await storage.createStockMovement(orgId, {
              productId: item.productId,
              type: 'exit',
              quantity: item.quantity,
              reason: 'customer_order',
              notes: `Pedido cliente ${order.orderNumber}`,
              orderId: id
            });

            // Update product stock
            const newStock = Math.max(0, product.currentStock - item.quantity);
            await storage.updateProduct(orgId, item.productId, { 
              currentStock: newStock
            });
          }
        }
        
        // Recalculate zone occupancies
        await storage.recalculateAllZoneOccupancies(orgId);
      }
      
      res.json(order);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating order status" });
    }
  });

  app.delete("/api/customer-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomerOrder(orgId, id);
      if (!success) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting order" });
    }
  });

  // Order Items routes
  app.get("/api/order-items/by-order/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const orderId = parseInt(req.params.orderId);
      const items = await storage.getOrderItemsByOrder(orgId, orderId);
      res.json(items);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching order items" });
    }
  });

  app.post("/api/order-items", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const item = await storage.createOrderItem(orgId, req.body);
      res.status(201).json(item);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating order item" });
    }
  });

  app.patch("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const item = await storage.updateOrderItem(orgId, id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      res.json(item);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating order item" });
    }
  });

  app.delete("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const id = parseInt(req.params.id);
      const success = await storage.deleteOrderItem(orgId, id);
      if (!success) {
        return res.status(404).json({ message: "Order item not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting order item" });
    }
  });

  // Product Reservations routes
  app.get("/api/reservations", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const reservations = await storage.getAllProductReservations(orgId);
      res.json(reservations);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching reservations" });
    }
  });

  app.get("/api/reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const reservation = await storage.getProductReservation(orgId, Number(req.params.id));
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching reservation" });
    }
  });

  app.get("/api/reservations/customer/:customerId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const reservations = await storage.getReservationsByCustomer(orgId, Number(req.params.customerId));
      res.json(reservations);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching customer reservations" });
    }
  });

  app.get("/api/reservations/product/:productId", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const reservations = await storage.getReservationsByProduct(orgId, Number(req.params.productId));
      res.json(reservations);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching product reservations" });
    }
  });

  app.get("/api/reservations/active", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const reservations = await storage.getActiveReservations(orgId);
      res.json(reservations);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error fetching active reservations" });
    }
  });

  app.post("/api/reservations", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const validatedData = insertProductReservationSchema.parse(req.body);
      const reservation = await storage.createProductReservation(orgId, validatedData);
      res.status(201).json(reservation);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reservation data", errors: error.errors });
      }
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error creating reservation" });
    }
  });

  app.patch("/api/reservations/:id/status", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const { status } = req.body;
      const reservationId = Number(req.params.id);
      
      // Get the reservation details before updating
      const currentReservation = await storage.getProductReservation(orgId, reservationId);
      if (!currentReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      // Update the reservation status
      const reservation = await storage.updateReservationStatus(orgId, reservationId, status);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // If converting to order, create a customer order automatically
      if (status === "converted") {
        const product = await storage.getProduct(orgId, currentReservation.productId);
        if (product) {
          // Generate order number
          const orderNumber = `ORD-${Date.now()}-${reservationId}`;
          
          // Create the customer order
          const orderData = {
            customerId: currentReservation.customerId,
            orderNumber,
            status: "pending" as const,
            totalAmount: (parseFloat(product.unitPrice || "0") * currentReservation.quantity).toString(),
            notes: `Pedido creado automáticamente desde reserva #${reservationId}${currentReservation.notes ? '. Notas originales: ' + currentReservation.notes : ''}`
          };
          
          const order = await storage.createCustomerOrder(orgId, orderData);
          
          // Create the order item
          const orderItemData = {
            orderId: order.id,
            productId: currentReservation.productId,
            quantity: currentReservation.quantity,
            unitPrice: (parseFloat(product.unitPrice || "0")).toString(),
            totalPrice: (parseFloat(product.unitPrice || "0") * currentReservation.quantity).toString()
          };
          
          await storage.createOrderItem(orgId, orderItemData);
        }
      }
      
      res.json(reservation);
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error updating reservation status" });
    }
  });

  app.delete("/api/reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      
      const success = await storage.deleteProductReservation(orgId, Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      if (error instanceof OrganizationMismatchError) {
        return res.status(403).json({ message: "Access denied: resource belongs to different organization" });
      }
      res.status(500).json({ message: "Error deleting reservation" });
    }
  });

  // SISTEMA LOGÍSTICO - Agencias de Transporte
  app.get("/api/shipping-agencies", async (req, res) => {
    try {
      const agencies = await db.select().from(shippingAgencies);
      res.json(agencies);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching shipping agencies" });
    }
  });

  app.get("/api/shipping-agencies/active", async (req, res) => {
    try {
      const agencies = await db.select().from(shippingAgencies).where(eq(shippingAgencies.isActive, true));
      res.json(agencies);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching active shipping agencies" });
    }
  });

  app.get("/api/shipping-agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [agency] = await db.select().from(shippingAgencies).where(eq(shippingAgencies.id, id));
      if (!agency) {
        return res.status(404).json({ message: "Shipping agency not found" });
      }
      res.json(agency);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching shipping agency" });
    }
  });

  app.post("/api/shipping-agencies", async (req, res) => {
    try {
      const agencyData = req.body;
      const [agency] = await db.insert(shippingAgencies).values(agencyData).returning();
      res.status(201).json(agency);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error creating shipping agency" });
    }
  });

  app.put("/api/shipping-agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const agencyData = req.body;
      const [agency] = await db.update(shippingAgencies)
        .set(agencyData)
        .where(eq(shippingAgencies.id, id))
        .returning();
      if (!agency) {
        return res.status(404).json({ message: "Shipping agency not found" });
      }
      res.json(agency);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error updating shipping agency" });
    }
  });

  app.patch("/api/shipping-agencies/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [agency] = await db.select().from(shippingAgencies).where(eq(shippingAgencies.id, id));
      if (!agency) {
        return res.status(404).json({ message: "Shipping agency not found" });
      }
      const [updated] = await db.update(shippingAgencies)
        .set({ isActive: !agency.isActive })
        .where(eq(shippingAgencies.id, id))
        .returning();
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error toggling shipping agency status" });
    }
  });

  app.delete("/api/shipping-agencies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.delete(shippingAgencies).where(eq(shippingAgencies.id, id));
      if (!result.rowCount || result.rowCount === 0) {
        return res.status(404).json({ message: "Shipping agency not found" });
      }
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: "Error deleting shipping agency" });
    }
  });

  // Tarifas de Envío
  app.get("/api/shipping-rates", async (req, res) => {
    try {
      const rates = await db.select().from(shippingRates);
      res.json(rates);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching shipping rates" });
    }
  });

  app.get("/api/shipping-rates/agency/:agencyId", async (req, res) => {
    try {
      const agencyId = parseInt(req.params.agencyId);
      const rates = await db.select().from(shippingRates).where(eq(shippingRates.agencyId, agencyId));
      res.json(rates);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching shipping rates for agency" });
    }
  });

  // Cálculo de Costos de Envío
  app.post("/api/shipping/calculate-cost", async (req, res) => {
    try {
      const { weight, zoneName, agencyId } = req.body;
      
      const whereConditions = [
        eq(shippingRates.zoneName, zoneName),
        eq(shippingRates.isActive, true),
        eq(shippingAgencies.isActive, true),
        lte(shippingRates.weightMin, weight),
        gte(shippingRates.weightMax, weight)
      ];

      if (agencyId) {
        whereConditions.push(eq(shippingAgencies.id, agencyId));
      }

      const query = db.select({
        agency: shippingAgencies,
        rate: shippingRates
      })
      .from(shippingRates)
      .innerJoin(shippingAgencies, eq(shippingRates.agencyId, shippingAgencies.id))
      .where(and(...whereConditions));

      const results = await query;
      
      const costCalculations = results.map(({ agency, rate }) => {
        const baseCost = parseFloat(rate.baseCost || '0');
        const costPerKg = parseFloat(rate.costPerKg || '0');
        const totalCost = baseCost + (costPerKg * weight);
        
        return {
          agency,
          rate,
          totalCost: totalCost.toFixed(2),
          deliveryTime: `${agency.deliveryTimeMin}-${agency.deliveryTimeMax} días`
        };
      });

      // Ordenar por precio
      costCalculations.sort((a, b) => parseFloat(a.totalCost) - parseFloat(b.totalCost));
      
      res.json(costCalculations);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error calculating shipping cost" });
    }
  });

  // Información de Envío de Pedidos
  app.get("/api/order-shipping/order/:orderId", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const shipping = await db.select().from(orderShipping).where(eq(orderShipping.orderId, orderId));
      res.json(shipping[0] || null);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching order shipping info" });
    }
  });

  app.post("/api/order-shipping", async (req, res) => {
    try {
      const shippingData = req.body;
      const [shipping] = await db.insert(orderShipping).values(shippingData).returning();
      res.status(201).json(shipping);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error creating order shipping" });
    }
  });

  app.patch("/api/order-shipping/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = { ...req.body, updatedAt: new Date() };
      const [shipping] = await db.update(orderShipping).set(updateData).where(eq(orderShipping.id, id)).returning();
      res.json(shipping);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error updating order shipping" });
    }
  });

  // Tracking de Envíos
  app.get("/api/shipping-events/order-shipping/:orderShippingId", async (req, res) => {
    try {
      const orderShippingId = parseInt(req.params.orderShippingId);
      const events = await db.select().from(shippingEvents)
        .where(eq(shippingEvents.orderShippingId, orderShippingId))
        .orderBy(shippingEvents.eventDate);
      res.json(events);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error fetching shipping events" });
    }
  });

  app.post("/api/shipping-events", async (req, res) => {
    try {
      const eventData = req.body;
      const [event] = await db.insert(shippingEvents).values(eventData).returning();
      res.status(201).json(event);
    } catch (error: unknown) {
      res.status(500).json({ message: "Error creating shipping event" });
    }
  });

  // Generar número de tracking
  app.post("/api/shipping/generate-tracking", async (req, res) => {
    try {
      const { agencyCode } = req.body;
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const trackingNumber = `${agencyCode}${timestamp.slice(-8)}${random}`;
      
      res.json({ trackingNumber });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error generating tracking number" });
    }
  });

  // === EXPORT SYSTEM ROUTES ===
  const exportService = new ExportService();

  // Export data in various formats
  app.post("/api/export", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const exportOptions = z.object({
        format: z.enum(['pdf', 'excel', 'csv']),
        module: z.enum(['inventory', 'movements', 'orders', 'suppliers', 'customers', 'analytics', 'all']),
        dateRange: z.object({
          start: z.coerce.date(),
          end: z.coerce.date()
        }).optional(),
        filters: z.object({
          categories: z.array(z.string()).optional(),
          zones: z.array(z.number()).optional(),
          suppliers: z.array(z.number()).optional(),
          status: z.array(z.string()).optional()
        }).optional(),
        columns: z.array(z.string()).optional(),
        template: z.enum(['standard', 'detailed', 'summary']).optional(),
        includeCharts: z.boolean().optional(),
        groupBy: z.string().optional()
      }).parse(req.body);

      console.log('Export request received:', exportOptions);
      
      const result = await exportService.exportData({ ...exportOptions, organizationId: orgId });
      
      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.buffer.length);
      
      // Send the file buffer
      res.send(result.buffer);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid export options", errors: error.errors });
      }
      console.error("Export error:", error);
      res.status(500).json({ message: "Error generating export" });
    }
  });

  // Get export preview/metadata
  app.post("/api/export/preview", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const previewOptions = z.object({
        module: z.enum(['inventory', 'movements', 'orders', 'suppliers', 'customers', 'analytics', 'all']),
        dateRange: z.object({
          start: z.coerce.date(),
          end: z.coerce.date()
        }).optional(),
        filters: z.object({
          categories: z.array(z.string()).optional(),
          zones: z.array(z.number()).optional(),
          suppliers: z.array(z.number()).optional(),
          status: z.array(z.string()).optional()
        }).optional()
      }).parse(req.body);

      // Get row count and basic statistics for preview
      let recordCount = 0;
      let previewData = {};

      switch (previewOptions.module) {
        case 'inventory':
          const products = await storage.getAllProducts(orgId);
          recordCount = products.length;
          previewData = {
            totalProducts: products.length,
            totalValue: products.reduce((sum, p) => sum + (p.currentStock * parseFloat(p.unitPrice || '0')), 0),
            categories: Array.from(new Set(products.map(p => p.category))).length
          };
          break;
        case 'movements':
          const movements = await storage.getAllStockMovements(orgId);
          recordCount = movements.length;
          previewData = {
            totalMovements: movements.length,
            entriesCount: movements.filter(m => m.type === 'entry').length,
            exitsCount: movements.filter(m => m.type === 'exit').length
          };
          break;
        case 'orders':
          const orders = await storage.getAllCustomerOrders(orgId);
          recordCount = orders.length;
          previewData = {
            totalOrders: orders.length,
            totalValue: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || '0'), 0)
          };
          break;
        case 'suppliers':
          const suppliers = await storage.getAllSuppliers(orgId);
          recordCount = suppliers.length;
          previewData = { totalSuppliers: suppliers.length };
          break;
        case 'customers':
          const customers = await storage.getAllCustomers(orgId);
          recordCount = customers.length;
          previewData = { totalCustomers: customers.length };
          break;
        default:
          recordCount = 0;
          previewData = { message: "Preview not available for this module" };
      }

      res.json({
        module: previewOptions.module,
        recordCount,
        estimatedFileSize: `${Math.round(recordCount * 0.5)}KB`,
        previewData,
        availableFormats: ['pdf', 'excel', 'csv']
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid preview options", errors: error.errors });
      }
      console.error("Export preview error:", error);
      res.status(500).json({ message: "Error generating export preview" });
    }
  });

  // Import Routes - File Import Management
  
  // Preview file before importing
  app.post("/api/import/preview", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se proporcionó archivo" });
      }

      const { type } = req.body;
      if (!type || !['products', 'customers', 'suppliers', 'zones', 'movements', 'inventory'].includes(type)) {
        return res.status(400).json({ message: "Tipo de importación inválido" });
      }

      const data = await importService.parseFileBuffer(req.file.buffer, req.file.originalname);
      
      let previewResult;
      switch (type) {
        case 'products':
          previewResult = await importService.importProducts(data, { dryRun: true });
          break;
        case 'customers':
          previewResult = await importService.importCustomers(data, { dryRun: true });
          break;
        case 'suppliers':
          previewResult = await importService.importSuppliers(data, { dryRun: true });
          break;
        case 'zones':
          previewResult = await importService.importWarehouseZones(data, { dryRun: true });
          break;
        case 'movements':
          previewResult = await importService.importStockMovements(data, { dryRun: true });
          break;
        case 'inventory':
          previewResult = await importService.importInventoryUpdates(data, { dryRun: true });
          break;
        default:
          return res.status(400).json({ message: "Tipo no soportado" });
      }

      res.json({
        filename: req.file.originalname,
        type,
        preview: previewResult,
        canProceed: previewResult.success || previewResult.errorCount === 0
      });
    } catch (error: unknown) {
      console.error("Error in import preview:", error);
      res.status(500).json({ 
        message: "Error al procesar archivo", 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  });

  // Execute actual import
  app.post("/api/import/execute", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      if (!req.file) {
        return res.status(400).json({ message: "No se proporcionó archivo" });
      }

      const { type, options = {} } = req.body;
      if (!type || !['products', 'customers', 'suppliers', 'zones', 'movements', 'inventory'].includes(type)) {
        return res.status(400).json({ message: "Tipo de importación inválido" });
      }

      const data = await importService.parseFileBuffer(req.file.buffer, req.file.originalname);
      
      let result;
      switch (type) {
        case 'products':
          result = await importService.importProducts(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (product: any) => {
              try {
                await storage.createProduct(orgId, product);
              } catch (error) {
                console.error(`Error importing product ${product.sku}:`, error);
              }
            }));
          }
          break;
        case 'customers':
          result = await importService.importCustomers(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (customer: any) => {
              try {
                await storage.createCustomer(orgId, customer);
              } catch (error) {
                console.error(`Error importing customer ${customer.name}:`, error);
              }
            }));
          }
          break;
        case 'suppliers':
          result = await importService.importSuppliers(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (supplier: any) => {
              try {
                await storage.createSupplier(orgId, supplier);
              } catch (error) {
                console.error(`Error importing supplier ${supplier.name}:`, error);
              }
            }));
          }
          break;
        case 'zones':
          result = await importService.importWarehouseZones(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (zone: any) => {
              try {
                await storage.createWarehouseZone(orgId, zone);
              } catch (error) {
                console.error(`Error importing zone ${zone.code}:`, error);
              }
            }));
          }
          break;
        case 'movements':
          result = await importService.importStockMovements(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (movement: any) => {
              try {
                await storage.createStockMovement(orgId, movement);
              } catch (error) {
                console.error(`Error importing movement:`, error);
              }
            }));
          }
          break;
        case 'inventory':
          result = await importService.importInventoryUpdates(data, options);
          if (result.success && result.importedData.length > 0) {
            await Promise.all(result.importedData.map(async (update: any) => {
              try {
                // Buscar producto por ID o SKU
                let product;
                if (update.productId) {
                  product = await storage.getProduct(orgId, update.productId);
                } else if (update.sku) {
                  const products = await storage.getAllProducts(orgId);
                  product = products.find(p => p.sku === update.sku);
                }
                
                if (product) {
                  // Actualizar el producto con los nuevos valores de stock
                  const updateData: any = { currentStock: update.newStock };
                  if (update.minStock !== undefined) updateData.minStock = update.minStock;
                  if (update.maxStock !== undefined) updateData.maxStock = update.maxStock;
                  if (update.warehouseZoneId !== undefined) updateData.warehouseZoneId = update.warehouseZoneId;
                  
                  await storage.updateProduct(orgId, product.id, updateData);
                } else {
                  console.error(`Product not found for update:`, update);
                }
              } catch (error) {
                console.error(`Error updating inventory:`, error);
              }
            }));
          }
          break;
        default:
          return res.status(400).json({ message: "Tipo no soportado" });
      }

      console.log(`Import completed for ${type}:`, {
        success: result.success,
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount
      });

      res.json({
        filename: req.file.originalname,
        type,
        result,
        message: result.success ? "Importación completada exitosamente" : "Importación completada con errores"
      });
    } catch (error: unknown) {
      console.error("Error in import execution:", error);
      res.status(500).json({ 
        message: "Error al ejecutar importación", 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  });

  // Download import templates (Excel format)
  app.get("/api/import/template/:type", isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      if (!type || !['products', 'customers', 'suppliers', 'zones', 'movements', 'inventory'].includes(type)) {
        return res.status(400).json({ message: "Tipo de plantilla inválido" });
      }

      // Generar archivo Excel
      const excelBuffer = importService.generateExcelTemplate(type as any);
      
      // Nombres de archivo en español
      const fileNames: Record<string, string> = {
        products: 'plantilla_productos',
        customers: 'plantilla_clientes',
        suppliers: 'plantilla_proveedores',
        zones: 'plantilla_zonas',
        movements: 'plantilla_movimientos',
        inventory: 'plantilla_inventario'
      };
      
      const filename = fileNames[type] || 'plantilla';
      
      // Configurar headers para descarga de Excel
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length.toString());
      
      // Enviar buffer
      res.send(excelBuffer);
    } catch (error: unknown) {
      console.error("Error generating Excel template:", error);
      res.status(500).json({ message: "Error al generar plantilla Excel" });
    }
  });

  // Predictive AI Suggestions
  app.get("/api/predictive/suggestions", isAuthenticated, hasPermission('reports', 'read'), async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      console.log('[Predictive AI] Generating suggestions...');

      // Obtener todos los datos necesarios
      const products = await storage.getAllProducts(orgId);
      const movements = await storage.getAllStockMovements(orgId);
      const customers = await storage.getAllCustomers(orgId);
      const orders = await storage.getAllCustomerOrders(orgId);

      const suppliers = await storage.getAllSuppliers(orgId);
      const zones = await storage.getAllWarehouseZones(orgId);

      // Generar sugerencias usando IA
      const suggestions = await aiPredictiveService.generatePredictiveSuggestions({
        products,
        movements,
        orders,
        suppliers,
        zones
      });

      console.log(`[Predictive AI] Generated ${suggestions.length} suggestions`);

      res.json({
        suggestions,
        generatedAt: new Date().toISOString(),
        dataSnapshot: {
          productsCount: products.length,
          movementsCount: movements.length,
          ordersCount: orders.length,
          zonesCount: zones.length
        }
      });
    } catch (error: unknown) {
      console.error("[Predictive AI] Error generating suggestions:", error);
      res.status(500).json({ 
        message: "Error al generar sugerencias predictivas",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Sales - TPV / Point of Sale routes
  app.get("/api/sales", isAuthenticated, hasPermission('inventory', 'read'), async (req, res) => {
    try {
      const sales = await storage.getAllSales();
      res.json(sales);
    } catch (error: unknown) {
      res.status(500).json({ 
        message: "Error al obtener ventas",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  app.get("/api/sales/recent", isAuthenticated, hasPermission('inventory', 'read'), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sales = await storage.getRecentSales(limit);
      res.json(sales);
    } catch (error: unknown) {
      res.status(500).json({ 
        message: "Error al obtener ventas recientes",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  app.get("/api/sales/:id", isAuthenticated, hasPermission('inventory', 'read'), async (req, res) => {
    try {
      const sale = await storage.getSaleWithItems(parseInt(req.params.id));
      if (!sale) {
        return res.status(404).json({ message: "Venta no encontrada" });
      }
      res.json(sale);
    } catch (error: unknown) {
      res.status(500).json({ 
        message: "Error al obtener venta",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  app.post("/api/sales", isAuthenticated, hasPermission('inventory', 'write'), async (req, res) => {
    try {
      const { sale, items } = req.body;
      
      if (!sale || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Datos incompletos de venta" });
      }

      // Validar sale data
      const saleValidation = insertSaleSchema.safeParse(sale);
      if (!saleValidation.success) {
        return res.status(400).json({ 
          message: "Datos de venta inválidos",
          errors: saleValidation.error.issues
        });
      }

      // Validar items (omitiendo saleId que se asigna en el backend)
      const itemSchema = insertSaleItemSchema.omit({ saleId: true });
      const itemsValidation = items.map(item => itemSchema.safeParse(item));
      const invalidItems = itemsValidation.filter(v => !v.success);
      if (invalidItems.length > 0) {
        return res.status(400).json({ 
          message: "Datos de items inválidos",
          errors: invalidItems.map(v => v.success ? null : v.error.issues).filter(Boolean)
        });
      }

      // Validar cantidades positivas
      if (items.some(item => item.quantity <= 0)) {
        return res.status(400).json({ message: "Las cantidades deben ser mayores a 0" });
      }

      // Validar total positivo
      if (parseFloat(sale.total) <= 0) {
        return res.status(400).json({ message: "El total debe ser mayor a 0" });
      }

      // Validar método de pago
      const validPaymentMethods = ['cash', 'card', 'transfer'];
      if (!validPaymentMethods.includes(sale.paymentMethod)) {
        return res.status(400).json({ message: "Método de pago inválido" });
      }

      // Validar efectivo recibido si es pago en efectivo
      if (sale.paymentMethod === 'cash') {
        if (!sale.cashReceived || parseFloat(sale.cashReceived) < parseFloat(sale.total)) {
          return res.status(400).json({ message: "Efectivo recibido insuficiente" });
        }
      }

      const userId = (req.user as any)?.id || undefined;
      const saleData = {
        ...saleValidation.data,
        userId
      };

      const newSale = await storage.createSale(saleData, items);
      res.status(201).json(newSale);
    } catch (error: unknown) {
      console.error("[Sales] Error creating sale:", error);
      
      // Manejar error de stock insuficiente (insensible a mayúsculas y a envoltorios de error)
      const errMsg = error instanceof Error ? `${error.message} ${(error as any).cause?.message ?? ""}` : "";
      if (errMsg.toLowerCase().includes('stock insuficiente')) {
        return res.status(409).json({
          message: error instanceof Error ? error.message : "Stock insuficiente",
        });
      }
      
      res.status(500).json({ 
        message: "Error al crear venta",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  app.delete("/api/sales/:id", isAuthenticated, hasPermission('inventory', 'delete'), async (req, res) => {
    try {
      const deleted = await storage.deleteSale(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Venta no encontrada" });
      }
      res.json({ message: "Venta eliminada exitosamente" });
    } catch (error: unknown) {
      res.status(500).json({ 
        message: "Error al eliminar venta",
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ── Billing / Stripe Routes ───────────────────────────────────────────────

  /**
   * GET /api/billing/plans
   * Public endpoint — returns plan definitions for the pricing page.
   */
  app.get("/api/billing/plans", (_req, res) => {
    res.json(PLANS);
  });

  // ── Invitation routes ──────────────────────────────────────────────────────

  /**
   * POST /api/invitations — Send invitation (admin/supervisor only)
   */
  app.post("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const { email, roleId } = req.body;
      if (!email) return res.status(400).json({ message: "Email obligatorio" });

      const sessionUser = (req as any).user;
      const orgId = sessionUser?.organizationId;
      if (!orgId) return res.status(400).json({ message: "Sin organización" });

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Check if already invited / already a member
      const existing = await storage.getInvitationsByOrg(orgId);
      const alreadyPending = existing.find(i => i.email === email && !i.acceptedAt);
      if (alreadyPending) {
        return res.status(409).json({ message: "Ya existe una invitación pendiente para ese email" });
      }

      const invitation = await storage.createInvitation({
        organizationId: orgId,
        email: email.toLowerCase().trim(),
        roleId: roleId ?? null,
        token,
        invitedBy: sessionUser.id,
        expiresAt,
      } as any);

      // Get inviter name + org name for the email
      const inviter = await storage.getUser(sessionUser.id) as any;
      const org = await storage.getOrganization(orgId) as any;
      const role = roleId ? (await db.select().from(roles).where(eq(roles.id, roleId)))[0] : null;

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const acceptUrl = `${appUrl}/accept-invitation?token=${token}`;

      await sendInvitationEmail(
        email,
        inviter?.firstName ? `${inviter.firstName} ${inviter.lastName ?? ""}`.trim() : inviter?.email ?? "Un administrador",
        org?.name ?? "tu empresa",
        (role as any)?.name ?? "operator",
        acceptUrl
      );

      res.json({ success: true, invitation: { id: invitation.id, email: invitation.email } });
    } catch (err: any) {
      console.error("Invitation error:", err);
      res.status(500).json({ message: err.message ?? "Error enviando invitación" });
    }
  });

  /**
   * GET /api/invitations — List pending invitations for the org
   */
  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const orgId = (req as any).user?.organizationId;
      if (!orgId) return res.status(400).json({ message: "Sin organización" });
      const invitations = await storage.getInvitationsByOrg(orgId);
      res.json(invitations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /**
   * DELETE /api/invitations/:id — Revoke invitation
   */
  app.delete("/api/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      await storage.deleteInvitation(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /**
   * GET /api/invitations/accept?token=xxx — Validate invitation token (public)
   */
  app.get("/api/invitations/accept", async (req, res) => {
    try {
      const { token } = req.query as { token: string };
      if (!token) return res.status(400).json({ message: "Token obligatorio" });

      const inv = await storage.getInvitationByToken(token);
      if (!inv) return res.status(404).json({ message: "Invitación no encontrada o inválida" });
      if (inv.acceptedAt) return res.status(409).json({ message: "Esta invitación ya fue aceptada" });
      if (new Date() > inv.expiresAt) return res.status(410).json({ message: "La invitación ha expirado" });

      const org = await storage.getOrganization(inv.organizationId) as any;
      res.json({
        valid: true,
        email: inv.email,
        organizationName: org?.name ?? "tu empresa",
        roleId: inv.roleId,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /**
   * POST /api/invitations/accept — Accept invitation (create account + join org)
   */
  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const { token, firstName, lastName, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token y contraseña obligatorios" });
      if (password.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

      const inv = await storage.getInvitationByToken(token);
      if (!inv) return res.status(404).json({ message: "Invitación no encontrada" });
      if (inv.acceptedAt) return res.status(409).json({ message: "Esta invitación ya fue aceptada" });
      if (new Date() > inv.expiresAt) return res.status(410).json({ message: "La invitación ha expirado" });

      // Check if user already exists
      let user = await storage.getUserByEmail(inv.email) as any;
      if (!user) {
        const passwordHash = await bcrypt.hash(password, 12);
        const crypto2 = await import("crypto");
        user = await storage.upsertUser({
          id: crypto2.randomUUID(),
          email: inv.email,
          firstName: firstName?.trim() ?? null,
          lastName: lastName?.trim() ?? null,
          passwordHash,
        } as any);
      }

      // Link user to org
      await storage.addUserToOrganization({
        userId: user.id,
        organizationId: inv.organizationId,
        roleId: inv.roleId ?? null,
        assignedBy: inv.invitedBy,
      } as any);

      // Assign role
      if (inv.roleId) {
        try {
          await storage.assignUserRole({
            userId: user.id,
            roleId: inv.roleId,
            organizationId: inv.organizationId,
            assignedBy: inv.invitedBy,
          } as any);
        } catch (_) { /* role already assigned */ }
      }

      await storage.acceptInvitation(inv.id);

      // Log in the new user
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => err ? reject(err) : resolve());
      });

      res.json({ success: true, message: "¡Bienvenido! Tu cuenta ha sido creada." });
    } catch (err: any) {
      console.error("Accept invitation error:", err);
      res.status(500).json({ message: err.message ?? "Error aceptando invitación" });
    }
  });

  /**
   * GET /api/onboarding/status
   * Returns whether the org has completed onboarding.
   */
  app.get("/api/onboarding/status", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;
      const [org] = await db
        .select({ onboardingCompleted: organizations.onboardingCompleted, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      res.json({ completed: org?.onboardingCompleted ?? true, orgName: org?.name ?? "" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /**
   * POST /api/onboarding/complete
   * Updates org details from wizard and marks onboarding as done.
   * Body: { orgName?, industry?, country?, timezone?, currency? }
   */
  app.post("/api/onboarding/complete", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;
      const { orgName, industry, country, timezone, currency } = req.body;
      const updates: Record<string, any> = { onboardingCompleted: true };
      if (orgName) updates.name = orgName;
      if (industry) updates.industry = industry;
      if (country) updates.country = country;
      if (timezone) updates.timezone = timezone;
      if (currency) updates.currency = currency;
      await db.update(organizations).set(updates).where(eq(organizations.id, organizationId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Onboarding complete error:", err);
      res.status(500).json({ message: err.message ?? "Error" });
    }
  });

  /**
   * GET /api/billing/subscription
   * Returns the current subscription for the authenticated org.
   */
  app.get("/api/billing/subscription", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;
      const sub = await storage.getSubscriptionByOrgId(organizationId);
      res.json(sub ?? { plan: "free", status: "none" });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener suscripción" });
    }
  });

  /**
   * POST /api/billing/create-checkout
   * Creates a Stripe Checkout Session and returns the redirect URL.
   * Body: { plan: "starter"|"pro"|"enterprise", interval: "monthly"|"yearly" }
   */
  app.post("/api/billing/create-checkout", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;

      const { plan, interval = "monthly" } = req.body as { plan: string; interval?: string };
      if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
        return res.status(400).json({ message: "Plan inválido" });
      }

      const priceId = getPriceId(plan as any, interval as any);
      if (!priceId) {
        return res.status(400).json({
          message: `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()} no está configurado. Añade las variables de entorno después de crear los productos en Stripe.`,
        });
      }

      // Get org info for customer creation
      const user = req.user as any;
      const org = await storage.getOrganization?.(organizationId) as any;
      const orgName = org?.name ?? "LogiPro Customer";
      const email = user?.email ?? "";

      // Get or create Stripe customer
      const stripeCustomerId = await getOrCreateCustomer(organizationId, orgName, email);

      // Persist customerId if new
      const existingSub = await storage.getSubscriptionByOrgId(organizationId);
      if (existingSub && !existingSub.stripeCustomerId) {
        await storage.updateSubscription(organizationId, { stripeCustomerId } as any);
      } else if (!existingSub) {
        await storage.createSubscription({ organizationId, stripeCustomerId, plan: plan as any, status: "incomplete" } as any);
      }

      const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const url = await createCheckoutSession({
        stripeCustomerId,
        priceId,
        organizationId,
        successUrl: `${baseUrl}/billing?success=1`,
        cancelUrl: `${baseUrl}/billing?canceled=1`,
        trialDays: 0, // Trial already given at registration
      });

      res.json({ url });
    } catch (error: any) {
      console.error("[Billing] Checkout error:", error);
      res.status(500).json({ message: error.message ?? "Error creando sesión de pago" });
    }
  });

  /**
   * POST /api/billing/customer-portal
   * Creates a Stripe Customer Portal session for invoice/subscription management.
   */
  app.post("/api/billing/customer-portal", isAuthenticated, async (req, res) => {
    try {
      const organizationId = getOrganizationId(req, res);
      if (!organizationId) return;

      const sub = await storage.getSubscriptionByOrgId(organizationId);
      if (!sub?.stripeCustomerId) {
        return res.status(400).json({ message: "No hay suscripción activa con Stripe" });
      }

      const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const url = await createPortalSession(sub.stripeCustomerId, `${baseUrl}/billing`);
      res.json({ url });
    } catch (error: any) {
      console.error("[Billing] Portal error:", error);
      res.status(500).json({ message: error.message ?? "Error abriendo portal de facturación" });
    }
  });

  /**
   * POST /api/billing/webhook
   * Stripe webhook — must be raw body (no JSON parsing).
   * Handles: customer.subscription.created/updated/deleted
   */
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) return res.status(400).send("Missing stripe-signature");

      let event;
      try {
        event = constructWebhookEvent(req.body as Buffer, sig);
      } catch (err: any) {
        console.error("[Webhook] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        const data = event.data.object as any;

        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const orgId = parseInt(data.metadata?.organization_id ?? "0");
            if (!orgId) break;

            await storage.upsertSubscription({
              organizationId: orgId,
              stripeCustomerId: data.customer,
              stripeSubscriptionId: data.id,
              stripePriceId: data.items?.data?.[0]?.price?.id ?? null,
              plan: mapPriceIdToPlan(data.items?.data?.[0]?.price?.id ?? "") as any,
              status: mapStripeStatus(data.status) as any,
              trialStart: data.trial_start ? new Date(data.trial_start * 1000) : null,
              trialEnd: data.trial_end ? new Date(data.trial_end * 1000) : null,
              currentPeriodStart: data.current_period_start ? new Date(data.current_period_start * 1000) : null,
              currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : null,
              cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
            } as any);
            console.log(`[Webhook] Subscription ${event.type} for org ${orgId}: ${data.status}`);
            break;
          }

          case "customer.subscription.deleted": {
            const orgId = parseInt(data.metadata?.organization_id ?? "0");
            if (!orgId) break;
            await storage.updateSubscription(orgId, {
              status: "canceled" as any,
              canceledAt: new Date(),
            } as any);
            console.log(`[Webhook] Subscription canceled for org ${orgId}`);
            break;
          }

          case "invoice.payment_failed": {
            const customerId = data.customer;
            console.log(`[Webhook] Payment failed for customer ${customerId}`);
            break;
          }

          default:
            break;
        }
      } catch (handlerErr) {
        console.error("[Webhook] Handler error:", handlerErr);
      }

      res.json({ received: true });
    }
  );

  // Register ERP module routes
  registerErpRoutes(app);

  // Register SGA module routes
  registerSgaRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
