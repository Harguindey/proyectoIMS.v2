import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * Development authentication bypass
 * Creates a mock user session for testing without Replit Auth
 */
export function setupDevAuth(app: Express) {
  console.log("🔧 Setting up development authentication (bypass mode)");

  // Dev login endpoint - creates a mock admin user session
  app.get("/api/dev-login", async (req, res) => {
    try {
      const email = (req.query.email as string) || "dev@sportmax.local";
      
      // Check if user exists
      let user = await storage.getUserByEmail(email);
      let orgId: number;
      
      // If user doesn't exist, create minimal user with first organization
      if (!user) {
        console.log(`Creating dev user: ${email}`);
        
        // Get first organization or create one
        const allOrgs = await storage.getAllOrganizations();
        let org = allOrgs[0];
        
        if (!org) {
          org = await storage.createOrganization({
            name: "Dev Organization",
            slug: "dev-organization",
            country: "Spain",
            industry: "sports_retail",
            isActive: true,
          });
        }

        // Create user with UUID
        const userId = `dev-${Date.now()}`;
        user = await storage.createUser({
          id: userId,
          email,
          firstName: "Dev",
          lastName: "User",
        } as any);
        
        console.log('[DevAuth] User created:', JSON.stringify(user, null, 2));

        // Create organization-user relationship
        await storage.createOrganizationUser({
          userId: user.id,
          organizationId: org.id,
          role: "admin",
          isActive: true
        });

        console.log('[DevAuth] User linked to organization:', org.id);
        orgId = org.id;

        // Assign admin role
        const adminRole = await storage.getRoleByName("admin");
        if (adminRole && user) {
          await storage.createUserRole({
            userId: user.id,
            roleId: adminRole.id,
          });
        }
      } else {
        // User exists, get their organization
        const userOrgs = await storage.getUserOrganizations(user.id);
        if (userOrgs.length === 0) {
          console.log('[DevAuth] User has no organization, creating link...');
          // User exists but has no organization - assign them to first org
          const allOrgs = await storage.getAllOrganizations();
          let org = allOrgs[0];
          
          if (!org) {
            org = await storage.createOrganization({
              name: "Dev Organization",
              slug: "dev-organization",
              country: "Spain",
              industry: "sports_retail",
              isActive: true,
            });
          }

          // Create organization-user relationship
          await storage.createOrganizationUser({
            userId: user.id,
            organizationId: org.id,
            role: "admin",
            isActive: true
          });

          // Assign admin role if not exists
          const adminRole = await storage.getRoleByName("admin");
          if (adminRole) {
            await storage.createUserRole({
              userId: user.id,
              roleId: adminRole.id,
            });
          }

          orgId = org.id;
          console.log('[DevAuth] User linked to organization:', orgId);
        } else {
          orgId = userOrgs[0].organizationId;
          console.log('[DevAuth] Existing user, organizationId:', orgId);
        }
      }

      // Create session using passport's login method
      if (req.session && user) {
        const userSession = {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          organizationId: orgId,  // Now we have orgId from above
        };

        console.log('[DevAuth] Creating session with user:', JSON.stringify(userSession, null, 2));

        // Use passport's login method to properly set up the session
        req.login(userSession, (err) => {
          if (err) {
            console.error("[DevAuth] Login error:", err);
            return res.status(500).json({ success: false, message: "Failed to create session" });
          }
          
          console.log('[DevAuth] Login successful, session created');
          // Redirect to home page after successful login
          res.redirect("/");
        });
      } else {
        res.status(500).json({ success: false, message: "Failed to create session" });
      }
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Development login failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Dev logout endpoint
  app.get("/api/dev-logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true, message: "Logged out" });
    });
  });

  // Dev user info endpoint
  app.get("/api/dev-user", (req, res) => {
    const user = (req.session as any)?.passport?.user;
    if (user) {
      res.json({ authenticated: true, user });
    } else {
      res.json({ authenticated: false });
    }
  });

  console.log("✅ Development authentication endpoints ready:");
  console.log("   GET /api/dev-login?email=your@email.com");
  console.log("   GET /api/dev-logout");
  console.log("   GET /api/dev-user");
}
