
import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSecurity, validateProductionConfig } from "./init-security";
import { setupDevAuth } from "./devAuth";

const app = express();
// Disable ETags globally to prevent 304 Not Modified responses
app.set('etag', false);

// ── Security headers (Helmet) ──────────────────────────────────────────────
// CSP disabled to avoid breaking Vite HMR in development
app.use(helmet({ contentSecurityPolicy: false }));

// ── Rate limiting ──────────────────────────────────────────────────────────
// Strict limit for login/auth endpoints (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
});
// General API limit
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas peticiones. Inténtalo de nuevo en un minuto." },
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", loginLimiter);
app.use("/api", apiLimiter);

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Disable HTTP caching for API routes to ensure real-time data updates
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Remove Last-Modified header to prevent 304 responses
    res.removeHeader('Last-Modified');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate production configuration before starting
  try {
    validateProductionConfig();
  } catch (error) {
    console.error('🚨 CRITICAL: Configuration validation failed:', error);
    process.exit(1);
  }

  // Initialize security system (roles, permissions, admin user)
  try {
    await initializeSecurity();
  } catch (error) {
    console.error('🚨 CRITICAL: Security initialization failed:', error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // Setup development authentication in development mode
  if (app.get("env") === "development") {
    setupDevAuth(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the configured port (default 5000, or 8001 for Emergent)
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: process.platform !== "win32"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
