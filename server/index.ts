import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Pool } from "pg";
import { CPUMonitor } from "./cpu-monitor";
import { createPerformanceRoutes } from "./perfomance-routes";
import { DatabaseOptimizer } from "./db-optimizer";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "dotenv";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./storage";

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

// Enable aggressive compression
app.use(compression({
  level: 9, // Maximum compression
  threshold: 512, // Compress smaller files too
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress JSON, text, JavaScript, CSS, HTML, XML, and images
    return compression.filter(req, res);
  }
}));

// Trust proxy
app.set('trust proxy', 1);

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1800000; // 30 minutes - more aggressive caching

app.use((req, res, next) => {
  // Add compression and cache headers with immutable for static assets
  if (req.path.match(/\.(jpg|jpeg|png|webp|gif|svg|ico|woff|woff2|ttf|eot|css|js)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    const cacheKey = req.path + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    res.setHeader('X-Cache', 'MISS');

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
const db = drizzle(pool, { schema: { products } });

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

  // Server-side meta tag injection for product pages (BEFORE static files)
  app.get("/product/:slug", async (req, res, next) => {
    try {
      const { slug } = req.params;
      console.log(`Product page requested for slug: ${slug}`);

      // Read the index.html file first
      const indexPath = path.join(process.cwd(), "dist/public/index.html");

      if (!fs.existsSync(indexPath)) {
        console.error("index.html not found at:", indexPath);
        return next();
      }

      let html = fs.readFileSync(indexPath, "utf-8");

      // Try to fetch product from database
      let product;
      try {
        product = await db.query.products.findFirst({
          where: eq(products.slug, slug),
        });
      } catch (dbError) {
        console.error("Database error fetching product:", dbError);
        // Send HTML anyway so React can handle it
        return res.send(html);
      }

      if (!product) {
        console.log(`Product not found for slug: ${slug}, sending default HTML`);
        // Even if product not found, send the HTML so React can handle 404
        return res.send(html);
      }

      // Prepare meta tags
      const productUrl = `https://poppiklifestyle.com/product/${slug}`;

      // Ensure image URL is absolute and properly formatted for social media
      let imageUrl = product.imageUrl || 'https://poppiklifestyle.com/favicon.png';

      // Make sure image URL is always absolute with HTTPS
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // Remove any leading slashes and add domain
        imageUrl = imageUrl.replace(/^\/+/, '');
        imageUrl = `https://poppiklifestyle.com/${imageUrl}`;
      }

      console.log(`Product image URL for OG tags: ${imageUrl}`);

      const metaTags = `
  <title>${product.name} - Poppik Lifestyle</title>
  <meta name="description" content="${product.shortDescription || product.description || 'Shop premium beauty products at Poppik Lifestyle'}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${productUrl}" />
  <meta property="og:title" content="${product.name} - ₹${product.price} | Poppik Lifestyle" />
  <meta property="og:description" content="${product.shortDescription || product.description || 'Shop premium beauty products at Poppik Lifestyle'}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${product.name}" />
  <meta property="og:site_name" content="Poppik Lifestyle" />
  <meta property="product:brand" content="Poppik Lifestyle" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:availability" content="${product.inStock ? 'in stock' : 'out of stock'}" />
  <meta property="product:condition" content="new" />

  <!-- WhatsApp Specific -->
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@PoppikLifestyle" />
  <meta name="twitter:url" content="${productUrl}" />
  <meta name="twitter:title" content="${product.name} - ₹${product.price} | Poppik Lifestyle" />
  <meta name="twitter:description" content="${product.shortDescription || product.description || 'Shop premium beauty products at Poppik Lifestyle'}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta name="twitter:image:alt" content="${product.name}" />
  <meta name="twitter:label1" content="Price" />
  <meta name="twitter:data1" content="₹${product.price}" />
  <meta name="twitter:label2" content="Availability" />
  <meta name="twitter:data2" content="${product.inStock ? 'In Stock' : 'Out of Stock'}" />

  <link rel="canonical" href="${productUrl}" />
    `;

      // Inject meta tags into HTML head
      html = html.replace("</head>", `${metaTags}</head>`);

      // Set headers for better caching and social media crawlers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache

      // Send the modified HTML
      res.send(html);
    } catch (error) {
      console.error("Error generating product meta tags:", error);
      next();
    }
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


  // Serve the app on port 5000 (required for Replit webview)
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