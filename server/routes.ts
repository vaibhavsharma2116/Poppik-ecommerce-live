import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { OTPService } from "./otp-service";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";

// Simple rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

function rateLimit(req: any, res: any, next: any) {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }

  const requests = rateLimitMap.get(clientIP);
  const recentRequests = requests.filter((time: number) => time > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests" });
  }

  recentRequests.push(now);
  rateLimitMap.set(clientIP, recentRequests);
  next();
}
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, gte, lte, like, isNull, asc, or, sql } from "drizzle-orm";
import { Pool } from "pg";
import { ordersTable, orderItemsTable, users, sliders, reviews } from "../shared/schema";
// Database connection with enhanced configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/my_pgdb",
  max: 20,
  min: 2,
  idleTimeoutMillis: 300000, // 5 minutes
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  allowExitOnIdle: false,
});

const db = drizzle(pool);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

// Cashfree configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'cashfree_app_id';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cashfree_secret_key';

// Determine environment based on credentials or explicit env variable
const isProduction = process.env.CASHFREE_BASE_URL === 'production' || 
                    (process.env.CASHFREE_SECRET_KEY && process.env.CASHFREE_SECRET_KEY.includes('prod'));

const CASHFREE_BASE_URL = isProduction 
  ? 'https://api.cashfree.com' 
  : 'https://sandbox.cashfree.com';

const CASHFREE_MODE = isProduction ? 'production' : 'sandbox';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for disk storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}-${Math.random().toString(36).substring(7)}${extension}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", rateLimit);

  // Health check endpoint with database status
  app.get("/api/health", async (req, res) => {
    let dbStatus = "disconnected";
    try {
      await db.select().from(users).limit(1);
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "disconnected";
    }

    res.json({ 
      status: "OK", 
      message: "API server is running",
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Public sliders endpoint for frontend
  app.get('/api/sliders', async (req, res) => {
    try {
      const activeSliders = await db
        .select()
        .from(sliders)
        .where(eq(sliders.isActive, true))
        .orderBy(asc(sliders.sortOrder));

      res.json(activeSliders);
    } catch (error) {
      console.error('Error fetching public sliders:', error);
      console.log("Database unavailable, using sample slider data");


    }
  });

  // Firebase authentication has been removed
  // Only email/password authentication is now supported



  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

      // Validation
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords don't match" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Mobile OTP routes
  app.post("/api/auth/send-mobile-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Basic phone number validation
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
        return res.status(400).json({ error: "Please enter a valid Indian mobile number" });
      }

      const result = await OTPService.sendMobileOTP(phoneNumber);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Failed to send mobile OTP" });
    }
  });

  app.post("/api/auth/verify-mobile-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;

      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required" });
      }

      if (otp.length !== 6) {
        return res.status(400).json({ error: "Please enter valid 6-digit OTP" });
      }

      const result = await OTPService.verifyMobileOTP(phoneNumber, otp);

      if (result.success) {
        res.json({
          verified: true,
          message: result.message
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Failed to verify mobile OTP" });
    }
  });

  // Get current mobile OTP for development
  app.get("/api/auth/get-mobile-otp/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const otpData = OTPService.otpStorage.get(phoneNumber);

      if (otpData && new Date() <= otpData.expiresAt) {
        res.json({ otp: otpData.otp });
      } else {
        res.status(404).json({ error: "No valid OTP found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get OTP" });
    }
  });

  // Profile update endpoint
  app.put("/api/users/:id", async (req, res) => {
    try {
      console.log(`PUT /api/users/${req.params.id} - Request received`);
      console.log('Request body:', req.body);
      console.log('Request headers:', req.headers);

      // Set content type to ensure JSON response
      res.setHeader('Content-Type', 'application/json');

      const { id } = req.params;
      const { firstName, lastName, phone } = req.body;

      console.log(`Updating user ${id} with:`, { firstName, lastName, phone });

      // Validation
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }

      // Validate ID
      const userId = parseInt(id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Update user in database
      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : null
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("User updated successfully:", updatedUser);

      // Return updated user data (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        message: "Profile updated successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });

  // Change password endpoint
  app.put("/api/users/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      // Get user
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUserPassword(parseInt(id), hashedNewPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });



  // Serve uploaded images with optimization
  app.use("/api/images", (req, res, next) => {
    const imagePath = path.join(uploadsDir, req.path.split('?')[0]);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Parse query parameters for optimization
    const { w: width, h: height, q: quality, format } = req.query;
    
    // Set appropriate content type based on format or file extension
    const extension = path.extname(imagePath).toLowerCase();
    let contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }[extension] || 'image/jpeg';

    // Override content type if format is specified
    if (format === 'webp') contentType = 'image/webp';
    if (format === 'jpeg') contentType = 'image/jpeg';
    if (format === 'png') contentType = 'image/png';

    // Create cache key based on file and parameters
    const params = `${width || ''}-${height || ''}-${quality || ''}-${format || ''}`;
    const cacheKey = `${req.path}-${params}`;
    const fileStats = fs.statSync(imagePath);

    // Set optimized caching headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year with immutable
      'ETag': `"${cacheKey}-${fileStats.mtime.getTime()}"`,
      'Last-Modified': fileStats.mtime.toUTCString(),
      'Vary': 'Accept-Encoding'
    });

    // Handle conditional requests
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    const etag = res.getHeader('ETag');
    const lastModified = res.getHeader('Last-Modified');

    if ((ifNoneMatch && ifNoneMatch === etag) || 
        (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModified))) {
      return res.status(304).end();
    }

    // Process image with Sharp if parameters are provided
    if (width || height || quality || format) {
      try {
        let pipeline = sharp(imagePath);

        // Resize if width or height specified
        if (width || height) {
          pipeline = pipeline.resize(
            width ? parseInt(width as string) : undefined,
            height ? parseInt(height as string) : undefined,
            { 
              fit: 'cover', 
              position: 'center',
              withoutEnlargement: true
            }
          );
        }

        // Set quality and format
        const qual = quality ? parseInt(quality as string) : 80;
        
        if (format === 'webp') {
          pipeline = pipeline.webp({ quality: qual });
        } else if (format === 'jpeg' || extension === '.jpg' || extension === '.jpeg') {
          pipeline = pipeline.jpeg({ quality: qual, progressive: true });
        } else if (format === 'png' || extension === '.png') {
          pipeline = pipeline.png({ quality: qual, progressive: true });
        }

        // Stream the processed image
        pipeline.pipe(res);
      } catch (error) {
        console.error('Image processing error:', error);
        res.sendFile(imagePath);
      }
    } else {
      res.sendFile(imagePath);
    }
  });

  // Image upload API
  app.post("/api/upload/image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Return the file URL
      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Admin image upload specifically for shades
  app.post("/api/admin/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Return the file URL
      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({ 
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Admin image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample product data");
      res.json(generateSampleProducts());
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      console.log("Received product data:", req.body);

      // Set content type to ensure JSON response
      res.setHeader('Content-Type', 'application/json');

      // Validate required fields
      const { name, price, category, description } = req.body;
      if (!name || !price || !category || !description) {
        return res.status(400).json({ 
          error: "Missing required fields: name, price, category, and description are required" 
        });
      }

      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({ 
          error: "Name and description cannot be empty" 
        });
      }

      if (isNaN(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({ 
          error: "Price must be a valid positive number" 
        });
      }

      const productData = {
        ...req.body,
        price: Number(price),
        rating: Number(req.body.rating) || 4.0,
        reviewCount: Number(req.body.reviewCount) || 0,
        inStock: Boolean(req.body.inStock ?? true),
        featured: Boolean(req.body.featured ?? false),
        bestseller: Boolean(req.body.bestseller ?? false),
        newLaunch: Boolean(req.body.newLaunch ?? false)
      };

      console.log("Creating product with processed data:", productData);

      const product = await storage.createProduct(productData);
      console.log("Product created successfully:", product);

      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({ 
        error: "Failed to create product", 
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample featured products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter(p => p.featured));
    }
  });

  app.get("/api/products/bestsellers", async (req, res) => {
    try {
      const products = await storage.getBestsellerProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample bestseller products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter(p => p.bestseller));
    }
  });

  app.get("/api/products/new-launches", async (req, res) => {
    try {
      const products = await storage.getNewLaunchProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample new launch products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter(p => p.newLaunch));
    }
  });

  // Get products by subcategory (by slug)
  app.get("/api/products/subcategory/:subcategory", async (req, res) => {
    try {
      const { subcategory } = req.params;

      // Get all products first
      const allProducts = await storage.getProducts();

      // Filter products by subcategory with exact matching
      const subcategorySlug = subcategory.toLowerCase().replace(/[-\s]+/g, ' ').trim();

      // Use Map to ensure unique products by ID
      const uniqueProducts = new Map();

      allProducts.forEach(product => {
        if (!product.subcategory) return;

        const productSubcategory = product.subcategory.toLowerCase().trim();
        const normalizedProductSub = productSubcategory.replace(/[-\s]+/g, ' ').trim();

        // Exact match only
        if (normalizedProductSub === subcategorySlug) {
          uniqueProducts.set(product.id, product);
        }
      });

      res.json(Array.from(uniqueProducts.values()));
    } catch (error) {
      console.log("Database unavailable, using sample product data with subcategory filter");
      const sampleProducts = generateSampleProducts();
      const { subcategory } = req.params;
      const subcategorySlug = subcategory.toLowerCase().replace('-', ' ');

      const filteredSampleProducts = sampleProducts.filter(product => {
        if (!product.subcategory) return false;
        const productSubcategory = product.subcategory.toLowerCase();
        return productSubcategory === subcategorySlug || 
               productSubcategory.replace(/[-\s]+/g, ' ') === subcategorySlug.replace(/[-\s]+/g, ' ');
      });

      res.json(filteredSampleProducts);
    }
  });

  // Get products by subcategory ID
  app.get("/api/products/subcategory/id/:subcategoryId", async (req, res) => {
    try {
      const { subcategoryId } = req.params;
      console.log("Fetching products for subcategory ID:", subcategoryId);

      // Get subcategory details first
      const subcategory = await storage.getSubcategoryById(parseInt(subcategoryId));
      if (!subcategory) {
        console.log("Subcategory not found:", subcategoryId);
        return res.status(404).json({ error: "Subcategory not found" });
      }

      console.log("Found subcategory:", subcategory.name);

      // Get all products and filter by subcategory name with exact matching
      const allProducts = await storage.getProducts();
      const filteredProducts = allProducts.filter(product => {
        if (!product.subcategory) return false;

        // Normalize both strings for comparison
        const productSubcategory = product.subcategory.toLowerCase().trim().replace(/\s+/g, ' ');
        const targetSubcategory = subcategory.name.toLowerCase().trim().replace(/\s+/g, ' ');

        // Exact match
        if (productSubcategory === targetSubcategory) return true;

        // Also check if the product subcategory matches common variations
        const variations = [
          targetSubcategory.replace(/\s/g, ''),  // No spaces
          targetSubcategory.replace(/\s/g, '-'), // Dashes instead of spaces
          targetSubcategory.replace(/-/g, ' '),  // Spaces instead of dashes
        ];

        return variations.some(variation => 
          productSubcategory === variation ||
          productSubcategory.replace(/\s/g, '') === variation.replace(/\s/g, '')
        );
      });

      console.log(`Found ${filteredProducts.length} products for subcategory "${subcategory.name}"`);
      res.json(filteredProducts);
    } catch (error) {
      console.error("Error fetching products by subcategory ID:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      console.log("Fetching products for category:", category);

      // Get all products first
      const allProducts = await storage.getProducts();
      console.log("Total products available:", allProducts.length);

      // Filter products by category with flexible matching
      const filteredProducts = allProducts.filter(product => {
        if (!product.category) return false;

        const productCategory = product.category.toLowerCase().trim();
        const searchCategory = category.toLowerCase().trim();

        console.log(`Comparing product category "${productCategory}" with search "${searchCategory}"`);

        // Exact match
        if (productCategory === searchCategory) return true;

        // Partial match
        if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;

        // Handle common variations and special cases
        const categoryMappings: Record<string, string[]> = {
          'skincare': ['skin', 'face', 'facial'],
          'haircare': ['hair'],
          'makeup': ['cosmetics', 'beauty'],
          'bodycare': ['body'],
          'eyecare': ['eye', 'eyes', 'eyecare', 'eye care', 'eye-care'],
          'eye-care': ['eye', 'eyes', 'eyecare', 'eye care'],
          'eyes-care': ['eye', 'eyes', 'eyecare', 'eye care'],
          'eye care': ['eye', 'eyes', 'eyecare', 'eye-care'],
          'eyes': ['eye', 'eyecare', 'eye care', 'eye-care'],
          'beauty': ['makeup', 'cosmetics', 'skincare'],
        };

        // Check if search category has mappings
        const mappedCategories = categoryMappings[searchCategory] || [];
        if (mappedCategories.some(mapped => productCategory.includes(mapped))) return true;

        // Check if product category has mappings to search category
        const reverseMappings = Object.entries(categoryMappings).find(([key, values]) => 
          values.includes(searchCategory)
        );
        if (reverseMappings && productCategory.includes(reverseMappings[0])) return true;

        return false;
      });

      console.log(`Found ${filteredProducts.length} products for category "${category}"`);
      res.json(filteredProducts);
    } catch (error) {
      console.log("Database unavailable, using sample product data with category filter");
      const sampleProducts = generateSampleProducts();
      const { category } = req.params;
      const searchCategory = category.toLowerCase().trim();

      const filteredSampleProducts = sampleProducts.filter(product => {
        if (!product.category) return false;
        
        const productCategory = product.category.toLowerCase().trim();
        
        // Exact match
        if (productCategory === searchCategory) return true;
        
        // Partial match
        if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;
        
        // Special mappings for common variations
        const categoryMappings: Record<string, string[]> = {
          'lips': ['lip'],
          'eyes': ['eye', 'eyecare', 'eye care', 'eye-care'],
          'eye-care': ['eye', 'eyes', 'eyecare'],
          'eyecare': ['eye', 'eyes', 'eye care', 'eye-care'],
          'face': ['facial', 'foundation', 'concealer'],
          'skincare': ['skin', 'serum', 'cleanser'],
        };

        const mappedCategories = categoryMappings[searchCategory] || [];
        if (mappedCategories.some(mapped => productCategory.includes(mapped))) return true;

        // Reverse mapping check
        const reverseMappings = Object.entries(categoryMappings).find(([key, values]) => 
          values.includes(searchCategory)
        );
        if (reverseMappings && productCategory.includes(reverseMappings[0])) return true;

        return false;
      });

      console.log(`Sample data: Found ${filteredSampleProducts.length} products for category "${category}"`);
      res.json(filteredSampleProducts);
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await storage.getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();

      // Update product count for each category dynamically
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const products = await storage.getProductsByCategory(category.name);
          return {
            ...category,
            productCount: products.length
          };
        })
      );

      res.json(categoriesWithCount);
    } catch (error) {
      console.log("Database unavailable, using sample category data");
      res.json(generateSampleCategories());
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const category = await storage.getCategoryBySlug(slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      console.log("Received category data:", req.body);

      // Set content type to ensure JSON response
      res.setHeader('Content-Type', 'application/json');

      // Validate required fields
      const { name, description } = req.body;
      if (!name || !description) {
        return res.status(400).json({ 
          error: "Missing required fields: name and description are required" 
        });
      }

      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({ 
          error: "Name and description cannot be empty" 
        });
      }

      // Generate slug from name
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Set default imageUrl if not provided
      const imageUrl = req.body.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400';

      const categoryData = {
        name: name.trim(),
        slug,
        description: description.trim(),
        imageUrl,
        status: req.body.status || 'Active',
        productCount: parseInt(req.body.productCount) || 0
      };

      console.log("Creating category with processed data:", categoryData);

      const category = await storage.createCategory(categoryData);
      console.log("Category created successfully:", category);

      res.status(201).json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({ 
        error: "Failed to create category", 
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(parseInt(id), req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCategory(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Subcategories API
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getSubcategories();
      res.json(subcategories);
    } catch (error) {
      console.log("Database unavailable, using sample subcategory data");
      res.json(generateSampleSubcategories());
    }
  });

  // Get subcategories for a specific category by slug
  app.get("/api/categories/:slug/subcategories", async (req, res) => {
    try {
      const { slug } = req.params;
      console.log("Fetching subcategories for category:", slug);

      // First get the category by slug
      const category = await storage.getCategoryBySlug(slug);
      if (!category) {
        console.log("Category not found:", slug);
        return res.status(404).json({ error: "Category not found" });
      }

      console.log("Found category:", category.name);

      // Get subcategories for this category
      const subcategories = await storage.getSubcategoriesByCategory(category.id);

      // Get all products to calculate accurate product counts
      const allProducts = await storage.getProducts();

      // Update product count for each subcategory
      const subcategoriesWithCount = subcategories.map(subcategory => {
        const productCount = allProducts.filter(product => 
          product.subcategory && 
          product.subcategory.toLowerCase().trim() === subcategory.name.toLowerCase().trim()
        ).length;

        return {
          ...subcategory,
          productCount
        };
      });

      console.log(`Found ${subcategoriesWithCount.length} subcategories for category "${category.name}"`);
      res.json(subcategoriesWithCount);
    } catch (error) {
      console.error("Error fetching subcategories for category:", error);

      // Fallback: return sample subcategories based on category
      const { slug } = req.params;
      const sampleSubcategories = generateSampleSubcategoriesForCategory(slug);
      res.json(sampleSubcategories);
    }
  });

  app.get("/api/subcategories/category/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const subcategories = await storage.getSubcategoriesByCategory(parseInt(categoryId));
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });

  app.get("/api/subcategories/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const subcategory = await storage.getSubcategoryBySlug(slug);
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcategory" });
    }
  });

  app.post("/api/subcategories", async (req, res) => {
    try {
      const subcategory = await storage.createSubcategory(req.body);
      res.status(201).json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  });

  app.put("/api/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subcategory = await storage.updateSubcategory(parseInt(id), req.body);
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subcategory" });
    }
  });

  app.delete("/api/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSubcategory(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subcategory" });
    }
  });

  // Admin Orders endpoints
  app.get("/api/admin/orders", async (req, res) => {
    try {
      // Get all orders from database
      let orders;
      try {
        orders = await db
          .select()
          .from(ordersTable)
          .orderBy(desc(ordersTable.createdAt));
      } catch (dbError) {
        // Fallback sample data when database is unavailable
        console.log("Database unavailable, using sample data");
        const sampleOrders = generateSampleOrders();
        return res.json(sampleOrders);
      }

      // Get order items for each order and user info
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              id: orderItemsTable.id,
              name: orderItemsTable.productName,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              image: orderItemsTable.productImage,
            })
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, order.id));

          // Get user info
          const user = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              phone: users.phone,
            })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);

          const userData = user[0] || { firstName: 'Unknown', lastName: 'Customer', email: 'unknown@email.com', phone: 'N/A' };

          return {
            id: `ORD-${order.id.toString().padStart(3, '0')}`,
            customer: {
              name: `${userData.firstName} ${userData.lastName}`,
              email: userData.email,
              phone: userData.phone || 'N/A',
              address: order.shippingAddress,
            },
            date: order.createdAt.toISOString().split('T')[0],
            total: `₹${order.totalAmount}`,
            status: order.status,
            items: items.length,
            paymentMethod: order.paymentMethod,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery?.toISOString().split('T')[0],
            products: items,
            userId: order.userId,
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress,
          };
        })
      );

      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Send order notification
  app.post("/api/orders/:id/notify", async (req, res) => {
    try {
      const orderId = req.params.id.replace('ORD-', '');
      const { status } = req.body;

      // Get order and user info
      const order = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, order[0].userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Here you would typically send an email notification
      // For now, we'll just log it
      console.log(`Sending ${status} notification to ${user[0].email} for order ORD-${orderId}`);

      // You can integrate with email services like SendGrid, Mailgun, etc.
      // Example notification content based on status
      const notifications = {
        pending: "Your order has been received and is being processed.",
        processing: "Your order is being prepared for shipment.",
        shipped: "Your order has been shipped and is on its way!",
        delivered: "Your order has been delivered successfully.",
        cancelled: "Your order has been cancelled."
      };

      res.json({ 
        message: "Notification sent successfully",
        notification: notifications[status] || "Order status updated"
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get orders from database
      const orders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, Number(userId)))
        .orderBy(desc(ordersTable.createdAt));

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              id: orderItemsTable.id,
              name: orderItemsTable.productName,
              quantity: orderItemsTable.quantity,
              price: orderItemsTable.price,
              image: orderItemsTable.productImage,
            })
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, order.id));

          return {
            id: `ORD-${order.id.toString().padStart(3, '0')}`,
            date: order.createdAt.toISOString().split('T')[0],
            status: order.status,
            total: `₹${order.totalAmount}`,
            items,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery?.toISOString().split('T')[0],
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod,
            userId: order.userId,
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id.replace('ORD-', '');

      const order = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const items = await db
        .select({
          id: orderItemsTable.id,
          name: orderItemsTable.productName,
          quantity: orderItemsTable.quantity,
          price: orderItemsTable.price,
          image: orderItemsTable.productImage,
        })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order[0].id));

      const orderWithItems = {
        id: `ORD-${order[0].id.toString().padStart(3, '0')}`,
        date: order[0].createdAt.toISOString().split('T')[0],
        status: order[0].status,
        total: `₹${order[0].totalAmount}`,
        items,
        trackingNumber: order[0].trackingNumber,
        estimatedDelivery: order[0].estimatedDelivery?.toISOString().split('T')[0],
        shippingAddress: order[0].shippingAddress,
        paymentMethod: order[0].paymentMethod,
        userId: order[0].userId,
      };

      res.json(orderWithItems);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Create sample orders for testing (you can call this endpoint to populate test data)
  app.post("/api/orders/sample", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Check if user already has orders
      const existingOrders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, Number(userId)));

      if (existingOrders.length > 0) {
        return res.json({ message: "User already has orders", orders: existingOrders.length });
      }

      // Create sample orders with current dates
      const now = new Date();
      const sampleOrders = [
        {
          userId: Number(userId),
          totalAmount: 1299,
          status: 'delivered' as const,
          paymentMethod: 'Credit Card',
          shippingAddress: '123 Beauty Street, Mumbai, Maharashtra 400001',
          trackingNumber: 'TRK001234567',
          estimatedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          userId: Number(userId),
          totalAmount: 899,
          status: 'shipped' as const,
          paymentMethod: 'UPI',
          shippingAddress: '456 Glow Avenue, Delhi, Delhi 110001',
          trackingNumber: 'TRK001234568',
          estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          userId: Number(userId),
          totalAmount: 1599,
          status: 'processing' as const,
          paymentMethod: 'Net Banking',
          shippingAddress: '789 Skincare Lane, Bangalore, Karnataka 560001',
          trackingNumber: null,
          estimatedDelivery: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        }
      ];

      const createdOrders = await db.insert(ordersTable).values(sampleOrders).returning();

      // Create sample order items
      const sampleItems = [

      ];

      await db.insert(orderItemsTable).values(sampleItems);

      res.json({ message: "Sample orders created successfully", orders: createdOrders.length });
    } catch (error) {
      console.error("Error creating sample orders:", error);
      res.status(500).json({ error: "Failed to create sample orders" });
    }
  });



  // Create Cashfree order
  app.post("/api/payments/cashfree/create-order", async (req, res) => {
    try {
      const { amount, currency = 'INR', customerInfo, orderNote, orderData } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (!customerInfo || !customerInfo.customerName || !customerInfo.customerEmail) {
        return res.status(400).json({ error: "Customer information is required" });
      }

      // Validate customer name and email format
      if (!customerInfo.customerName.trim() || customerInfo.customerName.trim().length < 2) {
        return res.status(400).json({ error: "Valid customer name is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.customerEmail.trim())) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      // Check Cashfree configuration
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        console.error("Cashfree credentials not configured properly");
        return res.status(500).json({ 
          error: "Cashfree payment is not configured. Please use Cash on Delivery instead.",
          configError: true
        });
      }

      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Store payment data in database for tracking
      try {
        await db.insert(sql`
          INSERT INTO cashfree_payments (cashfree_order_id, user_id, amount, status, order_data, customer_info, created_at)
          VALUES (${orderId}, ${orderData.userId}, ${amount}, 'created', ${JSON.stringify(orderData)}, ${JSON.stringify(customerInfo)}, NOW())
        `);
      } catch (dbError) {
        console.error("Failed to store payment data:", dbError);
        // Continue with payment creation even if DB storage fails
      }

      // Validate and format phone number properly for Cashfree
      let phoneNumber = customerInfo.customerPhone || '9999999999';

      // Clean the phone number - remove all non-digit characters except +
      phoneNumber = phoneNumber.replace(/[^\d+]/g, '');

      // Remove country code if present to normalize
      phoneNumber = phoneNumber.replace(/^(\+91|91)/, '');

      // Validate Indian mobile number format
      if (phoneNumber.length === 10 && phoneNumber.match(/^[6-9]\d{9}$/)) {
        phoneNumber = '+91' + phoneNumber;
      } else {
        // Use a valid default for testing
        phoneNumber = '+919999999999';
      }

      const cashfreeOrderData = {
        order_id: orderId,
        order_amount: parseFloat(amount).toFixed(2),
        order_currency: currency,
        order_note: orderNote || 'Beauty Store Purchase',
        customer_details: {
          customer_id: String(customerInfo.customerId || 'guest'),
          customer_name: customerInfo.customerName,
          customer_email: customerInfo.customerEmail,
          customer_phone: phoneNumber,
        },
        order_meta: {
          return_url: `https://${req.get('host')}/checkout?payment=processing&orderId=${orderId}`,
          notify_url: `https://${req.get('host')}/api/payments/cashfree/webhook`,
        }
      };

      console.log("Creating Cashfree order with data:", JSON.stringify(cashfreeOrderData, null, 2));

      const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cashfreeOrderData),
      });

      const result = await response.json();
      console.log("Cashfree API response:", JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error("Cashfree API error:", result);
        let errorMessage = "Failed to create Cashfree order";

        if (result.message) {
          errorMessage = result.message;
        } else if (result.error_description) {
          errorMessage = result.error_description;
        }

        return res.status(response.status).json({ 
          error: errorMessage,
          cashfreeError: true,
          details: result
        });
      }

      if (!result.payment_session_id) {
        console.error("No payment session ID found in Cashfree response:", result);
        return res.status(500).json({ 
          error: "Cashfree response missing payment session ID. Please try again.",
          cashfreeError: true,
          details: result
        });
      }

      res.json({
        orderId: result.order_id,
        paymentSessionId: result.payment_session_id,
        amount: result.order_amount,
        currency: result.order_currency,
        environment: CASHFREE_MODE,
      });
    } catch (error) {
      console.error("Cashfree order creation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create Cashfree order",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Cashfree payment success callback
  app.get("/api/payments/cashfree/success", async (req, res) => {
    try {
      const { order_id } = req.query;

      if (!order_id) {
        return res.redirect('/checkout?payment=failed');
      }

      // Verify payment status
      const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${order_id}`, {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
      });

      const orderData = await response.json();

      if (response.ok && orderData.order_status === 'PAID') {
        res.redirect('/checkout?payment=success');
      } else {
        res.redirect('/checkout?payment=failed');
      }
    } catch (error) {
      console.error("Cashfree success callback error:", error);
      res.redirect('/checkout?payment=failed');
    }
  });

  // Cashfree webhook for payment verification
  app.post("/api/payments/cashfree/webhook", async (req, res) => {
    try {
      const { order_id, order_status, payment_id } = req.body;

      console.log('Cashfree webhook received:', { order_id, order_status, payment_id });

      // Update payment status in database
      if (order_status === 'PAID') {
        try {
          // Get stored payment data
          const paymentInfo = await db.select(sql`
            SELECT * FROM cashfree_payments 
            WHERE cashfree_order_id = ${order_id} 
            LIMIT 1
          `);

          if (paymentInfo.length > 0 && paymentInfo[0].status !== 'completed') {
            const storedData = JSON.parse(paymentInfo[0].order_data);

            // Create the order in database
            const orderCreateData = {
              userId: storedData.userId,
              totalAmount: paymentInfo[0].amount,
              status: 'confirmed',
              paymentMethod: 'Cashfree',
              shippingAddress: storedData.shippingAddress,
              cashfreeOrderId: order_id,
              paymentId: payment_id,
              createdAt: new Date(),
            };

            const createdOrders = await db.insert(ordersTable).values(orderCreateData).returning();
            const order = createdOrders[0];

            // Create order items
            const orderItems = storedData.items.map((item: any) => ({
              orderId: order.id,
              productId: Number(item.productId || item.id || 0),
              productName: item.productName || item.name,
              productImage: item.productImage || item.image || '',
              quantity: Number(item.quantity),
              price: item.price.toString(),
            }));

            await db.insert(orderItemsTable).values(orderItems);

            // Update payment status
            await db.update(sql`
              UPDATE cashfree_payments 
              SET status = 'completed', payment_id = ${payment_id}, completed_at = NOW() 
              WHERE cashfree_order_id = ${order_id}
            `);

            console.log(`Order created successfully via webhook for payment ${order_id}`);
          }
        } catch (dbError) {
          console.error("Error processing webhook:", dbError);
        }
      } else {
        try {
          await db.update(sql`
            UPDATE cashfree_payments 
            SET status = 'failed', payment_id = ${payment_id}, completed_at = NOW() 
            WHERE cashfree_order_id = ${order_id}
          `);
          console.log(`Payment failed for order: ${order_id}`);
        } catch (dbError) {
          console.error("Error updating failed payment:", dbError);
        }
      }

      res.status(200).json({ status: 'OK' });
    } catch (error) {
      console.error("Cashfree webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Verify Cashfree payment
  app.post("/api/payments/cashfree/verify", async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      const response = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}`, {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
        },
      });

      const cashfreeOrderData = await response.json();

      if (response.ok && cashfreeOrderData.order_status === 'PAID') {
        // Payment successful, create the actual order
        try {
          // Get stored payment data
          const paymentInfo = await db.select(sql`
            SELECT * FROM cashfree_payments 
            WHERE cashfree_order_id = ${orderId} 
            LIMIT 1
          `);

          if (paymentInfo.length > 0) {
            const storedData = JSON.parse(paymentInfo[0].order_data);

            // Create the order in database
            const orderCreateData = {
              userId: storedData.userId,
              totalAmount: paymentInfo[0].amount,
              status: 'confirmed',
              paymentMethod: 'Cashfree',
              shippingAddress: storedData.shippingAddress,
              cashfreeOrderId: orderId,
              paymentSessionId: cashfreeOrderData.payment_session_id,
              createdAt: new Date(),
            };

            const createdOrders = await db.insert(ordersTable).values(orderCreateData).returning();
            const order = createdOrders[0];

            // Create order items
            const orderItems = storedData.items.map((item: any) => ({
              orderId: order.id,
              productId: Number(item.productId || item.id || 0),
              productName: item.productName || item.name,
              productImage: item.productImage || item.image || '',
              quantity: Number(item.quantity),
              price: item.price.toString(),
            }));

            await db.insert(orderItemsTable).values(orderItems);

            // Update payment status
            await db.update(sql`
              UPDATE cashfree_payments 
              SET status = 'completed', completed_at = NOW() 
              WHERE cashfree_order_id = ${orderId}
            `);

            console.log(`Order created successfully for payment ${orderId}`);
          }
        } catch (dbError) {
          console.error("Error creating order after payment:", dbError);
          // Don't fail the verification, but log the error
        }

        res.json({ verified: true, message: "Payment verified successfully" });
      } else {
        // Update payment status as failed
        try {
          await db.update(sql`
            UPDATE cashfree_payments 
            SET status = 'failed', completed_at = NOW() 
            WHERE cashfree_order_id = ${orderId}
          `);
        } catch (dbError) {
          console.error("Error updating payment status:", dbError);
        }

        res.status(400).json({ error: "Payment verification failed" });
      }
    } catch (error) {
      console.error("Cashfree verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Create new order
  app.post("/api/orders", async (req, res) => {
    try {
      console.log("Received order data:", req.body);

      const { userId, totalAmount, status, paymentMethod, shippingAddress, items } = req.body;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!totalAmount || isNaN(Number(totalAmount))) {
        return res.status(400).json({ error: "Valid total amount is required" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order items are required" });
      }

      if (!shippingAddress) {
        return res.status(400).json({ error: "Shipping address is required" });
      }

      // Parse and validate totalAmount
      const parsedTotalAmount = Number(totalAmount);
      if (parsedTotalAmount <= 0) {
        return res.status(400).json({ error: "Total amount must be greater than 0" });
      }

      // Create order
      const orderData = {
        userId: Number(userId),
        totalAmount: Math.round(parsedTotalAmount), // Round to nearest integer for database
        status: status || 'pending',
        paymentMethod: paymentMethod || 'Credit Card',
        shippingAddress: shippingAddress.toString(),
        trackingNumber: null,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
      };

      console.log("Creating order with data:", orderData);

      const createdOrders = await db.insert(ordersTable).values(orderData).returning();
      const order = createdOrders[0];

      console.log("Order created:", order);

      // Validate and create order items
      const orderItems = items.map((item: any, index: number) => {
        if (!item.productName && !item.name) {
          throw new Error(`Item ${index + 1} is missing product name`);
        }
        if (!item.quantity || isNaN(Number(item.quantity))) {
          throw new Error(`Item ${index + 1} has invalid quantity`);
        }
        if (!item.price) {
          throw new Error(`Item ${index + 1} is missing price`);
        }

        return {
          orderId: order.id,
          productId: Number(item.productId || item.id || 0),
          productName: item.productName || item.name,
          productImage: item.productImage || item.image || '',
          quantity: Number(item.quantity),
          price: item.price.toString(),
        };
      });

      console.log("Creating order items:", orderItems);

      await db.insert(orderItemsTable).values(orderItems);

      // Generate order ID
      const orderId = `ORD-${order.id.toString().padStart(3, '0')}`;

      console.log("Order created successfully with ID:", orderId);

      res.status(201).json({ 
        message: "Order created successfully",
        orderId,
        order: {
          id: orderId,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt
        }
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ 
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create sample orders for all users (for testing)
  app.post("/api/orders/create-sample-data", async (req, res) => {
    try {
      // Get all users
      const allUsers = await db.select();

      if (allUsers.length === 0) {
        return res.status(400).json({ error: "No users found. Please create a user account first." });
      }

      let ordersCreated = 0;

      for (const user of allUsers) {
        // Check if user already has orders
        const existingOrders = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.userId, user.id));

        if (existingOrders.length > 0) {
          continue; // Skip users who already have orders
        }

        // Create sample orders with current dates
        const now = new Date();
        const sampleOrders = [
          {
            userId: user.id,
            totalAmount: 1299,
            status: 'delivered' as const,
            paymentMethod: 'Credit Card',
            shippingAddress: `${user.firstName} ${user.lastName}, 123 Beauty Street, Mumbai, Maharashtra 400001`,
            trackingNumber: `TRK00${user.id}234567`,
            estimatedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            userId: user.id,
            totalAmount: 899,
            status: 'shipped' as const,
            paymentMethod: 'UPI',
            shippingAddress: `${user.firstName} ${user.lastName}, 456 Glow Avenue, Delhi, Delhi 110001`,
            trackingNumber: `TRK00${user.id}234568`,
            estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            userId: user.id,
            totalAmount: 1599,
            status: 'processing' as const,
            paymentMethod: 'Net Banking',
            shippingAddress: `${user.firstName} ${user.lastName}, 789 Skincare Lane, Bangalore, Karnataka 560001`,
            trackingNumber: null,
            estimatedDelivery: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          }
        ];

        const createdOrders = await db.insert(ordersTable).values(sampleOrders).returning();

        // Create sample order items
        const sampleItems = [

        ];

        await db.insert(orderItemsTable).values(sampleItems);
        ordersCreated += createdOrders.length;
      }

      res.json({ 
        message: "Sample orders created successfully", 
        ordersCreated,
        usersProcessed: allUsers.length
      });
    } catch (error) {
      console.error("Error creating sample orders:", error);
      res.status(500).json({ error: "Failed to create sample orders" });
    }
  });


        // Update order status (for admin)
  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = req.params.id.replace('ORD-', '');
      const { status, trackingNumber } = req.body;

      const updateData: any = { status };
      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      await db
        .update(ordersTable)
        .set(updateData)
        .where(eq(ordersTable.id, Number(orderId)));

      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Get order tracking details
  app.get("/api/orders/:id/tracking", async (req, res) => {
    try {
      const orderId = req.params.id.replace('ORD-', '');

      const order = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData = order[0];

      // Generate tracking timeline based on order status
      const trackingTimeline = generateTrackingTimeline(orderData.status, orderData.createdAt, orderData.estimatedDelivery);

      const trackingInfo = {
        orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
        status: orderData.status,
        trackingNumber: orderData.trackingNumber,
        estimatedDelivery: orderData.estimatedDelivery?.toISOString().split('T')[0],
        timeline: trackingTimeline,
        currentStep: getCurrentStep(orderData.status),
        totalAmount: orderData.totalAmount,
        shippingAddress: orderData.shippingAddress,
        createdAt: orderData.createdAt.toISOString().split('T')[0]
      };

      res.json(trackingInfo);
    } catch (error) {
      console.error("Error fetching tracking info:", error);
      res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });

  // Helper function to generate tracking timeline
  function generateTrackingTimeline(status: string, createdAt: Date, estimatedDelivery: Date | null) {
    const timeline = [
      {
        step: "Order Placed",
        status: "completed",
        date: createdAt.toISOString().split('T')[0],
        time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: "Your order has been placed successfully"
      }
    ];

    const orderDate = new Date(createdAt);

    if (status === 'processing' || status === 'shipped' || status === 'delivered') {
      timeline.push({
        step: "Processing",
        status: "completed",
        date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "10:00 AM",
        description: "Your order is being prepared for shipment"
      });
    } else if (status === 'pending') {
      timeline.push({
        step: "Processing",
        status: "pending",
        date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "Expected by 10:00 AM",
        description: "Your order will be processed within 24 hours"
      });
    }

    if (status === 'shipped' || status === 'delivered') {
      timeline.push({
        step: "Shipped",
        status: "completed",
        date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "02:30 PM",
        description: "Your order has been shipped and is on the way"
      });
    } else if (status === 'processing') {
      timeline.push({
        step: "Shipped",
        status: "pending",
        date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "Expected by 2:00 PM",
        description: "Your order will be shipped soon"
      });
    }

    if (status === 'delivered') {
      timeline.push({
        step: "Delivered",
        status: "completed",
        date: estimatedDelivery?.toISOString().split('T')[0] || new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "11:45 AM",
        description: "Your order has been delivered successfully"
      });
    } else if (status === 'shipped') {
      timeline.push({
        step: "Delivered",
        status: "pending",
        date: estimatedDelivery?.toISOString().split('T')[0] || new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "Expected delivery",
        description: "Your order is out for delivery"
      });
    }

    return timeline;
  }

  // Helper function to get current step
  function getCurrentStep(status: string): number {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  }

  // Generate sample orders for development
  function generateSampleOrders(customers = [], products = []) {
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];
  const orders = [];
  const now = new Date();

  // If either customers or products is empty, return empty orders
  if (!customers.length || !products.length) {
    return [];
  }

  for (let i = 0; i < 50; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const orderDate = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);

    const orderProducts = [];
    const numProducts = Math.floor(Math.random() * 3) + 1;
    let totalAmount = 0;

    for (let j = 0; j < numProducts; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = parseInt(product?.price?.replace(/[₹,]/g, '')) || 0;

      orderProducts.push({
        ...product,
        quantity,
      });

      totalAmount += price * quantity;
    }

    orders.push({
      id: `ORD-${(i + 1).toString().padStart(3, '0')}`,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: `${customer.name}, ${Math.floor(Math.random() * 999) + 1} Sample Street, Mumbai, Maharashtra 400001`,
      },
      date: orderDate.toISOString().split('T')[0],
      total: `₹${totalAmount}`,
      totalAmount,
      status,
      items: orderProducts.length,
      paymentMethod: ['Credit Card', 'UPI', 'Net Banking'][Math.floor(Math.random() * 3)],
      trackingNumber:
        status === 'shipped' || status === 'delivered'
          ? `TRK${Math.random().toString(36).substring(7).toUpperCase()}`
          : null,
      estimatedDelivery:
        status === 'shipped'
          ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null,
      products: orderProducts,
      userId: Math.floor(Math.random() * 5) + 1,
      shippingAddress: `${customer.name}, ${Math.floor(Math.random() * 999) + 1} Sample Street, Mumbai, Maharashtra 400001`,
    });
  }

  return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
}


  // Generate sample subcategories for development
  function generateSampleSubcategories() {
    return [
      { id: 1, name: "Matte Liquid Lipstick", slug: "matte-liquid-lipstick", categoryId: 1, description: "Long-lasting matte finish lipsticks", status: "Active", productCount: 8 },
      { id: 2, name: "Gloss Liquid Lipstick", slug: "gloss-liquid-lipstick", categoryId: 1, description: "High-shine glossy lipsticks", status: "Active", productCount: 6 },
      { id: 3, name: "Lip Liner", slug: "lip-liner", categoryId: 1, description: "Precise lip definition products", status: "Active", productCount: 4 },
      { id: 4, name: "Lip Balm", slug: "lip-balm", categoryId: 1, description: "Nourishing lip care products", status: "Active", productCount: 5 }
    ];
  }

  // Generate sample subcategories for a specific category
  function generateSampleSubcategoriesForCategory(categorySlug: string) {
    const allSubcategories = generateSampleSubcategories();

    // Map category slugs to subcategories
    const categorySubcategoryMap: Record<string, string[]> = {
      'lips': ['matte-liquid-lipstick', 'gloss-liquid-lipstick', 'lip-liner', 'lip-balm'],
      'eyes': ['mascara', 'eyeshadow', 'eyeliner', 'eyebrow'],
      'face': ['foundation', 'concealer', 'powder', 'blush'],
      'skincare': ['cleanser', 'moisturizer', 'serum', 'sunscreen'],
      'makeup': ['foundation', 'lipstick', 'eyeshadow', 'mascara']
    };

    const subcategorySlugs = categorySubcategoryMap[categorySlug] || [];
    return allSubcategories.filter(sub => subcategorySlugs.includes(sub.slug));
  }

  // Generate sample categories for development with dynamic product count
  function generateSampleCategories() {
    const sampleProducts = generateSampleProducts();

    const baseCategories = [
      {
        id: 1,
        name: "Lips",
        slug: "lips",
        description: "Beautiful lip products for every occasion",
        imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        status: "Active"
      },
      {
        id: 2,
        name: "Face",
        slug: "face",
        description: "Foundation, concealer and face makeup",
        imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        status: "Active"
      },
      {
        id: 3,
        name: "Eyes",
        slug: "eyes",
        description: "Eye makeup for stunning looks",
        imageUrl: "https://images.unsplash.com/photo-1512207846215-2a4d0e8b6b9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        status: "Active"
      },
      {
        id: 4,
        name: "Skincare",
        slug: "skincare",
        description: "Premium skincare products",
        imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        status: "Active"
      },
      {
        id: 5,
        name: "Eyes Care",
        slug: "eyes-care",
        description: "Specialized eye care products",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        status: "Active"
      }
    ];

    // Calculate dynamic product count for each category
    return baseCategories.map(category => {
      const productCount = sampleProducts.filter(product => 
        product.category.toLowerCase() === category.slug.toLowerCase()
      ).length;

      return {
        ...category,
        productCount
      };
    });
  }

  // Blog API Routes

  // Public blog routes
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const { category, featured, search } = req.query;
      
      let posts;
      
      if (search) {
        posts = await storage.searchBlogPosts(search.toString());
      } else if (featured === 'true') {
        posts = await storage.getFeaturedBlogPosts();
      } else {
        posts = await storage.getPublishedBlogPosts();
      }

      // Filter by category if provided
      if (category && category !== 'All') {
        posts = posts.filter(post => post.category === category);
      }

      // Parse tags for frontend
      const postsWithParsedTags = posts.map(post => ({
        ...post,
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || [])
      }));

      res.json(postsWithParsedTags);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      // Return sample data as fallback
      const samplePosts = [
        {
          id: 1,
          title: "The Ultimate Guide to Korean Skincare Routine",
          slug: "ultimate-guide-korean-skincare-routine",
          excerpt: "Discover the secrets behind the famous 10-step Korean skincare routine and how to adapt it for your skin type.",
          content: "Korean skincare has revolutionized the beauty industry with its emphasis on prevention, hydration, and gentle care...",
          author: "Sarah Kim",
          category: "Skincare",
          tags: ["K-Beauty", "Skincare", "Routine", "Tips"],
          imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
          videoUrl: null,
          featured: true,
          published: true,
          likes: 124,
          comments: 18,
          readTime: "8 min read",
          createdAt: new Date('2024-12-15'),
          updatedAt: new Date('2024-12-15')
        }
      ];
      res.json(samplePosts);
    }
  });

  app.get("/api/blog/posts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Parse tags for frontend
      const postWithParsedTags = {
        ...post,
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags
      };

      res.json(postWithParsedTags);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  app.get("/api/blog/categories", async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      // Return empty array if database is unavailable instead of static data
      res.json([]);
    }
  });

  // Admin blog routes
  app.get("/api/admin/blog/posts", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      
      // Parse tags for frontend
      const postsWithParsedTags = posts.map(post => ({
        ...post,
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags
      }));

      res.json(postsWithParsedTags);
    } catch (error) {
      console.error("Error fetching admin blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  app.post("/api/admin/blog/posts", upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let imageUrl = req.body.imageUrl;
      let videoUrl = req.body.videoUrl;

      // Handle image upload
      if (files?.image?.[0]) {
        imageUrl = `/api/images/${files.image[0].filename}`;
      }

      // Handle video upload
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      }

      const postData = {
        title: req.body.title,
        excerpt: req.body.excerpt,
        content: req.body.content,
        author: req.body.author,
        category: req.body.category,
        tags: Array.isArray(req.body.tags) ? req.body.tags : 
              typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : [],
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
        videoUrl,
        featured: req.body.featured === 'true',
        published: req.body.published === 'true',
        readTime: req.body.readTime || '5 min read'
      };

      const post = await storage.createBlogPost(postData);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  app.put("/api/admin/blog/posts/:id", upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const updateData: any = {};

      // Only update fields that are provided
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.excerpt) updateData.excerpt = req.body.excerpt;
      if (req.body.content) updateData.content = req.body.content;
      if (req.body.author) updateData.author = req.body.author;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.readTime) updateData.readTime = req.body.readTime;
      
      if (req.body.tags) {
        updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : 
                          typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : [];
      }

      if (req.body.featured !== undefined) updateData.featured = req.body.featured === 'true';
      if (req.body.published !== undefined) updateData.published = req.body.published === 'true';

      // Handle image upload
      if (files?.image?.[0]) {
        updateData.imageUrl = `/api/images/${files.image[0].filename}`;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }

      // Handle video upload
      if (files?.video?.[0]) {
        updateData.videoUrl = `/api/images/${files.video[0].filename}`;
      } else if (req.body.videoUrl !== undefined) {
        updateData.videoUrl = req.body.videoUrl || null;
      }

      const post = await storage.updateBlogPost(parseInt(id), updateData);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  app.delete("/api/admin/blog/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBlogPost(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json({ success: true, message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Admin blog categories
  app.get("/api/admin/blog/categories", async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: "Failed to fetch blog categories" });
    }
  });

  app.post("/api/admin/blog/categories", async (req, res) => {
    try {
      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive !== false,
        sortOrder: parseInt(req.body.sortOrder) || 0
      };

      const category = await storage.createBlogCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating blog category:", error);
      res.status(500).json({ error: "Failed to create blog category" });
    }
  });

  app.put("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateBlogCategory(parseInt(id), req.body);
      
      if (!category) {
        return res.status(404).json({ error: "Blog category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Error updating blog category:", error);
      res.status(500).json({ error: "Failed to update blog category" });
    }
  });

  app.delete("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBlogCategory(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Blog category not found" });
      }

      res.json({ success: true, message: "Blog category deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog category:", error);
      res.status(500).json({ error: "Failed to delete blog category" });
    }
  });

  // Generate sample customers for development
  function generateSampleCustomers() {
    const sampleCustomers = [];

    return sampleCustomers.map(customer => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      orders: Math.floor(Math.random() * 10) + 1,
      spent: `₹${(Math.random() * 8000 + 500).toFixed(2)}`,
      status: Math.random() > 0.7 ? 'VIP' : Math.random() > 0.4 ? 'Active' : 'New',
      joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      firstName: customer.firstName,
      lastName: customer.lastName,
    }));
  }

  // Generate sample products for development
  function generateSampleProducts() {
    return [
      {
        id: 1,
        name: "Matte Liquid Lipstick - Ruby Red",
        slug: "matte-liquid-lipstick-ruby-red",
        description: "Long-lasting matte liquid lipstick in stunning ruby red",
        shortDescription: "Long-lasting matte finish",
        price: 899,
        originalPrice: 1200,
        category: "Lips",
        subcategory: "Matte Liquid Lipstick",
        imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.5,
        reviewCount: 125,
        inStock: true,
        featured: true,
        bestseller: false,
        newLaunch: false,
        createdAt: new Date('2024-01-01'),
        tags: "matte, long-lasting, red"
      },
      {
        id: 2,
        name: "Gloss Liquid Lipstick - Pink Shine",
        slug: "gloss-liquid-lipstick-pink-shine",
        description: "High-shine glossy liquid lipstick in beautiful pink",
        shortDescription: "High-shine glossy finish",
        price: 799,
        originalPrice: 999,
        category: "Lips",
        subcategory: "Gloss Liquid Lipstick",
        imageUrl: "https://images.unsplash.com/photo-1631214540127-41f301318769?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.3,
        reviewCount: 89,
        inStock: true,
        featured: false,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-01-15'),
        tags: "gloss, shine, pink"
      },
      {
        id: 3,
        name: "HD Foundation - Ivory",
        slug: "hd-foundation-ivory",
        description: "Full coverage HD foundation for flawless skin",
        shortDescription: "Full coverage foundation",
        price: 1299,
        originalPrice: 1599,
        category: "Face",
        subcategory: "Foundation",
        imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.7,
        reviewCount: 203,
        inStock: true,
        featured: true,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-02-01'),
        tags: "foundation, coverage, ivory"
      },
      {
        id: 4,
        name: "Waterproof Mascara",
        slug: "waterproof-mascara",
        description: "Long-lasting waterproof mascara for dramatic lashes",
        shortDescription: "Waterproof dramatic lashes",
        price: 649,
        originalPrice: 799,
        category: "Eyes",
        subcategory: "Mascara",
        imageUrl: "https://images.unsplash.com/photo-1512207846215-2a4d0e8b6b9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.4,
        reviewCount: 156,
        inStock: true,
        featured: false,
        bestseller: false,
        newLaunch: true,
        createdAt: new Date('2024-02-15'),
        tags: "mascara, waterproof, lashes"
      },
      {
        id: 5,
        name: "Hydrating Face Serum",
        slug: "hydrating-face-serum",
        description: "Intensive hydrating serum with hyaluronic acid",
        shortDescription: "Hyaluronic acid serum",
        price: 1599,
        originalPrice: 1999,
        category: "Skincare",
        subcategory: "Serum",
        imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.8,
        reviewCount: 287,
        inStock: true,
        featured: true,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-01-20'),
        tags: "serum, hydrating, hyaluronic"
      },
      {
        id: 6,
        name: "Lip Liner - Nude Rose",
        slug: "lip-liner-nude-rose",
        description: "Precise lip liner in nude rose shade",
        shortDescription: "Precise lip definition",
        price: 449,
        originalPrice: 599,
        category: "Lips",
        subcategory: "Lip Liner",
        imageUrl: "https://images.unsplash.com/photo-1583241800519-6da18d585928?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.2,
        reviewCount: 78,
        inStock: true,
        featured: false,
        bestseller: false,
        newLaunch: false,
        createdAt: new Date('2024-01-10'),
        tags: "liner, nude, rose"
      },
      {
        id: 7,
        name: "Nourishing Lip Balm",
        slug: "nourishing-lip-balm",
        description: "Moisturizing lip balm with natural ingredients",
        shortDescription: "Natural moisturizing balm",
        price: 299,
        originalPrice: 399,
        category: "Lips",
        subcategory: "Lip Balm",
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.6,
        reviewCount: 134,
        inStock: true,
        featured: false,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-01-05'),
        tags: "balm, moisturizing, natural"
      },
      {
        id: 8,
        name: "Eyeshadow Palette - Sunset",
        slug: "eyeshadow-palette-sunset",
        description: "12-shade eyeshadow palette in sunset colors",
        shortDescription: "12-shade sunset palette",
        price: 1899,
        originalPrice: 2299,
        category: "Eyes",
        subcategory: "Eyeshadow",
        imageUrl: "https://images.unsplash.com/photo-1615397587950-3cfd4d96b742?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.9,
        reviewCount: 312,
        inStock: true,
        featured: true,
        bestseller: true,
        newLaunch: true,
        createdAt: new Date('2024-02-20'),
        tags: "eyeshadow, palette, sunset"
      },
      {
        id: 9,
        name: "Vitamin C Cleanser",
        slug: "vitamin-c-cleanser",
        description: "Brightening cleanser with vitamin C",
        shortDescription: "Brightening face cleanser",
        price: 799,
        originalPrice: 999,
        category: "Skincare",
        subcategory: "Cleanser",
        imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.4,
        reviewCount: 189,
        inStock: true,
        featured: false,
        bestseller: false,
        newLaunch: false,
        createdAt: new Date('2024-01-25'),
        tags: "cleanser, vitamin-c, brightening"
      },
      {
        id: 10,
        name: "Concealer - Medium",
        slug: "concealer-medium",
        description: "High coverage concealer for medium skin tones",
        shortDescription: "High coverage concealer",
        price: 899,
        originalPrice: 1199,
        category: "Face",
        subcategory: "Concealer",
        imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.5,
        reviewCount: 167,
        inStock: true,
        featured: false,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-02-05'),
        tags: "concealer, coverage, medium"
      },
      {
        id: 11,
        name: "Eye Cream - Anti Aging",
        slug: "eye-cream-anti-aging",
        description: "Powerful anti-aging eye cream with retinol and peptides",
        shortDescription: "Anti-aging eye treatment",
        price: 1299,
        originalPrice: 1599,
        category: "Eyes Care",
        subcategory: null,
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.6,
        reviewCount: 89,
        inStock: true,
        featured: true,
        bestseller: false,
        newLaunch: false,
        createdAt: new Date('2024-01-15'),
        tags: "eye cream, anti-aging, retinol"
      },
      {
        id: 12,
        name: "Under Eye Gel",
        slug: "under-eye-gel",
        description: "Cooling under eye gel to reduce puffiness and dark circles",
        shortDescription: "Cooling under eye treatment",
        price: 799,
        originalPrice: 999,
        category: "Eyes Care",
        subcategory: null,
        imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.3,
        reviewCount: 156,
        inStock: true,
        featured: false,
        bestseller: true,
        newLaunch: false,
        createdAt: new Date('2024-01-20'),
        tags: "under eye, gel, puffiness"
      },
      {
        id: 13,
        name: "Eye Serum - Vitamin C",
        slug: "eye-serum-vitamin-c",
        description: "Brightening eye serum with vitamin C and hyaluronic acid",
        shortDescription: "Brightening eye serum",
        price: 1099,
        originalPrice: 1399,
        category: "Eyes Care",
        subcategory: null,
        imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
        rating: 4.7,
        reviewCount: 203,
        inStock: true,
        featured: false,
        bestseller: false,
        newLaunch: true,
        createdAt: new Date('2024-02-10'),
        tags: "eye serum, vitamin c, brightening"
      }
    ];
  }

  // Admin Customers endpoints
  app.get("/api/admin/customers", async (req, res) => {
    try {
      // Get all users from database
      let allUsers;
      try {
        allUsers = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt,
        }).from(users);
      } catch (dbError) {
        // Fallback sample data when database is unavailable
        console.log("Database unavailable, using sample customer data");
        return res.json(generateSampleCustomers());
      }

      // Get order statistics for each customer
      const customersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          // Get order count and total spent for this user
          const userOrders = await db
            .select({
              totalAmount: ordersTable.totalAmount,
              status: ordersTable.status,
            })
            .from(ordersTable)
            .where(eq(ordersTable.userId, user.id));

          const orderCount = userOrders.length;
          const totalSpent = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);

          // Determine customer status based on orders and total spent
          let status = 'New';
          if (orderCount === 0) {
            status = 'Inactive';
          } else if (totalSpent > 2000) {
            status = 'VIP';
          } else if (orderCount > 0) {
            status = 'Active';
          }

          return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone || 'N/A',
            orders: orderCount,
            spent: `₹${totalSpent.toFixed(2)}`,
            status,
            joinedDate: user.createdAt.toISOString().split('T')[0],
            firstName: user.firstName,
            lastName: user.lastName,
          };
        })
      );

      res.json(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get individual customer details
  app.get("/api/admin/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);

      // Get user details
      const user = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, customerId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = user[0];

      // Get customer's orders
      const customerOrders = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, customerId))
        .orderBy(desc(ordersTable.createdAt));

      const orderCount = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      // Determine status
      let status = 'New';
      if (orderCount === 0) {
        status = 'Inactive';
      } else if (totalSpent > 2000) {
        status = 'VIP';
      } else if (orderCount > 0) {
        status = 'Active';
      }

      const customerWithStats = {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || 'N/A',
        orders: orderCount,
        spent: `₹${totalSpent.toFixed(2)}`,
        status,
        joinedDate: customer.createdAt.toISOString().split('T')[0],
        firstName: customer.firstName,
        lastName: customer.lastName,
        recentOrders: customerOrders.slice(0, 5).map(order => ({
          id: `ORD-${order.id.toString().padStart(3, '0')}`,
          date: order.createdAt.toISOString().split('T')[0],
          status: order.status,
          total: `₹${order.totalAmount}`,
        })),
      };

      res.json(customerWithStats);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer details" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, subject, message } = req.body;

      // Validation
      if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }

      // Save contact form submission to database
      const submissionData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        subject: subject ? subject.trim() : null,
        message: message.trim(),
        status: "unread"
      };

      const savedSubmission = await storage.createContactSubmission(submissionData);

      console.log("Contact form submission saved:", {
        id: savedSubmission.id,
        firstName,
        lastName,
        email,
        subject: subject || "General Inquiry",
        timestamp: savedSubmission.createdAt
      });

      // In a real application, you would also:
      // // 1. Send anemail notification to your support team
      // 2. Send a confirmation email to the customer

      res.json({ 
        message: "Thank you for your message! We'll get back to you within 24 hours.",
        success: true,
        submissionId: savedSubmission.id
      });
    } catch (error) {
      console.error("Contact form submission error:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Contact submissions management endpoints (Admin)
  app.get("/api/admin/contact-submissions", async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      res.status(500).json({ error: "Failed to fetch contact submissions" });
    }
  });

  app.get("/api/admin/contact-submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getContactSubmission(parseInt(id));
      if (!submission) {
        return res.status(404).json({ error: "Contact submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching contact submission:", error);
      res.status(500).json({ error: "Failed to fetch contact submission" });
    }
  });

  app.put("/api/admin/contact-submissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["unread", "read", "responded"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: unread, read, or responded" });
      }

      const respondedAt = status === "responded" ? new Date() : undefined;
      const updatedSubmission = await storage.updateContactSubmissionStatus(parseInt(id), status, respondedAt);

      if (!updatedSubmission) {
        return res.status(404).json({ error: "Contact submission not found" });
      }

      res.json({
        message: "Contact submission status updated successfully",
        submission: updatedSubmission
      });
    } catch (error) {
      console.error("Error updating contact submission status:", error);
      res.status(500).json({ error: "Failed to update contact submission status" });
    }
  });

  app.delete("/api/admin/contact-submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteContactSubmission(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Contact submission not found" });
      }
      res.json({ success: true, message: "Contact submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact submission:", error);
      res.status(500).json({ error: "Failed to delete contact submission" });
    }
  });

  // Invoice download endpoint
  app.get("/api/orders/:id/invoice", async (req, res) => {
    try {
      const orderId = req.params.id.replace('ORD-', '');

      // Get order details
      const order = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get order items
      const items = await db
        .select({
          id: orderItemsTable.id,
          name: orderItemsTable.productName,
          quantity: orderItemsTable.quantity,
          price: orderItemsTable.price,
          image: orderItemsTable.productImage,
        })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order[0].id));

      // Get user info
      const user = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, order[0].userId))
        .limit(1);

      const userData = user[0] || { firstName: 'Unknown', lastName: 'Customer', email: 'unknown@email.com', phone: 'N/A' };

      // Generate HTML invoice
      const invoiceHtml = generateInvoiceHTML({
        order: order[0],
        items,
        customer: userData,
        orderId: `ORD-${order[0].id.toString().padStart(3, '0')}`
      });

      // Set headers for file download
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-ORD-${order[0].id.toString().padStart(3, '0')}.html"`);

      res.send(invoiceHtml);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Helper function to generate invoice HTML
  function generateInvoiceHTML({ order, items, customer, orderId }: any) {
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return sum + (price * item.quantity);
    }, 0);

    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${orderId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f4f4f4;
            padding: 20px;
        }

        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e74c3c;
            padding-bottom: 20px;
        }

        .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 10px;
        }

        .company-details {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #333;
        }

        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        .info-section h3 {
            color: #e74c3c;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .info-section p {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .customer-info {
            text-align: right;
        }

        .status-badge {
            display: inline-block;
            background: #27ae60;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 14px;
        }

        .items-table th {
            background: #e74c3c;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
        }

        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }

        .items-table tbody tr:nth-child(even) {
            background: #f9f9f9;
        }

        .items-table .text-right {
            text-align: right;
        }

        .totals {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
        }

        .totals-table {
            width: 300px;
        }

        .totals-table tr {
            border-bottom: 1px solid #eee;
        }

        .totals-table td {
            padding: 8px 0;
            font-size: 14px;
        }

        .totals-table .text-right {
            text-align: right;
        }

        .grand-total {
            font-weight: bold;
            font-size: 18px;
            color: #e74c3c;
            border-top: 2px solid #e74c3c !important;
            padding-top: 15px !important;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 13px;
        }

        .footer p {
            margin-bottom: 8px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-name">Beauty Store</div>
            <div class="company-details">
                Premium Beauty & Skincare Products<br>
                123 Beauty Street, Mumbai, Maharashtra 400001<br>
                Email: info@beautystore.com | Phone: +91 98765 43210<br>
                GST No: 27ABCDE1234F1Z5
            </div>
        </div>

        <h1 class="invoice-title">INVOICE</h1>

        <div class="invoice-info">
            <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Invoice No:</strong> ${orderId}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                <p><strong>Status:</strong> <span class="status-badge">${order.status}</span></p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ''}
            </div>

            <div class="info-section customer-info">
                <h3>Bill To</h3>
                <p><strong>${customer.firstName} ${customer.lastName}</strong></p>
                <p>${customer.email}</p>
                ${customer.phone ? `<p>${customer.phone}</p>` : ''}
                <br>
                <p><strong>Shipping Address:</strong></p>
                <p>${order.shippingAddress}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item: any) => {
                  const unitPrice = parseInt(item.price.replace(/[₹,]/g, ""));
                  const itemTotal = unitPrice * item.quantity;
                  return `
                    <tr>
                        <td>${item.name}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">₹${unitPrice.toLocaleString('en-IN')}</td>
                        <td class="text-right">₹${itemTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">₹${subtotal.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td>GST (18%):</td>
                    <td class="text-right">₹${tax.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td>Shipping:</td>
                    <td class="text-right">Free</td>
                </tr>
                <tr class="grand-total">
                    <td><strong>Grand Total:</strong></td>
                    <td class="text-right"><strong>₹${total.toLocaleString('en-IN')}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer generated invoice. No signature required.</p>
            <p>For any queries, please contact us at support@beautystore.com</p>
            <p>Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
    </div>
</body>
</html>`;
  }

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured products" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q;

      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const products = await storage.searchProducts(query);
      return res.json(products);

    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Admin global search endpoint
  // Token validation endpoint
  app.get("/api/auth/validate", (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "No valid token provided" });
      }

      const token = authHeader.substring(7);

      // Verify JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        res.json({ valid: true, message: "Token is valid", user: decoded });
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid token" });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(401).json({ error: "Token validation failed" });
    }
  });

  app.get("/api/admin/search", async (req, res) => {
    try {
      const query = req.query.q;

      if (!query || query.toString().trim().length === 0) {
        return res.json({ products: [], customers: [], orders: [] });
      }

      console.log("Admin search query:", query);

      const searchTerm = query.toString().toLowerCase();

      // Search products
      let products = [];
      try {
        const allProducts = await storage.getProducts();
        products = allProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          (product.subcategory && product.subcategory.toLowerCase().includes(searchTerm)) ||
          (product.tags && product.tags.toLowerCase().includes(searchTerm))
        ).slice(0, 5);
      } catch (error) {
        console.log("Products search failed:", error.message);
        products = [];
      }

      // Search customers
      let customers = [];
      try {
        const allUsers = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt,
        }).from(users);

        customers = allUsers.filter(user => 
          (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
          (user.email && user.email.toLowerCase().includes(searchTerm)) ||
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm)
        ).map(user => ({
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phone: user.phone || 'N/A'
        })).slice(0, 5);
      } catch (error) {
        console.log("Customers search failed:", error.message);
        customers = [];
      }

      // Search orders
      let orders = [];
      try {
        const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

        orders = await Promise.all(
          allOrders.filter(order => {
            const orderId = `ORD-${order.id.toString().padStart(3, '0')}`;
            return orderId.toLowerCase().includes(searchTerm) ||
                   (order.status && order.status.toLowerCase().includes(searchTerm));
          }).slice(0, 5).map(async (order) => {
            try {
              // Get user info for the order
              const user = await db
                .select({
                  firstName: users.firstName,
                  lastName: users.lastName,
                  email: users.email,
                })
                .from(users)
                .where(eq(users.id, order.userId))
                .limit(1);

              const userData = user[0] || { firstName: 'Unknown', lastName: 'Customer', email: 'unknown@email.com' };

              return {
                id: `ORD-${order.id.toString().padStart(3, '0')}`,
                customerName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Customer',
                customerEmail: userData.email,
                date: order.createdAt.toISOString().split('T')[0],
                status: order.status,
                total: `₹${order.totalAmount}`
              };
            } catch (userError) {
              console.log("Error fetching user for order:", order.id);
              return {
                id: `ORD-${order.id.toString().padStart(3, '0')}`,
                customerName: 'Unknown Customer',
                customerEmail: 'unknown@email.com',
                date: order.createdAt.toISOString().split('T')[0],
                status: order.status,
                total: `₹${order.totalAmount}`
              };
            }
          })
        );
      } catch (error) {
        console.log("Orders search failed:", error.message);
        orders = [];
      }

      res.json({ products, customers, orders });
    } catch (error) {
      console.error("Admin search error:", error);
      res.status(500).json({ error: "Failed to perform admin search" });
    }
  });

  // Shades API
  app.get("/api/shades", async (req, res) => {
    try {
      const activeShades = await storage.getActiveShades();
      res.json(activeShades);
    } catch (error) {
      console.log("Database unavailable, using sample shade data");
      // Default shades data
      const defaultShades = [
        { id: 1, name: "Fair to Light", colorCode: "#F7E7CE", value: "fair-light", isActive: true, sortOrder: 1 },
        { id: 2, name: "Light to Medium", colorCode: "#F5D5AE", value: "light-medium", isActive: true, sortOrder: 2 },
        { id: 3, name: "Medium", colorCode: "#E8B895", value: "medium", isActive: true, sortOrder: 3 },
        { id: 4, name: "Medium to Deep", colorCode: "#D69E2E", value: "medium-deep", isActive: true, sortOrder: 4 },
        { id: 5, name: "Deep", colorCode: "#B7791F", value: "deep", isActive: true, sortOrder: 5 },
        { id: 6, name: "Very Deep", colorCode: "#975A16", value: "very-deep", isActive: true, sortOrder: 6 },
        { id: 7, name: "Porcelain", colorCode: "#FFF8F0", value: "porcelain", isActive: true, sortOrder: 7 },
        { id: 8, name: "Ivory", colorCode: "#FFFFF0", value: "ivory", isActive: true, sortOrder: 8 },
        { id: 9, name: "Beige", colorCode: "#F5F5DC", value: "beige", isActive: true, sortOrder: 9 },
        { id: 10, name: "Sand", colorCode: "#F4A460", value: "sand", isActive: true, sortOrder: 10 },
        { id: 11, name: "Honey", colorCode: "#FFB347", value: "honey", isActive: true, sortOrder: 11 },
        { id: 12, name: "Caramel", colorCode: "#AF6F09", value: "caramel", isActive: true, sortOrder: 12 },
        { id: 13, name: "Cocoa", colorCode: "#7B3F00", value: "cocoa", isActive: true, sortOrder: 13 },
        { id: 14, name: "Espresso", colorCode: "#3C2415", value: "espresso", isActive: true, sortOrder: 14 }
      ];
      res.json(defaultShades);
    }
  });

  // Admin shade management routes
  app.get("/api/admin/shades", async (req, res) => {
    try {
      const allShades = await storage.getShades();
      res.json(allShades);
    } catch (error) {
      console.error("Error fetching shades:", error);
      res.status(500).json({ error: "Failed to fetch shades" });
    }
  });

  app.post("/api/admin/shades", async (req, res) => {
    try {
      console.log("Creating shade with data:", req.body);

      const { name, colorCode, value, isActive, sortOrder, categoryIds, subcategoryIds, productIds, imageUrl } = req.body;

      // Validation
      if (!name || !colorCode) {
        return res.status(400).json({ error: "Name and color code are required" });
      }

      if (name.trim().length === 0) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }

      if (!colorCode.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: "Invalid color code format. Use hex format like #FF0000" });
      }

      const generatedValue = value && value.trim() ? value.trim() : name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const shadeData = {
        name: name.trim(),
        colorCode: colorCode.trim().toUpperCase(),
        value: generatedValue,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number(sortOrder) || 0,
        categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
        subcategoryIds: Array.isArray(subcategoryIds) ? subcategoryIds : [],
        productIds: Array.isArray(productIds) ? productIds : [],
        imageUrl: imageUrl || null
      };

      console.log("Processed shade data:", shadeData);

      const shade = await storage.createShade(shadeData);
      console.log("Shade created successfully:", shade);

      res.status(201).json(shade);
    } catch (error) {
      console.error("Error creating shade:", error);

      let errorMessage = "Failed to create shade";
      if (error.message) {
        errorMessage = error.message;
      }

      if (error.message && error.message.includes('unique constraint')) {
        errorMessage = "A shade with this value already exists. Please choose a different name or value.";
      }

      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.put("/api/admin/shades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating shade with ID:", id);
      console.log("Update data:", req.body);

      const { name, colorCode, value, isActive, sortOrder, categoryIds, subcategoryIds, productIds, imageUrl } = req.body;

      // Validation
      if (name && name.trim().length === 0) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }

      if (colorCode && !colorCode.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: "Invalid color code format. Use hex format like #FF0000" });
      }

      // Process the update data
      const updateData: any = {};

      if (name !== undefined) updateData.name = name.trim();
      if (colorCode !== undefined) updateData.colorCode = colorCode.trim().toUpperCase();
      if (value !== undefined) updateData.value = value.trim() || name?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder) || 0;
      if (categoryIds !== undefined) updateData.categoryIds = Array.isArray(categoryIds) ? categoryIds : [];
      if (subcategoryIds !== undefined) updateData.subcategoryIds = Array.isArray(subcategoryIds) ? subcategoryIds : [];
      if (productIds !== undefined) updateData.productIds = Array.isArray(productIds) ? productIds : [];
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;

      console.log("Processed update data:", updateData);

      const updatedShade = await storage.updateShade(parseInt(id), updateData);
      if (!updatedShade) {
        return res.status(404).json({ error: "Shade not found" });
      }

      console.log("Shade updated successfully:", updatedShade);
      res.json(updatedShade);
    } catch (error) {
      console.error("Error updating shade:", error);

      let errorMessage = "Failed to update shade";
      if (error.message) {
        errorMessage = error.message;
      }

      if (error.message && error.message.includes('unique constraint')) {
        errorMessage = "A shade with this value already exists. Please choose a different name or value.";
      }

      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.delete("/api/admin/shades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteShade(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Shade not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shade:", error);
      res.status(500).json({ error: "Failed to delete shade" });
    }
  });

  // Slider management routes
  app.get('/api/admin/sliders', async (req, res) => {
    try {
      const allSliders = await db.select().from(sliders).orderBy(desc(sliders.sortOrder));
      res.json(allSliders);
    } catch (error) {
      console.error('Error fetching sliders:', error);
      res.status(500).json({ error: 'Failed to fetch sliders' });
    }
  });

  app.post('/api/admin/sliders', upload.single("image"), async (req, res) => {
    try {
      // Handle image URL - require uploaded file
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Image file is required' 
        });
      }

      const imageUrl = `/api/images/${req.file.filename}`;

      const [newSlider] = await db.insert(sliders).values({
        title: `Image ${Date.now()}`,
        subtitle: '',
        description: 'Uploaded image',
        imageUrl: imageUrl,
        badge: '',
        primaryActionText: '',
        primaryActionUrl: '',
        isActive: true,
        sortOrder: 0
      }).returning();

      res.json(newSlider);
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ 
        error: 'Failed to upload image',
        details: error.message 
      });
    }
  });

  app.put('/api/admin/sliders/:id', upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;

       // Return the file URL
       let imageUrl = body.imageUrl;
       if(req.file) {
        imageUrl = `/api/images/${req.file?.filename}`;
       }

      const [updatedSlider] = await db.update(sliders)
        .set({

          imageUrl: imageUrl,
          isActive: body.isActive === 'true',
          sortOrder: parseInt(body.sortOrder, 10),
          updatedAt: new Date().toISOString()
        })
        .where(eq(sliders.id, id))
        .returning();

      if (!updatedSlider) {
        return res.status(404).json({ error: 'Slider not found' });
      }

      res.json(updatedSlider);
    } catch (error) {
      console.error('Error updating slider:', error);
      res.status(500).json({ error: 'Failed to update slider' });
    }
  });

  app.delete('/api/admin/sliders/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deletedSlider] = await db.delete(sliders)
        .where(eq(sliders.id, id))
        .returning();

      if (!deletedSlider) {
        return res.status(404).json({ error: 'Slider not found' });
      }

      res.json({ message: 'Slider deleted successfully' });
    } catch (error) {
      console.error('Error deleting slider:', error);
      res.status(500).json({ error: 'Failed to delete slider' });
    }
  });

  // Get shades for a specific product
  app.get("/api/products/:productId/shades", async (req, res) => {
    try {
      const { productId } = req.params;
      const shades = await storage.getProductShades(parseInt(productId));
      res.json(shades);
    } catch (error) {
      console.error("Error fetching product shades:", error);
      res.status(500).json({ error: "Failed to fetch product shades" });
    }
  });

  // Review Management APIs

  // Get reviews for a product
  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const { productId } = req.params;
      const productReviews = await storage.getProductReviews(parseInt(productId));
      res.json(productReviews);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Check if user can review a product
  app.get("/api/products/:productId/can-review", async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.query.userId;

      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const result = await storage.checkUserCanReview(parseInt(userId), parseInt(productId));
      res.json(result);
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ error: "Failed to check review eligibility" });
    }
  });

  // Create a new review
  app.post("/api/products/:productId/reviews", upload.single("image"), async (req, res) => {
    try {
      const { productId } = req.params;
      const { userId, rating, reviewText, orderId } = req.body;

      // Authentication check
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      // Validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if user can review this product
      const canReviewCheck = await storage.checkUserCanReview(parseInt(userId), parseInt(productId));
      if (!canReviewCheck.canReview) {
        return res.status(403).json({ error: canReviewCheck.message });
      }

      // Handle image upload
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      }

      // Create review
      const reviewData = {
        userId: parseInt(userId),
        productId: parseInt(productId),
        orderId: parseInt(orderId) || canReviewCheck.orderId!,
        rating: parseInt(rating),
        reviewText: reviewText || null,
        imageUrl,
        isVerified: true
      };

      const review = await storage.createReview(reviewData);

      res.status(201).json({
        message: "Review submitted successfully",
        review
      });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // Get user's reviews
  app.get("/api/users/:userId/reviews", async (req, res) => {
    try {
      const { userId } = req.params;
      const userReviews = await storage.getUserReviews(parseInt(userId));
      res.json(userReviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ error: "Failed to fetch user reviews" });
    }
  });

  // Delete a review
  app.delete("/api/reviews/:reviewId", async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const success = await storage.deleteReview(parseInt(reviewId), parseInt(userId));
      if (!success) {
        return res.status(404).json({ error: "Review not found or unauthorized" });
      }

      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}