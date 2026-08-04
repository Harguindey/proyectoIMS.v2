/**
 * replitAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication layer for LogiPro.
 *
 * Primary auth: local email + bcrypt (always enabled).
 * Optional auth: Replit OIDC – only attempted when USE_REPLIT_AUTH=true AND
 *                REPL_ID + REPLIT_DOMAINS env vars are present.
 * Social auth: Google OAuth2 (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)
 *              Microsoft OAuth2 (MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET)
 *
 * Session store: PostgreSQL via connect-pg-simple (SESSION_SECRET required).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// ── Replit OIDC (optional) ────────────────────────────────────────────────────
const USE_REPLIT_AUTH =
  process.env.USE_REPLIT_AUTH === "true" &&
  !!process.env.REPL_ID &&
  !!process.env.REPLIT_DOMAINS;

// Lazy-load heavy OIDC dependencies only when actually needed
let oidcClient: any = null;
let getOidcConfig: (() => Promise<any>) | null = null;

if (USE_REPLIT_AUTH) {
  const memoize = require("memoizee");
  oidcClient = require("openid-client");
  getOidcConfig = memoize(
    async () => {
      return await oidcClient.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    },
    { maxAge: 3600 * 1000 }
  );
}

// ── Session ───────────────────────────────────────────────────────────────────
export function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: sessionTtl,
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateUserSession(user: any, tokens: any) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertOidcUser(
  claims: any
): Promise<{ userId: string; organizationId: number | null }> {
  const upsertedUser = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  try {
    const { assignAdminToFirstUser } = await import("./init-security");
    await assignAdminToFirstUser(upsertedUser.id);
  } catch (err) {
    console.error("Error auto-assigning admin role:", err);
  }

  const userOrgs = await storage.getUserOrganizations(upsertedUser.id);
  return {
    userId: upsertedUser.id,
    organizationId: userOrgs[0]?.organizationId ?? null,
  };
}

// ── OAuth helper ──────────────────────────────────────────────────────────────
/**
 * Find-or-create a user from a social provider profile, then return a
 * session object shaped the same as local auth.
 */
async function upsertOAuthUser(profile: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}): Promise<{ id: string; email: string; firstName: string | null; lastName: string | null; organizationId: number | null }> {
  // Find by email first to link existing account (e.g. user registered via email)
  let user = await storage.getUserByEmail(profile.email);

  if (user) {
    // Update name/photo only if they were missing
    const patch: Record<string, any> = {};
    if (!user.firstName && profile.firstName) patch.firstName = profile.firstName;
    if (!user.lastName && profile.lastName) patch.lastName = profile.lastName;
    if (!user.profileImageUrl && profile.profileImageUrl) patch.profileImageUrl = profile.profileImageUrl;
    if (!user.emailVerified) patch.emailVerified = true; // social login = verified email
    if (Object.keys(patch).length) {
      user = (await storage.updateUser(user.id, patch)) ?? user;
    }
  } else {
    // New user — no passwordHash (OAuth-only account)
    const { randomUUID } = await import("crypto");
    user = await storage.upsertUser({
      id: randomUUID(),
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profileImageUrl: profile.profileImageUrl,
      emailVerified: true,
    });

    // Auto-assign admin role to the very first user
    try {
      const { assignAdminToFirstUser } = await import("./init-security");
      await assignAdminToFirstUser(user.id);
    } catch (err) {
      console.error("Error auto-assigning admin role (OAuth):", err);
    }
  }

  const orgs = await storage.getUserOrganizations(user.id);
  return {
    id: user.id,
    email: user.email!,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    organizationId: orgs[0]?.organizationId ?? null,
  };
}

// ── setupAuth ─────────────────────────────────────────────────────────────────
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // GET /api/login  → always redirect to the SPA login page
  app.get("/api/login", (_req, res) => res.redirect("/login"));

  // GET /api/logout → destroy session, redirect home
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => res.redirect("/"));
    });
  });

  // Optional Replit OIDC routes
  if (USE_REPLIT_AUTH && getOidcConfig) {
    try {
      const { Strategy } = require("openid-client/passport");
      const config = await getOidcConfig();

      const verify = async (tokens: any, verified: passport.AuthenticateCallback) => {
        const user: any = {};
        updateUserSession(user, tokens);
        const { userId, organizationId } = await upsertOidcUser(tokens.claims());
        user.claims.sub = userId;
        user.organizationId = organizationId;
        verified(null, user);
      };

      for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
        passport.use(
          new Strategy(
            {
              name: `replitauth:${domain}`,
              config,
              scope: "openid email profile offline_access",
              callbackURL: `https://${domain}/api/callback`,
            },
            verify
          )
        );
      }

      // Override /api/login to use OIDC
      app.get("/api/login", (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      });

      app.get("/api/callback", (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate(`replitauth:${req.hostname}`, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/login",
        })(req, res, next);
      });

      // Override /api/logout to use OIDC end-session
      app.get("/api/logout", (req: Request, res: Response) => {
        req.logout(() => {
          const endSession = oidcClient.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          });
          req.session.destroy(() => res.redirect(endSession.href));
        });
      });

      console.log("✅ Replit OIDC auth configured");
    } catch (err: any) {
      console.warn("⚠️  Replit OIDC setup failed (falling back to local auth):", err.message);
    }
  } else {
    console.log("ℹ️  Using local email/password auth (Replit OIDC disabled)");
  }

  // ── Google OAuth2 ─────────────────────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const { Strategy: GoogleStrategy } = await import("passport-google-oauth20");
      const appUrl = process.env.APP_URL || "http://localhost:5000";

      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${appUrl}/api/auth/google/callback`,
          },
          async (_accessToken, _refreshToken, profile, done) => {
            try {
              const email = profile.emails?.[0]?.value;
              if (!email) return done(new Error("No email from Google"), undefined);
              const sessionUser = await upsertOAuthUser({
                email,
                firstName: profile.name?.givenName ?? null,
                lastName: profile.name?.familyName ?? null,
                profileImageUrl: profile.photos?.[0]?.value ?? null,
              });
              done(null, sessionUser);
            } catch (err) {
              done(err as Error, undefined);
            }
          }
        )
      );

      app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

      app.get(
        "/api/auth/google/callback",
        passport.authenticate("google", { failureRedirect: "/login?error=google" }),
        (_req, res) => res.redirect("/")
      );

      console.log("✅ Google OAuth configured");
    } catch (err: any) {
      console.warn("⚠️  Google OAuth setup failed:", err.message);
    }
  }

  // ── Microsoft OAuth2 ──────────────────────────────────────────────────────
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    try {
      const { Strategy: MicrosoftStrategy } = await import("passport-microsoft");
      const appUrl = process.env.APP_URL || "http://localhost:5000";

      passport.use(
        new MicrosoftStrategy(
          {
            clientID: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            callbackURL: `${appUrl}/api/auth/microsoft/callback`,
            scope: ["user.read"],
          } as any,
          async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
              const email =
                profile.emails?.[0]?.value ??
                profile._json?.mail ??
                profile._json?.userPrincipalName;
              if (!email) return done(new Error("No email from Microsoft"), undefined);
              const sessionUser = await upsertOAuthUser({
                email,
                firstName: profile.name?.givenName ?? profile._json?.givenName ?? null,
                lastName: profile.name?.familyName ?? profile._json?.surname ?? null,
                profileImageUrl: null,
              });
              done(null, sessionUser);
            } catch (err) {
              done(err as Error, undefined);
            }
          }
        )
      );

      app.get("/api/auth/microsoft", passport.authenticate("microsoft"));

      app.get(
        "/api/auth/microsoft/callback",
        passport.authenticate("microsoft", { failureRedirect: "/login?error=microsoft" }),
        (_req, res) => res.redirect("/")
      );

      console.log("✅ Microsoft OAuth configured");
    } catch (err: any) {
      console.warn("⚠️  Microsoft OAuth setup failed:", err.message);
    }
  }
}

// ── isAuthenticated ───────────────────────────────────────────────────────────
/**
 * Supports two session shapes:
 *
 * A) Local auth (email+password):
 *    req.user = { id, email, firstName, lastName, organizationId }
 *    — no `expires_at`; accepted as-is.
 *
 * B) Replit OIDC:
 *    req.user = { claims: { sub, exp, email }, access_token, refresh_token,
 *                 expires_at, organizationId }
 *    — tokens are refreshed automatically on expiry.
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;

    // ── A) Local auth: no OIDC token, session is authoritative ──────────────
    if (!user.expires_at) {
      // Ensure organizationId is present (auto-inject for migrated sessions)
      if (!user.organizationId && user.id) {
        const orgs = await storage.getUserOrganizations(user.id);
        if (orgs.length > 0) user.organizationId = orgs[0].organizationId;
      }
      return next();
    }

    // ── B) Replit OIDC: validate token expiry ────────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) return next();

    // Token expired → attempt refresh
    if (!user.refresh_token) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    if (!USE_REPLIT_AUTH || !getOidcConfig) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await oidcClient.refreshTokenGrant(config, user.refresh_token);
      updateUserSession(user, tokenResponse);
      const { userId, organizationId } = await upsertOidcUser(tokenResponse.claims());
      user.claims.sub = userId;
      user.organizationId = organizationId;
      return next();
    } catch (refreshErr) {
      console.error("Token refresh failed:", refreshErr);
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
  } catch (err) {
    console.error("isAuthenticated error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── Role / Permission helpers ─────────────────────────────────────────────────

/** Extract userId from session (supports both local and OIDC shapes) */
export function getSessionUserId(req: Request): string | null {
  const user = req.user as any;
  if (!user) return null;
  // Local auth: user.id
  if (user.id && !user.claims) return user.id;
  // OIDC auth: user.claims.sub
  if (user.claims?.sub) {
    return typeof user.claims.sub === "object"
      ? user.claims.sub.userId ?? null
      : user.claims.sub;
  }
  return null;
}

export const hasRole = (requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const userRoles = await storage.getUserRoles(userId);
      if (!userRoles.length) return res.status(403).json({ message: "No roles assigned" });

      const roleNames = await Promise.all(
        userRoles.map(async (ur) => (await storage.getRole(ur.roleId))?.name)
      );

      if (!requiredRoles.some((r) => roleNames.includes(r))) {
        return res.status(403).json({
          message: "Insufficient permissions",
          required: requiredRoles,
          current: roleNames.filter(Boolean),
        });
      }
      next();
    } catch (err) {
      console.error("hasRole error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };

export const hasPermission = (module: string, action: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const ok = await storage.checkUserPermission(userId, module, action);
      if (!ok) return res.status(403).json({ message: "Permission denied", required: `${module}:${action}` });
      next();
    } catch (err) {
      console.error("hasPermission error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };

export const adminOnly = hasRole(["admin"]);

export const hasAnyPermission = (permissions: Array<{ module: string; action: string }>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      for (const p of permissions) {
        if (await storage.checkUserPermission(userId, p.module, p.action)) return next();
      }
      return res.status(403).json({
        message: "Permission denied",
        required: permissions.map((p) => `${p.module}:${p.action}`),
      });
    } catch (err) {
      console.error("hasAnyPermission error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };

// ── GET /api/auth/user handler ────────────────────────────────────────────────
export const getUserPermissionsHandler = async (req: Request, res: Response) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userWithRoles = await storage.getUserWithRoles(userId);
    const permissions = await storage.getUserPermissions(userId);

    res.json({
      user: userWithRoles,
      permissions: permissions.map((p) => ({
        id: p.id,
        module: p.module,
        action: p.action,
        description: p.description,
      })),
    });
  } catch (err) {
    console.error("getUserPermissionsHandler error:", err);
    res.status(500).json({ message: "Failed to get user permissions" });
  }
};
