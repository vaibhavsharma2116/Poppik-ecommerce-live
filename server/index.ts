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

  // Server-side meta tag injection for product pages (BEFORE static files)
  app.get("/product/:slug", async (req, res, next) => {
    try {
      const { slug } = req.params;
      const userAgent = req.headers['user-agent'] || '';
      const isBot = /bot|crawler|spider|crawling|whatsapp|facebook|twitter|telegram|skype|linkedin/i.test(userAgent);
      
      console.log(`Product page requested for slug: ${slug} (Bot: ${isBot})`);

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

      // Get the first image from product images or fallback to product.imageUrl
      let imageUrl = '';

      // PRIORITY 1: Try to fetch product images from database
      try {
        const imagesResponse = await db.query.productImages.findMany({
          where: (productImages, { eq }) => eq(productImages.productId, product.id),
          orderBy: (productImages, { asc }) => [asc(productImages.sortOrder)],
          limit: 1
        });

        if (imagesResponse && imagesResponse.length > 0) {
          imageUrl = imagesResponse[0].imageUrl || imagesResponse[0].url || '';
          console.log(`Found product image from database: ${imageUrl}`);
        }
      } catch (err) {
        console.log('Could not fetch product images for OG tags:', err);
      }

      // PRIORITY 2: If no image from database, use product.imageUrl
      if (!imageUrl && product.imageUrl) {
        imageUrl = product.imageUrl;
        console.log(`Using product.imageUrl: ${imageUrl}`);
      }

      // PRIORITY 3: If still no image, try to get from product.images array (if exists)
      if (!imageUrl && product.images && Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        imageUrl = firstImage.url || firstImage.imageUrl || '';
        console.log(`Using product.images array: ${imageUrl}`);
      }

      // Make sure image URL is always absolute with HTTPS
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // Handle /api/ prefix URLs
        if (imageUrl.startsWith('/api/')) {
          imageUrl = `https://poppiklifestyle.com${imageUrl}`;
        } else if (imageUrl.startsWith('/uploads/')) {
          imageUrl = `https://poppiklifestyle.com${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://poppiklifestyle.com${imageUrl}`;
        } else {
          // Remove any leading slashes and add domain
          imageUrl = imageUrl.replace(/^\/+/, '');
          imageUrl = `https://poppiklifestyle.com/${imageUrl}`;
        }
      }

      // Final fallback - use a default product placeholder image
      if (!imageUrl || imageUrl === 'https://poppiklifestyle.com/logo.png') {
        imageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';
        console.log('No product image found, using placeholder');
      }

      console.log(`Final product image URL for OG tags: ${imageUrl}`);

      // Clean description for meta tags (remove HTML and escape quotes)
      const cleanDescription = (product.shortDescription || product.description || 'Shop premium beauty products at Poppik Lifestyle')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/"/g, '&quot;') // Escape quotes
        .substring(0, 200);

      const cleanName = product.name.replace(/"/g, '&quot;');

      const metaTags = `
  <title>${cleanName} - Poppik Lifestyle</title>
  <meta name="description" content="${cleanDescription}" />

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${productUrl}" />
  <meta property="og:title" content="${cleanName} - ₹${product.price} | Poppik Lifestyle" />
  <meta property="og:description" content="${cleanDescription}" />
  
  <!-- Primary Image Tags - Multiple declarations for better compatibility -->
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:url" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${cleanName} - Product Image" />
  
  <!-- WhatsApp specific - they prefer these tags -->
  <meta name="og:image" content="${imageUrl}" />
  <meta itemprop="image" content="${imageUrl}" />
  
  <meta property="og:site_name" content="Poppik Lifestyle" />
  <meta property="og:locale" content="en_IN" />
  <meta property="product:brand" content="Poppik Lifestyle" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:availability" content="${product.inStock ? 'in stock' : 'out of stock'}" />
  <meta property="product:condition" content="new" />
  <meta property="og:determiner" content="auto" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@PoppikLifestyle" />
  <meta name="twitter:creator" content="@PoppikLifestyle" />
  <meta name="twitter:url" content="${productUrl}" />
  <meta name="twitter:title" content="${cleanName} - ₹${product.price} | Poppik Lifestyle" />
  <meta name="twitter:description" content="${cleanDescription}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta name="twitter:image:src" content="${imageUrl}" />
  <meta name="twitter:image:alt" content="${cleanName} - Product Image" />
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
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      
      // Add headers for better crawler support
      res.setHeader('X-Robots-Tag', 'index, follow');

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