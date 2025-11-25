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

// Import shades table
import { shades } from "@shared/schema";

// Create db instance
const db = drizzle(pool, { schema: { products, productImages, shades } });

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

  // Handle both /product/:slug and /api/products/:slug for Open Graph tags
  const handleProductOG = async (req: any, res: any, next: any) => {
    try {
      const { slug } = req.params;
      const shadeId = req.query.shade; // Get shade ID from query parameter
      
      // Check if slug is actually an ID (numeric)
      const isNumeric = /^\d+$/.test(slug);
      
      let product;
      if (isNumeric) {
        // Fetch by ID
        const productId = parseInt(slug);
        const productResult = await db
          .select()
          .from(products)
          .where(eq(products.id, productId))
          .limit(1);
        product = productResult[0];
      } else {
        // Fetch by slug
        const productResult = await db
          .select()
          .from(products)
          .where(eq(products.slug, slug))
          .limit(1);
        product = productResult[0];
      }

      if (!product) {
        return next(); // Let React handle 404
      }

      // If shade ID is provided, try to get shade image
      let shadeImage = null;
      let shadeName = '';
      if (shadeId) {
        try {
          const shadeResult = await db
            .select()
            .from(shades)
            .where(eq(shades.id, parseInt(shadeId as string)))
            .limit(1);
          
          if (shadeResult.length > 0 && shadeResult[0].imageUrl) {
            shadeImage = shadeResult[0].imageUrl;
            shadeName = shadeResult[0].name;
            console.log('🎨 Shade image found:', shadeName, shadeImage);
          }
        } catch (err) {
          console.log('⚠️ Could not fetch shade image:', err);
        }
      }

      // Get product images
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(productImages.sortOrder)
        .limit(1);

      console.log('📸 Product:', product.name);
      console.log('📸 Product imageUrl:', product.imageUrl);
      console.log('📸 DB Images count:', images.length);
      if (images.length > 0) {
        console.log('📸 First DB image:', images[0].imageUrl);
      }

      // Fallback to a default high-quality image if no image found
      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';
      
      // Get the best image URL with priority: Shade image > DB images > product.imageUrl > fallback
      let productImage = shadeImage || images[0]?.imageUrl || product.imageUrl || fallbackImage;
      
      if (!productImage || productImage.trim() === '') {
        productImage = fallbackImage;
        console.log('⚠️ No product image found, using fallback');
      }
      
      // Ensure full HTTPS URL for image (required for WhatsApp)
      let fullImageUrl = productImage;
      
      // Always use HTTPS for production domain
      const baseUrl = 'https://poppiklifestyle.com';
      
      // Check if URL is already a full HTTP/HTTPS URL
      if (fullImageUrl && !fullImageUrl.toLowerCase().startsWith('http')) {
        // Clean the image URL path
        if (fullImageUrl.startsWith('/api/images/')) {
          // Keep /api/images/ path as-is, just make it absolute
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else if (fullImageUrl.startsWith('/api/image/')) {
          // Convert /api/image/xxx to /api/images/xxx path
          const imageId = fullImageUrl.split('/').pop();
          fullImageUrl = `${baseUrl}/api/images/${imageId}`;
        } else if (fullImageUrl.startsWith('/uploads/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else if (fullImageUrl.startsWith('/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else if (fullImageUrl.length > 0) {
          fullImageUrl = `${baseUrl}/${fullImageUrl}`;
        } else {
          fullImageUrl = fallbackImage;
        }
      }
      
      // If still no valid URL, use fallback
      if (!fullImageUrl || fullImageUrl.trim() === '') {
        fullImageUrl = fallbackImage;
        console.log('⚠️ No valid image URL, using fallback');
      }
      
      console.log('✅ Final OG Image URL:', fullImageUrl);

      const productUrl = `https://poppiklifestyle.com/product/${product.slug || product.id}${shadeId ? `?shade=${shadeId}` : ''}`;
      const title = `${product.name}${shadeName ? ` - ${shadeName}` : ''} - ₹${product.price} | Poppik Lifestyle`;
      const description = product.shortDescription || product.description || 'Shop premium beauty products at Poppik Lifestyle';

      // Check if it's a social media crawler (WhatsApp, Facebook, Twitter, etc.)
      // Also check for search engine bots and specific keywords
      const userAgent = req.headers['user-agent'] || '';
      const isCrawler = /WhatsApp|facebookexternalhit|FacebookBot|facebook-external-hit|Twitterbot|LinkedInBot|Pinterest|Slackbot|Discordbot|wechat|Telegram|Viber|Line|Skype|OdnoklassnikiBot|bot|crawler|spider|scraper/i.test(userAgent);
      
      console.log(`📱 User Agent: ${userAgent}`);
      console.log(`🤖 Is Crawler: ${isCrawler}`);

      // For regular browsers, we'll still serve the static page with OG tags
      // This ensures WhatsApp and other crawlers always get proper meta tags
      // Regular browsers will just see the static page which redirects to React

      // Only serve static HTML with OG tags for social media crawlers
      const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/"/g, '&quot;')}</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  
  <!-- Redirect for regular browsers -->
  <meta http-equiv="refresh" content="0;url=https://poppiklifestyle.com/product/${product.slug || product.id}${shadeId ? `?shade=${shadeId}` : ''}">
  <link rel="canonical" href="https://poppiklifestyle.com/product/${product.slug || product.id}${shadeId ? `?shade=${shadeId}` : ''}">
  
  <!-- Primary Open Graph tags -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:url" content="${productUrl}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  
  <!-- Image tags - multiple formats for better compatibility -->
  <meta property="og:image" content="${fullImageUrl}">
  <meta property="og:image:url" content="${fullImageUrl}">
  <meta property="og:image:secure_url" content="${fullImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${product.name.replace(/"/g, '&quot;')}">
  <meta property="og:image:type" content="image/jpeg">
  
  <!-- Additional image meta for WhatsApp and social platforms -->
  <meta name="thumbnail" content="${fullImageUrl}">
  <meta itemprop="image" content="${fullImageUrl}">
  <link rel="image_src" href="${fullImageUrl}">
  
  <!-- WhatsApp specific tags -->
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:locale" content="en_IN">
  <meta name="robots" content="index, follow">
  
  <!-- Force image refresh for crawlers -->
  <meta http-equiv="Cache-Control" content="max-age=3600">
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@PoppikLifestyle">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${fullImageUrl}">
  <meta name="twitter:image:alt" content="${product.name.replace(/"/g, '&quot;')}">
  
  <!-- Product specific meta -->
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="INR">
  <meta property="product:availability" content="${product.inStock ? 'in stock' : 'out of stock'}">
  <meta property="product:retailer_item_id" content="${product.id}">
  ${product.category ? `<meta property="product:category" content="${product.category}">` : ''}
  ${product.rating ? `<meta property="product:rating:value" content="${product.rating}">` : ''}
  
  <!-- Schema.org markup for better indexing -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "${product.name.replace(/"/g, '\\"')}",
    "image": "${fullImageUrl}",
    "description": "${description.replace(/"/g, '\\"')}",
    "brand": {
      "@type": "Brand",
      "name": "Poppik Lifestyle"
    },
    "offers": {
      "@type": "Offer",
      "url": "${productUrl}",
      "priceCurrency": "INR",
      "price": "${product.price}",
      "availability": "https://schema.org/${product.inStock ? 'InStock' : 'OutOfStock'}"
    }
  }
  </script>
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
  <div style="text-align: center; background: white; border-radius: 15px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
    <img src="${fullImageUrl}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80'" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.15);">
    <h1 style="color: #333; margin: 20px 0; font-size: 28px;">${product.name}</h1>
    <p style="color: #666; font-size: 16px; margin: 15px 0;">${description}</p>
    <p style="color: #10b981; font-size: 32px; font-weight: bold; margin: 20px 0;">₹${product.price}</p>
    <p style="color: #999; font-size: 14px; margin: 20px 0;">Redirecting to product page...</p>
    <a href="${productUrl}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; font-size: 16px; transition: transform 0.2s;">View Product on Poppik</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Pragma', 'public');
      res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());
      
      console.log('📤 Sending OG page with image:', fullImageUrl);
      console.log('📤 Serving HTML for:', req.path);
      
      res.send(html);
    } catch (error) {
      console.error("Error serving product page:", error);
      next();
    }
  };

  // Add route for /product/:slug with OG tags for social media crawlers
  app.get("/product/:slug", handleProductOG);

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