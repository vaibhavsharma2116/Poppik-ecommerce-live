import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCashbackScheduler } from "./cashbackScheduler";
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

  try {
    startCashbackScheduler();
  } catch (e) {
    console.warn('⚠️ Failed to start cashback scheduler:', e);
  }

  // Handle product share URLs for social media crawlers
  app.get(["/product/:slug", "/share/product/:slug"], async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';

    // Detect social media crawlers and bots - be more specific
    const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);

    // IMPORTANT: Skip if it's a regular browser (contains Mozilla but not a bot)
    const isBrowser = /mozilla/i.test(userAgent) && !/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot/i.test(userAgent);

    console.log('🤖 Product page request:', {
      path: req.path,
      userAgent: userAgent.substring(0, 100),
      isCrawler,
      isBrowser
    });

    // Only serve static OG page to crawlers, not browsers
    if (!isCrawler || isBrowser) {
      return next();
    }

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
        .limit(10); // Get multiple images to find best one

      console.log('📸 Product:', product.name);
      console.log('📸 Product imageUrl:', product.imageUrl);
      console.log('📸 DB Images count:', images.length);
      if (images.length > 0) {
        console.log('📸 First DB image:', images[0].imageUrl);
      }

      // Fallback to a default high-quality image if no image found
      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

      // Get the best image URL with priority:
      // 1. Shade image (if shade selected)
      // 2. First non-base64 DB image (better for social sharing)
      // 3. product.imageUrl if not base64
      // 4. First DB image (even if base64)
      // 5. product.imageUrl (even if base64)
      // 6. Fallback

      let productImage = shadeImage;

      if (!productImage) {
        // Try to find a non-base64 image in DB first
        const nonBase64DbImage = images.find(img => img.imageUrl && !img.imageUrl.startsWith('data:'));
        productImage = nonBase64DbImage?.imageUrl;
      }

      if (!productImage && product.imageUrl && !product.imageUrl.startsWith('data:')) {
        // Use product imageUrl if it's not base64
        productImage = product.imageUrl;
      }

      if (!productImage && images.length > 0) {
        // Fallback to first DB image
        productImage = images[0].imageUrl;
      }

      if (!productImage) {
        // Last resort: use product imageUrl (even if base64)
        productImage = product.imageUrl;
      }

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
      const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);

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

    <!-- No automatic meta refresh to avoid redirect loops. -->
    <!-- Visitors can use the "View Product on Poppik" link below to open the product page. -->
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
    <a href="${productUrl}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; font-size: 16px; transition: transform 0.2s;">View Product on Poppik</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Pragma', 'public');
      res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString());
      // Expose selected OG image URL to help debugging crawlers/previews
      res.setHeader('X-OG-Image', fullImageUrl);

      console.log('📤 Sending OG page with image:', fullImageUrl);
      console.log('📤 Serving HTML for:', req.path);

      res.send(html);
    } catch (error) {
      console.error("Error serving product page:", error);
      next();
    }
  });

  // Handle combo share URLs for social media crawlers (serve OG HTML)
  app.get(["/combo/:slug", "/share/combo/:slug"], async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|whatsappbot|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);
    const isBrowser = /mozilla/i.test(userAgent) && !/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot/i.test(userAgent);
    const isHead = req.method === 'HEAD';
    const forceShare = typeof req.query === 'object' && (req.query.share === '1' || req.query.share === 'true');

    if (!isCrawler && !isHead && !forceShare) {
      return next();
    }

    try {
      const { slug } = req.params as any;
      const isNumeric = /^\d+$/.test(slug);

      // Fetch combo by id or slug
      let combo: any = null;
      if (isNumeric) {
        const q = await pool.query('SELECT * FROM combos WHERE id = $1 LIMIT 1', [parseInt(slug)]);
        combo = q.rows[0];
      } else {
        const q = await pool.query('SELECT * FROM combos WHERE slug = $1 LIMIT 1', [slug]);
        combo = q.rows[0];
      }

      if (!combo) return next();

      // Fetch combo images
      const imagesRes = await pool.query('SELECT * FROM combo_images WHERE combo_id = $1 ORDER BY sort_order LIMIT 10', [combo.id]);
      const images = imagesRes.rows || [];

      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

      // Choose best image
      let comboImage = null;
      if (images.length > 0) {
        const nonBase64 = images.find((img: any) => img.image_url && !img.image_url.startsWith('data:'));
        comboImage = nonBase64?.image_url || images[0].image_url;
      }

      if (!comboImage && Array.isArray(combo.image_url) && combo.image_url.length > 0) {
        const nonBase64 = combo.image_url.find((u: string) => u && !u.startsWith('data:'));
        comboImage = nonBase64 || combo.image_url[0];
      }

      if (!comboImage && combo.image_url && typeof combo.image_url === 'string') {
        comboImage = combo.image_url;
      }

      if (!comboImage) comboImage = fallbackImage;

      // Ensure absolute HTTPS URL
      let fullImageUrl = comboImage;
      const baseUrl = 'https://poppiklifestyle.com';
      if (fullImageUrl && !fullImageUrl.toLowerCase().startsWith('http')) {
        if (fullImageUrl.startsWith('/')) fullImageUrl = `${baseUrl}${fullImageUrl}`;
        else fullImageUrl = `${baseUrl}/${fullImageUrl}`;
      }

      if (!fullImageUrl) fullImageUrl = fallbackImage;

      // Append a small cache-busting query for same-origin images so crawlers
      // are more likely to fetch the actual combo image instead of a cached
      // site-wide logo thumbnail. This helps WhatsApp/Facebook pick the
      // correct OG image when CDN or cache returns a generic image.
      try {
        const urlLower = String(fullImageUrl || '').toLowerCase();
        if (urlLower.startsWith(baseUrl) || urlLower.includes('poppiklifestyle.com')) {
          // Don't duplicate query params if already present
          const separator = fullImageUrl.includes('?') ? '&' : '?';
          fullImageUrl = `${fullImageUrl}${separator}og=combo_${combo.id}`;
        }
      } catch (e) {
        // ignore
      }

      // Determine image MIME type from extension for better crawler compatibility
      let imageType = 'image/jpeg';
      try {
        const lower = String(fullImageUrl).toLowerCase();
        if (lower.endsWith('.png')) imageType = 'image/png';
        else if (lower.endsWith('.webp')) imageType = 'image/webp';
        else if (lower.endsWith('.gif')) imageType = 'image/gif';
        else if (lower.endsWith('.svg')) imageType = 'image/svg+xml';
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) imageType = 'image/jpeg';
      } catch (e) {
        // fallback kept
      }

      const comboUrl = `${baseUrl}/combo/${combo.id}`;
      const title = `${combo.name} - ₹${combo.price} | Poppik Lifestyle`;
      const description = combo.description || combo.detailed_description || 'Explore this combo on Poppik Lifestyle';

      const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/"/g, '&quot;')}</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:url" content="${comboUrl}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${fullImageUrl}">
  <meta property="og:image:url" content="${fullImageUrl}">
  <meta property="og:image:secure_url" content="${fullImageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${combo.name.replace(/"/g, '&quot;')}">
  <link rel="image_src" href="${fullImageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${fullImageUrl}">
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; background: white; border-radius: 15px; padding: 40px;">
    <img src="${fullImageUrl}" alt="${combo.name}" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 20px;">
    <h1 style="color: #333; margin: 20px 0; font-size: 28px;">${combo.name}</h1>
    <p style="color: #10b981; font-size: 32px; font-weight: bold; margin: 20px 0;">₹${combo.price}</p>
    <a href="${comboUrl}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Combo on Poppik</a>
  </div>
</body>
</html>`;

      // Expose selected OG image for debugging and to help crawlers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('X-OG-Image', fullImageUrl);
      console.log('📤 Combo OG image selected:', fullImageUrl, 'type:', imageType);
      res.send(html);
    } catch (err) {
      console.error('Error serving combo page:', err);
      next();
    }
  });

  // Handle blog post share URLs for social media crawlers
  app.get(["/blog/:slug", "/share/blog/:slug"], async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);
    const isBrowser = /mozilla/i.test(userAgent) && !/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot/i.test(userAgent);

    if (!isCrawler || isBrowser) {
      return next();
    }

    try {
      const { slug } = req.params as any;

      // Fetch blog post directly from DB
      const q = await pool.query('SELECT * FROM blog_posts WHERE slug = $1 LIMIT 1', [slug]);
      const post = q.rows[0];

      if (!post) return next();

      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

      // Prefer hero image, then imageUrl, then thumbnail
      let blogImage = post.hero_image_url || post.image_url || post.thumbnail_url || fallbackImage;

      // Ensure absolute HTTPS URL
      const baseUrl = 'https://poppiklifestyle.com';
      if (blogImage && !String(blogImage).toLowerCase().startsWith('http')) {
        if (String(blogImage).startsWith('/')) blogImage = `${baseUrl}${blogImage}`;
        else blogImage = `${baseUrl}/${blogImage}`;
      }

      if (!blogImage) blogImage = fallbackImage;

      // Append small cache buster for same-origin images to avoid generic thumbnails
      try {
        const urlLower = String(blogImage).toLowerCase();
        if (urlLower.includes('poppiklifestyle.com')) {
          // Don't duplicate query params if already present
          const separator = blogImage.includes('?') ? '&' : '?';
          blogImage = `${blogImage}${separator}og=blog_${post.id}`;
        }
      } catch (e) {
        // ignore
      }

      const title = `${post.title} | Poppik Lifestyle`;
      const description = post.excerpt || post.content?.slice(0, 160) || 'Read this article on Poppik Lifestyle';
      const postUrl = `${baseUrl}/blog/${post.slug}`;

      const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/"/g, '&quot;')}</title>
  <meta name="description" content="${String(description).replace(/"/g, '&quot;')}">
  <link rel="canonical" href="${postUrl}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${blogImage}">
  <meta property="og:image:url" content="${blogImage}">
  <meta property="og:image:secure_url" content="${blogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${String(post.title).replace(/"/g, '&quot;')}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${blogImage}">
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align:center; background:white; border-radius:12px; padding:30px; box-shadow:0 8px 30px rgba(0,0,0,0.08);">
    <img src="${blogImage}" alt="${String(post.title).replace(/"/g, '&quot;')}" style="max-width:100%; height:auto; border-radius:8px; margin-bottom:20px;" onerror="this.src='${fallbackImage}'">
    <h1 style="font-size:22px; color:#222; margin:10px 0;">${String(post.title).replace(/"/g, '&quot;')}</h1>
    <p style="color:#555;">${String(description)}</p>
    <a href="${postUrl}" style="display:inline-block; margin-top:18px; background:linear-gradient(to right,#ec4899,#8b5cf6); color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none;">Read on Poppik</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('X-OG-Image', blogImage);
      res.send(html);
    } catch (err) {
      console.error('Error serving blog OG page:', err);
      next();
    }
  });

  app.get(["/offer/:id", "/share/offer/:id"], async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|whatsappbot|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);
    const isBrowser = /mozilla/i.test(userAgent) && !/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot/i.test(userAgent);
    const isHead = req.method === 'HEAD';
    const forceShare = typeof req.query === 'object' && (req.query.share === '1' || req.query.share === 'true');

    if ((!isCrawler || isBrowser) && !isHead && !forceShare) {
      return next();
    }

    try {
      const { id } = req.params as any;
      const isNumeric = /^\d+$/.test(String(id));
      if (!isNumeric) return next();

      const offerRes = await pool.query('SELECT * FROM offers WHERE id = $1 LIMIT 1', [parseInt(String(id))]);
      const offer = offerRes.rows[0];
      if (!offer) return next();

      const baseUrl = 'https://poppiklifestyle.com';
      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

      let offerImage: any = offer.banner_image_url || offer.image_url || null;

      if (!offerImage) {
        const images = offer.images;
        if (Array.isArray(images) && images.length > 0) {
          offerImage = images.find((u: any) => u && !String(u).startsWith('data:')) || images[0];
        } else if (typeof images === 'string' && images.trim()) {
          try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed.length > 0) {
              offerImage = parsed.find((u: any) => u && !String(u).startsWith('data:')) || parsed[0];
            }
          } catch (e) {
          }
        }
      }

      if (!offerImage) offerImage = fallbackImage;

      let fullImageUrl = String(offerImage || '');
      if (fullImageUrl && !fullImageUrl.toLowerCase().startsWith('http')) {
        if (fullImageUrl.startsWith('/api/images/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else if (fullImageUrl.startsWith('/api/image/')) {
          const imageId = fullImageUrl.split('/').pop();
          fullImageUrl = `${baseUrl}/api/images/${imageId}`;
        } else if (fullImageUrl.startsWith('/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else {
          fullImageUrl = `${baseUrl}/${fullImageUrl}`;
        }
      }

      if (!fullImageUrl) fullImageUrl = fallbackImage;

      try {
        const lower = String(fullImageUrl).toLowerCase();
        if (lower.includes('poppiklifestyle.com')) {
          const sep = fullImageUrl.includes('?') ? '&' : '?';
          fullImageUrl = `${fullImageUrl}${sep}og=offer_${offer.id}`;
        }
      } catch (e) {
      }

      const offerUrl = `${baseUrl}/offer/${offer.id}`;
      const title = `${offer.title} | Poppik Lifestyle`;
      const description = offer.description || offer.detailed_description || 'Explore this offer on Poppik Lifestyle';

      const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${String(title).replace(/"/g, '&quot;')}</title>
  <meta name="description" content="${String(description).replace(/"/g, '&quot;')}">
  <link rel="canonical" href="${offerUrl}">

  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:url" content="${offerUrl}">
  <meta property="og:title" content="${String(title).replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${fullImageUrl}">
  <meta property="og:image:url" content="${fullImageUrl}">
  <meta property="og:image:secure_url" content="${fullImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${String(offer.title).replace(/"/g, '&quot;')}">
  <link rel="image_src" href="${fullImageUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${String(title).replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${fullImageUrl}">
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; background: white; border-radius: 15px; padding: 40px;">
    <img src="${fullImageUrl}" alt="${String(offer.title).replace(/"/g, '&quot;')}" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 20px;" onerror="this.src='${fallbackImage}'">
    <h1 style="color: #333; margin: 20px 0; font-size: 28px;">${String(offer.title).replace(/"/g, '&quot;')}</h1>
    <p style="color: #555;">${String(description)}</p>
    <a href="${offerUrl}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Offer on Poppik</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('X-OG-Image', fullImageUrl);
      res.send(html);
    } catch (err) {
      console.error('Error serving offer OG page:', err);
      next();
    }
  });

  app.get(["/contest/:slug", "/share/contest/:slug"], async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = /bot|crawler|spider|facebookexternalhit|whatsapp|whatsappbot|twitterbot|linkedinbot|pinterestbot|telegrambot|slackbot|discordbot|google/i.test(userAgent);
    const isBrowser = /mozilla/i.test(userAgent) && !/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot/i.test(userAgent);
    const isHead = req.method === 'HEAD';
    const forceShare = typeof req.query === 'object' && (req.query.share === '1' || req.query.share === 'true');

    if ((!isCrawler || isBrowser) && !isHead && !forceShare) {
      return next();
    }

    try {
      const { slug } = req.params as any;
      const baseUrl = 'https://poppiklifestyle.com';
      const fallbackImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

      const isNumeric = /^\d+$/.test(String(slug));
      const contestRes = isNumeric
        ? await pool.query('SELECT * FROM contests WHERE id = $1 LIMIT 1', [parseInt(String(slug))])
        : await pool.query('SELECT * FROM contests WHERE slug = $1 LIMIT 1', [String(slug)]);
      const contest = contestRes.rows[0];
      if (!contest) return next();

      let contestImage: any = contest.banner_image_url || contest.image_url || fallbackImage;
      let fullImageUrl = String(contestImage || '');
      if (fullImageUrl && !fullImageUrl.toLowerCase().startsWith('http')) {
        if (fullImageUrl.startsWith('/api/images/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else if (fullImageUrl.startsWith('/api/image/')) {
          const imageId = fullImageUrl.split('/').pop();
          fullImageUrl = `${baseUrl}/api/images/${imageId}`;
        } else if (fullImageUrl.startsWith('/')) {
          fullImageUrl = `${baseUrl}${fullImageUrl}`;
        } else {
          fullImageUrl = `${baseUrl}/${fullImageUrl}`;
        }
      }

      if (!fullImageUrl) fullImageUrl = fallbackImage;

      try {
        const lower = String(fullImageUrl).toLowerCase();
        if (lower.includes('poppiklifestyle.com')) {
          const sep = fullImageUrl.includes('?') ? '&' : '?';
          fullImageUrl = `${fullImageUrl}${sep}og=contest_${contest.id}`;
        }
      } catch (e) {
      }

      const contestUrl = `${baseUrl}/contest/${contest.slug || contest.id}`;
      const title = `${contest.title} | Poppik Lifestyle`;
      const description = contest.description || 'Join this contest on Poppik Lifestyle';

      const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${String(title).replace(/"/g, '&quot;')}</title>
  <meta name="description" content="${String(description).replace(/"/g, '&quot;')}">
  <link rel="canonical" href="${contestUrl}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Poppik Lifestyle">
  <meta property="og:url" content="${contestUrl}">
  <meta property="og:title" content="${String(title).replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${fullImageUrl}">
  <meta property="og:image:url" content="${fullImageUrl}">
  <meta property="og:image:secure_url" content="${fullImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${String(contest.title).replace(/"/g, '&quot;')}">
  <link rel="image_src" href="${fullImageUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${String(title).replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${String(description).replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${fullImageUrl}">
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; background: white; border-radius: 15px; padding: 40px;">
    <img src="${fullImageUrl}" alt="${String(contest.title).replace(/"/g, '&quot;')}" style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 20px;" onerror="this.src='${fallbackImage}'">
    <h1 style="color: #333; margin: 20px 0; font-size: 28px;">${String(contest.title).replace(/"/g, '&quot;')}</h1>
    <p style="color: #555;">${String(description)}</p>
    <a href="${contestUrl}" style="display: inline-block; background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Contest on Poppik</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('X-OG-Image', fullImageUrl);
      res.send(html);
    } catch (err) {
      console.error('Error serving contest OG page:', err);
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
  const port = process.env.PORT || 5000;
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