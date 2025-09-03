import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./storage";
import { DatabaseMonitor } from "./db-monitor";
import { DatabaseOptimizer } from "./db-optimizer";

// Load environment variables
config();

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
  // Initialize database monitor and optimizer using existing pool
  const dbMonitor = new DatabaseMonitor(pool);
  const dbOptimizer = new DatabaseOptimizer(pool);

  // Enable pg_stat_statements on startup
  await dbOptimizer.enableStatements();

  // Kill long running queries on startup
  console.log("🔧 Cleaning up long running queries...");
  await dbOptimizer.killLongRunningQueries(5); // Kill queries running longer than 5 minutes

  // Close idle connections
  console.log("🔧 Closing idle connections...");
  await dbOptimizer.closeIdleConnections(10); // Close connections idle for more than 10 minutes

  // Set up periodic database cleanup
  setInterval(async () => {
    try {
      await dbOptimizer.killLongRunningQueries(10);
      await dbOptimizer.closeIdleConnections(15);
      console.log("🔄 Database cleanup completed");
    } catch (error) {
      console.error("Database cleanup error:", error);
    }
  }, 300000); // Run every 5 minutes

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000 (recommended for web apps)
  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Optimize garbage collection
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 30000); // Run GC every 30 seconds
    }
  });
})();