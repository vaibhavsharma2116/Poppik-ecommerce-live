import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { products, productImages } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import { drizzle } from "drizzle-orm/node-postgres";

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

// Security headers with performance optimizations
app.use(helmet({
  contentSecurityPolicy: false, // Configure as needed
  crossOriginEmbedderPolicy: false
}));

app.use(cors());

// Aggressive compression
app.use(compression({
  level: 6,
  threshold: 1024, // Compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Cache static assets aggressively
app.use('/uploads', express.static('uploads', {
  maxAge: '365d',
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Set proper content type for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// Cache API responses
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/products')) {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }
  next();
});

// Trust proxy for load balancer
app.set('trust proxy', 1);

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    const cacheKey = req.path + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return originalJson(data);
    };
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

// Create db instance
const db = drizzle(pool, { schema: { products, productImages } });

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

  // Register API routes FIRST
  const server = await registerRoutes(app);

  app.get("/product/:slug", async (req, res, next) => {
   
  });

  // Vite/Static setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Catch-all route for SPA - Must be LAST
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    try {
      const indexPath = path.join(process.cwd(), "dist/public/index.html");

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    } catch (error) {
      console.error("Error serving index.html:", error);
      next();
    }
  });

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


  // Serve the app on port 5000 (required for Replit web preview)
  const port = 8085;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Clear cache periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          cache.delete(key);
        }
      }
    }, 60000); // Clean every minute

    // Optimize garbage collection
    if ((global as any).gc) {
      setInterval(() => {
        (global as any).gc();
      }, 30000); // Run GC every 30 seconds
    }
  });
})();