import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { OTPService } from "./otp-service";
import path from "path";
import fs from "fs";
import cookieParser from 'cookie-parser';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { adminAuthMiddleware as adminMiddleware } from "./admin-middleware";
import nodemailer from 'nodemailer';
import { createMasterAdminRoutes } from "./master-admin-routes";
import webpush from 'web-push';
import { startNotificationScheduler } from './notificationScheduler';
import dotenv from "dotenv";
dotenv.config();
// Configure web-push with VAPID keys
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:vaibhavsharma2116@gmail.com';
// Accept server-side VAPID_PUBLIC_KEY or frontend VITE_VAPID_PUBLIC_KEY as fallback
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✅ Web Push VAPID keys configured');
  // Start scheduler if enabled via env
  try {
    startNotificationScheduler();
  } catch (e) {
    console.warn('⚠️ Failed to start push scheduler:', e);
  }
} else {
  console.warn('⚠️ VAPID keys not configured - web push notifications will not work');
  console.warn('Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in environment variables');
}

// Verify adminMiddleware is working
console.log('✅ Admin middleware imported:', typeof adminMiddleware === 'function');

// Simple rate limiting
const rateLimitMap = new Map();
const adminRateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute
const ADMIN_RATE_LIMIT_MAX = 1000; // 1000 requests per minute for admin

function rateLimit(req: any, res: any, next: any) {
  // Use higher limit for admin routes
  const isAdminRoute = req.path.startsWith('/admin/');
  const limitMap = isAdminRoute ? adminRateLimitMap : rateLimitMap;
  const maxRequests = isAdminRoute ? ADMIN_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!limitMap.has(clientIP)) {
    limitMap.set(clientIP, []);
  }

  const requests = limitMap.get(clientIP) || [];
  const recentRequests = requests.filter((time: number) => time > windowStart);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({ error: "Too many requests" });
  }

  recentRequests.push(now);
  limitMap.set(clientIP, recentRequests);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const cutoff = now - (RATE_LIMIT_WINDOW * 2);
    [rateLimitMap, adminRateLimitMap].forEach(map => {
      map.forEach((times, ip) => {
        const validTimes = times.filter((time: number) => time > cutoff);
        if (validTimes.length === 0) {
          map.delete(ip);
        } else {
          map.set(ip, validTimes);
        }
      });
    });
  }

  next();
}
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, sql, or, like, isNull, asc } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../shared/schema"; // Import schema module
import { DatabaseMonitor } from "./db-monitor";
import ShiprocketService from "./shiprocket-service";
import type { InsertBlogCategory, InsertBlogSubcategory, InsertInfluencerApplication, PromoCode, PromoCodeUsage } from "../shared/schema";
import { users, ordersTable, orderItemsTable, cashfreePayments, affiliateApplications, affiliateClicks, affiliateSales, affiliateWallet, affiliateTransactions, blogPosts, blogCategories, blogSubcategories, contactSubmissions, categorySliders, videoTestimonials, announcements, combos, comboImages, jobPositions, influencerApplications, userWallet, userWalletTransactions, affiliateWallet as affiliateWalletSchema, affiliateApplications as affiliateApplicationsSchema } from "../shared/schema"; // Import users table explicitly
import type { Request, Response } from 'express'; // Import Request and Response types for clarity

// Initialize Shiprocket service
const shiprocketService = new ShiprocketService();

// Database connection with enhanced configuration and error recovery
const pool = new Pool({
 connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/poppik_local",
  ssl: false,  // force disable SSL
  max: 20,
  min: 2,
  idleTimeoutMillis: 300000, // 5 minutes
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  allowExitOnIdle: false,
});

// Handle pool errors to prevent crashes
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process, just log the error
});

pool.on('connect', (client) => {
  console.log('New database connection established');
});

pool.on('remove', (client) => {
  console.log('Database connection removed from pool');
});

const db = drizzle(pool, { schema }); // Pass schema to drizzle
const dbMonitor = new DatabaseMonitor(pool);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await pool.end();
  process.exit(0);
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
    // Accept image, video, and document files (for resumes)
    const allowedMimeTypes = [
      'image/',
      'video/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const isAllowed = allowedMimeTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only image, video, and document files (PDF, DOC, DOCX) are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos and large documents
  }
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465, // Use SSL if port is 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Force IPv4
  family: 4
});

// Function to send order notification email
async function sendOrderNotificationEmail(orderData: any) {
  const { orderId, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, totalAmount, items } = orderData;

  const emailSubject = `Poppik Lifestyle Order Confirmation - ${orderId}`;

  let itemHtml = '';
  items.forEach(item => {
    itemHtml += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 0; text-align: left;">
          <img src="${item.productImage}" alt="${item.productName}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; vertical-align: middle;">
          ${item.productName}
        </td>
        <td style="padding: 10px 0; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right;">₹${item.price}</td>
        <td style="padding: 10px 0; text-align: right;">₹${(parseFloat(item.price.replace(/[₹,]/g, "")) * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px;">
        <img src="https://poppik.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fpoppik-logo.31d60553.png&w=256&q=75" alt="Poppik Logo" style="width: 150px; margin-bottom: 10px;">
        <h2 style="color: #e74c3c; margin: 0;">Thank You for Your Order!</h2>
        <p style="color: #666; font-size: 14px;">Your order #${orderId} has been successfully placed.</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #e74c3c; margin-bottom: 15px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th style="padding: 12px 0; text-align: left;">Product</th>
              <th style="padding: 12px 0; text-align: right;">Qty</th>
              <th style="padding: 12px 0; text-align: right;">Unit Price</th>
              <th style="padding: 12px 0; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemHtml}
          </tbody>
        </table>
      </div>

      <div style="background-color: #fff; padding: 25px; border-radius: 8px; margin-top: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <h4 style="color: #555; margin-bottom: 10px;">Shipping To:</h4>
            <p style="margin: 0; font-size: 14px;"><strong>${customerName}</strong></p>
            <p style="margin: 0; font-size: 14px;">${customerEmail}</p>
            <p style="margin: 0; font-size: 14px;">${customerPhone || 'N/A'}</p>
            <p style="margin: 0; font-size: 14px;">${shippingAddress}</p>
            ${orderData.deliveryInstructions ? `
            <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #856404;">Delivery Instructions:</p>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #856404;">${orderData.deliveryInstructions}</p>
            </div>
            ` : ''}
          </div>
          <div>
            <h4 style="color: #555; margin-bottom: 10px;">Order Info:</h4>
            <p style="margin: 0; font-size: 14px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Order Status:</strong> Confirmed</p>
            ${orderData.saturdayDelivery !== undefined || orderData.sundayDelivery !== undefined ? `
            <div style="margin-top: 10px;">
              <p style="margin: 0; font-size: 13px;"><strong>Weekend Delivery:</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 13px;">Saturday: ${orderData.saturdayDelivery ? 'Yes' : 'No'}</p>
              <p style="margin: 0; font-size: 13px;">Sunday: ${orderData.sundayDelivery ? 'Yes' : 'No'}</p>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 40px;">
        <p style="color: #888; font-size: 13px;">
          You'll receive another email when your order ships. For any questions, please contact us at <a href="mailto:info@poppik.in" style="color: #e74c3c; text-decoration: none;">info@poppik.in</a>.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 10px;">
          © 2024 Poppik Lifestyle Private Limited. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'info@poppik.in',
      to: 'info@poppik.in', // Always send to info@poppik.in
      subject: emailSubject,
      html: emailHtml,
    });
    console.log(`✅ Order notification email sent successfully to info@poppik.in for order ${orderId}`);
  } catch (emailError) {
    console.error(`❌ Failed to send order notification email for order ${orderId}:`, emailError);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable cookie parsing so we can read/write affiliate cookies
  try {
    app.use(cookieParser());
  } catch (e) {
    console.warn('cookieParser not available:', e);
  }

  // Middleware: capture affiliate query params (aff_id, ref, affiliate, affiliateCode, aff)
  app.use((req: any, res: any, next: any) => {
    try {
      const q = req.query || {};
      const raw = q.aff_id || q.ref || q.affiliate || q.affiliateCode || q.affcode || q.aff;

      if (raw) {
        let val = String(raw);
        let normalized = val;

        // If only numeric, convert to affiliate code format used elsewhere (POPPIKAP{ID})
        if (/^\d+$/.test(val)) {
          normalized = `POPPIKAP${val}`;
        }

        const existing = req.cookies && (req.cookies.affiliate_id || req.cookies.affiliate_code);
        if (!existing || existing !== normalized) {
          const cookieOpts: any = {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: false,
            sameSite: 'lax'
          };
          if (process.env.NODE_ENV === 'production') cookieOpts.secure = true;
          res.cookie('affiliate_id', normalized, cookieOpts);
          // Also set legacy name used in some places
          res.cookie('affiliate_code', normalized, cookieOpts);
          console.log('📥 Affiliate cookie set:', normalized, 'from query param');
        }
      }
    } catch (err) {
      console.warn('Error in affiliate cookie middleware:', err);
    }
    next();
  });
  // Register Master Admin Routes
  const masterAdminRouter = createMasterAdminRoutes(pool);
  app.use(masterAdminRouter);
  console.log('✅ Master Admin routes registered');

  // Database connection recovery middleware
  app.use("/api", async (req, res, next) => {
    // Check if pool is healthy, try to reconnect if not
    try {
      if (pool.totalCount === 0 && pool.idleCount === 0) {
        console.log('Database pool appears empty, testing connection...');
        const client = await pool.connect();
        client.release();
      }
    } catch (error) {
      console.error('Database connection test failed:', error.message);
    }
    next();
  });

  // Apply rate limiting to all API routes except admin routes
  app.use("/api", (req, res, next) => {
    // Skip rate limiting for admin routes
    if (req.path.startsWith('/admin/')) {
      return next();
    }
    return rateLimit(req, res, next);
  });

  // Health check endpoint with database status
  app.get("/api/health", async (req, res) => {
    let dbStatus = "disconnected";
    let poolStats = {};
    let dbError = null;

    try {
      // Try a simple query with timeout
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        dbStatus = "connected";
        poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        };
      } finally {
        client.release();
      }
    } catch (error) {
      dbStatus = "disconnected";
      dbError = error.message;
      console.error('Database health check failed:', error.message);
    }

    res.json({
      status: dbStatus === "connected" ? "OK" : "DEGRADED",
      message: "API server is running",
      database: dbStatus,
      poolStats,
      dbError,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Database performance monitoring endpoints
  app.get("/api/admin/db/slow-queries", async (req, res) => {
    try {
      const minDuration = parseInt(req.query.minDuration as string) || 1000;
      const slowQueries = await dbMonitor.getSlowQueries(minDuration);
      res.json(slowQueries);
    } catch (error) {
      console.error("Error fetching slow queries:", error);
      res.status(500).json({ error: "Failed to fetch slow queries" });
    }
  });

  app.get("/api/admin/db/active-connections", async (req, res) => {
    try {
      const connections = await dbMonitor.getActiveConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching active connections:", error);
      res.status(500).json({ error: "Failed to fetch active connections" });
    }
  });

  app.get("/api/admin/db/suggest-indexes", async (req, res) => {
    try {
      const suggestions = await dbMonitor.suggestIndexes();
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting index suggestions:", error);
      res.status(500).json({ error: "Failed to get index suggestions" });
    }
  });

  app.post("/api/admin/db/kill-long-queries", async (req, res) => {
    try {
      const maxDuration = parseInt(req.body.maxDurationMinutes) || 30;
      const killedQueries = await dbMonitor.killLongRunningQueries(maxDuration);
      res.json({
        message: `Killed ${killedQueries.length} long running queries`,
        killedQueries
      });
    } catch (error) {
      console.error("Error killing long queries:", error);
      res.status(500).json({ error: "Failed to kill long running queries" });
    }
  });

  // Store Management Routes
  app.get("/api/stores", async (req, res) => {
    try {
      const allStores = await db.select().from(schema.stores).where(eq(schema.stores.isActive, true)).orderBy(schema.stores.sortOrder);
      res.json(allStores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.get("/api/admin/stores", async (req, res) => {
    try {
      // Check if authorization header exists
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("No token provided for admin stores endpoint");
        return res.status(401).json({ error: "Access denied. No token provided." });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;

        // Check if user has admin role
        if (decoded.role !== 'admin') {
          return res.status(403).json({ error: "Access denied. Admin privileges required." });
        }

        const allStores = await db.select().from(schema.stores).orderBy(schema.stores.sortOrder);
        res.json(allStores);
      } catch (jwtError) {
        console.error("JWT verification error:", jwtError);
        return res.status(401).json({ error: "Invalid token." });
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.post("/api/admin/stores", async (req, res) => {
    try {
      // Parse coordinates to remove degree symbols and direction letters
      const storeData = { ...req.body };

      if (storeData.latitude && typeof storeData.latitude === 'string') {
        // Remove degree symbols, N/S/E/W, and extra spaces
        storeData.latitude = parseFloat(storeData.latitude.replace(/[°NSEW\s]/g, ''));
      }

      if (storeData.longitude && typeof storeData.longitude === 'string') {
        // Remove degree symbols, N/S/E/W, and extra spaces
        storeData.longitude = parseFloat(storeData.longitude.replace(/[°NSEW\s]/g, ''));
      }

      const newStore = await db.insert(schema.stores).values(storeData).returning();
      res.json(newStore[0]);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  app.put("/api/admin/stores/:id", async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);

      // Parse coordinates to remove degree symbols and direction letters
      const storeData = { ...req.body };

      if (storeData.latitude && typeof storeData.latitude === 'string') {
        // Remove degree symbols, N/S/E/W, and extra spaces
        storeData.latitude = parseFloat(storeData.latitude.replace(/[°NSEW\s]/g, ''));
      }

      if (storeData.longitude && typeof storeData.longitude === 'string') {
        // Remove degree symbols, N/S/E/W, and extra spaces
        storeData.longitude = parseFloat(storeData.longitude.replace(/[°NSEW\s]/g, ''));
      }

      const updatedStore = await db
        .update(schema.stores)
        .set({ ...storeData, updatedAt: new Date() })
        .where(eq(schema.stores.id, storeId))
        .returning();
      res.json(updatedStore[0]);
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(500).json({ error: "Failed to update store" });
    }
  });

  app.delete("/api/admin/stores/:id", async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      await db.delete(schema.stores).where(eq(schema.stores.id, storeId));
      res.json({ message: "Store deleted successfully" });
    } catch (error) {
      console.error("Error deleting store:", error);
      res.status(500).json({ error: "Failed to delete store" });
    }
  });

  // Public sliders endpoint for frontend
  app.get("/api/sliders", async (req, res) => {
    try {
      const activeSliders = await storage.getActiveSliders();
      res.json(activeSliders);
    } catch (error) {
      console.error('Error fetching public sliders:', error);
      // Fallback sample data if database is unavailable
      console.log("Database unavailable, using sample slider data");
      res.json([
        {
          id: 1,
          imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
          isActive: true,
          sortOrder: 1
        },
        {
          id: 2,
          imageUrl: "https://images.unsplash.com/photo-15223357890203-aabd1fc54bc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
          isActive: true,
          sortOrder: 2
        }
      ]);
    }
  });

  // Firebase authentication has been removed
  // Only email/password authentication is now supported



  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("Signup request received:", {
        ...req.body,
        password: req.body.password ? "[HIDDEN]" : undefined,
        confirmPassword: req.body.confirmPassword ? "[HIDDEN]" : undefined
      });

      const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

      // Validation
      if (!firstName || !lastName || !email || !password ) {
        console.log("Missing required fields:", { firstName: !!firstName, lastName: !!lastName, email: !!email, password: !!password });
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      if (password !== confirmPassword) {
        console.log("Password mismatch during signup");
        return res.status(400).json({ error: "Passwords don't match" });
      }

      if (password.length < 6) {
        console.log("Password too short:", password.length);
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log("Invalid email format:", email);
        return res.status(400).json({ error: "Please provide a valid email address" });
      }

      console.log("Checking if user exists with email:", email);
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("User already exists with email:", email);
        return res.status(400).json({ error: "User already exists with this email" });
      }

      console.log("Hashing password...");
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log("Creating user in database...");
      // Create user with all the form data
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        password: hashedPassword
      };

      console.log("User data to create:", {
        ...userData,
        password: "[HIDDEN]"
      });

      const user = await storage.createUser(userData);
      console.log("User created successfully with ID:", user.id);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;

      console.log("Signup successful for user:", userWithoutPassword.email);
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Signup error details:", {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint && error.constraint.includes('email')) {
          return res.status(400).json({ error: "A user with this email already exists" });
        }
        return res.status(400).json({ error: "A user with this information already exists" });
      }

      if (error.code === 'ECONNREFUSED') {
        return res.status(500).json({ error: "Database connection error. Please try again." });
      }

      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(500).json({ error: "Database table not found. Please contact support." });
      }

      // Generic error response
      res.status(500).json({
        error: "Failed to create user",
        details: process.env.NODE_ENV === 'development' ? error.message : "Please try again or contact support if the problem persists."
      });
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

  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("🔐 Admin login attempt for email:", email);

      // Validation
      if (!email || !password) {
        console.log("❌ Missing email or password");
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("❌ User not found for email:", email);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      console.log("✅ User found:", { id: user.id, email: user.email, role: user.role });

      // Check if user is admin or master_admin
      if (user.role !== 'admin' && user.role !== 'master_admin') {
        console.log("❌ User does not have admin privileges. Role:", user.role);
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("🔑 Password validation result:", isValidPassword);
      
      if (!isValidPassword) {
        console.log("❌ Invalid password for user:", email);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      console.log("✅ Admin login successful for:", email);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Admin login successful",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Cashfree Payment Routes
  app.post('/api/payments/cashfree/create-order', async (req, res) => {
    try {
      const { amount, orderId, currency, customerDetails, orderData, orderNote } = req.body;

      // Validate required fields
      if (!amount || !orderId || !currency || !customerDetails) {
        return res.status(400).json({
          error: "Missing required fields: amount, orderId, currency, and customerDetails are required"
        });
      }

      // Validate customerDetails structure
      if (!customerDetails.customerId || !customerDetails.customerName || !customerDetails.customerEmail) {
        return res.status(400).json({
          error: "customerDetails must include customerId, customerName, and customerEmail"
        });
      }

      // Check if Cashfree is configured
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY ||
          CASHFREE_APP_ID === 'cashfree_app_id' || CASHFREE_SECRET_KEY === 'cashfree_secret_key') {
        console.log("Cashfree not configured properly");
        return res.status(400).json({
          error: "Cashfree payment gateway is not configured",
          configError: true
        });
      }

      console.log("Creating Cashfree order:", {
        orderId,
        amount,
        currency,
        customer: customerDetails.customerName
      });

      // Create Cashfree order payload with proper HTTPS URLs
      const host = req.get('host');

      // Always use HTTPS for Cashfree as it requires secure URLs
      let protocol = 'https';

      // For Replit development, use the replit.dev domain with HTTPS
      let returnHost = host;
      if (host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0'))) {
        // For local development, we need to use a publicly accessible HTTPS URL
        // Since Cashfree requires HTTPS, we'll use the Replit preview URL
        const replitHost = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : host;
        returnHost = replitHost;
        protocol = 'https';
      }

      const cashfreePayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: customerDetails.customerId,
          customer_name: customerDetails.customerName,
          customer_email: customerDetails.customerEmail,
          customer_phone: customerDetails.customerPhone || '9999999999'
        },
        order_meta: {
          return_url: `${protocol}://${returnHost}/checkout?payment=processing&orderId=${orderId}`,
          notify_url: `${protocol}://${returnHost}/api/payments/cashfree/webhook`
        },
        order_note: orderNote || 'Beauty Store Purchase'
      };

      console.log("Cashfree API URL:", `${CASHFREE_BASE_URL}/pg/orders`);
      console.log("Cashfree payload:", JSON.stringify(cashfreePayload, null, 2));

      // Call Cashfree API
      const cashfreeResponse = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(cashfreePayload)
      });

      const cashfreeResult = await cashfreeResponse.json();

      console.log("Cashfree API response status:", cashfreeResponse.status);
      console.log("Cashfree API response:", JSON.stringify(cashfreeResult, null, 2));

      if (!cashfreeResponse.ok) {
        console.error("Cashfree API error:", cashfreeResult);
        return res.status(400).json({
          error: cashfreeResult.message || "Failed to create Cashfree order",
          cashfreeError: true,
          details: cashfreeResult
        });
      }

      // Store payment record in database
      try {
        await db.insert(schema.cashfreePayments).values({
          cashfreeOrderId: orderId,
          userId: parseInt(customerDetails.customerId),
          amount: amount,
          status: 'created',
          orderData: orderData || {},
          customerInfo: customerDetails
        });
      } catch (dbError) {
        console.error("Database error storing payment:", dbError);
        // Continue even if database storage fails
      }

      // Return payment session details
      res.json({
        orderId: orderId,
        paymentSessionId: cashfreeResult.payment_session_id,
        environment: CASHFREE_MODE,
        message: "Order created successfully"
      });

    } catch (error) {
      console.error("Cashfree create order error:", error);
      res.status(500).json({
        error: "Failed to create payment order",
        details: error.message
      });
    }
  });

  app.post('/api/payments/cashfree/verify', async (req, res) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      console.log("Verifying payment for order:", orderId);

      // Check Cashfree configuration
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY ||
          CASHFREE_APP_ID === 'cashfree_app_id' || CASHFREE_SECRET_KEY === 'cashfree_secret_key') {
        return res.status(400).json({
          error: "Cashfree payment gateway is not configured",
          verified: false
        });
      }

      // Get order status from Cashfree
      const statusResponse = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
        }
      });

      const statusResult = await statusResponse.json();

      console.log("Payment verification response:", JSON.stringify(statusResult, null, 2));

      if (!statusResponse.ok) {
        console.error("Cashfree verification error:", statusResult);
        return res.json({
          verified: false,
          error: "Failed to verify payment status"
        });
      }

      const isPaymentSuccessful = statusResult.order_status === 'PAID';

      // Update payment record in database
      try {
        await db.update(schema.cashfreePayments)
          .set({
            status: isPaymentSuccessful ? 'completed' : 'failed',
            paymentId: statusResult.cf_order_id || null,
            completedAt: isPaymentSuccessful ? new Date() : null
          })
          .where(eq(schema.cashfreePayments.cashfreeOrderId, orderId));

        // If payment is successful, create order in ordersTable for admin panel
        if (isPaymentSuccessful) {
          // Get cashfree payment details
          const cashfreePayment = await db
            .select()
            .from(schema.cashfreePayments)
            .where(eq(schema.cashfreePayments.cashfreeOrderId, orderId))
            .limit(1);

          if (cashfreePayment.length > 0) {
            const payment = cashfreePayment[0];
            const orderData = payment.orderData;

            // Check if order already exists in ordersTable
            const existingOrder = await db
              .select()
              .from(schema.ordersTable)
              .where(eq(schema.ordersTable.cashfreeOrderId, orderId))
              .limit(1);

            if (existingOrder.length === 0) {
              // Create order in ordersTable
              const [newOrder] = await db.insert(schema.ordersTable).values({
                userId: payment.userId,
                totalAmount: payment.amount,
                status: 'processing',
                paymentMethod: 'Cashfree',
                shippingAddress: orderData.shippingAddress,
                cashfreeOrderId: orderId,
                paymentSessionId: statusResult.payment_session_id || null,
                paymentId: statusResult.cf_order_id || null,
                affiliateCode: orderData.affiliateCode || null,
                estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
              }).returning();

              // Create order items
              if (orderData.items && Array.isArray(orderData.items)) {
                const orderItems = orderData.items.map((item: any) => ({
                  orderId: newOrder.id,
                  productId: Number(item.productId) || null,
                  productName: item.productName,
                  productImage: item.productImage,
                  quantity: Number(item.quantity),
                  price: item.price,
                  cashbackPrice: item.cashbackPrice || null,
                  cashbackPercentage: item.cashbackPercentage || null,
                }));

                await db.insert(schema.orderItemsTable).values(orderItems);
              }

              // Process affiliate commission for Cashfree payment
              if (orderData.affiliateCode && orderData.affiliateCode.startsWith('POPPIKAP')) {
                const affiliateUserId = parseInt(orderData.affiliateCode.replace('POPPIKAP', ''));

                console.log(`🔍 Processing affiliate commission for Cashfree payment: ${orderData.affiliateCode}, userId: ${affiliateUserId}`);

                if (!isNaN(affiliateUserId)) {
                  try {
                    // Verify affiliate exists and is approved
                    const affiliateApp = await db
                      .select()
                      .from(schema.affiliateApplications)
                      .where(and(
                        eq(schema.affiliateApplications.userId, affiliateUserId),
                        eq(schema.affiliateApplications.status, 'approved')
                      ))
                      .limit(1);

                    if (affiliateApp && affiliateApp.length > 0) {
                      // Calculate commission dynamically from order items
                      let calculatedCommission = 0;
                      
                      if (orderData.items && Array.isArray(orderData.items)) {
                        calculatedCommission = Math.round(
                          orderData.items.reduce((sum: number, item: any) => {
                            const itemAffiliateCommission = item.affiliateCommission || 0;
                            const itemPrice = parseInt(item.price?.replace(/[₹,]/g, "") || "0");
                            const itemTotal = itemPrice * (item.quantity || 1);
                            return sum + (itemTotal * itemAffiliateCommission) / 100;
                          }, 0)
                        );
                      }
                      
                      const commissionRate = calculatedCommission > 0 && Number(payment.amount) > 0 
                        ? (calculatedCommission / Number(payment.amount)) * 100 
                        : 0;

                      console.log(`💰 Calculated commission: ₹${calculatedCommission.toFixed(2)} (${commissionRate}% of ₹${payment.amount})`);

                      // Get or create affiliate wallet
                      let wallet = await db
                        .select()
                        .from(schema.affiliateWallet)
                        .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                        .limit(1);

                      if (wallet.length === 0) {
                        console.log(`📝 Creating new wallet for affiliate ${affiliateUserId}`);
                        await db.insert(schema.affiliateWallet).values({
                          userId: affiliateUserId,
                          cashbackBalance: "0.00",
                          commissionBalance: calculatedCommission.toFixed(2),
                          totalEarnings: calculatedCommission.toFixed(2),
                          totalWithdrawn: "0.00"
                        });
                      } else {
                        console.log(`📝 Updating existing wallet for affiliate ${affiliateUserId}`);
                        const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
                        const currentEarnings = parseFloat(wallet[0].totalEarnings || '0');

                        await db.update(schema.affiliateWallet)
                          .set({
                            commissionBalance: (currentCommission + calculatedCommission).toFixed(2),
                            totalEarnings: (currentEarnings + calculatedCommission).toFixed(2),
                            updatedAt: new Date()
                          })
                          .where(eq(schema.affiliateWallet.userId, affiliateUserId));
                      }

                      // Get customer details
                      const orderUser = await db
                        .select({
                          firstName: schema.users.firstName,
                          lastName: schema.users.lastName,
                          email: schema.users.email,
                          phone: schema.users.phone,
                        })
                        .from(schema.users)
                        .where(eq(schema.users.id, Number(payment.userId)))
                        .limit(1);

                      const userData = orderUser[0] || { firstName: 'Customer', lastName: '', email: 'customer@email.com', phone: null };

                      // Record affiliate sale
                      await db.insert(schema.affiliateSales).values({
                        affiliateUserId,
                        affiliateCode: orderData.affiliateCode,
                        orderId: newOrder.id,
                        customerId: Number(payment.userId),
                        customerName: orderData.customerName || `${userData.firstName} ${userData.lastName}`,
                        customerEmail: orderData.customerEmail || userData.email,
                        customerPhone: orderData.customerPhone || userData.phone || null,
                        productName: orderData.items.map((item: any) => item.productName).join(', '),
                        saleAmount: Number(payment.amount).toFixed(2),
                        commissionAmount: calculatedCommission.toFixed(2),
                        commissionRate: commissionRate.toFixed(2),
                        status: 'confirmed'
                      });

                      // Add transaction record
                      await db.insert(schema.affiliateTransactions).values({
                        userId: affiliateUserId,
                        orderId: newOrder.id,
                        type: 'commission',
                        amount: calculatedCommission.toFixed(2),
                        balanceType: 'commission',
                        description: `Commission (${commissionRate}%) from Cashfree order ORD-${newOrder.id.toString().padStart(3, '0')}`,
                        status: 'completed',
                        transactionId: null,
                        notes: null,
                        processedAt: new Date(),
                        createdAt: new Date()
                      });

                      console.log(`✅ Affiliate commission credited: ₹${calculatedCommission.toFixed(2)} (${commissionRate}%) to affiliate ${affiliateUserId} for Cashfree order ${newOrder.id}`);
                    } else {
                      console.error(`❌ Affiliate not found or not approved for user ${affiliateUserId}`);
                    }
                  } catch (affiliateError) {
                    console.error(`❌ Error processing affiliate commission for Cashfree:`, affiliateError);
                  }
                }
              }

              console.log("Order created in ordersTable:", newOrder.id);
            } else {
              console.log("Order already exists in ordersTable");
            }
          }
        }
      } catch (dbError) {
        console.error("Database error updating payment:", dbError);
      }

      res.json({
        verified: isPaymentSuccessful,
        status: statusResult.order_status,
        paymentId: statusResult.cf_order_id,
        message: isPaymentSuccessful ? "Payment verified successfully" : "Payment verification failed"
      });

    } catch (error) {
      console.error("Payment verification error:", error);
      res.json({
        verified: false,
        error: "Payment verification failed"
      });
    }
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

  // Affiliate Click Tracking - Track when someone clicks an affiliate link
  app.post("/api/affiliate/track-click", async (req, res) => {
    try {
      const { affiliateCode, productId, comboId, offerId, ipAddress, userAgent, referrer } = req.body;

      if (!affiliateCode) {
        return res.status(400).json({ error: "Affiliate code is required" });
      }

      // Extract affiliate user ID from code (POPPIKAP01 -> 1)
      const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));

      if (isNaN(affiliateUserId)) {
        return res.status(400).json({ error: "Invalid affiliate code" });
      }

      // Verify affiliate exists and is approved
      const affiliate = await db
        .select()
        .from(schema.affiliateApplications)
        .where(and(
          eq(schema.affiliateApplications.userId, affiliateUserId),
          eq(schema.affiliateApplications.status, 'approved')
        ))
        .limit(1);

      if (!affiliate || affiliate.length === 0) {
        return res.status(404).json({ error: "Affiliate not found or not approved" });
      }

      // Track the click
      const [clickRecord] = await db.insert(schema.affiliateClicks).values({
        affiliateUserId,
        affiliateCode,
        productId: productId || null,
        comboId: comboId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        referrer: referrer || null,
        converted: false
      }).returning();

      console.log(`✅ Affiliate click tracked: Code ${affiliateCode}, Product ${productId || 'N/A'}, Combo ${comboId || 'N/A'}, Offer ${offerId || 'N/A'}`);

      res.json({
        success: true,
        message: "Click tracked successfully",
        clickId: clickRecord.id
      });

    } catch (error) {
      console.error("Error tracking affiliate click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Get Affiliate Clicks - Get all clicks for an affiliate
  app.get("/api/affiliate/clicks", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const clicks = await db
        .select()
        .from(schema.affiliateClicks)
        .where(eq(schema.affiliateClicks.affiliateUserId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateClicks.createdAt))
        .limit(100);

      const totalClicks = clicks.length;
      const convertedClicks = clicks.filter(click => click.converted).length;

      res.json({
        total: totalClicks,
        converted: convertedClicks,
        conversionRate: totalClicks > 0 ? ((convertedClicks / totalClicks) * 100).toFixed(2) : 0,
        recent: clicks.slice(0, 10)
      });

    } catch (error) {
      console.error("Error fetching affiliate clicks:", error);
      res.status(500).json({ error: "Failed to fetch clicks" });
    }
  });

  // Get Affiliate Sales - Get all sales/commissions for an affiliate
  app.get("/api/affiliate/sales", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const sales = await db
        .select()
        .from(schema.affiliateSales)
        .where(eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateSales.createdAt));

      res.json(sales);

    } catch (error) {
      console.error("Error fetching affiliate sales:", error);
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  // Get Affiliate Wallet - Get wallet balance and stats
  app.get("/api/affiliate/wallet", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get or create wallet
      let wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId as string)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        // Create wallet if doesn't exist
        const [newWallet] = await db.insert(schema.affiliateWallet).values({
          userId: parseInt(userId as string),
          cashbackBalance: "0.00",
          commissionBalance: "0.00",
          totalEarnings: "0.00",
          totalWithdrawn: "0.00"
        }).returning();

        wallet = [newWallet];
      }

      // Convert decimal values to proper format
      const walletData = {
        ...wallet[0],
        cashbackBalance: parseFloat(wallet[0].cashbackBalance || '0').toFixed(2),
        commissionBalance: parseFloat(wallet[0].commissionBalance || '0').toFixed(2),
        totalEarnings: parseFloat(wallet[0].totalEarnings || '0').toFixed(2),
        totalWithdrawn: parseFloat(wallet[0].totalWithdrawn || '0').toFixed(2)
      };

      console.log('Affiliate wallet data:', {
        userId: parseInt(userId as string),
        balances: walletData
      });

      res.json(walletData);

    } catch (error) {
      console.error("Error fetching affiliate wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  // Get Affiliate Wallet Stats
  app.get("/api/affiliate/wallet/stats", async (req, res) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get wallet
      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId as string)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        return res.json({
          totalEarnings: '0.00',
          availableBalance: '0.00',
          pendingCommission: '0.00',
          totalWithdrawn: '0.00',
          thisMonthEarnings: '0.00'
        });
      }

      const walletData = wallet[0];

      // Get pending commission (from confirmed sales)
      const pendingSales = await db
        .select()
        .from(schema.affiliateSales)
        .where(and(
          eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)),
          eq(schema.affiliateSales.status, 'confirmed')
        ));

      const pendingCommission = pendingSales.reduce((sum, sale) => 
        sum + parseFloat(sale.commissionAmount || '0'), 0
      );

      // Get this month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthSales = await db
        .select()
        .from(schema.affiliateSales)
        .where(and(
          eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)),
          sql`${schema.affiliateSales.createdAt} >= ${startOfMonth}`
        ));

      const thisMonthEarnings = monthSales.reduce((sum, sale) => 
        sum + parseFloat(sale.commissionAmount || '0'), 0
      );

      const totalEarnings = parseFloat(walletData.totalEarnings || '0');
      const cashbackBalance = parseFloat(walletData.cashbackBalance || '0');
      const commissionBalance = parseFloat(walletData.commissionBalance || '0');
      const availableBalance = cashbackBalance + commissionBalance;

      res.json({
        totalEarnings: totalEarnings.toFixed(2),
        availableBalance: availableBalance.toFixed(2),
        pendingCommission: pendingCommission.toFixed(2),
        totalWithdrawn: parseFloat(walletData.totalWithdrawn || '0').toFixed(2),
        thisMonthEarnings: thisMonthEarnings.toFixed(2)
      });

    } catch (error) {
      console.error("Error fetching wallet stats:", error);
      res.status(500).json({ error: "Failed to fetch wallet stats" });
    }
  });

  // Get Affiliate Wallet Transactions
  app.get('/api/affiliate/wallet/transactions', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const transactions = await db
        .select({
          id: schema.affiliateTransactions.id,
          userId: schema.affiliateTransactions.userId,
          type: schema.affiliateTransactions.type,
          amount: schema.affiliateTransactions.amount,
          balanceType: schema.affiliateTransactions.balanceType,
          description: schema.affiliateTransactions.description,
          orderId: schema.affiliateTransactions.orderId,
          status: schema.affiliateTransactions.status,
          transactionId: schema.affiliateTransactions.transactionId,
          notes: schema.affiliateTransactions.notes,
          processedAt: schema.affiliateTransactions.processedAt,
          createdAt: schema.affiliateTransactions.createdAt,
        })
        .from(schema.affiliateTransactions)
        .where(eq(schema.affiliateTransactions.userId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateTransactions.createdAt))
        .limit(100);

      console.log(`✅ Fetched ${transactions.length} transactions for user ${userId}`);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching affiliate wallet transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Get Affiliate Withdrawals
  app.get('/api/affiliate/wallet/withdrawals', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const withdrawals = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(and(
          eq(schema.affiliateTransactions.userId, parseInt(userId as string)),
          eq(schema.affiliateTransactions.type, 'withdrawal')
        ))
        .orderBy(desc(schema.affiliateTransactions.createdAt));

      // Transform the data to match the expected withdrawal format
      const formattedWithdrawals = withdrawals.map(w => ({
        id: w.id,
        userId: w.userId,
        amount: w.amount,
        status: w.status,
        paymentMethod: 'Bank Transfer',
        requestedAt: w.createdAt,
        processedAt: w.processedAt,
        rejectedReason: w.notes
      }));

      res.json(formattedWithdrawals);
    } catch (error) {
      console.error('Error fetching affiliate withdrawals:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  });

  // Get Affiliate Withdrawals (Admin)
  app.get('/api/admin/affiliate/withdrawals', async (req, res) => {
    try {
      const withdrawals = await db
        .select({
          id: schema.affiliateTransactions.id,
          userId: schema.affiliateTransactions.userId,
          amount: schema.affiliateTransactions.amount,
          balanceType: schema.affiliateTransactions.balanceType,
          description: schema.affiliateTransactions.description,
          status: schema.affiliateTransactions.status,
          notes: schema.affiliateTransactions.notes,
          transactionId: schema.affiliateTransactions.transactionId,
          createdAt: schema.affiliateTransactions.createdAt,
          processedAt: schema.affiliateTransactions.processedAt,
          userName: schema.users.firstName,
          userEmail: schema.users.email,
          userPhone: schema.users.phone,
          bankName: schema.affiliateApplications.bankName,
          branchName: schema.affiliateApplications.branchName,
          ifscCode: schema.affiliateApplications.ifscCode,
          accountNumber: schema.affiliateApplications.accountNumber,
        })
        .from(schema.affiliateTransactions)
        .leftJoin(schema.users, eq(schema.affiliateTransactions.userId, schema.users.id))
        .leftJoin(schema.affiliateApplications, eq(schema.affiliateTransactions.userId, schema.affiliateApplications.userId))
        .where(eq(schema.affiliateTransactions.type, 'withdrawal'))
        .orderBy(desc(schema.affiliateTransactions.createdAt));

      res.json(withdrawals);
    } catch (error) {
      console.error('Error fetching affiliate withdrawals:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  });

  // Approve affiliate withdrawal (Admin)
  app.post('/api/admin/affiliate/withdrawals/:id/approve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { transactionId, notes } = req.body;

      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      // Update transaction status
      const [updatedTransaction] = await db
        .update(schema.affiliateTransactions)
        .set({
          status: 'completed',
          transactionId,
          notes: notes || null,
          processedAt: new Date()
        })
        .where(eq(schema.affiliateTransactions.id, id))
        .returning();

      if (!updatedTransaction) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
  });

  // Reject affiliate withdrawal (Admin)
  app.post('/api/admin/affiliate/withdrawals/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;

      // Get the transaction to refund the amount
      const transaction = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(eq(schema.affiliateTransactions.id, id))
        .limit(1);

      if (!transaction || transaction.length === 0) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }

      const withdrawalAmount = parseFloat(transaction[0].amount);
      const userId = transaction[0].userId;
      const balanceType = transaction[0].balanceType;

      // Update transaction status
      const [updatedTransaction] = await db
        .update(schema.affiliateTransactions)
        .set({
          status: 'rejected',
          notes: notes || 'Rejected by admin',
          processedAt: new Date()
        })
        .where(eq(schema.affiliateTransactions.id, id))
        .returning();

      // Refund the amount to the wallet
      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, userId))
        .limit(1);

      if (wallet && wallet.length > 0) {
        const currentCashback = parseFloat(wallet[0].cashbackBalance || '0');
        const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
        const currentWithdrawn = parseFloat(wallet[0].totalWithdrawn || '0');

        if (balanceType === 'cashback') {
          await db
            .update(schema.affiliateWallet)
            .set({
              cashbackBalance: (currentCashback + withdrawalAmount).toFixed(2),
              totalWithdrawn: Math.max(0, currentWithdrawn - withdrawalAmount).toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(schema.affiliateWallet.userId, userId));
        } else {
          await db
            .update(schema.affiliateWallet)
            .set({
              commissionBalance: (currentCommission + withdrawalAmount).toFixed(2),
              totalWithdrawn: Math.max(0, currentWithdrawn - withdrawalAmount).toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(schema.affiliateWallet.userId, userId));
        }
      }

      res.json({
        success: true,
        message: 'Withdrawal rejected and amount refunded',
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
  });

  // Process affiliate wallet withdrawal
  app.post('/api/affiliate/wallet/withdraw', async (req, res) => {
    try {
      const { userId, amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: 'User ID and amount required' });
      }

      const withdrawAmount = parseFloat(amount);

      if (withdrawAmount < 2500) {
        return res.status(400).json({ error: 'Minimum withdrawal amount is ₹2500' });
      }

      // Get current wallet
      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const cashbackBalance = parseFloat(wallet[0].cashbackBalance);
      const commissionBalance = parseFloat(wallet[0].commissionBalance);
      const totalBalance = cashbackBalance + commissionBalance;

      if (totalBalance < withdrawAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Deduct from balances (prioritize commission first, then cashback)
      let remainingAmount = withdrawAmount;
      let newCommissionBalance = commissionBalance;
      let newCashbackBalance = cashbackBalance;

      if (commissionBalance >= remainingAmount) {
        newCommissionBalance = commissionBalance - remainingAmount;
        remainingAmount = 0;
      } else {
        remainingAmount -= commissionBalance;
        newCommissionBalance = 0;
        newCashbackBalance = cashbackBalance - remainingAmount;
      }

      // Update wallet
      await db
        .update(schema.affiliateWallet)
        .set({
          cashbackBalance: newCashbackBalance.toFixed(2),
          commissionBalance: newCommissionBalance.toFixed(2),
          totalWithdrawn: (parseFloat(wallet[0].totalWithdrawn) + withdrawAmount).toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(schema.affiliateWallet.userId, parseInt(userId)));

      // Create withdrawal transaction
      await db.insert(schema.affiliateTransactions).values({
        userId: parseInt(userId),
        type: 'withdrawal',
        amount: withdrawAmount.toFixed(2),
        balanceType: commissionBalance >= withdrawAmount ? 'commission' : 'mixed',
        description: `Withdrawal request of ₹${withdrawAmount.toFixed(2)}`,
        status: 'pending',
        transactionId: null,
        notes: null,
        processedAt: null,
        createdAt: new Date()
      });

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        newBalance: (newCashbackBalance + newCommissionBalance).toFixed(2)
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  });

  // Multi-Address Orders API
  app.post("/api/multi-address-orders", async (req, res) => {
    try {
      const { userId, itemAddressMapping, cartItems } = req.body;

      if (!userId || !itemAddressMapping || !cartItems) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate that all items have addresses
      const itemIds = cartItems.map((item: any) => item.id);
      const mappingKeys = Object.keys(itemAddressMapping).map(k => parseInt(k));

      const allItemsMapped = itemIds.every((id: number) => mappingKeys.includes(id));

      if (!allItemsMapped) {
        return res.status(400).json({ error: "All items must have delivery addresses assigned" });
      }

      // Get all addresses to include full details
      const addressIds = Object.values(itemAddressMapping);
      const addresses = await db
        .select()
        .from(schema.deliveryAddresses)
        .where(sql`${schema.deliveryAddresses.id} IN (${sql.raw(addressIds.join(','))})`);

      // Create a mapping of addressId to full address
      const addressMap = addresses.reduce((acc, addr) => {
        acc[addr.id] = addr;
        return acc;
      }, {} as any);

      // Build response with full address details
      const itemsWithAddresses = cartItems.map((item: any) => ({
        ...item,
        addressId: itemAddressMapping[item.id],
        address: addressMap[itemAddressMapping[item.id]]
      }));

      res.json({
        success: true,
        message: "Multi-address order data saved",
        itemsWithAddresses,
        itemAddressMapping
      });

    } catch (error) {
      console.error("Error saving multi-address order:", error);
      res.status(500).json({ error: "Failed to save multi-address order" });
    }
  });

  // Get all active offers (public endpoint)
  app.get("/api/offers", async (req, res) => {
    try {
      console.log("📦 Fetching active offers...");

      const offers = await db
        .select()
        .from(schema.offers)
        .where(eq(schema.offers.isActive, true))
        .orderBy(desc(schema.offers.sortOrder));

      console.log(`✅ Found ${offers.length} active offers`);

      // Ensure we always return an array, even if database is unavailable
      res.json(offers || []);
    } catch (error) {
      console.error("❌ Error fetching offers:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      // Return empty array instead of error to prevent UI breakage
      res.json([]);
    }
  });

  // Get all offers for admin (including inactive)
  app.get("/api/admin/offers", async (req, res) => {
    try {
      const offers = await db
        .select()
        .from(schema.offers)
        .orderBy(desc(schema.offers.sortOrder), desc(schema.offers.createdAt));

      res.json(offers);
    } catch (error) {
      console.error("Error fetching admin offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Create new offer (admin)
  app.post("/api/admin/offers", upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImages', maxCount: 10 },
    { name: 'additionalImages', maxCount: 10 },
    { name: 'video', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let imageUrl = req.body.imageUrl;
      let bannerImageUrl = req.body.bannerImageUrl;
      let additionalImages: string[] = [];
      let videoUrl = null;

      // Handle main image
      if (files?.image?.[0]) {
        imageUrl = `/api/images/${files.image[0].filename}`;
      }

      // Handle banner images - save multiple images to bannerImages array
      let bannerImages: string[] = [];
      if (files?.bannerImages) {
        bannerImages = files.bannerImages.map(file => `/api/images/${file.filename}`);
      }

      // Handle additional images - these go in the images array
      if (files?.additionalImages) {
        additionalImages = files.additionalImages.map(file => `/api/images/${file.filename}`);
      }

      // Handle video
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      }

      const offerData: any = {
        title: req.body.title,
        description: req.body.description,
        imageUrl: imageUrl || '',
        bannerImageUrl: bannerImageUrl || null,
        bannerImages: bannerImages.length > 0 ? bannerImages : null,
        images: additionalImages.length > 0 ? additionalImages : null,
        videoUrl: videoUrl,
        discountType: req.body.discountType || 'none',
        discountValue: req.body.discountValue ? parseFloat(req.body.discountValue) : null,
        discountText: req.body.discountText || null,
        validFrom: new Date(req.body.validFrom),
        validUntil: new Date(req.body.validUntil),
        linkUrl: req.body.linkUrl || null,
        buttonText: req.body.buttonText || 'Shop Now',
        productIds: req.body.productIds ? JSON.parse(req.body.productIds) : null,
        detailedDescription: req.body.detailedDescription || null,
        productsIncluded: req.body.productsIncluded || null,
        benefits: req.body.benefits || null,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        sortOrder: parseInt(req.body.sortOrder) || 0
      };

      // Add price fields
      if (req.body.price) {
        offerData.price = parseFloat(req.body.price);
      }
      if (req.body.originalPrice) {
        offerData.originalPrice = parseFloat(req.body.originalPrice);
      }
      if (req.body.cashbackPercentage) {
        offerData.cashbackPercentage = parseFloat(req.body.cashbackPercentage);
      }
      if (req.body.cashbackPrice) {
        offerData.cashbackPrice = parseFloat(req.body.cashbackPrice);
      }

      console.log("Creating offer with data:", JSON.stringify(offerData, null, 2));

      const [newOffer] = await db.insert(schema.offers).values(offerData).returning();

      console.log("Offer created successfully:", JSON.stringify(newOffer, null, 2));
     try {
        const subscriptions = await db
          .select()
          .from(schema.pushSubscriptions)
          .where(eq(schema.pushSubscriptions.isActive, true));

        if (subscriptions.length > 0) {
          console.log(`📢 Sending offer notification to ${subscriptions.length} subscribers...`);

          // Prepare offer notification payload
          const offerNotificationPayload = {
            title: offerData.title || "🎉 New Offer Available!",
            body: offerData.discountText || offerData.description || "Check out our latest exclusive offer!",
            image: offerData.imageUrl || offerData.bannerImageUrl || "",
            url: offerData.linkUrl || `/offers?highlight=${newOffer.id}`,
            tag: `poppik-offer-${newOffer.id}`,
          };

          // Send notification to all subscriptions
          let sentCount = 0;
          for (const subscription of subscriptions) {
            try {
              const notificationMessage = {
                title: offerNotificationPayload.title,
                body: offerNotificationPayload.body,
                icon: offerNotificationPayload.image || '/poppik-icon.png',
                badge: '/poppik-badge.png',
                image: offerNotificationPayload.image,
                tag: offerNotificationPayload.tag,
                data: {
                  url: offerNotificationPayload.url,
                  offerId: newOffer.id,
                },
              };

              // Create subscription object for web-push
              const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                  auth: subscription.auth,
                  p256dh: subscription.p256dh,
                },
              };

              // Send via web-push
              await webpush.sendNotification(pushSubscription, JSON.stringify(notificationMessage));
              console.log(`📤 ✅ Offer notification sent to ${subscription.email || subscription.endpoint.substring(0, 50)}`);
              
              // Update last used timestamp
              await db
                .update(schema.pushSubscriptions)
                .set({ lastUsedAt: new Date() })
                .where(eq(schema.pushSubscriptions.id, subscription.id));

              sentCount++;
            } catch (error: any) {
              // Handle subscription errors (expired, unsubscribed, etc)
              if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription is invalid, mark as inactive
                console.warn(`⚠️ Subscription invalid for ${subscription.email || subscription.endpoint.substring(0, 50)}, marking inactive`);
                await db
                  .update(schema.pushSubscriptions)
                  .set({ isActive: false })
                  .where(eq(schema.pushSubscriptions.id, subscription.id));
              } else {
                console.error(`❌ Failed to send offer notification to ${subscription.email || subscription.endpoint.substring(0, 50)}:`, error.message);
              }
            }
          }

          console.log(`✅ Offer notification sent to ${sentCount} subscribers`);
        } else {
          console.log("ℹ️ No active subscriptions found for offer notification");
        }
      } catch (notificationError) {
        console.error("⚠️ Error sending offer notifications:", notificationError);
        // Don't block offer creation if notification fails
      }
      res.status(201).json(newOffer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "Failed to create offer", details: error.message });
    }
  });

  // Admin: send custom notification to all active subscribers
  app.post('/api/admin/notifications', async (req, res) => {
    try {
      const { title, body: messageBody, image, url, recipients } = req.body;

      if (!title || !messageBody) {
        return res.status(400).json({ error: 'title and body are required' });
      }

      // If recipients is provided and is an array, send only to those subscriber IDs.
      let subscriptionsQuery = db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.isActive, true));

      if (Array.isArray(recipients) && recipients.length > 0) {
        // Ensure we only select requested ids that are active
        subscriptionsQuery = db.select().from(schema.pushSubscriptions).where(and(eq(schema.pushSubscriptions.isActive, true), sql`${schema.pushSubscriptions.id} IN (${sql.raw(recipients.map((r: any) => parseInt(r)).join(','))})`));
      }

      const subscriptions = await subscriptionsQuery;

      if (!subscriptions || subscriptions.length === 0) {
        return res.status(200).json({ message: 'No matching active subscribers', sent: 0, total: 0 });
      }

      const payload = {
        title,
        body: messageBody,
        icon: image || '/poppik-icon.png',
        badge: '/poppik-badge.png',
        image: image || undefined,
        tag: `poppik-admin-${Date.now()}`,
        data: { url: url || '/offers' },
      };

      let sentCount = 0;
      for (const subscription of subscriptions) {
        try {
          const pushSub = {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          };

          await webpush.sendNotification(pushSub, JSON.stringify(payload));

          await db.update(schema.pushSubscriptions)
            .set({ lastUsedAt: new Date() })
            .where(eq(schema.pushSubscriptions.id, subscription.id));

          sentCount++;
        } catch (err: any) {
          if (err && (err.statusCode === 410 || err.statusCode === 404)) {
            console.warn(`⚠️ Admin notification: subscription invalid for ${subscription.email || subscription.endpoint}, marking inactive`);
            await db.update(schema.pushSubscriptions)
              .set({ isActive: false })
              .where(eq(schema.pushSubscriptions.id, subscription.id));
          } else {
            console.error('❌ Admin notification failed for subscription', subscription.id, err && err.message ? err.message : err);
          }
        }
      }

      console.log(`✅ Admin notification sent to ${sentCount}/${subscriptions.length} subscribers`);
      res.json({ sent: sentCount, total: subscriptions.length });
    } catch (error) {
      console.error('Error sending admin notifications:', error);
      res.status(500).json({ error: 'Failed to send notifications', details: error.message });
    }
  });

  // Admin: list push subscribers (email, isActive, lastUsedAt) for admin UI
  app.get('/api/admin/notifications/subscribers', async (req, res) => {
    try {
      const rows = await db
        .select({ id: schema.pushSubscriptions.id, email: schema.pushSubscriptions.email, isActive: schema.pushSubscriptions.isActive, lastUsedAt: schema.pushSubscriptions.lastUsedAt, createdAt: schema.pushSubscriptions.createdAt, endpoint: schema.pushSubscriptions.endpoint })
        .from(schema.pushSubscriptions)
        .orderBy(desc(schema.pushSubscriptions.createdAt))
        .limit(1000);

      // Return a safe representation (truncate endpoint for UI)
      const safe = rows.map(r => ({
        id: r.id,
        email: r.email || null,
        isActive: r.isActive,
        lastUsedAt: r.lastUsedAt,
        createdAt: r.createdAt,
        endpointPreview: r.endpoint ? r.endpoint.substring(0, 120) : null
      }));

      res.json(safe);
    } catch (error) {
      console.error('Error listing push subscribers for admin:', error);
      res.status(500).json({ error: 'Failed to list subscribers' });
    }
  });
  // Update offer (admin)
  app.put("/api/admin/offers/:id", upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'bannerImages', maxCount: 10 },
    { name: 'additionalImages', maxCount: 10 },
    { name: 'video', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const updateData: any = {};

      // Handle main image
      if (files?.image?.[0]) {
        updateData.imageUrl = `/api/images/${files.image[0].filename}`;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }

      // Handle banner images - save to bannerImages array
      let allBannerImages: string[] = [];
      
      // Add existing banner images if provided
      if (req.body.existingBannerImages) {
        try {
          const existingImages = JSON.parse(req.body.existingBannerImages);
          if (Array.isArray(existingImages)) {
            allBannerImages = [...existingImages];
          }
        } catch (e) {
          console.error('Error parsing existingBannerImages:', e);
        }
      }
      
      // Add new uploaded banner images
      if (files?.bannerImages) {
        const newImages = files.bannerImages.map(file => `/api/images/${file.filename}`);
        allBannerImages = [...allBannerImages, ...newImages];
      }
      
      // Only update bannerImages array if there are images
      if (allBannerImages.length > 0) {
        updateData.bannerImages = allBannerImages;
      } else if (req.body.existingBannerImages === '[]') {
        // If explicitly cleared
        updateData.bannerImages = null;
      }

      // Handle additional images - these go in the images array, NOT the banner image
      let allAdditionalImages: string[] = [];
      
      // Add existing additional images if provided
      if (req.body.existingAdditionalImages) {
        try {
          const existingImages = JSON.parse(req.body.existingAdditionalImages);
          if (Array.isArray(existingImages)) {
            allAdditionalImages = [...existingImages];
          }
        } catch (e) {
          console.error('Error parsing existingAdditionalImages:', e);
        }
      }
      
      // Add new uploaded additional images (NOT banner image)
      if (files?.additionalImages) {
        const newImages = files.additionalImages.map(file => `/api/images/${file.filename}`);
        allAdditionalImages = [...allAdditionalImages, ...newImages];
      }
      
      // Only update images array with additional images
      if (allAdditionalImages.length > 0) {
        updateData.images = allAdditionalImages;
      } else if (req.body.existingAdditionalImages === '[]') {
        // If explicitly cleared
        updateData.images = null;
      }

      // Handle video
      if (files?.video?.[0]) {
        updateData.videoUrl = `/api/images/${files.video[0].filename}`;
      }

      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;

      // Price fields - ensure they are saved properly
      if (req.body.price !== undefined && req.body.price !== '') {
        updateData.price = parseFloat(req.body.price);
      }
      if (req.body.originalPrice !== undefined && req.body.originalPrice !== '') {
        updateData.originalPrice = parseFloat(req.body.originalPrice);
      }

      // Discount fields
      if (req.body.discountType) updateData.discountType = req.body.discountType;
      if (req.body.discountValue !== undefined && req.body.discountValue !== '') {
        updateData.discountValue = parseFloat(req.body.discountValue);
      }
      if (req.body.discountText !== undefined) updateData.discountText = req.body.discountText || null;

      // Cashback fields
      if (req.body.cashbackPercentage !== undefined && req.body.cashbackPercentage !== '') {
        updateData.cashbackPercentage = parseFloat(req.body.cashbackPercentage);
      }
      if (req.body.cashbackPrice !== undefined && req.body.cashbackPrice !== '') {
        updateData.cashbackPrice = parseFloat(req.body.cashbackPrice);
      }

      // Other fields
      if (req.body.validFrom) updateData.validFrom = new Date(req.body.validFrom);
      if (req.body.validUntil) updateData.validUntil = new Date(req.body.validUntil);
      if (req.body.linkUrl !== undefined) updateData.linkUrl = req.body.linkUrl || null;
      if (req.body.buttonText !== undefined) updateData.buttonText = req.body.buttonText || 'Shop Now';
      if (req.body.productIds !== undefined) {
        updateData.productIds = req.body.productIds ? JSON.parse(req.body.productIds) : null;
      }
      if (req.body.detailedDescription !== undefined) updateData.detailedDescription = req.body.detailedDescription || null;
      if (req.body.productsIncluded !== undefined) updateData.productsIncluded = req.body.productsIncluded || null;
      if (req.body.benefits !== undefined) updateData.benefits = req.body.benefits || null;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
      if (req.body.sortOrder !== undefined) updateData.sortOrder = parseInt(req.body.sortOrder) || 0;

      updateData.updatedAt = new Date();

      console.log("Updating offer with data:", JSON.stringify(updateData, null, 2));

      const [updatedOffer] = await db
        .update(schema.offers)
        .set(updateData)
        .where(eq(schema.offers.id, offerId))
        .returning();

      if (!updatedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      console.log("Offer updated successfully:", JSON.stringify(updatedOffer, null, 2));
      // Send notification if offer is being activated or updated
      if (updatedOffer.isActive) {
        try {
          const subscriptions = await db
            .select()
            .from(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.isActive, true));

          if (subscriptions.length > 0) {
            console.log(`📢 Sending updated offer notification to ${subscriptions.length} subscribers...`);

            // Prepare offer notification payload
            const offerNotificationPayload = {
              title: updateData.title || updatedOffer.title || "🔄 Offer Updated!",
              body: updateData.discountText || updatedOffer.discountText || updateData.description || updatedOffer.description || "Check out the updated offer!",
              image: updateData.imageUrl || updatedOffer.imageUrl || updateData.bannerImageUrl || updatedOffer.bannerImageUrl || "",
              url: updateData.linkUrl || updatedOffer.linkUrl || `/offers?highlight=${offerId}`,
              tag: `poppik-offer-${offerId}`,
            };

            // Send notification to all subscriptions
            let sentCount = 0;
            for (const subscription of subscriptions) {
              try {
                const notificationMessage = {
                  title: offerNotificationPayload.title,
                  body: offerNotificationPayload.body,
                  icon: offerNotificationPayload.image || '/poppik-icon.png',
                  badge: '/poppik-badge.png',
                  image: offerNotificationPayload.image,
                  tag: offerNotificationPayload.tag,
                  data: {
                    url: offerNotificationPayload.url,
                    offerId: offerId,
                  },
                };

                // Create subscription object for web-push
                const pushSubscription = {
                  endpoint: subscription.endpoint,
                  keys: {
                    auth: subscription.auth,
                    p256dh: subscription.p256dh,
                  },
                };

                // Send via web-push
                await webpush.sendNotification(pushSubscription, JSON.stringify(notificationMessage));
                console.log(`📤 ✅ Updated offer notification sent to ${subscription.email || subscription.endpoint.substring(0, 50)}`);
                
                // Update last used timestamp
                await db
                  .update(schema.pushSubscriptions)
                  .set({ lastUsedAt: new Date() })
                  .where(eq(schema.pushSubscriptions.id, subscription.id));

                sentCount++;
              } catch (error: any) {
                // Handle subscription errors (expired, unsubscribed, etc)
                if (error.statusCode === 410 || error.statusCode === 404) {
                  // Subscription is invalid, mark as inactive
                  console.warn(`⚠️ Subscription invalid for ${subscription.email || subscription.endpoint.substring(0, 50)}, marking inactive`);
                  await db
                    .update(schema.pushSubscriptions)
                    .set({ isActive: false })
                    .where(eq(schema.pushSubscriptions.id, subscription.id));
                } else {
                  console.error(`❌ Failed to send updated offer notification to ${subscription.email || subscription.endpoint.substring(0, 50)}:`, error.message);
                }
              }
            }

            console.log(`✅ Updated offer notification sent to ${sentCount} subscribers`);
          }
        } catch (notificationError) {
          console.error("⚠️ Error sending updated offer notifications:", notificationError);
          // Don't block offer update if notification fails
        }
      }
      res.json(updatedOffer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "Failed to update offer", details: error.message });
    }
  });

  // Delete offer (admin)
  app.delete("/api/admin/offers/:id", async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);

      const [deletedOffer] = await db
        .delete(schema.offers)
        .where(eq(schema.offers.id, offerId))
        .returning();

      if (!deletedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      res.json({ message: "Offer deleted successfully" });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ error: "Failed to delete offer" });
    }
  });

  // Get single offer by ID with products and calculated prices
  app.get("/api/offers/:id", async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);

      if (isNaN(offerId)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }

      const offer = await db
        .select()
        .from(schema.offers)
        .where(and(
          eq(schema.offers.id, offerId),
          eq(schema.offers.isActive, true) // Only return active offers publicly
        ))
        .limit(1);

      if (!offer || offer.length === 0) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const offerData = {
        ...offer[0],
        detailedDescription: offer[0].detailedDescription || offer[0].description,
        productsIncluded: offer[0].productsIncluded || null,
        benefits: offer[0].benefits || null,
        images: offer[0].images || [],
        bannerImages: offer[0].bannerImages || [],
        videoUrl: offer[0].videoUrl || null,
        additionalImages: offer[0].images || [],
      };

      // Get products with calculated offer prices
      if (offerData.productIds && Array.isArray(offerData.productIds)) {
        const products = await Promise.all(
          offerData.productIds.map(async (productId: number) => {
            const product = await db
              .select()
              .from(schema.products)
              .where(eq(schema.products.id, productId))
              .limit(1);

            if (product && product.length > 0) {
              const productData = product[0];
              const originalPrice = parseFloat(productData.price || '0');
              let offerPrice = originalPrice;
              let discountAmount = 0;

              // Calculate offer price based on discount type
              if (offerData.discountType === 'percentage' && offerData.discountValue) {
                discountAmount = (originalPrice * parseFloat(offerData.discountValue)) / 100;
                offerPrice = originalPrice - discountAmount;
              } else if (offerData.discountType === 'flat' && offerData.discountValue) {
                discountAmount = parseFloat(offerData.discountValue);
                offerPrice = Math.max(0, originalPrice - discountAmount);
              }

              return {
                ...productData,
                offerPrice: offerPrice.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                originalPrice: originalPrice.toFixed(2)
              };
            }
            return null;
          })
        );

        // Filter out null products
        const validProducts = products.filter(p => p !== null);

        res.json({
          ...offerData,
          products: validProducts,
          totalProducts: validProducts.length
        });
      } else {
        res.json(offerData);
      }
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ error: "Failed to fetch offer" });
    }
  });

  // Get reviews for an offer
  app.get("/api/offers/:id/reviews", async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);

      if (isNaN(offerId)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }

      // For now, return empty array since we don't have offer reviews table yet
      // You can add a dedicated table for offer reviews similar to product reviews
      res.json([]);
    } catch (error) {
      console.error("Error fetching offer reviews:", error);
      res.status(500).json({ error: "Failed to fetch offer reviews" });
    }
  });

  // Submit a review for an offer
  app.post("/api/offers/:id/reviews", async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      const { rating, title, comment, userName, orderId } = req.body;

      if (isNaN(offerId)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }

      if (!rating || !title || !comment) {
        return res.status(400).json({ error: "Rating, title, and comment are required" });
      }

      // For now, just return success
      // You would need to create an offer_reviews table to store these
      res.json({
        success: true,
        message: "Review submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting offer review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // Check if user can review an offer
  app.get("/api/offers/:id/can-review", async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      const userId = req.query.userId;

      if (isNaN(offerId)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }

      if (!userId) {
        return res.json({ canReview: false, message: "Please login to review" });
      }

      // Check if user has purchased this offer
      // For now, allow all logged-in users to review
      res.json({ 
        canReview: true, 
        message: "You can review this offer"
      });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ error: "Failed to check review eligibility" });
    }
  });

  // Affiliate Stats - Overview stats
  app.get("/api/affiliate/stats", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get total clicks
      const clicks = await db
        .select()
        .from(schema.affiliateClicks)
        .where(eq(schema.affiliateClicks.affiliateUserId, parseInt(userId as string)));

      const totalClicks = clicks.length;

      // Get total sales
      const sales = await db
        .select()
        .from(schema.affiliateSales)
        .where(eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)));

      const totalSales = sales.length;
      const totalEarnings = sales.reduce((sum, sale) => sum + parseFloat(sale.commissionAmount), 0);

      // Calculate average commission
      const avgCommission = totalSales > 0 ? totalEarnings / totalSales : 0;

      // Get pending earnings
      const pendingSales = sales.filter(sale => sale.status === 'pending');
      const pendingEarnings = pendingSales.reduce((sum, sale) => sum + parseFloat(sale.commissionAmount), 0);

      // Calculate conversion rate
      const conversionRate = totalClicks > 0 ? ((totalSales / totalClicks) * 100) : 0;

      // Get this month's data for growth calculation
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthClicks = clicks.filter(click => 
        new Date(click.createdAt) >= startOfMonth
      ).length;

      const thisMonthSales = sales.filter(sale => 
        new Date(sale.createdAt) >= startOfMonth
      ).length;

      const thisMonthEarnings = sales
        .filter(sale => new Date(sale.createdAt) >= startOfMonth)
        .reduce((sum, sale) => sum + parseFloat(sale.commissionAmount), 0);

      // Calculate monthly growth (compare with previous month)
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

      const lastMonthEarnings = sales
        .filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= startOfLastMonth && saleDate < startOfMonth;
        })
        .reduce((sum, sale) => sum + parseFloat(sale.commissionAmount), 0);

      const monthlyGrowth = lastMonthEarnings > 0 
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 
        : thisMonthEarnings > 0 ? 100 : 0;

      res.json({
        totalClicks,
        totalSales,
        totalEarnings: totalEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgCommission: parseFloat(avgCommission.toFixed(2)),
        clicksGrowth: 0, // Placeholder, not calculated
        salesGrowth: 0,  // Placeholder, not calculated
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1))
      });

    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Test SMS service connectivity with real SMS sending
  app.get("/api/auth/test-sms-service", async (req, res) => {
    try {
      // Check configuration
      if (!process.env.MDSSEND_API_KEY || !process.env.MDSSEND_SENDER_ID) {
        return res.status(400).json({
          success: false,
          message: "SMS service not configured",
          issues: [
            "Missing MDSSEND_API_KEY environment variable",
            "Missing MDSSEND_SENDER_ID environment variable"
          ]
        });
      }

      const testPhone = req.query.phone || '9999999999';
      console.log('🧪 Testing SMS service with phone:', testPhone);

      // Test actual SMS sending
      const result = await OTPService.sendMobileOTP(testPhone.toString());

      res.json({
        success: result.success,
        message: result.message,
        testPhone,
        details: {
          apiUrl: 'http://13.234.156.238/v1/sms/send',
          configured: true,
          apiKeyLength: process.env.MDSSEND_API_KEY?.length,
          senderId: process.env.MDSSEND_SENDER_ID,
          templateId: process.env.MDSSEND_TEMPLATE_ID || 'Not set'
        }
      });

    } catch (error) {
      console.error('SMS test error:', error);
      res.status(500).json({
        success: false,
        message: "SMS service test failed",
        error: error.message,
        details: {
          configured: !!process.env.MDSSEND_API_KEY && !!process.env.MDSSEND_SENDER_ID,
          possibleIssues: [
            "Invalid API credentials",
            "Network connectivity issues",
            "MDSSEND.IN API is down",
            "Incorrect API endpoint URL",
            "Phone number format issues"
          ]
        }
      });
    }
  });

  // Network connectivity test endpoint
  app.get("/api/auth/test-network", async (req, res) => {
    try {
      const testUrls = [
        'http://13.234.156.238',
        'https://api.mdssend.in',
        'http://api.mdssend.in',
        'https://www.google.com'
      ];

      const results = [];

      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const start = Date.now();
          const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
          });
          const duration = Date.now() - start;

          clearTimeout(timeoutId);

          results.push({
            url,
            status: response.status,
            success: response.ok,
            duration: `${duration}ms`
          });
        } catch (error) {
          results.push({
            url,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        message: "Network connectivity test completed",
        results,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        error: "Network test failed",
        details: error.message
      });
    }
  });

  // Get current mobile OTP for development
  app.get("/api/auth/get-mobile-otp/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;

      // Clean phone number the same way as in sendMobileOTP
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.startsWith('91') && cleanedPhone.length === 12
        ? cleanedPhone.substring(2)
        : cleanedPhone;

      const otpData = OTPService.otpStorage.get(formattedPhone);

      if (otpData && new Date() <= otpData.expiresAt) {
        res.json({
          otp: otpData.otp,
          phoneNumber: formattedPhone,
          expiresAt: otpData.expiresAt,
          remainingTime: Math.max(0, Math.floor((otpData.expiresAt.getTime() - Date.now()) / 1000))
        });
      } else {
        res.status(404).json({ error: "No valid OTP found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get OTP" });
    }
  });

  // Debug OTP endpoint for development
  app.get("/api/auth/debug-otp/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;

      // Clean phone number the same way as in sendMobileOTP
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.startsWith('91') && cleanedPhone.length === 12
        ? cleanedPhone.substring(2)
        : cleanedPhone;

      const otpData = OTPService.otpStorage.get(formattedPhone);

      if (otpData && new Date() <= otpData.expiresAt) {
        res.json({
          success: true,
          otp: otpData.otp,
          phoneNumber: formattedPhone,
          expiresAt: otpData.expiresAt,
          remainingTime: Math.max(0, Math.floor((otpData.expiresAt.getTime() - Date.now()) / 1000))
        });
      } else {
        res.json({
          success: false,
          error: "No valid OTP found",
          phoneNumber: formattedPhone
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Failed to get OTP",
        details: error.message
      });
    }
  });

  // Direct SMS test endpoint
  app.post("/api/auth/test-direct-sms", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      console.log('🧪 Direct SMS Test - Phone:', phoneNumber);
      console.log('🧪 Direct SMS Test - Message:', message || 'Test message');

      // Check configuration
      if (!process.env.MDSSEND_API_KEY || !process.env.MDSSEND_SENDER_ID) {
        return res.status(400).json({
          error: "SMS service not configured properly",
          details: {
            apiKey: !!process.env.MDSSEND_API_KEY,
            senderId: !!process.env.MDSSEND_SENDER_ID
          }
        });
      }

      const apiKey = process.env.MDSSEND_API_KEY;
      const senderId = process.env.MDSSEND_SENDER_ID;
      const templateId = process.env.MDSSEND_TEMPLATE_ID || '';

      // Format phone number
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`;

      const testMessage = message || `Test SMS from Poppik Beauty Store at ${new Date().toLocaleString('en-IN')}`;

      const requestData = {
        apikey: apiKey,
        sender: senderId,
        message: testMessage,
        numbers: formattedPhone,
        ...(templateId && { templateid: templateId })
      };

      console.log('Sending to:', `http://13.234.156.238/v1/sms/send`);
      console.log('Request payload:', JSON.stringify(requestData, null, 2));

      const response = await fetch('http://13.234.156.238/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Poppik-Beauty-Store-Test/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      console.log('MDSSEND.IN Response Status:', response.status);
      console.log('MDSSEND.IN Response:', JSON.stringify(result, null, 2));

      res.json({
        success: response.ok,
        status: response.status,
        response: result,
        requestData: {
          ...requestData,
          apikey: `${apiKey.substring(0, 8)}****` // Hide full API key
        },
        formattedPhone,
        message: testMessage
      });

    } catch (error) {
      console.error('Direct SMS test error:', error);
      res.status(500).json({
        error: error.message,
        details: 'Failed to send direct SMS test'
      });
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
      const { firstName, lastName, phone, dateOfBirth, address, city, state, pincode } = req.body;

      console.log(`Updating user ${id} with:`, { firstName, lastName, phone, city, state, pincode });

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
        phone: phone ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        pincode: pincode ? pincode.trim() : null
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
 app.post("/api/upload/video", upload.single("video"), async (req, res) => {
    try {
      console.log("Video upload request received");

      if (!req.file) {
        console.error("No video file provided in request");
        return res.status(400).json({ error: "No video file provided" });
      }

      console.log("Video uploaded successfully:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Return the file URL
      const videoUrl = `/api/images/${req.file.filename}`;
      console.log("Video upload successful, returning URL:", videoUrl);
      res.json({
        videoUrl,
        message: "Video uploaded successfully",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({
        error: "Failed to upload video",
        details: error.message
      });
    }
  });
  // Image upload API
  app.post("/api/upload/image", upload.single("image"), async (req, res) => {
    try {
      console.log("Image upload request received");

      if (!req.file) {
        console.error("No image file provided in request");
        return res.status(400).json({ error: "No image file provided" });
      }

      console.log("Image uploaded successfully:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Return the file URL
      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({
        imageUrl,
        message: "Image uploaded successfully",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message
      });
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
      console.log("📦 GET /api/products - Fetching products...");
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      console.log("📦 Query params - limit:", limit, "offset:", offset);

      // Fetch all products directly from database
      const allProducts = await db
        .select()
        .from(schema.products)
        .orderBy(desc(schema.products.createdAt))
        .limit(limit)
        .offset(offset);

      console.log("📦 Products fetched from DB:", allProducts?.length || 0);

      if (allProducts && allProducts.length > 0) {
        console.log("📦 Sample product from DB:", {
          id: allProducts[0].id,
          name: allProducts[0].name,
          price: allProducts[0].price,
          category: allProducts[0].category
        });
      } else {
        console.log("⚠️ No products found in database!");
      }

      if (!allProducts || !Array.isArray(allProducts)) {
        console.warn("Products data is not an array, returning empty array");
        return res.json([]);
      }

      res.json(allProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Delivery Address Management Routes
  app.get("/api/delivery-addresses", async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const addresses = await db
        .select()
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.userId, parseInt(userId as string)))
        .orderBy(desc(schema.deliveryAddresses.isDefault), desc(schema.deliveryAddresses.createdAt));

      res.json(addresses);
    } catch (error) {
      console.error("Error fetching delivery addresses:", error);
      res.status(500).json({ error: "Failed to fetch delivery addresses" });
    }
  });

  app.post("/api/delivery-addresses", async (req, res) => {
    try {
      const {
        userId,
        recipientName,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        phoneNumber,
        deliveryInstructions,
        isDefault
      } = req.body;

      if (!userId || !recipientName || !addressLine1 || !city || !state || !pincode || !phoneNumber) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // If this is set as default, unset other default addresses
      if (isDefault) {
        await db
          .update(schema.deliveryAddresses)
          .set({ isDefault: false })
          .where(eq(schema.deliveryAddresses.userId, parseInt(userId)));
      }

      const [newAddress] = await db
        .insert(schema.deliveryAddresses)
        .values({
          userId: parseInt(userId),
          recipientName: recipientName.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2 ? addressLine2.trim() : null,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country || 'India',
          phoneNumber: phoneNumber.trim(),
          deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : null,
          isDefault: Boolean(isDefault)
        })
        .returning();

      res.status(201).json(newAddress);
    } catch (error) {
      console.error("Error creating delivery address:", error);
      res.status(500).json({ error: "Failed to create delivery address" });
    }
  });

  app.put("/api/delivery-addresses/:id", async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);
      const {
        recipientName,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        phoneNumber,
        deliveryInstructions,
        isDefault
      } = req.body;

      // If setting as default, unset other defaults for this user
      if (isDefault) {
        const address = await db
          .select()
          .from(schema.deliveryAddresses)
          .where(eq(schema.deliveryAddresses.id, addressId))
          .limit(1);

        if (address.length > 0) {
          await db
            .update(schema.deliveryAddresses)
            .set({ isDefault: false })
            .where(eq(schema.deliveryAddresses.userId, address[0].userId));
        }
      }

      const [updatedAddress] = await db
        .update(schema.deliveryAddresses)
        .set({
          recipientName: recipientName?.trim(),
          addressLine1: addressLine1?.trim(),
          addressLine2: addressLine2 ? addressLine2.trim() : null,
          city: city?.trim(),
          state: state?.trim(),
          pincode: pincode?.trim(),
          country: country || 'India',
          phoneNumber: phoneNumber?.trim(),
          deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : null,
          isDefault: Boolean(isDefault),
          updatedAt: new Date()
        })
        .where(eq(schema.deliveryAddresses.id, addressId))
        .returning();

      if (!updatedAddress) {
        return res.status(404).json({ error: "Address not found" });
      }

      res.json(updatedAddress);
    } catch (error) {
      console.error("Error updating delivery address:", error);
      res.status(500).json({ error: "Failed to update delivery address" });
    }
  });

  app.delete("/api/delivery-addresses/:id", async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);

      const [deletedAddress] = await db
        .delete(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, addressId))
        .returning();

      if (!deletedAddress) {
        return res.status(404).json({ error: "Address not found" });
      }

      res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
      console.error("Error deleting delivery address:", error);
      res.status(500).json({ error: "Failed to delete delivery address" });
    }
  });

  app.put("/api/delivery-addresses/:id/set-default", async (req, res) => {
    try {
      const addressId = parseInt(req.params.id);

      const address = await db
        .select()
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, addressId))
        .limit(1);

      if (address.length === 0) {
        return res.status(404).json({ error: "Address not found" });
      }

      // Unset all default addresses for this user
      await db
        .update(schema.deliveryAddresses)
        .set({ isDefault: false })
        .where(eq(schema.deliveryAddresses.userId, address[0].userId));

      // Set this address as default
      const [updatedAddress] = await db
        .update(schema.deliveryAddresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(schema.deliveryAddresses.id, addressId))
        .returning();

      res.json(updatedAddress);
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "Failed to set default address" });
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
        originalPrice: req.body.originalPrice ? Number(req.body.originalPrice) : null,
        discount: req.body.discount ? Number(req.body.discount) : null,
        cashbackPercentage: req.body.cashbackPercentage ? Number(req.body.cashbackPercentage) : null,
        cashbackPrice: req.body.cashbackPrice ? Number(req.body.cashbackPrice) : null,
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

      // Store product images if any were uploaded
      if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        try {
          console.log("Storing product images:", req.body.images);
          await Promise.all(
            req.body.images.map(async (imageUrl: string, index: number) => {
              await db.insert(schema.productImages).values({
                productId: product.id,
                imageUrl: imageUrl,
                altText: `${product.name} - Image ${index + 1}`,
                isPrimary: index === 0, // First image is primary
                sortOrder: index
              });
            })
          );
          console.log("Product images stored successfully");
        } catch (imageError) {
          console.error('Error storing product images:', imageError);
          // Continue even if image storage fails
        }
      }

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
      console.error("Error fetching featured products:", error);
      res.status(500).json({ error: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/bestsellers", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
      res.setHeader('CDN-Cache-Control', 'public, max-age=600');
      const products = await storage.getBestsellerProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample bestseller products");
      res.status(500).json({ error: "Failed to fetch bestseller products" });
    }
  });

  app.get("/api/products/new-launches", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
      res.setHeader('CDN-Cache-Control', 'public, max-age=600');
      const products = await storage.getNewLaunchProducts();
      res.json(products);
    } catch (error) {
      console.log("Database unavailable, using sample new launch products");
      res.status(500).json({ error: "Failed to fetch new launch products" });
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
      res.status(500).json({ error: "Failed to fetch products by subcategory" }); // Added error handling
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
          'skincare': ['skincare', 'skin', 'face', 'facial'],
          'haircare': ['hair'],
          'makeup': ['makeup', 'cosmetics', 'beauty'],
          'bodycare': ['body'],
          'eyecare': ['eye', 'eyes', 'eyecare', 'eye care', 'eye-care'],
          'eye-care': ['eye', 'eyes', 'eyecare', 'eye care'],
          'eyes-care': ['eye', 'eyes', 'eyecare', 'eye care'],
          'eye care': ['eye', 'eyes', 'eyecare', 'eye-care'],
          'eyes': ['eye', 'eyecare', 'eye care', 'eye-care'],
          'lipcare': ['lip', 'lips', 'lip care', 'lip-care'],
          'lip-care': ['lip', 'lips', 'lipcare', 'lip care'],
          'lip care': ['lip', 'lips', 'lipcare', 'lip-care'],
          'lips': ['lip', 'lipcare', 'lip care', 'lip-care'],
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
      res.status(500).json({ error: "Failed to fetch products by category" }); // Added error handling
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      // Check if slug is actually an ID (numeric)
      const isNumeric = /^\d+$/.test(slug);

      let product;
      if (isNumeric) {
        // Fetch by ID
        const productId = parseInt(slug);
        const products = await storage.getProducts();
        product = products.find(p => p.id === productId);
      } else {
        // Fetch by slug
        product = await storage.getProductBySlug(slug);
      }

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Categories API
 app.get("/api/categories", async (req, res) => {
  try {
    const categories = await storage.getCategories();
    console.log("categories", categories);

    // const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        // const products = await storage.getProductsByCategory(category.name);
        // console.log(`Category: ${category.name}, Products:`, products);
        return {
          ...category,
          // productCount: products.length
        };
      })
    // );

    // console.log("categoriesWithCount", categoriesWithCount);
    res.json(categories);
  } catch (error) {
    console.log("Database unavailable, returning empty categories");
    res.json([]);
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
      console.error("Error fetching category by slug:", error);
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
      console.error("Error updating category:", error);
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
      console.error("Error deleting category:", error);
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
      console.error("Error fetching subcategories by category ID:", error);
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
      console.error("Error fetching subcategory by slug:", error);
      res.status(500).json({ error: "Failed to fetch subcategory" });
    }
  });

  app.post("/api/subcategories", async (req, res) => {
    try {
      console.log("Creating subcategory with data:", req.body);

      // Set content type to ensure JSON response
      res.setHeader('Content-Type', 'application/json');

      // Validate required fields
      const { name, categoryId, description } = req.body;
      if (!name || !categoryId || !description) {
        return res.status(400).json({
          error: "Missing required fields: name, categoryId, and description are required"
        });
      }

      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({
          error: "Name and description cannot be empty"
        });
      }

      // Generate slug from name
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const subcategoryData = {
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId: Number(categoryId),
        status: req.body.status || 'Active',
        productCount: parseInt(req.body.productCount) || 0
      };

      console.log("Creating subcategory with processed data:", subcategoryData);

      const subcategory = await storage.createSubcategory(subcategoryData);
      console.log("Subcategory created successfully:", subcategory);

      res.status(201).json(subcategory);
    } catch (error) {
      console.error("Subcategory creation error:", error);

      let errorMessage = "Failed to create subcategory";
      if (error.message) {
        errorMessage = error.message;
      }

      if (error.message && error.message.includes('unique constraint')) {
        errorMessage = "A subcategory with this name or slug already exists";
      } else if (error.message && error.message.includes('foreign key constraint')) {
        errorMessage = "Invalid category selected. Please choose a valid category.";
      } else if (error.message && error.message.includes('ECONNREFUSED')) {
        errorMessage = "Database connection error. Please try again later.";
      }

      res.status(500).json({
        error: errorMessage,
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
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
      console.error("Error updating subcategory:", error);
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
      console.error("Error deleting subcategory:", error);
      res.status(500).json({ error: "Failed to delete subcategory" });
    }
  });

  // Sync existing orders with Shiprocket
  app.post("/api/admin/sync-shiprocket-orders", async (req, res) => {
    try {
      console.log("Syncing existing orders with Shiprocket...");

      // Check if Shiprocket is configured
      if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
        return res.status(400).json({
          error: "Shiprocket credentials not configured",
          message: "Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables"
        });
      }

      // Get orders that don't have Shiprocket tracking
      const ordersToSync = await db
        .select()
        .from(schema.ordersTable)
        .where(and(
          isNull(schema.ordersTable.shiprocketOrderId),
          or(
            eq(schema.ordersTable.status, 'processing'),
            eq(schema.ordersTable.status, 'pending')
          )
        ))
        .limit(10); // Process in batches

      let syncedCount = 0;
      let failedCount = 0;

      for (const order of ordersToSync) {
        try {
          // Get user details
          const user = await db
            .select({
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              email: schema.users.email,
              phone: schema.users.phone,
            })
            .from(schema.users)
            .where(eq(schema.users.id, order.userId))
            .limit(1);

          const userData = user[0] || {
            firstName: 'Customer',
            lastName: '',
            email: 'customer@example.com',
            phone: '9999999999'
          };

          // Get order items
          const items = await db
            .select()
            .from(schema.orderItemsTable)
            .where(eq(schema.orderItemsTable.orderId, order.id));

          const orderForShiprocket = {
            id: `ORD-${order.id.toString().padStart(3, '0')}`,
            createdAt: order.createdAt,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            shippingAddress: order.shippingAddress,
            items: items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              productImage: item.productImage,
              quantity: item.quantity,
              price: item.price
            })),
            customer: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              phone: userData.phone,
            }
          };

          const shiprocketOrderData = shiprocketService.convertToShiprocketFormat(orderForShiprocket);
          const shiprocketResponse = await shiprocketService.createOrder(shiprocketOrderData);

          if (shiprocketResponse.order_id) {
            // Update order with Shiprocket details
            await db.update(schema.ordersTable)
              .set({
                shiprocketOrderId: shiprocketResponse.order_id,
                shiprocketShipmentId: shiprocketResponse.shipment_id || null
              })
              .where(eq(schema.ordersTable.id, order.id));

            syncedCount++;
            console.log(`Synced order ${order.id} with Shiprocket order ${shiprocketResponse.order_id}`);
          } else {
            failedCount++;
            console.error(`Failed to create Shiprocket order for order ${order.id}`);
          }

        } catch (orderError) {
          failedCount++;
          console.error(`Error syncing order ${order.id}:`, orderError);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      res.json({
        message: `Shiprocket sync completed`,
        totalOrders: ordersToSync.length,
        syncedCount,
        failedCount,
        remaining: Math.max(0, ordersToSync.length - syncedCount - failedCount)
      });

    } catch (error) {
      console.error("Error syncing orders with Shiprocket:", error);
      res.status(500).json({
        error: "Failed to sync orders with Shiprocket",
        details: error.message
      });
    }
  });

  // Sync Cashfree orders to ordersTable
  app.post("/api/admin/sync-cashfree-orders", async (req, res) => {
    try {
      console.log("Syncing Cashfree orders to ordersTable...");

      // Get all completed Cashfree payments
      const completedPayments = await db
        .select()
        .from(schema.cashfreePayments)
        .where(eq(schema.cashfreePayments.status, 'completed'));

      let syncedCount = 0;

      for (const payment of completedPayments) {
        // Check if order already exists in ordersTable
        const existingOrder = await db
          .select()
          .from(schema.ordersTable)
          .where(eq(schema.ordersTable.cashfreeOrderId, payment.cashfreeOrderId))
          .limit(1);

        if (existingOrder.length === 0) {
          try {
            const orderData = payment.orderData;

            // Create order in ordersTable
            const [newOrder] = await db.insert(schema.ordersTable).values({
              userId: payment.userId,
              totalAmount: payment.amount,
              status: 'processing',
              paymentMethod: 'Cashfree',
              shippingAddress: orderData.shippingAddress,
              cashfreeOrderId: payment.cashfreeOrderId,
              paymentId: payment.paymentId,
              estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              createdAt: payment.createdAt || new Date(),
            }).returning();

            // Create order items
            if (orderData.items && Array.isArray(orderData.items)) {
              const orderItems = orderData.items.map((item: any) => ({
                orderId: newOrder.id,
                productId: Number(item.productId) || null,
                productName: item.productName,
                productImage: item.productImage,
                quantity: Number(item.quantity),
                price: item.price,
              }));

              await db.insert(schema.orderItemsTable).values(orderItems);
            }

            syncedCount++;
            console.log(`Synced order: ${payment.cashfreeOrderId}`);
          } catch (error) {
            console.error(`Failed to sync order ${payment.cashfreeOrderId}:`, error);
          }
        }
      }

      res.json({
        message: `Successfully synced ${syncedCount} Cashfree orders`,
        syncedCount,
        totalPayments: completedPayments.length
      });
    } catch (error) {
      console.error("Error syncing Cashfree orders:", error);
      res.status(500).json({ error: "Failed to sync Cashfree orders" });
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
          .from(schema.ordersTable)
          .orderBy(desc(schema.ordersTable.createdAt));
      } catch (dbError) {
        // Fallback sample data when database is unavailable
        console.log("Database unavailable, using sample data");
        const sampleOrders = generateSampleOrders();
        return res.json(sampleOrders);
      }

      // Get order items for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              id: schema.orderItemsTable.id,
              name: schema.orderItemsTable.productName,
              quantity: schema.orderItemsTable.quantity,
              price: schema.orderItemsTable.price,
              image: schema.orderItemsTable.productImage,
            })
            .from(schema.orderItemsTable)
            .where(eq(schema.orderItemsTable.orderId, order.id));

          // Get user info
          const user = await db
            .select({
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              email: schema.users.email,
              phone: schema.users.phone,
            })
            .from(schema.users)
            .where(eq(schema.users.id, order.userId))
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
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.id, Number(orderId)));

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, order[0].userId))
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
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.userId, Number(userId)))
        .orderBy(desc(schema.ordersTable.createdAt));

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              id: schema.orderItemsTable.id,
              name: schema.orderItemsTable.productName,
              quantity: schema.orderItemsTable.quantity,
              price: schema.orderItemsTable.price,
              image: schema.orderItemsTable.productImage,
            })
            .from(schema.orderItemsTable)
            .where(eq(schema.orderItemsTable.orderId, order.id));

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
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const items = await db
        .select({
          id: schema.orderItemsTable.id,
          name: schema.orderItemsTable.productName,
          quantity: schema.orderItemsTable.quantity,
          price: schema.orderItemsTable.price,
          image: schema.orderItemsTable.productImage,
        })
        .from(schema.orderItemsTable)
        .where(eq(schema.orderItemsTable.orderId, order[0].id));

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

  // Recalculate Affiliate Wallet Balances (Admin utility)
  app.post("/api/admin/recalculate-affiliate-wallets", async (req, res) => {
    try {
      console.log("Recalculating all affiliate wallet balances...");

      // Get all affiliate wallets
      const wallets = await db.select().from(schema.affiliateWallet);

      let updatedCount = 0;

      for (const wallet of wallets) {
        // Get all confirmed sales for this affiliate
        const sales = await db
          .select()
          .from(schema.affiliateSales)
          .where(and(
            eq(schema.affiliateSales.affiliateUserId, wallet.userId),
            eq(schema.affiliateSales.status, 'confirmed')
          ));

        // Calculate total commission from sales
        const totalCommission = sales.reduce((sum, sale) => 
          sum + parseFloat(sale.commissionAmount || '0'), 0
        );

        // Update wallet with correct values
        await db.execute(sql`
          UPDATE affiliate_wallet 
          SET 
            commission_balance = ${totalCommission},
            total_earnings = ${totalCommission},
            updated_at = NOW()
          WHERE user_id = ${wallet.userId}
        `);

        console.log(`Updated wallet for user ${wallet.userId}: ₹${totalCommission.toFixed(2)}`);
        updatedCount++;
      }

      res.json({
        success: true,
        message: `Recalculated ${updatedCount} affiliate wallets`,
        updatedCount
      });

    } catch (error) {
      console.error("Error recalculating affiliate wallets:", error);
      res.status(500).json({ error: "Failed to recalculate wallets" });
    }
  });

  // Promo Codes Management Routes (Admin)
  app.get("/api/admin/promo-codes", async (req, res) => {
    try {
      const promoCodes = await db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt));
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promo-codes", async (req, res) => {
    try {
      const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, userUsageLimit, validFrom, validUntil, isActive } = req.body;

      if (!code || !description || !discountType || !discountValue) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [promoCode] = await db.insert(schema.promoCodes).values({
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue: discountValue.toString(),
        minOrderAmount: minOrderAmount ? minOrderAmount.toString() : "0.00",
        maxDiscount: maxDiscount ? maxDiscount.toString() : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        userUsageLimit: userUsageLimit ? parseInt(userUsageLimit) : 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== false && isActive !== 'false',
        usageCount: 0
      }).returning();

      res.status(201).json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Promo code already exists" });
      }
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  app.put("/api/admin/promo-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, userUsageLimit, validFrom, validUntil, isActive } = req.body;

      const updateData: any = {
        updatedAt: new Date()
      };

      if (code) updateData.code = code.toUpperCase();
      if (description) updateData.description = description;
      if (discountType) updateData.discountType = discountType;
      if (discountValue) updateData.discountValue = discountValue.toString();
      if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount.toString();
      if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? maxDiscount.toString() : null;
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null;
      if (userUsageLimit !== undefined) updateData.userUsageLimit = parseInt(userUsageLimit);
      if (validFrom) updateData.validFrom = new Date(validFrom);
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updatedPromoCode] = await db
        .update(schema.promoCodes)
        .set(updateData)
        .where(eq(schema.promoCodes.id, id))
        .returning();

      if (!updatedPromoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json(updatedPromoCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(schema.promoCodes)
        .where(eq(schema.promoCodes.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ error: "Failed to delete promo code" });
    }
  });

  // Promo code validation endpoint (public)
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code, cartTotal, userId, affiliateCode, affiliateWalletAmount } = req.body;

      // Prevent promo validation when affiliate code/link or affiliate wallet redemption is present
      if (affiliateCode || (affiliateWalletAmount && Number(affiliateWalletAmount) > 0)) {
        return res.status(400).json({ error: "Cannot apply a promo code when an affiliate code/link or affiliate wallet redemption is used. Remove affiliate or wallet redemption to use a promo code." });
      }

      if (!code) {
        return res.status(400).json({ error: "Promo code is required" });
      }

      const promoCode = await db
        .select()
        .from(schema.promoCodes)
        .where(eq(schema.promoCodes.code, code.toUpperCase()))
        .limit(1);

      if (!promoCode || promoCode.length === 0) {
        return res.status(404).json({ error: "Invalid promo code" });
      }

      const promo = promoCode[0];

      // Check if promo is active
      if (!promo.isActive) {
        return res.status(400).json({ error: "This promo code is no longer active" });
      }

      // Check validity dates
      const now = new Date();
      if (promo.validFrom && new Date(promo.validFrom) > now) {
        return res.status(400).json({ error: "This promo code is not yet valid" });
      }
      if (promo.validUntil && new Date(promo.validUntil) < now) {
        return res.status(400).json({ error: "This promo code has expired" });
      }

      // Check usage limit
      if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        return res.status(400).json({ error: "This promo code has reached its usage limit" });
      }

      // Check user usage limit if userId provided
      if (userId && promo.userUsageLimit) {
        const userUsage = await db
          .select()
          .from(schema.promoCodeUsage)
          .where(and(
            eq(schema.promoCodeUsage.promoCodeId, promo.id),
            eq(schema.promoCodeUsage.userId, parseInt(userId))
          ));

        if (userUsage.length >= promo.userUsageLimit) {
          return res.status(400).json({ error: "You have already used this promo code the maximum number of times" });
        }
      }

      // Check minimum order amount
      const minOrder = parseFloat(promo.minOrderAmount || '0');
      if (cartTotal < minOrder) {
        return res.status(400).json({ 
          error: `Minimum order amount of ₹${minOrder} required to use this promo code` 
        });
      }

      // Calculate discount
      let discountAmount = 0;
      if (promo.discountType === 'percentage' && promo.discountValue) {
        discountAmount = (cartTotal * parseFloat(promo.discountValue)) / 100;
        if (promo.maxDiscount) {
          discountAmount = Math.min(discountAmount, parseFloat(promo.maxDiscount));
        }
      } else if (promo.discountType === 'flat' && promo.discountValue) {
        discountAmount = parseFloat(promo.discountValue);
      }

      res.json({
        valid: true,
        promoCode: {
          id: promo.id,
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountAmount: Math.round(discountAmount)
        }
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: "Failed to validate promo code" });
    }
  });

  // Get promo code usage history (admin)
  app.get("/api/admin/promo-codes/usage", async (req, res) => {
    try {
      const usage = await db
        .select({
          id: schema.promoCodeUsage.id,
          code: schema.promoCodes.code,
          userId: schema.promoCodeUsage.userId,
          orderId: schema.promoCodeUsage.orderId,
          discountAmount: schema.promoCodeUsage.discountAmount,
          createdAt: schema.promoCodeUsage.createdAt
        })
        .from(schema.promoCodeUsage)
        .leftJoin(schema.promoCodes, eq(schema.promoCodeUsage.promoCodeId, schema.promoCodes.id))
        .orderBy(desc(schema.promoCodeUsage.createdAt));

      res.json(usage);
    } catch (error) {
      console.error("Error fetching promo code usage:", error);
      res.status(500).json({ error: "Failed to fetch promo code usage" });
    }
  });

  // ==================== GIFT MILESTONES ROUTES ====================

  // Get all gift milestones
  app.get("/api/admin/gift-milestones", async (req, res) => {
    try {
      const milestones = await db
        .select()
        .from(schema.giftMilestones)
        .orderBy(asc(schema.giftMilestones.sortOrder));
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching gift milestones:", error);
      res.status(500).json({ error: "Failed to fetch gift milestones" });
    }
  });

  // Get active gift milestones (public)
  app.get("/api/gift-milestones", async (req, res) => {
    try {
      const milestones = await db
        .select()
        .from(schema.giftMilestones)
        .where(eq(schema.giftMilestones.isActive, true))
        .orderBy(asc(schema.giftMilestones.sortOrder));
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching active gift milestones:", error);
      res.status(500).json({ error: "Failed to fetch gift milestones" });
    }
  });

  // Create new gift milestone
  app.post("/api/admin/gift-milestones", async (req, res) => {
    try {
      const { minAmount, maxAmount, giftCount, giftDescription, discountType, discountValue, cashbackPercentage, isActive, sortOrder } = req.body;

      if (!minAmount || !giftCount) {
        return res.status(400).json({ error: "Minimum amount and gift count are required" });
      }

      const [milestone] = await db
        .insert(schema.giftMilestones)
        .values({
          minAmount: minAmount.toString(),
          maxAmount: maxAmount ? maxAmount.toString() : null,
          giftCount: parseInt(giftCount),
          giftDescription: giftDescription || null,
          discountType: discountType || "none",
          discountValue: discountValue ? discountValue.toString() : null,
          cashbackPercentage: cashbackPercentage ? cashbackPercentage.toString() : null,
          isActive: isActive !== false && isActive !== "false",
          sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        })
        .returning();

      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating gift milestone:", error);
      res.status(500).json({ error: "Failed to create gift milestone" });
    }
  });

  // Update gift milestone
  app.put("/api/admin/gift-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { minAmount, maxAmount, giftCount, giftDescription, discountType, discountValue, cashbackPercentage, isActive, sortOrder } = req.body;

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (minAmount) updateData.minAmount = minAmount.toString();
      if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? maxAmount.toString() : null;
      if (giftCount) updateData.giftCount = parseInt(giftCount);
      if (giftDescription !== undefined) updateData.giftDescription = giftDescription || null;
      if (discountType) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = discountValue ? discountValue.toString() : null;
      if (cashbackPercentage !== undefined) updateData.cashbackPercentage = cashbackPercentage ? cashbackPercentage.toString() : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

      const [updated] = await db
        .update(schema.giftMilestones)
        .set(updateData)
        .where(eq(schema.giftMilestones.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Gift milestone not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating gift milestone:", error);
      res.status(500).json({ error: "Failed to update gift milestone" });
    }
  });

  // Delete gift milestone
  app.delete("/api/admin/gift-milestones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(schema.giftMilestones)
        .where(eq(schema.giftMilestones.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Gift milestone not found" });
      }

      res.json({ success: true, message: "Gift milestone deleted successfully" });
    } catch (error) {
      console.error("Error deleting gift milestone:", error);
      res.status(500).json({ error: "Failed to delete gift milestone" });
    }
  });

  // ==================== END GIFT MILESTONES ROUTES ====================


  // Create new order (for checkout)
  app.post("/api/orders", async (req, res) => {
    try {
      console.log("Creating new order:", req.body);
      console.log("📍 Cookies received in order request:", (req as any).cookies);

      const { 
        userId, 
        totalAmount, 
        paymentMethod, 
        shippingAddress, 
        items,
        customerName,
        customerEmail,
        customerPhone,
        redeemAmount,
        affiliateCode,
        affiliateCommission,
        affiliateCommissionEarned,
        affiliateWalletAmount
      } = req.body;

      // If affiliate code not provided in the body, try to read from cookie set by affiliate links
      const cookieAffiliate = (req as any).cookies?.affiliate_id || (req as any).cookies?.affiliate_code || null;
      console.log("🔗 Affiliate from cookie:", cookieAffiliate, "| From body:", affiliateCode);
      const effectiveAffiliateCode = affiliateCode || cookieAffiliate || null;

      // Validation
      if (!userId || !totalAmount || !paymentMethod || !shippingAddress || !items) {
        return res.status(400).json({ error: "Missing required fields: userId, totalAmount, paymentMethod, shippingAddress, and items are required" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
      }

      // Mutual exclusion: do not allow both promo code and affiliate code/wallet redemption together
      const hasPromo = !!(req.body.promoCode || req.body.promoDiscount);
      const hasAffiliateUsage = !!(effectiveAffiliateCode || (affiliateWalletAmount && Number(affiliateWalletAmount) > 0));

      if (hasPromo && hasAffiliateUsage) {
        return res.status(400).json({ error: "Cannot use a promo code together with an affiliate code/link or affiliate wallet redemption. Remove one before placing the order." });
      }

      // Insert the order into database
      const newOrderData = {
        userId: Number(userId),
        totalAmount: Number(totalAmount),
        status: 'pending', // Default to 'pending' for COD, will be updated by webhook/payment confirmation
        paymentMethod: paymentMethod || 'Cash on Delivery',
        shippingAddress: shippingAddress,
        deliveryInstructions: req.body.deliveryInstructions || null,
        saturdayDelivery: req.body.saturdayDelivery !== undefined ? req.body.saturdayDelivery : true,
        sundayDelivery: req.body.sundayDelivery !== undefined ? req.body.sundayDelivery : true,
        affiliateCode: effectiveAffiliateCode || null,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      };

      console.log("Inserting order data:", newOrderData);

      const [newOrder] = await db.insert(ordersTable).values(newOrderData).returning();

      console.log('✅ Order created successfully:', newOrder.id);

      // Credit commission earned — prefer affiliate from link (cookie) instead of current user
      if (affiliateCommissionEarned && affiliateCommissionEarned > 0) {
        try {
          // Decide recipient: prefer affiliate from effectiveAffiliateCode (if present), otherwise current user
          let recipientUserId: number | null = null;
          if (effectiveAffiliateCode && typeof effectiveAffiliateCode === 'string' && effectiveAffiliateCode.startsWith('POPPIKAP')) {
            const parsed = parseInt(effectiveAffiliateCode.replace('POPPIKAP', ''));
            if (!isNaN(parsed)) recipientUserId = parsed;
          }
          if (recipientUserId === null) recipientUserId = Number(userId);

          console.log(`🔍 Crediting affiliate commission ₹${affiliateCommissionEarned} to user ${recipientUserId} (source order by user ${userId})`);

          // Get or create affiliate wallet for recipient
          let userWallet = await db
            .select()
            .from(schema.affiliateWallet)
            .where(eq(schema.affiliateWallet.userId, Number(recipientUserId)))
            .limit(1);

          if (userWallet.length === 0) {
            console.log(`📝 Creating new affiliate wallet for user ${recipientUserId}`);
            const [newWallet] = await db.insert(schema.affiliateWallet).values({
              userId: Number(recipientUserId),
              cashbackBalance: "0.00",
              commissionBalance: affiliateCommissionEarned.toFixed(2),
              totalEarnings: affiliateCommissionEarned.toFixed(2),
              totalWithdrawn: "0.00",
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning();
            console.log(`✅ Affiliate wallet created for user ${recipientUserId} with commission: ₹${affiliateCommissionEarned.toFixed(2)}`, newWallet);
          } else {
            console.log(`📝 Updating existing affiliate wallet for user ${recipientUserId}`);
            const currentCommission = parseFloat(userWallet[0].commissionBalance || '0');
            const currentEarnings = parseFloat(userWallet[0].totalEarnings || '0');
            const newCommission = currentCommission + Number(affiliateCommissionEarned);
            const newEarnings = currentEarnings + Number(affiliateCommissionEarned);

            console.log(`Current commission: ₹${currentCommission}, Adding: ₹${affiliateCommissionEarned}, New total: ₹${newCommission}`);

            const [updatedWallet] = await db.update(schema.affiliateWallet)
              .set({
                commissionBalance: newCommission.toFixed(2),
                totalEarnings: newEarnings.toFixed(2),
                updatedAt: new Date()
              })
              .where(eq(schema.affiliateWallet.userId, Number(recipientUserId)))
              .returning();

            console.log(`✅ Affiliate wallet updated for user ${recipientUserId}: Commission ₹${newCommission.toFixed(2)}, Total Earnings ₹${newEarnings.toFixed(2)}`, updatedWallet);
          }

          // Add transaction record for earned commission
          const [txRecord] = await db.insert(schema.affiliateTransactions).values({
            userId: Number(recipientUserId),
            orderId: newOrder.id,
            type: 'commission',
            amount: affiliateCommissionEarned.toFixed(2),
            balanceType: 'commission',
            description: `Commission credited from order ORD-${newOrder.id.toString().padStart(3, '0')}`,
            status: 'completed',
            transactionId: null,
            notes: null,
            processedAt: new Date(),
            createdAt: new Date()
          }).returning();

          console.log(`✅ Commission credit recorded: ₹${affiliateCommissionEarned.toFixed(2)} to user ${recipientUserId} for order ${newOrder.id}`, txRecord);
        } catch (commissionError) {
          console.error(`❌ Error processing affiliate commission earned:`, commissionError);
          // Continue with order creation even if commission credit fails
        }
      } else {
        console.log(`⏭️ No affiliate commission earned to process (affiliateCommissionEarned: ${affiliateCommissionEarned})`);
      }

      // Process affiliate commission for COD orders
      if (effectiveAffiliateCode && effectiveAffiliateCode.startsWith('POPPIKAP') && paymentMethod === 'Cash on Delivery') {
        const affiliateUserId = parseInt(effectiveAffiliateCode.replace('POPPIKAP', ''));

        console.log(`🔍 Processing affiliate commission for COD order: ${affiliateCode}, userId: ${affiliateUserId}`);

        if (!isNaN(affiliateUserId)) {
          try {
            // Verify affiliate exists and is approved
            const affiliateApp = await db
              .select()
              .from(schema.affiliateApplications)
              .where(and(
                eq(schema.affiliateApplications.userId, affiliateUserId),
                eq(schema.affiliateApplications.status, 'approved')
              ))
              .limit(1);

            if (affiliateApp && affiliateApp.length > 0) {
              // Use the affiliateCommission value passed from checkout instead of recalculating
              const calculatedCommission = affiliateCommission || 0;
              const commissionRate = calculatedCommission > 0 && Number(totalAmount) > 0 
                ? ((calculatedCommission / Number(totalAmount)) * 100).toFixed(2)
                : '0.00';

              console.log(`💰 Using commission from checkout: ₹${calculatedCommission.toFixed(2)} (${commissionRate}%)`);

              if (calculatedCommission > 0) {
                // Get or create affiliate wallet
                let wallet = await db
                  .select()
                  .from(schema.affiliateWallet)
                  .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                  .limit(1);

                if (wallet.length === 0) {
                  console.log(`📝 Creating new wallet for affiliate ${affiliateUserId}`);
                  await db.insert(schema.affiliateWallet).values({
                    userId: affiliateUserId,
                    cashbackBalance: "0.00",
                    commissionBalance: calculatedCommission.toFixed(2),
                    totalEarnings: calculatedCommission.toFixed(2),
                    totalWithdrawn: "0.00"
                  });
                  console.log(`✅ Wallet created for affiliate ${affiliateUserId} with commission: ₹${calculatedCommission.toFixed(2)}`);
                } else {
                  console.log(`📝 Updating existing wallet for affiliate ${affiliateUserId}`);
                  const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
                  const currentEarnings = parseFloat(wallet[0].totalEarnings || '0');
                  const newCommission = currentCommission + calculatedCommission;
                  const newEarnings = currentEarnings + calculatedCommission;

                  console.log(`Current commission: ₹${currentCommission}, Adding: ₹${calculatedCommission}, New total: ₹${newCommission}`);

                  await db.update(schema.affiliateWallet)
                    .set({
                      commissionBalance: newCommission.toFixed(2),
                      totalEarnings: newEarnings.toFixed(2),
                      updatedAt: new Date()
                    })
                    .where(eq(schema.affiliateWallet.userId, affiliateUserId));

                  console.log(`✅ Wallet updated for affiliate ${affiliateUserId}: Commission ₹${newCommission.toFixed(2)}, Total Earnings ₹${newEarnings.toFixed(2)}`);
                }
              }

              // Record affiliate sale
              await db.insert(schema.affiliateSales).values({
                affiliateUserId,
                affiliateCode: effectiveAffiliateCode,
                orderId: newOrder.id,
                customerId: Number(userId),
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone || null,
                productName: items.map((item: any) => item.productName || item.name).join(', '),
                saleAmount: Number(totalAmount).toFixed(2),
                commissionAmount: calculatedCommission.toFixed(2),
                commissionRate: commissionRate,
                status: 'confirmed'
              });

              // Add transaction record
              await db.insert(schema.affiliateTransactions).values({
                userId: affiliateUserId,
                orderId: newOrder.id,
                type: 'commission',
                amount: calculatedCommission.toFixed(2),
                balanceType: 'commission',
                description: `Commission (${commissionRate}%) from COD order ORD-${newOrder.id.toString().padStart(3, '0')}`,
                status: 'completed',
                transactionId: null,
                notes: null,
                processedAt: new Date(),
                createdAt: new Date()
              });

              console.log(`✅ Affiliate commission credited: ₹${calculatedCommission.toFixed(2)} (${commissionRate}%) to affiliate ${affiliateUserId} for COD order ${newOrder.id}`);
            } else {
              console.error(`❌ Affiliate not found or not approved for user ${affiliateUserId}`);
            }
          } catch (affiliateError) {
            console.error(`❌ Error processing affiliate commission for COD:`, affiliateError);
            // Continue with order creation even if affiliate is invalid
          }
        }
      }

      // Create order items in separate table
      if (items && Array.isArray(items)) {
        const orderItems = [];

        for (const item of items) {
          const orderItem: any = {
            orderId: newOrder.id,
            productName: item.productName || item.name,
            productImage: item.productImage || item.image,
            quantity: Number(item.quantity),
            price: item.price,
            cashbackPrice: item.cashbackPrice || null,
            cashbackPercentage: item.cashbackPercentage || null,
            // Offer tracking - save complete details
            offerId: item.offerId || null,
            offerTitle: item.offerTitle || null,
            originalPrice: item.originalPrice || null,
            discountType: item.discountType || null,
            discountValue: item.discountValue ? String(item.discountValue) : null,
            discountAmount: item.discountAmount ? String(item.discountAmount) : null,
          };

          // Determine if this is a combo or regular product
          if (item.isCombo === true || item.type === 'combo' || item.comboId) {
            // This is a combo, set productId to null
            orderItem.productId = null;
          } else if (item.productId && !isNaN(Number(item.productId))) {
            // Verify product exists before adding
            try {
              const productExists = await db
                .select({ id: schema.products.id })
                .from(schema.products)
                .where(eq(schema.products.id, Number(item.productId)))
                .limit(1);

              if (productExists && productExists.length > 0) {
                orderItem.productId = Number(item.productId);
              } else {
                // Product doesn't exist, set to null
                console.warn(`Product ${item.productId} not found, setting productId to null`);
                orderItem.productId = null;
              }
            } catch (error) {
              console.error(`Error checking product ${item.productId}:`, error);
              orderItem.productId = null;
            }
          } else {
            // No valid productId, set to null
            orderItem.productId = null;
          }

          orderItems.push(orderItem);
        }

        await db.insert(schema.orderItemsTable).values(orderItems);
      }

      // Add cashback to user's wallet for items that have cashback
      if (items && Array.isArray(items)) {
        let totalCashback = 0;
        const cashbackItems = [];

        for (const item of items) {
          if (item.cashbackPrice && item.cashbackPercentage) {
            const cashbackAmount = Number(item.cashbackPrice) * item.quantity;
            totalCashback += cashbackAmount;
            cashbackItems.push({
              name: item.productName,
              amount: cashbackAmount
            });
          }
        }

        if (totalCashback > 0) {
          // Get or create wallet
          const existingWallet = await db
            .select()
            .from(schema.userWallet)
            .where(eq(schema.userWallet.userId, parseInt(userId)));

          if (existingWallet.length === 0) {
            // Create new wallet with cashback
            await db.insert(schema.userWallet).values({
              userId: parseInt(userId),
              cashbackBalance: "0.00",
              totalEarned: "0.00",
              totalRedeemed: "0.00"
            });

            console.log(`Created new wallet for user ${userId} with ₹${totalCashback.toFixed(2)} cashback`);
          } else {
            // Update existing wallet
            const currentBalance = parseFloat(existingWallet[0].cashbackBalance || '0');
            const currentEarned = parseFloat(existingWallet[0].totalEarned || '0');

            await db.update(schema.userWallet)
              .set({
                cashbackBalance: (currentBalance + totalCashback).toFixed(2),
                totalEarned: (currentEarned + totalCashback).toFixed(2),
                updatedAt: new Date()
              })
              .where(eq(schema.userWallet.userId, parseInt(userId)));

            console.log(`Updated wallet for user ${userId}: Added ₹${totalCashback.toFixed(2)} cashback`);
          }

          // Create individual cashback transactions for each item
          for (const cashbackItem of cashbackItems) {
            // Get current balance for transaction record
            const walletForBalance = await db
              .select()
              .from(schema.userWallet)
              .where(eq(schema.userWallet.userId, parseInt(userId)))
              .limit(1);

            const balanceBefore = parseFloat(walletForBalance[0].cashbackBalance || '0') - cashbackItem.amount;
            const balanceAfter = parseFloat(walletForBalance[0].cashbackBalance || '0');

            await db.insert(schema.userWalletTransactions).values({
              userId: parseInt(userId),
              orderId: newOrder.id,
              type: 'credit',
              amount: cashbackItem.amount.toFixed(2),
              description: `Cashback from ${cashbackItem.name}`,
              balanceBefore: balanceBefore.toFixed(2),
              balanceAfter: balanceAfter.toFixed(2),
              status: 'completed'
            });

            console.log(`Added cashback transaction: ₹${cashbackItem.amount.toFixed(2)} for ${cashbackItem.name}`);
          }

          console.log(`Total cashback credited: ₹${totalCashback.toFixed(2)} from ${cashbackItems.length} items`);
        }
      }

      // Track promo code usage if promo code was used
      if (req.body.promoCode && req.body.promoDiscount) {
        try {
          const promoCodeData = await db
            .select()
            .from(schema.promoCodes)
            .where(eq(schema.promoCodes.code, req.body.promoCode.toUpperCase()))
            .limit(1);

          if (promoCodeData.length > 0) {
            const promo = promoCodeData[0];

            // Record promo code usage
            await db.insert(schema.promoCodeUsage).values({
              promoCodeId: promo.id,
              userId: parseInt(userId),
              orderId: newOrder.id,
              discountAmount: req.body.promoDiscount.toString()
            });

            // Increment usage count
            await db.update(schema.promoCodes)
              .set({
                usageCount: sql`${schema.promoCodes.usageCount} + 1`,
                updatedAt: new Date()
              })
              .where(eq(schema.promoCodes.id, promo.id));

            console.log(`Promo code ${req.body.promoCode} used. Total uses: ${promo.usageCount + 1}`);
          }
        } catch (promoError) {
          console.error('Error tracking promo code usage:', promoError);
          // Continue even if promo tracking fails
        }
      }

      // Deduct affiliate wallet amount if used (for both COD and Cashfree)
      if (affiliateWalletAmount > 0 && userId) {
        try {
          console.log(`🔍 Deducting ₹${affiliateWalletAmount} from affiliate wallet for user ${userId}`);

          // Get affiliate wallet
          const wallet = await db
            .select()
            .from(schema.affiliateWallet)
            .where(eq(schema.affiliateWallet.userId, parseInt(userId)))
            .limit(1);

          if (wallet && wallet.length > 0) {
            const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
            const currentWithdrawn = parseFloat(wallet[0].totalWithdrawn || '0');

            // Update wallet balance
            await db.update(schema.affiliateWallet)
              .set({
                commissionBalance: Math.max(0, currentCommission - affiliateWalletAmount).toFixed(2),
                totalWithdrawn: (currentWithdrawn + affiliateWalletAmount).toFixed(2),
                updatedAt: new Date()
              })
              .where(eq(schema.affiliateWallet.userId, parseInt(userId)));

            // Create transaction record for wallet deduction
            await db.insert(schema.affiliateTransactions).values({
              userId: parseInt(userId),
              orderId: newOrder.id,
              type: 'withdrawal',
              amount: affiliateWalletAmount.toFixed(2),
              balanceType: commissionBalance >= affiliateWalletAmount ? 'commission' : 'mixed',
              description: `Commission balance used for order ORD-${newOrder.id.toString().padStart(3, '0')}`,
              status: 'completed',
              processedAt: new Date(),
              createdAt: new Date()
            });

            console.log(`✅ Affiliate wallet deducted: ₹${affiliateWalletAmount} for order ${newOrder.id}, transaction recorded`);
          } else {
            console.error(`❌ Affiliate wallet not found for user ${userId}`);
          }
        } catch (walletError) {
          console.error(`❌ Error deducting affiliate wallet:`, walletError);
          // Continue with order creation even if wallet deduction fails
        }
      }

      // Credit affiliate commission to wallet if affiliate code was used
      if (affiliateCode && affiliateCode.startsWith('POPPIKAP') && paymentMethod !== 'Cash on Delivery') {
        const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));

        console.log(`🔍 Processing affiliate commission for code: ${affiliateCode}, userId: ${affiliateUserId}`);

        if (!isNaN(affiliateUserId)) {
          try {
            // Verify affiliate exists and is approved
            const affiliateApp = await db
              .select()
              .from(schema.affiliateApplications)
              .where(and(
                eq(schema.affiliateApplications.userId, affiliateUserId),
                eq(schema.affiliateApplications.status, 'approved')
              ))
              .limit(1);

            if (!affiliateApp || affiliateApp.length === 0) {
              console.error(`❌ Affiliate application not found or not approved for user ${affiliateUserId}`);
              // Continue with order creation even if affiliate is invalid
            } else {
              // Use affiliateCommission from request body if provided, otherwise calculate from items
              let calculatedCommission = affiliateCommission ? Number(affiliateCommission) : 0;
              
              if (calculatedCommission === 0 && items && Array.isArray(items)) {
                calculatedCommission = items.reduce((sum: number, item: any) => {
                  const itemAffiliateCommission = item.affiliateCommission || 0;
                  const itemPrice = parseInt(item.price?.replace(/[₹,]/g, "") || "0");
                  const itemTotal = itemPrice * (item.quantity || 1);
                  return sum + (itemTotal * itemAffiliateCommission) / 100;
                }, 0);
              }
              
              const commissionRate = calculatedCommission > 0 && Number(totalAmount) > 0 
                ? (calculatedCommission / Number(totalAmount)) * 100 
                : 0;

              console.log(`💰 Commission to credit: ₹${calculatedCommission.toFixed(2)} (${commissionRate}% of ₹${totalAmount})`);

              // Get or create affiliate wallet
              let wallet = await db
                .select()
                .from(schema.affiliateWallet)
                .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                .limit(1);

              if (wallet.length === 0) {
                console.log(`📝 Creating new wallet for affiliate ${affiliateUserId}`);
                // Create wallet
                const [newWallet] = await db.insert(schema.affiliateWallet).values({
                  userId: affiliateUserId,
                  cashbackBalance: "0.00",
                  commissionBalance: calculatedCommission.toFixed(2),
                  totalEarnings: calculatedCommission.toFixed(2),
                  totalWithdrawn: "0.00"
                }).returning();

                console.log(`✅ Wallet created:`, newWallet);
              } else {
                console.log(`📝 Updating existing wallet for affiliate ${affiliateUserId}`);
                // Update wallet
                const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
                const currentEarnings = parseFloat(wallet[0].totalEarnings || '0');

                const [updatedWallet] = await db.update(schema.affiliateWallet)
                  .set({
                    commissionBalance: (currentCommission + calculatedCommission).toFixed(2),
                    totalEarnings: (currentEarnings + calculatedCommission).toFixed(2),
                    updatedAt: new Date()
                  })
                  .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                  .returning();

                console.log(`✅ Wallet updated:`, updatedWallet);
              }

              // Get user details for sale record
              const orderUser = await db
                .select({
                  firstName: schema.users.firstName,
                  lastName: schema.users.lastName,
                  email: schema.users.email,
                  phone: schema.users.phone,
                })
                .from(schema.users)
                .where(eq(schema.users.id, Number(userId)))
                .limit(1);

              const userData = orderUser[0] || { firstName: 'Customer', lastName: '', email: 'customer@email.com', phone: null };

              // Record affiliate sale in database
              const [saleRecord] = await db.insert(schema.affiliateSales).values({
                affiliateUserId,
                affiliateCode,
                orderId: newOrder.id,
                customerId: Number(userId),
                customerName: customerName || `${userData.firstName} ${userData.lastName}`,
                customerEmail: customerEmail || userData.email,
                customerPhone: customerPhone || userData.phone || null,
                productName: items.map((item: any) => item.productName || item.name).join(', '),
                saleAmount: Number(totalAmount).toFixed(2),
                commissionAmount: calculatedCommission.toFixed(2),
                commissionRate: commissionRate.toFixed(2),
                status: 'confirmed'
              }).returning();

              console.log(`✅ Sale record created:`, saleRecord);

              // Add transaction record
              const [transactionRecord] = await db.insert(schema.affiliateTransactions).values({
                userId: affiliateUserId,
                orderId: newOrder.id,
                type: 'commission',
                amount: calculatedCommission.toFixed(2),
                balanceType: 'commission',
                description: `Commission (${commissionRate}%) from order ORD-${newOrder.id.toString().padStart(3, '0')}`,
                status: 'completed',
                transactionId: null,
                notes: null,
                processedAt: new Date(),
                createdAt: new Date()
              }).returning();

              console.log(`✅ Transaction record created:`, transactionRecord);

              console.log(`✅ Affiliate commission credited: ₹${calculatedCommission.toFixed(2)} (${commissionRate}%) to affiliate ${affiliateUserId} for order ${newOrder.id}`);
            }
          } catch (affiliateError) {
            console.error(`❌ Error processing affiliate commission:`, affiliateError);
            // Continue with order creation even if affiliate tracking fails
          }
        } else {
          console.error(`❌ Invalid affiliate user ID from code: ${affiliateCode}`);
        }
      }

      // Credit affiliateCommissionEarned to affiliate wallet if provided
      if (affiliateCommissionEarned && Number(affiliateCommissionEarned) > 0 && affiliateCode && affiliateCode.startsWith('POPPIKAP')) {
        const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));
        const commissionAmount = Number(affiliateCommissionEarned);

        console.log(`💳 Processing affiliateCommissionEarned: ₹${commissionAmount} for affiliate ${affiliateUserId}`);

        if (!isNaN(affiliateUserId)) {
          try {
            // Get or create affiliate wallet
            let wallet = await db
              .select()
              .from(schema.affiliateWallet)
              .where(eq(schema.affiliateWallet.userId, affiliateUserId))
              .limit(1);

            if (wallet.length === 0) {
              console.log(`📝 Creating new wallet for affiliate ${affiliateUserId}`);
              // Create wallet
              const [newWallet] = await db.insert(schema.affiliateWallet).values({
                userId: affiliateUserId,
                cashbackBalance: "0.00",
                commissionBalance: commissionAmount.toFixed(2),
                totalEarnings: commissionAmount.toFixed(2),
                totalWithdrawn: "0.00"
              }).returning();

              console.log(`✅ Wallet created with commission:`, newWallet);
            } else {
              console.log(`📝 Updating existing wallet for affiliate ${affiliateUserId}`);
              // Update wallet
              const currentCommission = parseFloat(wallet[0].commissionBalance || '0');
              const currentEarnings = parseFloat(wallet[0].totalEarnings || '0');

              const [updatedWallet] = await db.update(schema.affiliateWallet)
                .set({
                  commissionBalance: (currentCommission + commissionAmount).toFixed(2),
                  totalEarnings: (currentEarnings + commissionAmount).toFixed(2),
                  updatedAt: new Date()
                })
                .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                .returning();

              console.log(`✅ Wallet updated with commission:`, updatedWallet);
            }

            // Create transaction record for this commission
            await db.insert(schema.affiliateTransactions).values({
              userId: affiliateUserId,
              orderId: newOrder.id,
              type: 'commission',
              amount: commissionAmount.toFixed(2),
              balanceType: 'commission',
              description: `Commission earned from order ${orderId}`,
              status: 'completed',
              processedAt: new Date(),
              createdAt: new Date()
            });

            console.log(`✅ Affiliate commission earned credited: ₹${commissionAmount.toFixed(2)} to affiliate ${affiliateUserId}`);
          } catch (error) {
            console.error(`❌ Error crediting affiliateCommissionEarned:`, error);
            // Continue with order creation even if this fails
          }
        }
      }

      const orderId = `ORD-${newOrder.id.toString().padStart(3, '0')}`;

      // Always try to create Shiprocket order for all new orders
      let shiprocketOrderId = null;
      let shiprocketAwb = null;
      let shiprocketError = null;

      // Check if Shiprocket is configured
      if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
        try {
          console.log('Starting Shiprocket order creation for:', orderId);

          // Get user details from database
          const user = await db
            .select({
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              email: schema.users.email,
              phone: schema.users.phone,
            })
            .from(schema.users)
            .where(eq(schema.users.id, Number(userId)))
            .limit(1);

          let customerData = {
            firstName: customerName?.split(' ')[0] || 'Customer',
            lastName: customerName?.split(' ').slice(1).join(' ') || 'Name',
            email: customerEmail || 'customer@example.com',
            phone: customerPhone || '9999999999'
          };

          if (user.length > 0) {
            customerData = {
              firstName: user[0].firstName || customerData.firstName,
              lastName: user[0].lastName || customerData.lastName,
              email: user[0].email || customerData.email,
              phone: user[0].phone || customerData.phone
            };
          }

          console.log('Customer data for Shiprocket:', customerData);
          console.log('Full shipping address:', shippingAddress);

          // Prepare Shiprocket order with correct pickup location
          const shiprocketOrderData = shiprocketService.convertToShiprocketFormat({
            id: orderId,
            createdAt: newOrder.createdAt,
            totalAmount: Number(totalAmount),
            paymentMethod: paymentMethod,
            shippingAddress: shippingAddress,
            items: items,
            customer: customerData
          }, "Office"); // Use "Office" as pickup location instead of "Primary"

          console.log('Shiprocket order payload:', JSON.stringify(shiprocketOrderData, null, 2));

          // Create order on Shiprocket
          const shiprocketResponse = await shiprocketService.createOrder(shiprocketOrderData);
          console.log('Shiprocket API response:', JSON.stringify(shiprocketResponse, null, 2));

          if (shiprocketResponse && shiprocketResponse.order_id) {
            shiprocketOrderId = shiprocketResponse.order_id;
            shiprocketAwb = shiprocketResponse.awb_code || shiprocketResponse.shipment_id || null;

            console.log(`Shiprocket order created: ${shiprocketOrderId} with AWB: ${shiprocketAwb || 'Pending'}`);

            // Update order with Shiprocket details immediately
            await db.update(schema.ordersTable)
              .set({
                shiprocketOrderId: shiprocketOrderId,
                shiprocketShipmentId: shiprocketAwb,
                status: 'processing' // Set status to processing since it's now with Shiprocket
              })
              .where(eq(schema.ordersTable.id, newOrder.id));

            console.log(`Database updated with Shiprocket details for order ${orderId}`);
          } else {
            shiprocketError = 'Invalid Shiprocket response - no order_id';
            console.error('Shiprocket response missing order_id:', shiprocketResponse);
          }
        } catch (shiprocketErrorCatch) {
          shiprocketError = shiprocketErrorCatch.message;
          console.error('Shiprocket order creation failed:', {
            orderId: orderId,
            error: shiprocketErrorCatch.message,
            stack: shiprocketErrorCatch.stack
          });

          // Save error to database for debugging
          await db.update(schema.ordersTable)
            .set({
              notes: `Shiprocket Error: ${shiprocketErrorCatch.message}`
            })
            .where(eq(schema.ordersTable.id, newOrder.id));
        }
      } else {
        shiprocketError = 'Shiprocket credentials not configured';
        console.warn('Shiprocket not configured - skipping integration');
      }

      // Send order notification email to info@poppik.in
      await sendOrderNotificationEmail({
        orderId: orderId,
        customerName: customerName || `${user[0]?.firstName || ''} ${user[0]?.lastName || ''}`.trim(),
        customerEmail: customerEmail || user[0]?.email || 'customer@example.com',
        customerPhone: customerPhone || user[0]?.phone,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        items: items.map((item: any) => ({
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: item.price
        }))
      });

      res.json({
        success: true,
        message: "Order placed successfully",
        orderId: orderId,
        shiprocketIntegrated: !!shiprocketOrderId,
        shiprocketOrderId: shiprocketOrderId,
        shiprocketError: shiprocketError,
        order: {
          id: orderId,
          ...newOrder,
          shiprocketOrderId: shiprocketOrderId || null,
          shiprocketShipmentId: shiprocketAwb || null
        }
      });

    } catch (error) {
      console.error("Order creation error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      res.status(500).json({
        error: "Failed to create order",
        details: error.message || "Unknown error occurred"
      });
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
        .update(schema.ordersTable)
        .set(updateData)
        .where(eq(schema.ordersTable.id, Number(orderId)));

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
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.id, Number(orderId)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData = order[0];

      // Generate tracking timeline based on order status
      const trackingTimeline = generateTrackingTimeline(orderData.status, new Date(orderData.createdAt), orderData.estimatedDelivery);

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

    // Handle cancelled orders
    if (status === 'cancelled') {
      timeline.push({
        step: "Order Cancelled",
        status: "completed",
        date: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 hours later
        time: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: "Your order has been cancelled. If you have any questions, please contact our support team."
      });
      return timeline;
    }

    if (status === 'confirmed') {
      timeline.push({
        step: "Order Confirmed",
        status: "completed",
        date: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 hours later
        time: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: "Your order has been confirmed and is being prepared"
      });
      timeline.push({
        step: "Processing",
        status: "pending",
        date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: "Expected by 10:00 AM",
        description: "Your order will be processed and shipped soon"
      });
    } else if (status === 'processing' || status === 'shipped' || status === 'delivered') {
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
      case 'confirmed': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return 1; // Show cancelled at step 1
      default: return 0;
    }
  }

  // Shiprocket serviceability endpoint for shipping cost
  app.get("/api/shiprocket/serviceability", async (req, res) => {
    try {
      const { deliveryPincode, weight, cod } = req.query;

      if (!deliveryPincode || !weight) {
        return res.status(400).json({
          error: "Missing required parameters: deliveryPincode and weight"
        });
      }

      const shiprocketService = new ShiprocketService();

      // Default pickup pincode (you should set this in env or get from settings)
      const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "400001";

      try {
        const serviceability = await shiprocketService.getServiceability(
          pickupPincode,
          deliveryPincode as string,
          Number(weight),
          cod === 'true'
        );

        // Check if we got valid data from Shiprocket
        if (serviceability && serviceability.data && serviceability.data.available_courier_companies) {
          res.json(serviceability);
        } else {
          // Return fallback if no courier companies available
          console.warn("No courier companies available from Shiprocket, using fallback");
          res.json({
            data: {
              available_courier_companies: [{
                courier_company_id: 0,
                courier_name: "Standard Shipping",
                freight_charge: 99,
                cod_charges: cod === 'true' ? 20 : 0,
                estimated_delivery_days: "5-7",
                rate: 99
              }]
            },
            fallback: true,
            message: "Using default shipping rates"
          });
        }
      } catch (shiprocketError) {
        // If Shiprocket fails, return a fallback response with default shipping
        console.warn("Shiprocket serviceability check failed, using fallback:", shiprocketError);

        res.json({
          data: {
            available_courier_companies: [{
              courier_company_id: 0,
              courier_name: "Standard Shipping",
              freight_charge: 99,
              cod_charges: cod === 'true' ? 20 : 0,
              estimated_delivery_days: "5-7",
              rate: 99
            }]
          },
          fallback: true,
          message: "Using default shipping rates"
        });
      }
    } catch (error) {
      console.error("Error checking Shiprocket serviceability:", error);
      res.status(500).json({
        error: "Failed to check shipping serviceability",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Shiprocket tracking endpoint
  app.get("/api/orders/:orderId/track-shiprocket", async (req, res) => {
    try {
      const orderId = req.params.orderId.replace('ORD-', '');

      // Extract numeric ID from order ID (e.g., "ORD-001" -> 1)
      const numericId = parseInt(orderId.replace(/\D/g, ''));

      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid order ID format" });
      }

      // Fetch order from database
      const result = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [numericId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData = result.rows[0];

      // Check if order has Shiprocket integration
      if (!orderData.shiprocket_order_id) {
        // Generate basic timeline for non-Shiprocket orders
        const basicTimeline = generateTrackingTimeline(orderData.status, new Date(orderData.created_at), orderData.estimated_delivery);

        return res.json({
          error: "This order is not shipped through Shiprocket",
          hasShiprocketTracking: false,
          orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
          status: orderData.status,
          trackingNumber: orderData.tracking_number,
          estimatedDelivery: orderData.estimated_delivery?.toISOString().split('T')[0],
          timeline: basicTimeline,
          realTimeTracking: false,
          totalAmount: orderData.total_amount,
          shippingAddress: orderData.shipping_address,
          createdAt: orderData.created_at.toISOString().split('T')[0]
        });
      }

      // Check if Shiprocket is configured
      if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
        // Fallback to basic tracking if Shiprocket not configured
        const basicTimeline = generateTrackingTimeline(orderData.status, new Date(orderData.created_at), orderData.estimated_delivery);

        res.json({
          orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
          shiprocketOrderId: orderData.shiprocket_order_id,
          status: orderData.status,
          trackingNumber: orderData.tracking_number,
          estimatedDelivery: orderData.estimated_delivery?.toISOString().split('T')[0],
          timeline: basicTimeline,
          realTimeTracking: false,
          totalAmount: orderData.total_amount,
          shippingAddress: orderData.shipping_address,
          createdAt: orderData.created_at.toISOString().split('T')[0],
          hasShiprocketTracking: true,
          configured: true,
          error: "Unable to fetch real-time tracking data from Shiprocket. Using standard tracking."
        });
      } else {
        // Fetch real-time tracking from Shiprocket
        try {
          const trackingDetails = await shiprocketService.getTrackingDetails(orderData.shiprocket_order_id);
          console.log("Shiprocket tracking details:", JSON.stringify(trackingDetails, null, 2));

          // Extract necessary information and format timeline
          const timeline = trackingDetails.tracking_data?.track?.map((track: any) => ({
            step: track.description,
            status: track.status, // Assuming Shiprocket status maps directly
            date: new Date(track.shipment_date).toLocaleDateString('en-IN'),
            time: new Date(track.shipment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            description: track.location || track.status // Use location if available, otherwise status
          })) || [];

          // Ensure 'Order Placed' is the first step if not present
          if (timeline.length === 0 || timeline[0].step !== 'Order Placed') {
            timeline.unshift({
              step: "Order Placed",
              status: "completed",
              date: new Date(orderData.created_at).toLocaleDateString('en-IN'),
              time: new Date(orderData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              description: "Your order has been placed successfully"
            });
          }

          // Ensure 'Delivered' status is handled correctly
          let finalStatus = orderData.status;
          if (trackingDetails.tracking_data?.track?.some((t: any) => t.status === 'Delivered')) {
            finalStatus = 'delivered';
          } else if (trackingDetails.tracking_data?.track?.some((t: any) => t.status === 'Shipped')) {
            finalStatus = 'shipped';
          } else if (trackingDetails.tracking_data?.track?.some((t: any) => t.status === 'Out For Delivery')) {
            finalStatus = 'shipped'; // Map 'Out For Delivery' to 'shipped' for simplicity
          }

          res.json({
            orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
            shiprocketOrderId: orderData.shiprocket_order_id,
            status: finalStatus,
            trackingNumber: trackingDetails.tracking_number || orderData.tracking_number,
            estimatedDelivery: orderData.estimated_delivery?.toISOString().split('T')[0],
            timeline: timeline,
            currentStep: getCurrentStep(finalStatus),
            totalAmount: orderData.total_amount,
            shippingAddress: orderData.shipping_address,
            createdAt: orderData.created_at.toISOString().split('T')[0],
            hasShiprocketTracking: true,
            realTimeTracking: true
          });

        } catch (shiprocketTrackingError) {
          console.error("Error fetching Shiprocket tracking details:", shiprocketTrackingError);
          // Fallback to basic timeline if Shiprocket API fails
          const basicTimeline = generateTrackingTimeline(orderData.status, new Date(orderData.created_at), orderData.estimated_delivery);
          res.json({
            orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
            shiprocketOrderId: orderData.shiprocket_order_id,
            status: orderData.status,
            trackingNumber: orderData.tracking_number,
            estimatedDelivery: orderData.estimated_delivery?.toISOString().split('T')[0],
            timeline: basicTimeline,
            currentStep: getCurrentStep(orderData.status),
            totalAmount: orderData.total_amount,
            shippingAddress: orderData.shipping_address,
            createdAt: orderData.created_at.toISOString().split('T')[0],
            hasShiprocketTracking: true,
            realTimeTracking: false,
            error: "Failed to fetch real-time tracking from Shiprocket. Displaying standard tracking."
          });
        }
      }
    } catch (error) {
      console.error("Error fetching Shiprocket tracking:", error);
      res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });

  // Generate sample orders for development
  function generateSampleOrders() {
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
        items: orderItems.length,
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

    ];
  }

  // Generate sample subcategories for a specific category
  function generateSampleSubcategoriesForCategory(categorySlug: string) {
    const allSubcategories = generateSampleSubcategories();

    // Map category slugs to subcategories
    const categorySubcategoryMap: Record<string, string[]> = {

    };

    const subcategorySlugs = categorySubcategoryMap[categorySlug] || [];
    return allSubcategories.filter(sub => subcategorySlugs.includes(sub.slug));
  }



  // Blog API Routes

  // Like/Unlike blog post
  app.post("/api/blog/posts/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const postId = parseInt(id);

      // Simple implementation without separate likes table for now
      const db = require('./storage').getDb();
      const post = await db.select().from(require('../shared/schema').blogPosts)
        .where(require('drizzle-orm').eq(require('../shared/schema').blogPosts.id, postId))
        .limit(1);

      if (!post || post.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // For simplicity, just increment/decrement likes count
      // In a real app, you'd track individual user likes
      const currentLikes = post[0].likes || 0;
      const newLikes = currentLikes + 1;

      await db.update(require('../shared/schema').blogPosts)
        .set({ likes: newLikes })
        .where(require('drizzle-orm').eq(require('../shared/schema').blogPosts.id, postId));

      res.json({
        liked: true,
        likesCount: newLikes
      });
    } catch (error) {
      console.error("Error toggling blog post like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Add comment to blog post
  app.post("/api/blog/posts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, content } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const postId = parseInt(id);

      // Get user details
      const user = await db.select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName
      }).from(schema.users).where(eq(schema.users.id, parseInt(userId))).limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const comment = {
        id: Date.now(),
        author: `${user[0].firstName} ${user[0].lastName}`,
        content: content.trim(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        userId: parseInt(userId)
      };

      // Update post comment count
      await db.update(schema.blogPosts)
        .set({ comments: sql`${schema.blogPosts.comments} + 1` })
        .where(eq(schema.blogPosts.id, postId));

      res.json({
        success: true,
        comment,
        message: "Comment added successfully"
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Get comments for blog post
  app.get("/api/blog/posts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;

      // For now, return empty array since we don't have persistent comment storage
      // In a real app, you'd fetch from a comments table
      res.json([]);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

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
      res.status(500).json({ error: "Failed to fetch blog posts" });
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
        tags: typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : (post.tags || [])
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
      // Return default categories when database is unavailable
      res.json([
        { id: 1, name: "Skincare", slug: "skincare", description: "All about skincare", isActive: true, sortOrder: 1 },
        { id: 2, name: "Makeup", slug: "makeup", description: "All about makeup", isActive        : true, sortOrder: 2 },
        { id: 3, name: "Haircare", slug: "haircare", description: "All about haircare", isActive: true, sortOrder: 3 }
      ]);
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
    { name: 'video', maxCount: 1 },
    { name: 'contentVideos', maxCount: 10 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let imageUrl = req.body.imageUrl;
      let videoUrl = req.body.videoUrl;
      const contentVideoUrls: string[] = [];

      // Handle image upload
      if (files?.image?.[0]) {
        imageUrl = `/api/images/${files.image[0].filename}`;
      }

      // Handle video upload
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      }

      // Handle content videos upload
      if (files?.contentVideos && files.contentVideos.length > 0) {
        for (const videoFile of files.contentVideos) {
          contentVideoUrls.push(`/api/images/${videoFile.filename}`);
        }
      }

      // If content videos were uploaded, add them to the content
      let content = req.body.content;
      if (contentVideoUrls.length > 0 && content) {
        // Insert video tags into content at specified positions or append
        const videoInsertPositions = req.body.videoPositions ? JSON.parse(req.body.videoPositions) : [];
        contentVideoUrls.forEach((url, index) => {
          const videoHtml = `<div class="video-container" style="margin: 20px 0; text-align: center;"><video controls preload="metadata" style="width: 100%; max-width: 800px; border-radius: 8px;"><source src="${url}" type="video/mp4" />Your browser does not support the video tag.</video></div>`;
          if (videoInsertPositions[index]) {
            content = content.slice(0, videoInsertPositions[index]) + videoHtml + content.slice(videoInsertPositions[index]);
          } else {
            content += videoHtml;
          }
        });
      }

      const postData = {
        title: req.body.title,
        excerpt: req.body.excerpt,
        content: content,
        author: req.body.author,
        category: req.body.category,
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
    { name: 'video', maxCount: 1 },
    { name: 'contentVideos', maxCount: 10 }
  ]), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const updateData: any = {};

      // Only update fields that are provided
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.excerpt) updateData.excerpt = req.body.excerpt;
      if (req.body.author) updateData.author = req.body.author;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.readTime) updateData.readTime = req.body.readTime;

      if (req.body.tags) {
        updateData.tags = Array.isArray(req.body.tags) ? req.body.tags :
                          typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : [];
      }

      if (req.body.featured !== undefined) updateData.featured = req.body.featured === 'true';
      if (req.body.published !== undefined) updateData.published = req.body.published === 'true';

      // Handle content with new videos
      let content = req.body.content;
      if (files?.contentVideos && files.contentVideos.length > 0) {
        const contentVideoUrls: string[] = [];
        for (const videoFile of files.contentVideos) {
          contentVideoUrls.push(`/api/images/${videoFile.filename}`);
        }

        const videoInsertPositions = req.body.videoPositions ? JSON.parse(req.body.videoPositions) : [];
        contentVideoUrls.forEach((url, index) => {
          const videoHtml = `<div class="video-container" style="margin: 20px 0;"><video controls style="width: 100%; max-width: 800px; border-radius: 8px;"><source src="${url}" type="video/mp4">Your browser does not support the video tag.</video></div>`;
          if (videoInsertPositions[index]) {
            content = content.slice(0, videoInsertPositions[index]) + videoHtml + content.slice(videoInsertPositions[index]);
          } else {
            content += videoHtml;
          }
        });
      }

      if (content) updateData.content = content;

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



  app.post("/api/admin/featured-sections", async (req, res) => {
    try {
      const { title, subtitle, imageUrl, linkUrl, buttonText, displayOrder, isActive } = req.body;

      if (!title || !imageUrl) {
        return res.status(400).json({ error: "Title and image URL are required" });
      }

      const sectionData = {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl ? linkUrl.trim() : null,
        buttonText: buttonText ? buttonText.trim() : null,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: Boolean(isActive ?? true)
      };

      const section = await storage.createFeaturedSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating featured section:", error);
      res.status(500).json({ error: "Failed to create featured section" });
    }
  });

  app.put("/api/admin/featured-sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subtitle, imageUrl, linkUrl, buttonText, displayOrder, isActive } = req.body;

      if (!title || !imageUrl) {
        return res.status(400).json({ error: "Title and image URL are required" });
      }

      const sectionData = {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl ? linkUrl.trim() : null,
        buttonText: buttonText ? buttonText.trim() : null,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: Boolean(isActive ?? true)
      };

      const section = await storage.updateFeaturedSection(parseInt(id), sectionData);
      if (!section) {
        return res.status(404).json({ error: "Featured section not found" });
      }

      res.json(section);
    } catch (error) {
      console.error("Error updating featured section:", error);
      res.status(500).json({ error: "Failed to update featured section" });
    }
  });

  app.delete("/api/admin/featured-sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFeaturedSection(parseInt(id));
      res.json({ message: "Featured section deleted successfully" });
    } catch (error) {
      console.error("Error deleting featured section:", error);
      res.status(500).json({ error: "Failed to delete featured section" });
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

  // Admin blog subcategories
  app.get("/api/admin/blog/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getBlogSubcategories();
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching blog subcategories:", error);
      res.status(500).json({ error: "Failed to fetch blog subcategories" });
    }
  });

  app.get("/api/admin/blog/categories/:categoryId/subcategories", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const subcategories = await storage.getBlogSubcategoriesByCategory(parseInt(categoryId));
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching blog subcategories by category:", error);
      res.status(500).json({ error: "Failed to fetch blog subcategories" });
    }
  });

  app.post("/api/admin/blog/categories", async (req, res) => {
    try {
      const { name, description, isActive, sortOrder } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData: InsertBlogCategory = {
        name: name.trim(),
        description: description?.trim() || '',
        isActive: isActive !== false && isActive !== 'false',
        sortOrder: parseInt(sortOrder) || 0
      };

      const category = await storage.createBlogCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating blog category:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create blog category";
      res.status(500).json({
        error: "Failed to create blog category",
        details: errorMessage
      });
    }
  });

  app.put("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, sortOrder } = req.body;

      const updateData: Partial<InsertBlogCategory> = {};

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (isActive !== undefined) updateData.isActive = isActive !== false && isActive !== 'false';
      if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;

      const category = await storage.updateBlogCategory(parseInt(id), updateData);

      if (!category) {
        return res.status(404).json({ error: "Blog category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Error updating blog category:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update blog category";
      res.status.json({
        error: "Failed to update blog category",
        details: errorMessage
      });
    }
  });

  app.delete("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);

      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const success = await storage.deleteBlogCategory(categoryId);

      if (!success) {
        return res.status(404).json({ error: "Blog category not found" });
      }

      res.json({ success: true, message: "Blog category deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog category:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete blog category";
      res.status(500).json({
        error: "Failed to delete blog category",
        details: errorMessage
      });
    }
  });

  app.post("/api/admin/blog/subcategories", async (req, res) => {
    try {
      const { name, description, categoryId, isActive, sortOrder } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Subcategory name is required" });
      }

      if (!categoryId) {
        return res.status(400).json({ error: "Category ID is required" });
      }

      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const subcategoryData: InsertBlogSubcategory = {
        name: name.trim(),
        slug,
        description: description?.trim() || '',
        categoryId: parseInt(categoryId),
        isActive: isActive !== false && isActive !== 'false',
        sortOrder: parseInt(sortOrder) || 0
      };

      const subcategory = await storage.createBlogSubcategory(subcategoryData);
      res.status(201).json(subcategory);
    } catch (error) {
      console.error("Error creating blog subcategory:", error);

      let errorMessage = "Failed to create blog subcategory";
      if (error.message) {
        errorMessage = error.message;
      }

      if (error.message && error.message.includes('unique constraint')) {
        errorMessage = "A subcategory with this name or slug already exists";
      } else if (error.message && error.message.includes('foreign key constraint')) {
        errorMessage = "Invalid category selected. Please choose a valid category.";
      } else if (error.message && error.message.includes('ECONNREFUSED')) {
        errorMessage = "Database connection error. Please try again later.";
      }

      res.status(500).json({
        error: errorMessage,
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.put("/api/admin/blog/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, categoryId, isActive, sortOrder } = req.body;

      const updateData: Partial<InsertBlogSubcategory> = {};

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
      if (isActive !== undefined) updateData.isActive = isActive !== false && isActive !== 'false';
      if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;

      if (updateData.name !== undefined) {
        updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      const subcategory = await storage.updateBlogSubcategory(parseInt(id), updateData);

      if (!subcategory) {
        return res.status(404).json({ error: "Blog subcategory not found" });
      }

      res.json(subcategory);
    } catch (error) {
      console.error("Error updating blog subcategory:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update blog subcategory";
      res.status(500).json({
        error: "Failed to update blog subcategory",
        details: errorMessage
      });
    }
  });

  app.delete("/api/admin/blog/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subcategoryId = parseInt(id);

      if (isNaN(subcategoryId)) {
        return res.status(400).json({ error: "Invalid subcategory ID" });
      }

      const success = await storage.deleteBlogSubcategory(subcategoryId);

      if (!success) {
        return res.status(404).json({ error: "Blog subcategory not found" });
      }

      res.json({ success: true, message: "Blog subcategory deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog subcategory:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete blog subcategory";
      res.status(500).json({
        error: "Failed to delete blog subcategory",
        details: errorMessage
      });
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
      // Set cache headers for faster subsequent loads
      res.setHeader('Cache-Control', 'private, max-age=30');
      
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
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.id, Number(orderId)));

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get order items
      const items = await db
        .select({
          id: schema.orderItemsTable.id,
          name: schema.orderItemsTable.productName,
          quantity: schema.orderItemsTable.quantity,
          price: schema.orderItemsTable.price,
          image: schema.orderItemsTable.productImage,
        })
        .from(schema.orderItemsTable)
        .where(eq(schema.orderItemsTable.orderId, order[0].id));

      // Get user info
      const user = await db
        .select({
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          phone: schema.users.phone,
        })
        .from(schema.users)
        .where(eq(schema.users.id, order[0].userId))
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
            .invoice-container{
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-name">Poppik Lifestyle Private Limited</div>
            <div class="company-details">
                Premium Beauty & Skincare Products<br>
                Office No.- 213, A- Wing, Skylark Building, <br>
                Plot No.- 63, Sector No.- 11, C.B.D. Belapur,<br>
                 Navi Mumbai- 400614 INDIA.o
                GST No: 27AAQCP0247B1ZK
            </div>
        </div><br>

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
            <p>For any queries, please contact us at info@poppik.in</p>
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
      console.error("Error fetching featured products:", error);
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

  // Get all customers (admin)
  app.get("/api/admin/customers", async (req, res) => {
    try {
      // Get all users from database
      const allUsers = await db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        createdAt: schema.users.createdAt,
        role: schema.users.role,
      }).from(schema.users).orderBy(desc(schema.users.createdAt));

      // Get order statistics for each user
      const customersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          // Get user's orders
          const userOrders = await db
            .select()
            .from(schema.ordersTable)
            .where(eq(schema.ordersTable.userId, user.id));

          const totalOrders = userOrders.length;
          const totalSpent = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);

          // Determine status based on activity
          let status = 'New';
          if (totalOrders === 0) {
            status = 'New';
          } else if (totalOrders >= 5) {
            status = 'VIP';
          } else if (totalOrders >= 1) {
            status = 'Active';
          } else {
            status = 'Inactive';
          }

          return {
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: user.phone || 'N/A',
            orders: totalOrders,
            spent: `₹${totalSpent.toFixed(2)}`,
            status,
            joinedDate: new Date(user.createdAt).toLocaleDateString('en-IN'),
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

  // Get customer details by ID (admin)
  app.get("/api/admin/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);

      // Get user details
      const user = await db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        createdAt: schema.users.createdAt,
        role: schema.users.role,
      }).from(schema.users).where(eq(schema.users.id, customerId)).limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const userData = user[0];

      // Get user's orders
      const userOrders = await db
        .select()
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.userId, customerId))
        .orderBy(desc(schema.ordersTable.createdAt))
        .limit(5);

      const totalOrders = userOrders.length;
      const totalSpent = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      // Determine status
      let status = 'New';
      if (totalOrders === 0) {
        status = 'New';
      } else if (totalOrders >= 5) {
        status = 'VIP';
      } else if (totalOrders >= 1) {
        status = 'Active';
      } else {
        status = 'Inactive';
      }

      // Format recent orders
      const recentOrders = userOrders.map(order => ({
        id: `ORD-${order.id.toString().padStart(3, '0')}`,
        date: new Date(order.createdAt).toLocaleDateString('en-IN'),
        status: order.status,
        total: `₹${order.totalAmount.toFixed(2)}`
      }));

      const customerDetails = {
        id: userData.id,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email,
        phone: userData.phone || 'N/A',
        orders: totalOrders,
        spent: `₹${totalSpent.toFixed(2)}`,
        status,
        joinedDate: new Date(userData.createdAt).toLocaleDateString('en-IN'),
        firstName: userData.firstName,
        lastName: userData.lastName,
        recentOrders
      };

      res.json(customerDetails);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({ error: "Failed to fetch customer details" });
    }
  });

  // Admin search endpoint
  app.get("/api/admin/search", async (req, res) => {
    try {
      const query = req.query.q;

      if (!query || query.trim().length === 0) {
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
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          phone: schema.users.phone,
          createdAt: schema.users.createdAt,
        }).from(schema.users);

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
        const allOrders = await db.select().from(schema.ordersTable).orderBy(desc(schema.ordersTable.createdAt));

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
                  firstName: schema.users.firstName,
                  lastName: schema.users.lastName,
                  email: schema.users.email,
                })
                .from(schema.users)
                .where(eq(schema.users.id, order.userId))
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
        { id: 5, name: "Deep", colorCode: "#D69E2E", value: "deep", isActive: true, sortOrder: 5 },
        { id: 6, name: "Very Deep", colorCode: "#B7791F", value: "very-deep", isActive: true, sortOrder: 6 },
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
      res.json(allShades);    } catch (error) {
      console.error("Error fetching admin shades:", error);
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

      const shadeData = {
        name: name.trim(),
        colorCode: colorCode.trim().toUpperCase(),
        value: value && value.trim() ? value.trim() : null, // Let storage handle value generation
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
      let statusCode = 500;

      if (error.message) {
        if (error.message.includes('uniqueconstraint') || error.message.includes('duplicate key')) {
          errorMessage = "A shade with this name or similar properties already exists. The system will automatically generate a unique identifier.";
          statusCode = 400;
        } else if (error.message.includes('not null constraint')) {
          errorMessage = "Missing required shade information";
          statusCode = 400;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.put("/api/admin/shades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating shade with ID:", id);
      console.log("Update data received:", req.body);

      // Extract productIds from request body
      const { productIds, categoryIds, subcategoryIds, ...shadeData } = req.body;

      // Update shade with only product-specific assignments
      const shade = await storage.updateShade(parseInt(id), {
        ...shadeData,
        productIds: productIds || [], // Only store individually selected products
        categoryIds: categoryIds || [],
        subcategoryIds: subcategoryIds || []
      });

      console.log("Shade updated successfully:", shade);
      res.json(shade);
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
      res.status(5050).json({ error: "Failed to delete shade" });
    }
  });

  // Public category sliders endpoint (for frontend display)
  app.get('/api/categories/slug/:slug/sliders', async (req, res) => {
    try {
      const { slug } = req.params;
      console.log('Fetching sliders for category slug:', slug);

      // First get the category by slug
      const category = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, slug))
        .limit(1);

      if (!category || category.length === 0) {
        console.log('Category not found for slug:', slug);
        // Return empty array instead of error to prevent UI issues
        return res.json([]);
      }

      const categoryId = category[0].id;
      console.log('Found category ID:', categoryId);

      // Get sliders for this category
      try {
        const slidersResult = await db
          .select()
          .from(schema.categorySliders)
          .where(and(
            eq(schema.categorySliders.categoryId, categoryId),
            eq(schema.categorySliders.isActive, true)
          ))
          .orderBy(asc(schema.categorySliders.sortOrder));

        console.log('Found sliders count:', slidersResult.length);
        // Always return an array, even if empty
        res.json(slidersResult || []);
      } catch (tableError) {
        console.log('Error querying category sliders, returning empty array:', tableError.message);
        // Return empty array on any database error
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching category sliders by slug:', error);
      // Return empty array instead of error to prevent UI breakage
      res.json([]);
    }
  });

  // Category slider management routes
  app.get('/api/admin/categories/:categoryId/sliders', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      console.log('Fetching sliders for category ID:', categoryId);

      // Check if categorySliders table exists, if not return empty array
      try {
        const slidersResult = await db
          .select()
          .from(schema.categorySliders)
          .where(eq(schema.categorySliders.categoryId, categoryId))
          .orderBy(asc(schema.categorySliders.sortOrder));

        console.log('Found sliders:', slidersResult);
        res.json(slidersResult);
      } catch (tableError) {
        console.log('CategorySliders table may not exist, returning empty array');
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching category sliders:', error);
      res.status(500).json({ error: 'Failed to fetch category sliders', details: error.message });
    }
  });

  app.post('/api/admin/categories/:categoryId/sliders', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const { imageUrl, title, subtitle, isActive, sortOrder } = req.body;

      console.log('Creating category slider for category:', categoryId);
      console.log('Slider data:', { imageUrl, title, subtitle, isActive, sortOrder });

      // Validation
      if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
      }

      if (isNaN(categoryId)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }

      // Check if category exists
      const category = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .limit(1);

      if (category.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const sliderData = {
        categoryId,
        imageUrl: imageUrl.trim(),
        title: (title || '').trim(),
        subtitle: (subtitle || '').trim(),
        isActive: Boolean(isActive ?? true),
        sortOrder: parseInt(sortOrder) || 0
      };

      console.log('Inserting slider data:', sliderData);

      const [newSlider] = await db.insert(schema.categorySliders).values(sliderData).returning();

      console.log('Created slider successfully:', newSlider);
      res.json(newSlider);
    } catch (error) {
      console.error('Error creating category slider:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail
      });

      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'A slider with similar data already exists' });
      }

      if (error.code === '23503') { // Foreign key constraint violation
        return res.status(400).json({ error: 'Invalid category reference' });
      }

      res.status(500).json({
        error: 'Failed to create category slider',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.put('/api/admin/categories/:categoryId/sliders/:sliderId', async (req, res) => {
    try {
      const sliderId = parseInt(req.params.sliderId);
      const { imageUrl, title, subtitle, isActive, sortOrder } = req.body;

      const [updatedSlider] = await db
        .update(schema.categorySliders)
        .set({
          imageUrl,
          title: title || '',
          subtitle: subtitle || '',
          isActive: isActive !== false,
          sortOrder: sortOrder || 0,
          updatedAt: new Date()
        })
        .where(eq(schema.categorySliders.id, sliderId))
        .returning();

      if (!updatedSlider) {
        return res.status(404).json({ error: 'Category slider not found' });
      }

      res.json(updatedSlider);
    } catch (error) {
      console.error('Error updating category slider:', error);
      res.status(500).json({ error: 'Failed to update category slider' });
    }
  });

  app.delete('/api/admin/categories/:categoryId/sliders/:sliderId', async (req, res) => {
    try {
      const sliderId = parseInt(req.params.sliderId);

      const [deletedSlider] = await db
        .delete(schema.categorySliders)
        .where(eq(schema.categorySliders.id, sliderId))
        .returning();

      if (!deletedSlider) {
        return res.status(404).json({ error: 'Category slider not found' });
      }

      res.json({ message: 'Category slider deleted successfully' });
    } catch (error) {
      console.error('Error deleting category slider:', error);
      res.status(500).json({ error: 'Failed to delete category slider' });
    }
  });

  // Combo Sliders Management Routes

  // Public endpoints for combo sliders
  app.get('/api/combo-sliders', async (req, res) => {
    try {
      const sliders = await db
        .select()
        .from(schema.comboSliders)
        .where(eq(schema.comboSliders.isActive, true))
        .orderBy(asc(schema.comboSliders.sortOrder));

      res.json(sliders);
    } catch (error) {
      console.error('Error fetching combo sliders:', error);
      res.status(500).json({ error: 'Failed to fetch combo sliders' });
    }
  });

  // Admin endpoints for combo sliders
  app.get('/api/admin/combo-sliders', async (req, res) => {
    try {
      const sliders = await db
        .select()
        .from(schema.comboSliders)
        .orderBy(asc(schema.comboSliders.sortOrder));

      res.json(sliders);
    } catch (error) {
      console.error('Error fetching combo sliders:', error);
      res.status(500).json({ error: 'Failed to fetch combo sliders' });
    }
  });

  app.post('/api/admin/combo-sliders', upload.single('image'), async (req, res) => {
    try {
      const { title, subtitle, isActive, sortOrder } = req.body;

      let imageUrl = '';
      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      } else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
      } else {
        return res.status(400).json({ error: 'Image is required' });
      }

      const [slider] = await db
        .insert(schema.comboSliders)
        .values({
          imageUrl: imageUrl.trim(),
          title: title?.trim() || null,
          subtitle: subtitle?.trim() || null,
          isActive: isActive === 'true' || isActive === true,
          sortOrder: parseInt(sortOrder) || 0,
        })
        .returning();

      res.json(slider);
    } catch (error) {
      console.error('Error creating combo slider:', error);
      res.status(500).json({ error: 'Failed to create combo slider' });
    }
  });

  app.put('/api/admin/combo-sliders/:id', upload.single('image'), async (req, res) => {
    try {
      const sliderId = parseInt(req.params.id);
      const { title, subtitle, isActive, sortOrder } = req.body;

      let imageUrl = req.body.imageUrl;
      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      }

      const [updatedSlider] = await db
        .update(schema.comboSliders)
        .set({
          ...(imageUrl && { imageUrl: imageUrl.trim() }),
          title: title?.trim() || null,
          subtitle: subtitle?.trim() || null,
          isActive: isActive === 'true' || isActive === true,
          sortOrder: parseInt(sortOrder) || 0,
          updatedAt: new Date(),
        })
        .where(eq(schema.comboSliders.id, sliderId))
        .returning();

      if (!updatedSlider) {
        return res.status(404).json({ error: 'Combo slider not found' });
      }

      res.json(updatedSlider);
    }catch (error) {
      console.error('Error updating combo slider:', error);
      res.status(500).json({ error: 'Failed to update combo slider' });
    }
  });

  app.delete('/api/admin/combo-sliders/:id', async (req, res) => {
    try {
      const sliderId = parseInt(req.params.id);

      const [deletedSlider] = await db
        .delete(schema.comboSliders)
        .where(eq(schema.comboSliders.id, sliderId))
        .returning();

      if (!deletedSlider) {
        return res.status(404).json({ error: 'Combo slider not found' });
      }

      res.json({ message: 'Combo slider deleted successfully' });
    } catch (error) {
      console.error('Error deleting combo slider:', error);
      res.status(500).json({ error: 'Failed to delete combo slider' });
    }
  });

  // Video Testimonials Management Routes

  // Public endpoints for video testimonials
  app.get('/api/video-testimonials', async (req, res) => {
    try {
      const testimonials = await db
        .select()
        .from(schema.videoTestimonials)
        .where(eq(schema.videoTestimonials.isActive, true))
        .orderBy(asc(schema.videoTestimonials.sortOrder));

      res.json(testimonials);
    } catch (error) {
      console.error('Error fetching video testimonials:', error);
      res.status(500).json({ error: 'Failed to fetch video testimonials' });
    }
  });

  // Admin endpoints for video testimonials management
  app.get('/api/admin/video-testimonials', async (req, res) => {
    try {
      const testimonials = await db
        .select()
        .from(schema.videoTestimonials)
        .orderBy(desc(schema.videoTestimonials.createdAt));

      res.json(testimonials);
    } catch (error) {
      console.error('Error fetching video testimonials:', error);
      res.status(500).json({ error: 'Failed to fetch video testimonials' });
    }
  });

  app.post('/api/admin/video-testimonials', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      let videoUrl = req.body.videoUrl;
      let thumbnailUrl = req.body.thumbnailUrl;

      // Handle video upload
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      }

      // Handle thumbnail upload
      if (files?.thumbnail?.[0]) {
        thumbnailUrl = `/api/images/${files.thumbnail[0].filename}`;
      }

      const testimonialData = {
        customerImage: '', // Empty string for backward compatibility
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        productId: parseInt(req.body.productId),
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      const [testimonial] = await db
        .insert(schema.videoTestimonials)
        .values(testimonialData)
        .returning();

      res.status(201).json(testimonial);
    } catch (error) {
      console.error('Error creating video testimonial:', error);
      res.status(500).json({ error: 'Failed to create video testimonial' });
    }
  });

  app.put('/api/admin/video-testimonials/:id', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      let updateData: any = {
        customerName: req.body.customerName,
        customerImage: '', // Empty string for backward compatibility
        productId: parseInt(req.body.productId),
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        updatedAt: new Date(),
      };

      // Handle video upload
      if (files?.video?.[0]) {
        updateData.videoUrl = `/api/images/${files.video[0].filename}`;
      } else if (req.body.videoUrl) {
        updateData.videoUrl = req.body.videoUrl;
      }

      // Handle thumbnail upload
      if (files?.thumbnail?.[0]) {
        updateData.thumbnailUrl = `/api/images/${files.thumbnail[0].filename}`;
      } else if (req.body.thumbnailUrl) {
        updateData.thumbnailUrl = req.body.thumbnailUrl;
      }

      const [testimonial] = await db
        .update(schema.videoTestimonials)
        .set(updateData)
        .where(eq(schema.videoTestimonials.id, id))
        .returning();

      if (!testimonial) {
        return res.status(404).json({ error: 'Video testimonial not found' });
      }

      res.json(testimonial);
    } catch (error) {
      console.error('Error updating video testimonial:', error);
      res.status(500).json({ error: 'Failed to update video testimonial' });
    }
  });

  app.delete('/api/admin/video-testimonials/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deletedTestimonial] = await db
        .delete(schema.videoTestimonials)
        .where(eq(schema.videoTestimonials.id, id))
        .returning();

      if (!deletedTestimonial) {
        return res.status(404).json({ error: 'Video testimonial not found' });
      }

      res.json({ message: 'Video testimonial deleted successfully' });
    } catch (error) {
      console.error('Error deleting video testimonial:', error);
      res.status(500).json({ error: 'Failed to delete video testimonial' });
    }
  });

  // Offers Management Routes

  // Public endpoint for active offers
  app.get('/api/offers', async (req, res) => {
    try {
      const offers = await db
        .select()
        .from(schema.offers)
        .where(eq(schema.offers.isActive, true))
        .orderBy(asc(schema.offers.sortOrder));

      res.json(offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Return empty array instead of error to prevent UI breaking
      res.json([]);
    }
  });

  // Public endpoint for single offer by ID
  app.get('/api/offers/:id', async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);

      const offer = await db
        .select()
        .from(schema.offers)
        .where(and(
          eq(schema.offers.id, offerId),
          eq(schema.offers.isActive, true) // Only return active offers publicly
        ))
        .limit(1);

      if (!offer || offer.length === 0) {
        return res.status(404).json({ error: 'Offer not found' });
      }

      res.json(offer[0]);
    } catch (error) {
      console.error('Error fetching offer:', error);
      res.status(500).json({ error: 'Failed to fetch offer' });
    }
  });

  // Announcements Management Routes

  // Public endpoint for active announcements
  app.get('/api/announcements', async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
        }
  });

  // Admin endpoints for offers management
  app.get('/api/admin/offers', async (req, res) => {
    try {
      console.log('📊 GET /api/admin/offers - Admin user authenticated');

      const offers = await db
        .select()
        .from(schema.offers)
        .orderBy(desc(schema.offers.createdAt));

      console.log(`✅ Fetched ${offers.length} offers successfully`);
      res.json(offers);
    } catch (error) {
      console.error('❌ Error fetching admin offers:', error);
      res.status(500).json({ error: 'Failed to fetch offers' });
    }
  });

  app.post('/api/admin/offers', upload.single('image'), async (req, res) => {
    try {
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      }

      // Parse productIds and ensure it's an array of integers
      let productIds = [];
      if (req.body.productIds) {
        try {
          const parsed = typeof req.body.productIds === 'string' 
            ? JSON.parse(req.body.productIds) 
            : req.body.productIds;
          productIds = Array.isArray(parsed) ? parsed.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        } catch (e) {
          console.error('Error parsing productIds:', e);
          productIds = [];
        }
      }

      const offerData = {
        title: req.body.title,
        description: req.body.description,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=500&fit=crop',
        productIds: productIds.length > 0 ? productIds : null,
        discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : null,
        discountText: req.body.discountText || null,
        validFrom: new Date(req.body.validFrom),
        validUntil: new Date(req.body.validUntil),
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        linkUrl: req.body.linkUrl || null,
        buttonText: req.body.buttonText || 'Shop Now'
      };

      console.log('Creating offer with data:', offerData);

      const [offer] = await db.insert(schema.offers).values(offerData).returning();

      console.log('Offer created successfully:', offer);
      res.json(offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ 
        error: 'Failed to create offer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.put('/api/admin/offers/:id', upload.single('image'), async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);
      let updateData: any = {
        title: req.body.title,
        description: req.body.description,
        discountType: req.body.discountType || 'none',
        discountValue: req.body.discountValue ? parseFloat(req.body.discountValue) : null,
        discountText: req.body.discountText || null,
        validFrom: new Date(req.body.validFrom),
        validUntil: new Date(req.body.validUntil),
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        linkUrl: req.body.linkUrl || null,
        buttonText: req.body.buttonText || 'Shop Now',
        updatedAt: new Date()
      };

      // Parse productIds and ensure it's an array of integers
      let productIds = [];
      if (req.body.productIds) {
        try {
          const parsed = typeof req.body.productIds === 'string' 
            ? JSON.parse(req.body.productIds) 
            : req.body.productIds;
          productIds = Array.isArray(parsed) ? parsed.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        } catch (e) {
          console.error('Error parsing productIds:', e);
          productIds = [];
        }
      }
      updateData.productIds = productIds.length > 0 ? productIds : null;


      if (req.file) {
        updateData.imageUrl = `/api/images/${req.file.filename}`;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }

      console.log('Updating offer with data:', updateData);

      const [offer] = await db
        .update(schema.offers)
        .set(updateData)
        .where(eq(schema.offers.id, offerId))
        .returning();

      if (!offer) {
        return res.status(404).json({ error: 'Offer not found' });
      }

      console.log('Offer updated successfully:', offer);
      res.json(offer);
    } catch (error) {
      console.error('Error updating offer:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ 
        error: 'Failed to update offer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete('/api/admin/offers/:id', async (req, res) => {
    try {
      const offerId = parseInt(req.params.id);

      const [deletedOffer] = await db
        .delete(schema.offers)
        .where(eq(schema.offers.id, offerId))
        .returning();

      if (!deletedOffer) {
        return res.status(404).json({ error: 'Offer not found' });
      }

      res.json({ message: 'Offer deleted successfully' });
    } catch (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({ error: 'Failed to delete offer' });
    }
  });

  // Admin endpoints for announcements
  app.get('/api/admin/announcements', async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
        }
  });

  app.get('/api/admin/announcements/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const announcement = await storage.getAnnouncement(id);
      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      res.json(announcement);
    } catch (error) {
      console.error('Error fetching announcement:', error);
      res.status(500).json({ error: 'Failed to fetch announcement' });
    }
  });

  app.post('/api/admin/announcements', async (req, res) => {
    try {
      const announcement = await storage.createAnnouncement(req.body);
      res.json(announcement);
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  app.put('/api/admin/announcements/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { text, isActive, sortOrder } = req.body;

      console.log('Updating announcement ID:', id);
      console.log('Request body:', req.body);

      // Validate required fields
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Announcement text is required' });
      }

      const updateData = {
        text: text.trim(),
        isActive: isActive === true || isActive === 'true' || isActive === true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        updatedAt: new Date()
      };

      console.log('Update data prepared:', updateData);

      const [updatedAnnouncement] = await db
        .update(schema.announcements)
        .set(updateData)
        .where(eq(schema.announcements.id, id))
        .returning();

      if (!updatedAnnouncement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      console.log('Announcement updated successfully:', updatedAnnouncement);
      res.json(updatedAnnouncement);
    } catch (error) {
      console.error('Error updating announcement:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ 
        error: 'Failed to update announcement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete('/api/admin/announcements/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAnnouncement(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Combos Management Routes

  // Public endpoint for active combos
  app.get('/api/combos', async (req, res) => {
    try {
      console.log('Fetching combos from database...');

      const activeCombos = await db
        .select()
        .from(schema.combos)
        .where(eq(schema.combos.isActive, true))
        .orderBy(asc(schema.combos.sortOrder));

      console.log('Active combos found:', activeCombos.length);

      if (!activeCombos || activeCombos.length === 0) {
        console.log('No active combos found, returning empty array');
        return res.json([]);
      }

      // Get images for each combo
      const combosWithImages = await Promise.all(
        activeCombos.map(async (combo) => {
          try {
            const images = await db
              .select()
              .from(schema.comboImages)
              .where(eq(schema.comboImages.comboId, combo.id))
              .orderBy(asc(schema.comboImages.sortOrder));

            return {
              ...combo,
              imageUrls: images.map(img => img.imageUrl)
            };
          } catch (imgError) {
            console.warn(`Failed to get images for combo ${combo.id}:`, imgError.message);
            return {
              ...combo,
              imageUrls: []
            };
          }
        })
      );

      console.log('Returning combos with images:', combosWithImages.length);
      res.json(combosWithImages);
    } catch (error) {
      console.error('Error fetching combos:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ error: 'Failed to fetch combos', details: error.message });
    }
  });

  // Debug endpoint to check combos table
  app.get('/api/combos/debug', async (req, res) => {
    try {
      const allCombos = await db.select().from(schema.combos);
      const activeCombos = await db.select().from(schema.combos).where(eq(schema.combos.isActive, true));

      res.json({
        totalCombos: allCombos.length,
        activeCombos: activeCombos.length,
        allCombosData: allCombos,
        activeCombosData: activeCombos
      });
    } catch (error) {
      console.error('Debug combos error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin endpoints for combos management
  app.get('/api/admin/combos', async (req, res) => {
    try {
      const allCombos = await db
        .select()
        .from(schema.combos)
        .orderBy(desc(schema.combos.createdAt));

      // Get images for each combo
      const combosWithImages = await Promise.all(
        allCombos.map(async (combo) => {
          try {
            const images = await db
              .select()
              .from(schema.comboImages)
              .where(eq(schema.comboImages.comboId, combo.id))
              .orderBy(asc(schema.comboImages.sortOrder));

            return {
              ...combo,
              imageUrls: images.map(img => img.imageUrl)
            };
          } catch (imgError) {
            console.warn(`Failed to get images for combo ${combo.id}:`, imgError.message);
            return {
              ...combo,
              imageUrls: []
            };
          }
        })
      );

      res.json(combosWithImages);
    } catch (error) {
      console.error('Error fetching combos:', error);
      res.status(500).json({ error: 'Failed to fetch combos' });
    }
  });

  app.post('/api/admin/combos', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const name = (req.body.name || '').substring(0, 200);
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 200);

      // Get products array - ensure it's properly parsed and limited
      let products = req.body.products || [];
      if (typeof products === 'string') {
        try {
          products = JSON.parse(products);
        } catch (e) {
          console.error('Error parsing products:', e);
          products = [];
        }
      }

      // Ensure products is an array and limit to 20 items
      if (!Array.isArray(products)) {
        products = [];
      }
      products = products.slice(0, 20);

      // Get productShades from request body
      let productShades = req.body.productShades || {};
      if (typeof productShades === 'string') {
        try {
          productShades = JSON.parse(productShades);
        } catch (e) {
          console.error('Error parsing productShades:', e);
          productShades = {};
        }
      }

      // Collect all image URLs into an array
      let imageUrls: string[] = [];

      if (files?.images && files.images.length > 0) {
        imageUrls = files.images.map(file => `/api/images/${file.filename}`);
      } else if (req.body.imageUrl) {
        // If imageUrl is provided in body, ensure it's an array
        imageUrls = Array.isArray(req.body.imageUrl) ? req.body.imageUrl : [req.body.imageUrl];
      } else {
        // Default fallback image
        imageUrls = ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop'];
      }

      // Handle video upload
      let videoUrl = null;
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      } else if (req.body.videoUrl) {
        videoUrl = req.body.videoUrl;
      }

      const comboData = {
        name: name,
        slug,
        description: (req.body.description || '').substring(0, 500),
        detailedDescription: req.body.detailedDescription || null,
        productsIncluded: req.body.productsIncluded || null,
        benefits: req.body.benefits || null,
        howToUse: req.body.howToUse || null,
        price: parseFloat(req.body.price) || 0,
        originalPrice: parseFloat(req.body.originalPrice) || 0,
        discount: (req.body.discount || '').substring(0, 50),
        cashbackPercentage: req.body.cashbackPercentage ? parseFloat(req.body.cashbackPercentage) : null,
        cashbackPrice: req.body.cashbackPrice ? parseFloat(req.body.cashbackPrice) : null,
        imageUrl: imageUrls,
        videoUrl: videoUrl,
        products: JSON.stringify(products),
        productShades: JSON.stringify(productShades || {}),
        rating: parseFloat(req.body.rating) || 5.0,
        reviewCount: parseInt(req.body.reviewCount) || 0,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      console.log("Final combo data to insert:", comboData);

      // Insert combo into database
      const [combo] = await db
        .insert(schema.combos)
        .values(comboData)
        .returning();

      console.log("Combo created successfully:", combo);
      res.json(combo);
    } catch (error) {
      console.error("Error creating combo:", error);
      console.error('Error details:', error.message);
      res.status(500).json({
        error: "Failed to create combo",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.put('/api/admin/combos/:id', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Get products array - ensure it's properly parsed and limited
      let products = req.body.products || [];
      if (typeof products === 'string') {
        try {
          products = JSON.parse(products);
        } catch (e) {
          console.error('Error parsing products:', e);
          products = [];
        }
      }

      // Ensure products is an array and limit to 20 items
      if (!Array.isArray(products)) {
        products = [];
      }
      products = products.slice(0, 20);

      let updateData: any = {
        name: (req.body.name || '').substring(0, 200),
        description: (req.body.description || '').substring(0, 500),
        detailedDescription: req.body.detailedDescription || null,
        productsIncluded: req.body.productsIncluded || null,
        benefits: req.body.benefits || null,
        howToUse: req.body.howToUse || null,
        price: parseFloat(req.body.price) || 0,
        originalPrice: parseFloat(req.body.originalPrice) || 0,
        discount: (req.body.discount || '').substring(0, 50),
        cashbackPercentage: req.body.cashbackPercentage ? parseFloat(req.body.cashbackPercentage) : null,
        cashbackPrice: req.body.cashbackPrice ? parseFloat(req.body.cashbackPrice) : null,
        products: JSON.stringify(products),
        rating: parseFloat(req.body.rating) || 5.0,
        reviewCount: parseInt(req.body.reviewCount) || 0,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        updatedAt: new Date()
      };

      // Handle image updates
      if (files?.images && files.images.length > 0) {
        updateData.imageUrl = `/api/images/${files.images[0].filename}`;

        // Delete existing images from combo_images table
        await db.delete(schema.comboImages).where(eq(schema.comboImages.comboId, id));

        // Insert new combo images into combo_images table
        await Promise.all(
          files.images.map(async (file, index) => {
            await db.insert(schema.comboImages).values({
              comboId: id,
              imageUrl: `/api/images/${file.filename}`,
              altText: `${updateData.name} - Image ${index + 1}`,
              isPrimary: index === 0,
              sortOrder: index
            });
          })
        );
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }

      // Handle video upload
      if (files?.video?.[0]) {
        updateData.videoUrl = `/api/images/${files.video[0].filename}`;
      } else if (req.body.videoUrl) {
        updateData.videoUrl = req.body.videoUrl;
      }

      const [combo] = await db
        .update(schema.combos)
        .set(updateData)
        .where(eq(schema.combos.id, id))
        .returning();

      if (!combo) {
        return res.status(404).json({ error: 'Combo not found' });
      }

      res.json(combo);
    } catch (error) {
      console.error('Error updating combo:', error);
      console.error('Error details:', error.message);
      res.status(500).json({
        error: 'Failed to update combo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete('/api/admin/combos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deletedCombo] = await db
        .delete(schema.combos)
        .where(eq(schema.combos.id, id))
        .returning();

      if (!deletedCombo) {
        return res.status(404).json({ error: 'Combo not found' });
      }

      res.json({ message: 'Combo deleted successfully' });
    } catch (error) {
      console.error('Error deleting combo:', error);
      res.status(500).json({ error: 'Failed to delete combo' });
    }
  });

  // Job application submission endpoint
  app.post('/api/job-applications', upload.single('resume'), async (req, res) => {
    try {
      const { fullName, email, phone, position, location, isFresher, experienceYears, experienceMonths, coverLetter } = req.body;

      // Validation
      if (!fullName || !email || !phone || !position || !location || !coverLetter) {
        return res.status(400).json({ error: 'All required fields must be provided' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Resume file is required' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      const resumeUrl = `/api/images/${req.file.filename}`;

      // Save application to database
      const [savedApplication] = await db.insert(schema.jobApplications).values({
        fullName,
        email,
        phone,
        position,
        location,
        isFresher: isFresher === 'true',
        experienceYears: experienceYears || null,
        experienceMonths: experienceMonths || null,
        coverLetter,
        resumeUrl,
        status: 'pending'
      }).returning();

      // HR Manager's email
      const HR_EMAIL = process.env.HR_EMAIL || 'apurva@poppik.in';

      // Prepare email content
      const experienceInfo = isFresher === 'true' 
        ? 'Fresher' 
        : `${experienceYears || 0} years ${experienceMonths || 0} months`;

      const emailSubject = `New Job Application - ${position}`;
      const emailBody = `
Dear HR Manager,

A new job application has been received.

APPLICATION DETAILS:
------------------
Full Name: ${fullName}
Email: ${email}
Phone: ${phone}
Position: ${position}
Location: ${location}
Experience: ${experienceInfo}

COVER LETTER:
-------------
${coverLetter}

Please find the resume attached to this email.

Best regards,
Poppik Career Portal
      `;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">New Job Application</h2>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Full Name:</td>
                <td style="padding: 8px;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Phone:</td>
                <td style="padding: 8px;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Position:</td>
                <td style="padding: 8px;">${position}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Location:</td>
                <td style="padding: 8px;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Experience:</td>
                <td style="padding: 8px;">${experienceInfo}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333;">Cover Letter</h3>
            <p style="white-space: pre-wrap;">${coverLetter}</p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Resume is attached to this email.
          </p>
        </div>
      `;

      console.log('Sending job application email to HR:', {
        to: HR_EMAIL,
        from: email,
        position: position,
        applicant: fullName
      });

      try {
        // Send email to HR manager using the existing transporter
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'careers@poppik.in',
          to: HR_EMAIL,
          subject: emailSubject,
          text: emailBody,
          html: emailHtml
        });

        console.log('✅ Job application email sent successfully to:', HR_EMAIL);

        res.json({
          success: true,
          message: 'Application submitted successfully! Our HR team will review your application and get back to you soon.',
          applicationId: savedApplication.id
        });

      } catch (emailError) {
        console.error('❌ Failed to send job application email:', emailError);

        // Still return success to the user, but log the email failure
        res.json({
          success: true,
          message: 'Application submitted successfully! Our HR team will review your application and get back to you soon.',
          applicationId: savedApplication.id,
          emailSent: false
        });
      }

    } catch (error) {
      console.error('Job application submission error:', error);
      res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
    }
  });

  // Admin job applications endpoints
  app.get('/api/admin/job-applications', async (req, res) => {
    try {
      const applications = await db
        .select()
        .from(schema.jobApplications)
        .orderBy(desc(schema.jobApplications.appliedAt));

      res.json(applications);
    } catch (error) {
      console.error('Error fetching job applications:', error);
      res.status(500).json({ error: 'Failed to fetch job applications' });
    }
  });

  app.get('/api/admin/job-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await db
        .select()
        .from(schema.jobApplications)
        .where(eq(schema.jobApplications.id, id))
        .limit(1);

      if (!application || application.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json(application[0]);
    } catch (error) {
      console.error('Error fetching job application:', error);
      res.status(500).json({ error: 'Failed to fetch job application' });
    }
  });

  app.put('/api/admin/job-applications/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'reviewing', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const [updatedApplication] = await db
        .update(schema.jobApplications)
        .set({
          status,
          reviewedAt: new Date()
        })
        .where(eq(schema.jobApplications.id, id))
        .returning();

      if (!updatedApplication) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({ 
        success: true, 
        message: `Application status updated to ${status}`,
        application: updatedApplication 
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  });

  app.delete('/api/admin/job-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(schema.jobApplications)
        .where(eq(schema.jobApplications.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
      console.error('Error deleting job application:', error);
      res.status(500).json({ error: 'Failed to delete job application' });
    }
  });

  // User Wallet endpoint - get wallet balance
  app.get('/api/wallet', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Get or create wallet
      let wallet = await db
        .select()
        .from(schema.userWallet)
        .where(eq(schema.userWallet.userId, parseInt(userId as string)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        // Create new wallet if it doesn't exist
        const [newWallet] = await db.insert(schema.userWallet).values({
          userId: parseInt(userId as string),
          cashbackBalance: "0.00",
          totalEarned: "0.00",
          totalRedeemed: "0.00"
        }).returning();

        wallet = [newWallet];
      }

      res.json({
        userId: parseInt(userId as string),
        cashbackBalance: parseFloat(wallet[0].cashbackBalance),
        totalEarned: parseFloat(wallet[0].totalEarned),
        totalRedeemed: parseFloat(wallet[0].totalRedeemed),
        createdAt: wallet[0].createdAt,
        updatedAt: wallet[0].updatedAt
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  });

  // Get wallet transactions
  app.get('/api/wallet/transactions', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const transactions = await db
        .select()
        .from(schema.userWalletTransactions)
        .where(eq(schema.userWalletTransactions.userId, parseInt(userId as string)))
        .orderBy(desc(schema.userWalletTransactions.createdAt));

      res.json(transactions);
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Credit cashback to wallet (when order is delivered)
  app.post('/api/wallet/credit', async (req, res) => {
    try {
      const { userId, amount, orderId, description } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: 'User ID and amount required' });
      }

      // Get current wallet
      let wallet = await db
        .select()
        .from(schema.userWallet)
        .where(eq(schema.userWallet.userId, parseInt(userId)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        // Create wallet if doesn't exist
        const [newWallet] = await db.insert(schema.userWallet).values({
          userId: parseInt(userId),
          cashbackBalance: "0.00",
          totalEarned: "0.00",
          totalRedeemed: "0.00"
        }).returning();
        wallet = [newWallet];
      }

      const currentBalance = parseFloat(wallet[0].cashbackBalance);
      const creditAmount = parseFloat(amount);
      const newBalance = currentBalance + creditAmount;

      // Update wallet
      await db
        .update(schema.userWallet)
        .set({
          cashbackBalance: newBalance.toFixed(2),
          totalEarned: (parseFloat(wallet[0].totalEarned) + creditAmount).toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(schema.userWallet.userId, parseInt(userId)));

      // Create transaction record
      await db.insert(schema.userWalletTransactions).values({
        userId: parseInt(userId),
        type: 'credit',
        amount: creditAmount.toFixed(2),
        description: description || 'Cashback credited',
        orderId: orderId ? parseInt(orderId) : null,
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Cashback credited successfully',
        newBalance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error('Error crediting wallet:', error);
      res.status(500).json({ error: 'Failed to credit cashback' });
    }
  });

  // Redeem cashback
  app.post('/api/wallet/redeem', async (req, res) => {
    try {
      const { userId, amount, description } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: 'User ID and amount required' });
      }

      // Get current wallet
      const wallet = await db
        .select()
        .from(schema.userWallet)
        .where(eq(schema.userWallet.userId, parseInt(userId)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const currentBalance = parseFloat(wallet[0].cashbackBalance);
      const redeemAmount = parseFloat(amount);

      if (currentBalance < redeemAmount) {
        return res.status(400).json({ error: 'Insufficient cashback balance' });
      }

      const newBalance = currentBalance - redeemAmount;

      // Update wallet
      await db
        .update(schema.userWallet)
        .set({
          cashbackBalance: newBalance.toFixed(2),
          totalRedeemed: (parseFloat(wallet[0].totalRedeemed) + redeemAmount).toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(schema.userWallet.userId, parseInt(userId)));

      // Create transaction record
      await db.insert(schema.userWalletTransactions).values({
        userId: parseInt(userId),
        type: 'redeem',
        amount: redeemAmount.toFixed(2),
        description: description || 'Cashback redeemed',
        orderId: null,
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Cashback redeemed successfully',
        newBalance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error('Error redeeming cashback:', error);
      res.status(500).json({ error: 'Failed to redeem cashback' });
    }
  });

  // Affiliate Applications Routes

  // Submit affiliate application (public) - alternative endpoint
  app.post('/api/affiliate/apply', async (req, res) => {
    try {
      const { 
        userId,
        firstName, 
        lastName, 
        email, 
        phone,
        address,
        city,
        state,
        pincode,
        landmark,
        country,
        bankName,
        branchName,
        ifscCode,
        accountNumber
      } = req.body;

      // Validate required fields
      if (!userId || !firstName || !lastName || !email || !phone || !address || !country) {
        return res.status(400).json({ error: 'All required fields must be provided' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      // Check if user already has an application
      const existingApplicationByUser = await db
        .select()
        .from(schema.affiliateApplications)
        .where(
          or(
            eq(schema.affiliateApplications.userId, parseInt(userId)),
            eq(schema.affiliateApplications.email, email.toLowerCase())
          )
        )
        .limit(1);

      if (existingApplicationByUser && existingApplicationByUser.length > 0) {
        const application = existingApplicationByUser[0];
        const status = application.status || 'pending';

        return res.status(400).json({ 
          error: `You have already submitted an affiliate application. Status: ${status}`,
          application: {
            ...application,
            status: status
          }
        });
      }

      // Save to database
      const savedApplication = await db.insert(schema.affiliateApplications).values({
        userId: parseInt(userId),
        firstName,
        lastName,
        email,
        phone,
        address,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        landmark: landmark || null,
        country,
        bankName: bankName || null,
        branchName: branchName || null,
        ifscCode: ifscCode || null,
        accountNumber: accountNumber || null,
        status: 'pending'
      }).returning();

      console.log('Affiliate application saved:', savedApplication[0].id);

      res.json({
        success: true,
        message: 'Application submitted successfully! Our team will review your application and get back to you within 5-7 business days.',
        applicationId: savedApplication[0].id
      });

    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
    }
  });

  // Submit affiliate application (public)
  app.post('/api/affiliate-applications', async (req, res) => {
    try {
      const { 
        userId,
        firstName, 
        lastName, 
        email, 
        phone,
        address,
        city,
        state,
        pincode,
        landmark,
        country,
        bankName,
        branchName,
        ifscCode,
        accountNumber
      } = req.body;

      // Validate required fields
      if (!userId || !firstName || !lastName || !email || !phone || !address || !country) {
        return res.status(400).json({ error: 'All required fields must be provided' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      // Check if user already has an application (by userId or email)
      const existingApplicationByUser = await db
        .select()
        .from(schema.affiliateApplications)
        .where(
          or(
            eq(schema.affiliateApplications.userId, parseInt(userId)),
            eq(schema.affiliateApplications.email, email.toLowerCase())
          )
        )
        .limit(1);

      if (existingApplicationByUser && existingApplicationByUser.length > 0) {
        const application = existingApplicationByUser[0];
        const status = application.status || 'pending';

        return res.status(400).json({ 
          error: `You have already submitted an affiliate application. Status: ${status}`,
          application: {
            ...application,
            status: status
          }
        });
      }

      // Save to database
      const savedApplication = await db.insert(schema.affiliateApplications).values({
        userId: parseInt(userId),
        firstName,
        lastName,
        email,
        phone,
        address,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        landmark: landmark || null,
        country,
        bankName: bankName || null,
        branchName: branchName || null,
        ifscCode: ifscCode || null,
        accountNumber: accountNumber || null,
        status: 'pending' // Default status
      }).returning();

      console.log('Affiliate application saved to DB:', savedApplication[0].id);

      // TODO: Send email notification to applicant
      // For now, just send email notification to admin
      const HR_EMAIL = process.env.HR_EMAIL || 'apurva@poppik.in';

      const emailSubject = `New Affiliate Application - ${firstName} ${lastName}`;
      const emailBody = `
Dear Admin,

A new affiliate application has been received.

APPLICANT DETAILS:
------------------
Application ID: #${savedApplication.id}
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Address: ${address}, ${city}, ${state} - ${pincode}

BANKING DETAILS:
----------------
Bank Name: ${bankName || 'Not provided'}
Branch Name: ${branchName || 'Not provided'}
IFSC Code: ${ifscCode || 'Not provided'}
Account Number: ${accountNumber ? '****' + accountNumber.slice(-4) : 'Not provided'}

Please review this application in the admin panel at:
${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/admin/affiliate-applications` : 'Admin Panel'}

Best regards,
Poppik Affiliate Portal
      `;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">New Affiliate Application #${savedApplication.id}</h2>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Application ID:</td>
                <td style="padding: 8px;">#${savedApplication.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Name:</td>
                <td style="padding: 8px;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Phone:</td>
                <td style="padding: 8px;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Address:</td>
                <td style="padding: 8px;">${address}, ${city}, ${state} - ${pincode}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333;">Banking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Bank Name:</td>
                <td style="padding: 8px;">${bankName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Branch Name:</td>
                <td style="padding: 8px;">${branchName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">IFSC Code:</td>
                <td style="padding: 8px;">${ifscCode || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Account Number:</td>
                <td style="padding: 8px;">${accountNumber ? '****' + accountNumber.slice(-4) : 'Not provided'}</td>
              </tr>
            </table>
          </div>
        </div>
      `;

      console.log('Sending affiliate application email to:', HR_EMAIL);

      try {
        // Send email notification
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'affiliates@poppik.in',
          to: HR_EMAIL,
          subject: emailSubject,
          text: emailBody,
          html: emailHtml
        });

        console.log('✅ Affiliate application email sent successfully');

        res.json({
          success: true,
          message: 'Application submitted successfully! Our team will review your application and get back to you within 5-7 business days.',
          applicationId: savedApplication.id
        });

      } catch (emailError) {
        console.error('❌ Failed to send affiliate application email:', emailError);

        // Still return success to user since application was saved to database
        res.json({
          success: true,
          message: 'Application submitted successfully! Our team will review your application and get back to you within 5-7 business days.',
          applicationId: savedApplication.id,
          emailSent: false
        });
      }

    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
    }
  });

  // Get user's affiliate application
  app.get('/api/affiliate/my-application', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      console.log('Fetching affiliate application for userId:', userId);

      // Find application by userId using proper eq operator
      const application = await db
        .select()
        .from(schema.affiliateApplications)
        .where(eq(schema.affiliateApplications.userId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateApplications.createdAt))
        .limit(1);

      console.log('Application found:', application.length > 0 ? 'Yes' : 'No');

      if (!application || application.length === 0) {
        // Check localStorage fallback
        return res.status(404).json({ error: 'No application found' });
      }

      // Ensure status field exists - default to 'pending' if not set
      const appData = {
        ...application[0],
        status: application[0].status || 'pending'
      };

      console.log('Application data:', {
        id: appData.id,
        userId: appData.userId,
        status: appData.status,
        email: appData.email
      });

      res.json(appData);
    } catch (error) {
      console.error('Error fetching affiliate application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  });

  // Get affiliate stats with wallet details
  app.get('/api/affiliate/stats', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Generate affiliate code for tracking
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, parseInt(userId as string)))
        .limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Format user ID as 2-digit number (01, 02, 03, etc.)
      const formattedUserId = userId.toString().padStart(2, '0');
      const affiliateCode = `POPPIKAP${formattedUserId}`;

      // Get wallet data
      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId as string)))
        .limit(1);

      // Get sales data
      const sales = await db
        .select()
        .from(schema.affiliateSales)
        .where(eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)));

      // Get clicks data
      const clicks = await db
        .select()
        .from(schema.affiliateClicks)
        .where(eq(schema.affiliateClicks.affiliateUserId, parseInt(userId as string)));

      const totalClicks = clicks.length;
      const totalConversions = sales.length;
      const totalEarnings = wallet && wallet[0] ? parseFloat(wallet[0].totalEarnings || '0') : 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const avgCommission = totalConversions > 0 ? totalEarnings / totalConversions : 0;

      res.json({
        affiliateCode,
        totalClicks,
        totalConversions,
        totalEarnings,
        conversionRate,
        avgCommission,
        pendingAmount: wallet && wallet.length > 0 ? parseFloat(wallet[0].pendingBalance?.toString() || '0') : 0,
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate stats' });
    }
  });

  // Get affiliate sales history
  app.get('/api/affiliate/sales', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Check if user is an approved affiliate
      const application = await db
        .select()
        .from(schema.affiliateApplications)
        .where(eq(schema.affiliateApplications.userId, parseInt(userId as string)))
        .limit(1);

      if (!application || application.length === 0 || application[0].status !== 'approved') {
        return res.status(403).json({ error: 'Not an approved affiliate' });
      }

      // Fetch affiliate sales with detailed information
      const sales = await db
        .select({
          id: schema.affiliateSales.id,
          orderId: schema.affiliateSales.orderId,
          productName: schema.affiliateSales.productName,
          productId: schema.affiliateSales.productId,
          comboId: schema.affiliateSales.comboId,
          customerName: schema.affiliateSales.customerName,
          customerEmail: schema.affiliateSales.customerEmail,
          customerPhone: schema.affiliateSales.customerPhone,
          saleAmount: schema.affiliateSales.saleAmount,
          commissionRate: schema.affiliateSales.commissionRate,
          commissionAmount: schema.affiliateSales.commissionAmount,
          status: schema.affiliateSales.status,
          createdAt: schema.affiliateSales.createdAt,
          paidAt: schema.affiliateSales.paidAt,
        })
        .from(schema.affiliateSales)
        .where(eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateSales.createdAt))
        .limit(100);

      res.json(sales);
    } catch (error) {
      console.error('Error fetching affiliate sales:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate sales' });
    }
  });

  // Get affiliate clicks
  app.get('/api/affiliate/clicks', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Fetch total clicks and recent clicks
      const clicks = await db
        .select()
        .from(schema.affiliateClicks)
        .where(eq(schema.affiliateClicks.affiliateUserId, parseInt(userId as string)))
        .orderBy(desc(schema.affiliateClicks.createdAt))
        .limit(50);

      const totalClicks = clicks.length;

      res.json({
        total: totalClicks,
        recent: clicks.slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching affiliate clicks:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate clicks' });
    }
  });

  // Get affiliate wallet stats for dashboard
  app.get('/api/affiliate/wallet/stats', async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // Get wallet
      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId as string)))
        .limit(1);

      // Get this month's sales
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthSales = await db
        .select()
        .from(schema.affiliateSales)
        .where(and(
          eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)),
          sql`${schema.affiliateSales.createdAt} >= ${firstDayOfMonth}`
        ));

      const thisMonthEarnings = thisMonthSales.reduce((sum, sale) => 
        sum + parseFloat(sale.commissionAmount || '0'), 0
      );

      // Get pending commission
      const allSales = await db
        .select()
        .from(schema.affiliateSales)
        .where(eq(schema.affiliateSales.affiliateUserId, parseInt(userId as string)));

      const pendingCommission = allSales
        .filter(s => s.status === 'confirmed')
        .reduce((sum, sale) => sum + parseFloat(sale.commissionAmount || '0'), 0);

      res.json({
        totalEarnings: wallet && wallet.length > 0 ? wallet[0].totalEarnings : '0.00',
        availableBalance: wallet && wallet.length > 0 ? wallet[0].commissionBalance : '0.00',
        pendingCommission: pendingCommission.toFixed(2),
        totalWithdrawn: wallet && wallet.length > 0 ? wallet[0].totalWithdrawn : '0.00',
        thisMonthEarnings: thisMonthEarnings.toFixed(2)
      });
    } catch (error) {
      console.error("Error fetching wallet stats:", error);
      res.status(500).json({ error: "Failed to fetch wallet stats" });
    }
  });

  // Admin endpoints for affiliate applications
  app.get('/api/admin/affiliate-applications', async (req, res) => {
    try {
      const applications = await db
        .select()
        .from(schema.affiliateApplications)
        .orderBy(desc(schema.affiliateApplications.createdAt));

      res.json(applications);
    } catch (error) {
      console.error('Error fetching affiliate applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  app.get('/api/admin/affiliate-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await db
        .select()
        .from(schema.affiliateApplications)
        .where(eq(schema.affiliateApplications.id, id))
        .limit(1);

      if (!application || application.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json(application[0]);
    } catch (error) {
      console.error('Error fetching affiliate application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  });

  app.put('/api/admin/affiliate-applications/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const [updatedApplication] = await db
        .update(schema.affiliateApplications)
        .set({
          status,
          reviewNotes: notes,
          reviewedAt: new Date()
        })
        .where(eq(schema.affiliateApplications.id, parseInt(id)))
        .returning();

      if (!updatedApplication) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // If approved, create affiliate wallet
      if (status === 'approved' && updatedApplication.userId) {
        try {
          const existingWallet = await db
            .select()
            .from(schema.affiliateWallet)
            .where(eq(schema.affiliateWallet.userId, updatedApplication.userId))
            .limit(1);

          if (existingWallet.length === 0) {
            await db.insert(schema.affiliateWallet).values({
              userId: updatedApplication.userId,
              cashbackBalance: "0.00",
              commissionBalance: "0.00",
              totalEarnings: "0.00",
              totalWithdrawn: "0.00"
            });
            console.log(`✅ Affiliate wallet created for user ${updatedApplication.userId}`);
          }
        } catch (walletError) {
          console.error('Error creating affiliate wallet:', walletError);
        }
      }

      // Send email notification
      try {
        const formattedUserId = updatedApplication.userId.toString().padStart(2, '0');
        const affiliateCode = `POPPIKAP${formattedUserId}`;
        const dashboardUrl = process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/affiliate-dashboard`
          : 'https://poppik.in/affiliate-dashboard';

        const emailSubject = status === 'approved' 
          ? 'Welcome to the Poppik Lifestyle Private Limited Affiliate Program'
          : 'Update on Your Poppik Affiliate Application';

        const emailHtml = status === 'approved'
          ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to the Poppik Lifestyle Private Limited Affiliate Program</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Dear <strong>${updatedApplication.firstName}</strong>,</p>
              <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 0 0 20px 0;">
                We are delighted to welcome you as an official affiliate partner of Poppik Lifestyle Private Limited.
              </p>
              <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 0 0 30px 0;">
                Your skills and dedication align perfectly with our vision, and we are excited to collaborate with you. As a valued member of our affiliate program, you now have access to your unique referral link, marketing materials, and performance dashboard to help you start promoting our brand effectively.
              </p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px;">Your Unique Affiliate Code</p>
                <p style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">${affiliateCode}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 16px; color: #555555; margin: 0 0 15px 0;">
                  Please log in to your affiliate account here:
                </p>
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #e74c3c; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  Access Dashboard
                </a>
              </div>
              <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 30px 0 20px 0;">
                If you have any questions or need assistance, don't hesitate to contact our support team at <a href="mailto:info@poppik.in" style="color: #e74c3c; text-decoration: none;">info@poppik.in</a>.
              </p>
              <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 0;">
                Thank you for joining us. We look forward to a successful and rewarding partnership.
              </p>
            </div>
            <div style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 5px 0;">
                © 2024 Poppik Lifestyle Private Limited. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Office No.- 213, A- Wing, Skylark Building, Plot No.- 63, Sector No.- 11, C.B.D. Belapur, Navi Mumbai- 400614 INDIA
              </p>
            </div>
          </div>`
          : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #6c757d; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Poppik Affiliate Application Update</h1>
            </div>
            <div style="background: white; padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Dear <strong>${updatedApplication.firstName} ${updatedApplication.lastName}</strong>,</p>
              <p style="font-size: 16px; color: #555555; line-height: 1.6;">
                Thank you for your interest in the Poppik Affiliate Program. After careful review, we are unable to approve your application at this time.
              </p>
              ${notes ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>Reason:</strong> ${notes}</p>
              </div>` : ''}
              <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 20px 0 0 0;">
                We encourage you to reapply in the future. Keep creating amazing content!
              </p>
              <p style="font-size: 14px; color: #999999; margin: 20px 0 0 0;">
                Questions? Contact us at <a href="mailto:info@poppik.in" style="color: #e74c3c;">info@poppik.in</a>
              </p>
            </div>
            <div style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 5px 0;">© 2024 Poppik Lifestyle Private Limited</p>
            </div>
          </div>`;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'info@poppik.in',
          to: updatedApplication.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Affiliate ${status} email sent to: ${updatedApplication.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
      }

      res.json({ 
        success: true, 
        message: `Application ${status} successfully`,
        application: updatedApplication 
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  });

  app.delete('/api/admin/affiliate-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(schema.affiliateApplications)
        .where(eq(schema.affiliateApplications.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
      console.error('Error deleting affiliate application:', error);
      res.status(500).json({ error: 'Failed to delete application' });
    }
  });

  // Influencer Applications Routes

  // Submit influencer application (public)
  app.post('/api/influencer-applications', async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        contactNumber, 
        fullAddress, 
        landmark, 
        city, 
        pinCode, 
        state, 
        country,
        instagramProfile,
        youtubeChannel,
        facebookProfile
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !contactNumber || !fullAddress || !city || !pinCode || !state || !country) {
        return res.status(400).json({ error: 'All required fields must be provided' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      // Save to database
      const [savedApplication] = await db.insert(schema.influencerApplications).values({
        firstName,
        lastName,
        email,
        contactNumber,
        fullAddress,
        landmark: landmark || null,
        city,
        pinCode,
        state,
        country,
        instagramProfile: instagramProfile || null,
        youtubeChannel: youtubeChannel || null,
        facebookProfile: facebookProfile || null,
        status: 'pending'
      }).returning();

      console.log('Influencer application created:', savedApplication.id);

      res.json({
        success: true,
        message: 'Application submitted successfully! We will review your application and get back to you soon.',
        applicationId: savedApplication.id
      });
    } catch (error) {
      console.error('Error submitting influencer application:', error);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  });

  // Admin endpoints for influencer applications
  app.get('/api/admin/influencer-applications', async (req, res) => {
    try {
      const applications = await storage.getInfluencerApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching influencer applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  app.get('/api/admin/influencer-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getInfluencerApplication(id);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json(application);
    } catch (error) {
      console.error('Error fetching influencer application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  });

  app.put('/api/admin/influencer-applications/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const application = await storage.updateInfluencerApplicationStatus(id, status);

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json({ 
        success: true, 
        message: `Application ${status} successfully`,
        application 
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  });

  app.delete('/api/admin/influencer-applications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInfluencerApplication(id);
      res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
      console.error('Error deleting influencer application:', error);
      res.status(500).json({ error: 'Failed to delete application' });
    }
  });

  // Job Positions Management Routes

  // Get all job positions (public)
  app.get('/api/job-positions', async (req, res) => {
    try {
      console.log('GET /api/job-positions - Fetching all job positions');

      // Auto-expire old job positions
      try {
        await storage.autoExpireJobPositions();
      } catch (expireError) {
        console.log('Auto-expire error (continuing):', expireError.message);
      }

      // Get all positions (both active and inactive)
      const positions = await storage.getAllJobPositions();
      console.log('Total positions found:', positions.length);
      console.log('Positions data:', JSON.stringify(positions, null, 2));

      // Parse JSONB fields for all positions
      const parsedPositions = positions.map(position => ({
        ...position,
        responsibilities: typeof position.responsibilities === 'string' 
          ? JSON.parse(position.responsibilities) 
          : position.responsibilities,
        requirements: typeof position.requirements === 'string' 
          ? JSON.parse(position.requirements) 
          : position.requirements,
        skills: typeof position.skills === 'string' 
          ? JSON.parse(position.skills) 
          : position.skills,
      }));

      res.json(parsedPositions);
    } catch (error) {
      console.error('Error fetching job positions:', error);
      res.status(500).json({ error: 'Failed to fetch job positions' });
    }
  });

  app.get("/api/job-positions/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      console.log(`GET /api/job-positions/${slug} - Fetching job position`);

      // Auto-expire positions
      await storage.autoExpireJobPositions();

      const position = await storage.getJobPositionBySlug(slug);

      if (!position) {
        return res.status(404).json({ error: 'Job position not found' });
      }

      // Parse JSONB fields if they are strings
      const parsedPosition = {
        ...position,
        responsibilities: typeof position.responsibilities === 'string' 
          ? JSON.parse(position.responsibilities) 
          : position.responsibilities,
        requirements: typeof position.requirements === 'string' 
          ? JSON.parse(position.requirements) 
          : position.requirements,
        skills: typeof position.skills === 'string' 
          ? JSON.parse(position.skills) 
          : position.skills,
      };

      res.json(parsedPosition);
    } catch (error) {
      console.error('Error fetching job position:', error);
      res.status(500).json({ error: 'Failed to fetch job position' });
    }
  });

  // Admin endpoints for job positions management
  app.get('/api/admin/job-positions', async (req, res) => {
    try {
      console.log('GET /api/admin/job-positions - Fetching all job positions for admin');

      const positions = await storage.getJobPositions();
      console.log('Total positions found for admin:', positions.length);

      res.json(positions);
    } catch (error) {
      console.error('Error fetching job positions:', error);
      res.status(500).json({ error: 'Failed to fetch job positions' });
    }
  });

  app.post('/api/admin/job-positions', async (req, res) => {
    try {
      console.log('Creating job position with data:', req.body);

      // Validate required fields
      if (!req.body.title || !req.body.department || !req.body.location || !req.body.type) {
        return res.status(400).json({ 
          error: 'Missing required fields: title, department, location, and type are required' 
        });
      }

      const slug = req.body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Set expiry date to 15 days from now if not provided
      const expiresAt = req.body.expiresAt 
        ? new Date(req.body.expiresAt) 
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const positionData = {
        title: req.body.title,
        slug,
        department: req.body.department,
        location: req.body.location,
        type: req.body.type,
        jobId: req.body.jobId || null,
        experienceLevel: req.body.experienceLevel || 'Entry Level',
        workExperience: req.body.workExperience || '0-1 years',
        education: req.body.education || 'Bachelor\'s Degree',
        description: req.body.description || '',
        aboutRole: req.body.aboutRole || '',
        responsibilities: Array.isArray(req.body.responsibilities) 
          ? req.body.responsibilities 
          : (typeof req.body.responsibilities === 'string' ? JSON.parse(req.body.responsibilities || '[]') : []),
        requirements: Array.isArray(req.body.requirements) 
          ? req.body.requirements 
          : (typeof req.body.requirements === 'string' ? JSON.parse(req.body.requirements || '[]') : []),
        skills: Array.isArray(req.body.skills) 
          ? req.body.skills 
          : (typeof req.body.skills === 'string' ? JSON.parse(req.body.skills || '[]') : []),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        expiresAt,
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      console.log('Processed position data:', positionData);

      const position = await storage.createJobPosition(positionData);
      console.log('Job position created successfully:', position);

      res.status(201).json(position);
    } catch (error) {
      console.error('Error creating job position:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ 
        error: 'Failed to create job position',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.put('/api/admin/job-positions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        slug: req.body.title ? req.body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : undefined,
        responsibilities: req.body.responsibilities ? (Array.isArray(req.body.responsibilities) ? req.body.responsibilities : JSON.parse(req.body.responsibilities)) : undefined,
        requirements: req.body.requirements ? (Array.isArray(req.body.requirements) ? req.body.requirements : JSON.parse(req.body.requirements)) : undefined,
        skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : JSON.parse(req.body.skills)) : undefined,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      };

      const position = await storage.updateJobPosition(id, updateData);
      if (!position) {
        return res.status(404).json({ error: 'Job position not found' });
      }
      res.json(position);
    } catch (error) {
      console.error('Error updating job position:', error);
      res.status(500).json({ error: 'Failed to update job position' });
    }
  });

  app.delete('/api/admin/job-positions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJobPosition(id);
      if (!success) {
        return res.status(404).json({ error: 'Job position not found' });
      }
      res.json({ message: 'Job position deleted successfully' });
    } catch (error) {
      console.error('Error deleting job position:', error);
      res.status(500).json({ error: 'Failed to delete job position' });
    }
  });

  // Testimonials Management Routes

  // Public endpoints for testimonials
  app.get('/api/testimonials', async (req, res) => {
    try {
      const testimonials = await storage.getActiveTestimonials();
      // Map customer_image to customerImageUrl for frontend compatibility
      const formattedTestimonials = testimonials.map(t => ({
        id: t.id,
        customerName: t.customerName,
        customerImageUrl: t.customerImage,
        rating: t.rating,
        content: t.reviewText,
        isActive: t.isActive,
        createdAt: t.createdAt,
      }));
      res.json(formattedTestimonials);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
  });

  // Admin endpoints for testimonials management
  app.get('/api/admin/testimonials', async (req, res) => {
    try {
      const testimonials = await storage.getTestimonials();
      // Map customer_image to customerImage for admin panel
      const formattedTestimonials = testimonials.map(t => ({
        ...t,
        customerImage: t.customerImage || t.customer_image,
      }));
      res.json(formattedTestimonials);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
  });

  app.get('/api/admin/testimonials/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testimonial = await storage.getTestimonial(id);
      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonial not found' });
      }
      res.json(testimonial);
    } catch (error) {
      console.error('Error fetching testimonial:', error);
      res.status(500).json({ error: 'Failed to fetch testimonial' });
    }
  });

  app.post('/api/admin/testimonials', upload.single('image'), async (req, res) => {
    try {
      let customerImage = req.body.customerImage;

      // Handle image upload
      if (req.file) {
        customerImage = `/api/images/${req.file.filename}`;
      }

      const testimonialData = {
        customerName: req.body.customerName,
        customerImage: customerImage || null,
        rating: parseInt(req.body.rating) || 5,
        reviewText: req.body.reviewText,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      const testimonial = await storage.createTestimonial(testimonialData);
      res.status(201).json(testimonial);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: 'Failed to create testimonial' });
    }
  });

  app.put('/api/admin/testimonials/:id', upload.single('image'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let updateData: any = {
        customerName: req.body.customerName,
        rating: parseInt(req.body.rating) || 5,
        reviewText: req.body.reviewText,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      // Handle image upload
      if (req.file) {
        updateData.customerImage = `/api/images/${req.file.filename}`;
      } else if (req.body.customerImage) {
        updateData.customerImage = req.body.customerImage;
      }

      const testimonial = await storage.updateTestimonial(id, updateData);
      if (!testimonial) {
        return res.status(404).json({ error: 'Testimonial not found' });
      }
      res.json(testimonial);
    } catch (error) {
      console.error('Error updating testimonial:', error);
      res.status(500).json({ error: 'Failed to update testimonial' });
    }
  });

  app.delete('/api/admin/testimonials/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTestimonial(id);
      if (!success) {
        return res.status(404).json({ error: 'Testimonial not found' });
      }
      res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ error: 'Failed to delete testimonial' });
    }
  });

  // Public category sliders endpoint (for frontend display)
  app.get('/api/categories/slug/:slug/sliders', async (req, res) => {
    try {
      const { slug } = req.params;
      console.log('Fetching sliders for category slug:', slug);

      // First get the category by slug
      const category = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, slug))
        .limit(1);

      if (!category || category.length === 0) {
        console.log('Category not found for slug:', slug);
        // Return empty array instead of error to prevent UI issues
        return res.json([]);
      }

      const categoryId = category[0].id;
      console.log('Found category ID:', categoryId);

      // Get active sliders for this category
      try {
        const slidersResult = await db
          .select()
          .from(schema.categorySliders)
          .where(and(
            eq(schema.categorySliders.categoryId, categoryId),
            eq(schema.categorySliders.isActive, true)
          ))
          .orderBy(asc(schema.categorySliders.sortOrder));

        console.log('Found sliders count:', slidersResult.length);
        // Always return an array, even if empty
        res.json(slidersResult || []);
      } catch (tableError) {
        console.log('Error querying category sliders, returning empty array:', tableError.message);
        // Return empty array on any database error
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching category sliders by slug:', error);
      // Return empty array instead of error to prevent UI breakage
      res.json([]);
    }
  });

  // General slider management routes
  app.get('/api/admin/sliders', async (req, res) => {
    try {
      const allSliders = await db.select().from(schema.sliders).orderBy(desc(schema.sliders.sortOrder));
      res.json(allSliders);
    } catch (error) {
      console.error('Error fetchingsliders:', error);
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

      const [newSlider] = await db.insert(schema.sliders).values({
        title: 'Uploaded Image', // Default title
        subtitle: '',
        description: 'New slider image uploaded',
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

      const [updatedSlider] = await db.update(schema.sliders)
        .set({
          title: body.title,
          subtitle: body.subtitle,
          description: body.description,
          imageUrl: imageUrl,
          badge: body.badge,
          primaryActionText: body.primaryActionText,
          primaryActionUrl: body.primaryActionUrl,
          isActive: body.isActive === 'true',
          sortOrder: parseInt(body.sortOrder, 10),
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.sliders.id, id))
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
    try{
      const id = parseInt(req.params.id);

      const [deletedSlider] = await db.delete(schema.sliders)
        .where(eq(schema.sliders.id, id))
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

  // Get product images
  app.get("/api/products/:productId/images", async (req, res) => {
    try {
      const { productId } = req.params;
      const images = await storage.getProductImages(parseInt(productId));
      res.json(images);
    } catch (error) {
      console.error("Error fetching product images:", error);
      res.status(500).json({ error: "Failed to fetch product images" });
    }
  });

  // Get product shades
  app.get("/api/products/:productId/shades", async (req, res) => {
    try {
      const { productId } = req.params;
      console.log("Fetching shades for product:", productId);

      // Fetch all active shades with associations
      const allShades = await storage.getActiveShadesWithAssociations();
      console.log("Total active shades found:", allShades.length);

      // Filter shades to only include those specifically assigned to this product
      const applicableShades = allShades.filter(shade => {
        // If the shade has specific productIds and this product is in it, include it
        if (shade.productIds && Array.isArray(shade.productIds) && shade.productIds.includes(parseInt(productId))) {
          return true;
        }
        return false;
      });

      console.log(`Found ${applicableShades.length} shades for product ${productId}`);
      res.json(applicableShades);
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

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      console.log("Updating product:", productId, "with data:", req.body);

      // Process cashback fields
      const updateData = {
        ...req.body,
        cashbackPercentage: req.body.cashbackPercentage ? Number(req.body.cashbackPercentage) : null,
        cashbackPrice: req.body.cashbackPrice ? Number(req.body.cashbackPrice) : null
      };

      const product = await storage.updateProduct(productId, updateData);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Handle product images update if provided
      if (req.body.images && Array.isArray(req.body.images)) {
        // Delete existing images
        await db.delete(schema.productImages).where(eq(schema.productImages.productId, parseInt(id)));

        // Remove duplicates and insert new images
        const uniqueImages = Array.from(new Set(req.body.images.filter(url => url && url.trim() !== '')));
        console.log("Updating product with unique images:", uniqueImages.length);

        if (uniqueImages.length > 0) {
          await Promise.all(
            uniqueImages.map(async (imageUrl: string, index: number) => {
              await db.insert(schema.productImages).values({
                productId: parseInt(id),
                imageUrl: imageUrl,
                altText: `${req.body.name || 'Product'} - Image ${index + 1}`,
                isPrimary: index === 0,
                sortOrder: index
              });
            })
          );
        }
      }

      res.json(product);
    } catch (error) {
      console.error("Product update error:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      console.log(`DELETE /api/products/${id} - Request received`);

      if (isNaN(productId)) {
        console.log(`Invalid product ID: ${id}`);
        return res.status(400).json({
          error: "Invalid product ID",
          success: false
        });
      }

      console.log(`Attempting to delete product with ID: ${productId}`);

      // Check if product exists before deletion
      let existingProduct;
      try {
        existingProduct = await storage.getProduct(productId);
      } catch (error) {
        console.error(`Error checking if product exists: ${error.message}`);
        return res.status(500).json({
          error: "Database error while checking product",
          success: false
        });
      }

      if (!existingProduct) {
        console.log(`Product with ID ${productId} not found`);
        return res.status(404).json({
          error: "Product not found",
          success: false,
          productId
        });
      }

      console.log(`Found product to delete: ${existingProduct.name}`);

      // Perform deletion
      let success;
      try {
        success = await storage.deleteProduct(productId);
      } catch (error) {
        console.error(`Error during product deletion: ${error.message}`);
        return res.status(500).json({
          error: "Database error during deletion",
          success: false,
          details: error.message
        });
      }

      if (!success) {
        console.log(`Failed to delete product ${productId} from database`);
        return res.status(500).json({
          error: "Failed to delete product from database",
          success: false,
          productId
        });
      }

      console.log(`Successfully deleted product ${productId} from database`);

      // Verify deletion by trying to fetch the product again
      try {
        const verifyDelete = await storage.getProduct(productId);
        if (verifyDelete) {
          console.log(`WARNING: Product ${productId} still exists after delete operation`);
          return res.status(500).json({
            error: "Product deletion verification failed - product still exists",
            success: false,
            productId
          });
        }
      } catch (error) {
        // This is expected - the product should not exist anymore
        console.log(`Verification confirmed: Product ${productId} no longer exists`);
      }

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        productId: productId
      });

    } catch (error) {
      console.error("Unexpected product deletion error:", error);
      res.status(500).json({
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      });
    }
  });

  // Get single combo by ID
  app.get("/api/combos/:id", async (req, res) => {
    try {
      const comboId = parseInt(req.params.id);

      if (isNaN(comboId)) {
        return res.status(400).json({ message: "Invalid combo ID" });
      }

      const combo = await db.query.combos.findFirst({
        where: eq(schema.combos.id, comboId),
      });

      if (!combo) {
        return res.status(404).json({ message: "Combo not found" });
      }

      // Fetch images from combo_images table
      const images = await db
        .select()
        .from(schema.comboImages)
        .where(eq(schema.comboImages.comboId, comboId))
        .orderBy(asc(schema.comboImages.sortOrder));

      // Parse products if it's a string
      const comboData = {
        ...combo,
        products: typeof combo.products === 'string'
          ? JSON.parse(combo.products)
          : combo.products,
        imageUrls: images.length > 0 
          ? images.map(img => img.imageUrl)
          : [combo.imageUrl] // Fallback to the main imageUrl if no specific combo_images
      };

      res.json(comboData);
    } catch (error: any) {
      console.error("Error fetching combo:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get combo reviews
  app.get("/api/combos/:comboId/reviews", async (req, res) => {
    try {
      const { comboId } = req.params;
      const reviews = await storage.getComboReviews(parseInt(comboId));
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching combo reviews:", error);
      res.status(500).json({ error: "Failed to fetch combo reviews" });
    }
  });

  // Check if user can review combo
  app.get("/api/combos/:comboId/can-review", async (req, res) => {
    try {
      const { comboId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.json({
          canReview: false,
          message: "Please login to submit a review"
        });
      }

      const canReview = await storage.checkUserCanReviewCombo(parseInt(userId as string), parseInt(comboId));
      res.json(canReview);
    } catch (error) {
      console.error("Error checking combo review eligibility:", error);
      res.status(500).json({ 
        canReview: false,
        message: "Error checking review eligibility"
      });
    }
  });

  // Create combo review
  app.post("/api/combos/:comboId/reviews", async (req, res) => {
    try {
      const { comboId } = req.params;
      const { rating, title, comment, userName, orderId } = req.body;
      const user = req.user; // Assuming user is attached to req after auth middleware

      if (!user) {
        return res.status(401).json({ error: "Please login to submit a review" });
      }

      // Check if user can review this combo
      const canReview = await storage.checkUserCanReviewCombo(user.id, parseInt(comboId));
      if (!canReview.canReview) {
        return res.status(403).json({ error: canReview.message });
      }

      const reviewData = {
        userId: user.id,
        comboId: parseInt(comboId),
        orderId: orderId || canReview.orderId, // Use orderId from body or from checkUserCanReviewCombo
        rating: parseInt(rating),
        title: title || null,
        comment: comment || null,
        userName: userName || `${user.firstName} ${user.lastName}`,
        isVerified: true, // Assuming verified if they can review
      };

      const review = await db.insert(schema.comboReviews).values(reviewData).returning();
      res.json(review[0]);
    } catch (error) {
      console.error("Error creating combo review:", error);
      res.status(500).json({ error: "Failed to create combo review"
      });
    }
  });

  // ========== PUSH NOTIFICATIONS ROUTES ==========

  /**
   * POST /api/notifications/subscribe
   * Save push notification subscription to the database
   */
  app.post("/api/notifications/subscribe", async (req: Request, res: Response) => {
    try {
      const { subscription, timestamp, email } = req.body;
      const token = req.headers.authorization?.split(" ")[1];

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      // Decode JWT to get user info if authenticated
      let userId: number | null = null;
      if (token) {
        try {
          const decoded: any = jwt.verify(
            token,
            process.env.JWT_SECRET || "your-secret-key"
          );
          userId = decoded.id;
        } catch (error) {
          console.warn("⚠️ Invalid JWT token for push subscription");
        }
      }

      // Check if subscription already exists
      const existingSubscription = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.endpoint, subscription.endpoint))
        .limit(1);

      if (existingSubscription.length > 0) {
        // Update existing subscription
        const updated = await db
          .update(schema.pushSubscriptions)
          .set({
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            isActive: true,
            updatedAt: new Date(),
            userAgent: req.headers["user-agent"] as string,
            email: email || null,
          })
          .where(eq(schema.pushSubscriptions.endpoint, subscription.endpoint))
          .returning();

        console.log(
          "✅ Push subscription updated:",
          subscription.endpoint.substring(0, 50) + "...",
          email ? `| Email: ${email}` : ""
        );
        return res.json({
          success: true,
          message: "Subscription updated",
          subscriptionId: updated[0].id,
        });
      }

      // Create new subscription
      const newSubscription = await db
        .insert(schema.pushSubscriptions)
        .values({
          userId,
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          userAgent: req.headers["user-agent"] as string,
          email: email || null,
          isActive: true,
        })
        .returning();

      console.log(
        "✅ New push subscription created:",
        subscription.endpoint.substring(0, 50) + "...",
        email ? `| Email: ${email}` : ""
      );

      res.json({
        success: true,
        message: "Subscription saved",
        subscriptionId: newSubscription[0].id,
      });
    } catch (error) {
      console.error("❌ Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  /**
   * POST /api/notifications/send
   * Send push notifications to users (admin only)
   * Body: { userId?, title, body, image?, url?, tag? }
   */
  app.post("/api/notifications/send", async (req: Request, res: Response) => {
    try {
      // Check admin authentication
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let isAdmin = false;
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );
        // Check if user is admin
        const user = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, decoded.id))
          .limit(1);

        if (user.length === 0 || user[0].role !== "admin") {
          return res.status(403).json({ error: "Forbidden: Admin access required" });
        }
        isAdmin = true;
      } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { userId, title, body, image, url, tag } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      // Get subscriptions to send to
      let subscriptions;
      if (userId) {
        // Send to specific user
        subscriptions = await db
          .select()
          .from(schema.pushSubscriptions)
          .where(
            and(
              eq(schema.pushSubscriptions.userId, userId),
              eq(schema.pushSubscriptions.isActive, true)
            )
          );
      } else {
        // Send to all active subscriptions
        subscriptions = await db
          .select()
          .from(schema.pushSubscriptions)
          .where(eq(schema.pushSubscriptions.isActive, true));
      }

      if (subscriptions.length === 0) {
        return res.status(404).json({
          error: "No active subscriptions found",
          sent: 0,
        });
      }

      // Prepare notification payload
      const notificationPayload = {
        title,
        body,
        image: image || "",
        url: url || "/",
        tag: tag || "poppik-notification",
      };

      // Send to all subscriptions (in production, you'd use a queue)
      let sentCount = 0;
      let failedCount = 0;

      for (const subscription of subscriptions) {
        try {
          // In production, integrate with web-push library:
          // import webpush from 'web-push';
          // await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));

          // For now, just log that we would send
          console.log(`📤 Would send notification to ${subscription.endpoint.substring(0, 50)}...`);

          // Update last used timestamp
          await db
            .update(schema.pushSubscriptions)
            .set({
              lastUsedAt: new Date(),
            })
            .where(eq(schema.pushSubscriptions.id, subscription.id));

          sentCount++;
        } catch (error) {
          console.error("❌ Failed to send to subscription:", error);
          failedCount++;

          // Mark as inactive if endpoint invalid
          if (
            error instanceof Error &&
            (error.message.includes("invalid") || error.message.includes("410"))
          ) {
            await db
              .update(schema.pushSubscriptions)
              .set({ isActive: false })
              .where(eq(schema.pushSubscriptions.id, subscription.id));
          }
        }
      }

      console.log(`✅ Notification send complete: ${sentCount} sent, ${failedCount} failed`);

      res.json({
        success: true,
        message: `Notification sent to ${sentCount} subscriptions`,
        sent: sentCount,
        failed: failedCount,
        total: subscriptions.length,
      });
    } catch (error) {
      console.error("❌ Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  /**
   * POST /api/notifications/send-offer
   * Send welcome offer notification when user enables push notifications
   * Body: { email, timestamp }
   */
  app.post("/api/notifications/send-offer", async (req: Request, res: Response) => {
    try {
      const { email, timestamp } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get the user's push subscriptions by email
      const subscriptions = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(
          and(
            eq(schema.pushSubscriptions.email, email),
            eq(schema.pushSubscriptions.isActive, true)
          )
        )
        .limit(1);

      if (subscriptions.length === 0) {
        return res.json({
          success: true,
          message: "No active subscription found for email",
          sent: 0,
        });
      }

      const subscription = subscriptions[0];

      // Prepare welcome offer notification
      const notificationPayload = {
        title: "Welcome to Poppik! 🎉",
        body: "Enjoy exclusive offers and updates just for you!",
        image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500",
        url: "/",
        tag: "poppik-welcome-offer",
      };

      try {
        // In production, integrate with web-push library:
        // import webpush from 'web-push';
        // await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));

        // For now, just log that we would send
        console.log(`📤 Sending welcome offer to ${email} (${subscription.endpoint.substring(0, 50)}...)`);

        // Update last used timestamp
        await db
          .update(schema.pushSubscriptions)
          .set({
            lastUsedAt: new Date(),
          })
          .where(eq(schema.pushSubscriptions.id, subscription.id));

        console.log(`✅ Welcome offer notification prepared for ${email}`);

        res.json({
          success: true,
          message: "Welcome offer notification sent",
          email,
          sent: 1,
        });
      } catch (error) {
        console.error("❌ Failed to send offer notification:", error);
        
        // Mark as inactive if endpoint invalid
        if (
          error instanceof Error &&
          (error.message.includes("invalid") || error.message.includes("410"))
        ) {
          await db
            .update(schema.pushSubscriptions)
            .set({ isActive: false })
            .where(eq(schema.pushSubscriptions.id, subscription.id));
        }

        res.status(500).json({ error: "Failed to send offer notification" });
      }
    } catch (error) {
      console.error("❌ Error in send-offer endpoint:", error);
      res.status(500).json({ error: "Failed to process offer notification" });
    }
  });

  /**
   * GET /api/notifications/status
   * Check if user has active push subscription
   */
  app.get("/api/notifications/status", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.json({ subscribed: false });
      }

      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );

        const subscriptions = await db
          .select()
          .from(schema.pushSubscriptions)
          .where(
            and(
              eq(schema.pushSubscriptions.userId, decoded.id),
              eq(schema.pushSubscriptions.isActive, true)
            )
          )
          .limit(1);

        res.json({
          subscribed: subscriptions.length > 0,
          subscriptionCount: subscriptions.length,
        });
      } catch (error) {
        return res.json({ subscribed: false });
      }
    } catch (error) {
      console.error("❌ Error checking notification status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}