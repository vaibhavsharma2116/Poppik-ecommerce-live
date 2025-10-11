import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./storage";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env") }); // dist ke bahar wali .env ko load karega

// Optimize for production
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_OPTIONS = '--max-old-space-size=512';
}

// Process optimization
process.setMaxListeners(15);
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const app = express();

// Enable compression for better performance
app.use(compression());

// Trust proxy for load balancer
app.set('trust proxy', 1);

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Disable X-Powered-By header for security
app.disable('x-powered-by');

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
  // Simple database connection test
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log("✅ Database connection verified");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }

  // Register API routes FIRST before any middleware
  const server = await registerRoutes(app);

  // Vite/Static setup को API routes के बाद करते हैं
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Final error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Only handle API route errors here
    if (req.path.startsWith('/api/')) {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      return;
    }
    next(err);
  });

  // Global error handler for non-API routes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global error handler:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });


  // Serve the app on port 5000 (recommended for web apps)
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Optimize garbage collection
    if ((global as any).gc) {
      setInterval(() => {
        (global as any).gc();
      }, 30000); // Run GC every 30 seconds
    }
  });
})();