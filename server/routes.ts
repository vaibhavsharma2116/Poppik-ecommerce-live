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
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }

  const requests = rateLimitMap.get(clientIP) || [];
  const recentRequests = requests.filter((time: number) => time > windowStart);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests" });
  }

  recentRequests.push(now);
  rateLimitMap.set(clientIP, recentRequests);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    const cutoff = now - (RATE_LIMIT_WINDOW * 2);
    rateLimitMap.forEach((times, ip) => {
      const validTimes = times.filter((time: number) => time > cutoff);
      if (validTimes.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, validTimes);
      }
    });
  }

  next();
}
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, sql, or, like, isNull, asc } from "drizzle-orm";
import { Pool } from "pg";
import { ordersTable, orderItemsTable, users, sliders, reviews, blogPosts, productImages, productShades, cashfreePayments, categorySliders, categories } from "../shared/schema";
import { DatabaseMonitor } from "./db-monitor";
// Database connection with enhanced configuration
const pool = new Pool({
 connectionString: process.env.DATABASE_URL || "postgresql://poppikuser:poppikuser@31.97.226.116:5432/poppikdb",
  ssl: false,  // force disable SSL
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
const dbMonitor = new DatabaseMonitor(pool);

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
    // Accept image and video files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", rateLimit);

  // Health check endpoint with database status
  app.get("/api/health", async (req, res) => {
    let dbStatus = "disconnected";
    let poolStats = {};

    try {
      await db.select().from(users).limit(1);
      dbStatus = "connected";
      poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    } catch (error) {
      dbStatus = "disconnected";
    }

    res.json({
      status: "OK",
      message: "API server is running",
      database: dbStatus,
      poolStats,
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
          imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
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

      const { firstName, lastName, email, phone, password, confirmPassword, dateOfBirth, address, city, state, pinCode } = req.body;

      // Validation
      if (!firstName || !lastName || !email || !password || !dateOfBirth || !address) {
        console.log("Missing required fields:", { firstName: !!firstName, lastName: !!lastName, email: !!email, password: !!password, dateOfBirth: !!dateOfBirth, address: !!address });
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
        password: hashedPassword,
        dateOfBirth: dateOfBirth.trim(),
        address: `${address.trim()}${city ? `, ${city.trim()}` : ''}${state ? `, ${state.trim()}` : ''}${pinCode ? ` - ${pinCode.trim()}` : ''}`
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

  app.post("/api/auth/logout", (res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Cashfree Payment Routes
  app.post('/api/payments/cashfree/create-order', async (req, res) => {
    try {
      const { amount, orderId, currency, customerDetails, orderNote, orderData } = req.body;

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
        await db.insert(cashfreePayments).values({
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
        await db.update(cashfreePayments)
          .set({
            status: isPaymentSuccessful ? 'completed' : 'failed',
            paymentId: statusResult.cf_order_id || null,
            completedAt: isPaymentSuccessful ? new Date() : null
          })
          .where(eq(cashfreePayments.cashfreeOrderId, orderId));

        // If payment is successful, create order in ordersTable for admin panel
        if (isPaymentSuccessful) {
          // Get cashfree payment details
          const cashfreePayment = await db
            .select()
            .from(cashfreePayments)
            .where(eq(cashfreePayments.cashfreeOrderId, orderId))
            .limit(1);

          if (cashfreePayment.length > 0) {
            const payment = cashfreePayment[0];
            const orderData = payment.orderData;

            // Check if order already exists in ordersTable
            const existingOrder = await db
              .select()
              .from(ordersTable)
              .where(eq(ordersTable.cashfreeOrderId, orderId))
              .limit(1);

            if (existingOrder.length === 0) {
              // Create order in ordersTable
              const [newOrder] = await db.insert(ordersTable).values({
                userId: payment.userId,
                totalAmount: payment.amount,
                status: 'processing',
                paymentMethod: 'Cashfree',
                shippingAddress: orderData.shippingAddress,
                cashfreeOrderId: orderId,
                paymentSessionId: statusResult.payment_session_id || null,
                paymentId: statusResult.cf_order_id || null,
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
                }));

                await db.insert(orderItemsTable).values(orderItems);
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

      console.log('🔗 Sending to:', `http://13.234.156.238/v1/sms/send`);
      console.log('📝 Request payload:', JSON.stringify(requestData, null, 2));

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

      console.log('📱 MDSSEND.IN Response Status:', response.status);
      console.log('📱 MDSSEND.IN Response:', JSON.stringify(result, null, 2));

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
      const { firstName, lastName, phone, dateOfBirth, address } = req.body;

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
        phone: phone ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
        address: address ? address.trim() : null
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
      console.log("GET /api/products - Fetching products...");

      res.setHeader('Content-Type', 'application/json');

      const products = await storage.getProducts();
      console.log("Products fetched:", products?.length || 0);

      if (!Array.isArray(products)) {
        console.warn("Products is not an array, returning empty array");
        return res.json([]);
      }

      // Get images for each product
      const productsWithImages = await Promise.all(
        products.map(async (product) => {
          try {
            const images = await storage.getProductImages(product.id);
            return {
              ...product,
              images: images.map(img => ({
                id: img.id,
                url: img.imageUrl,
                isPrimary: img.isPrimary,
                sortOrder: img.sortOrder
              }))
            };
          } catch (imgError) {
            console.warn(`Failed to get images for product ${product.id}:`, imgError.message);
            return {
              ...product,
              images: []
            };
          }
        })
      );

      console.log("Returning products with images:", productsWithImages.length);
      res.json(productsWithImages);
    } catch (error) {
      console.error("Products API error:", error);
      console.log("Database unavailable, using sample product data");
      res.json([]);
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

      // Store product images if any were uploaded
      if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        try {
          console.log("Storing product images:", req.body.images);
          await Promise.all(
            req.body.images.map(async (imageUrl: string, index: number) => {
              await db.insert(productImages).values({
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
          'lips': ['lip', 'lipcare', 'lip care', 'lip-care'],
          'lip': ['lips', 'lipcare', 'lip care', 'lip-care'],
          'lipcare': ['lip', 'lips', 'lip care', 'lip-care'],
          'lip-care': ['lip', 'lips', 'lipcare', 'lip care'],
          'lip care': ['lip', 'lips', 'lipcare', 'lip-care'],
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

  // Sync Cashfree orders to ordersTable
  app.post("/api/admin/sync-cashfree-orders", async (req, res) => {
    try {
      console.log("Syncing Cashfree orders to ordersTable...");

      // Get all completed Cashfree payments
      const completedPayments = await db
        .select()
        .from(cashfreePayments)
        .where(eq(cashfreePayments.status, 'completed'));

      let syncedCount = 0;

      for (const payment of completedPayments) {
        // Check if order already exists in ordersTable
        const existingOrder = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.cashfreeOrderId, payment.cashfreeOrderId))
          .limit(1);

        if (existingOrder.length === 0) {
          try {
            const orderData = payment.orderData;

            // Create order in ordersTable
            const [newOrder] = await db.insert(ordersTable).values({
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

              await db.insert(orderItemsTable).values(orderItems);
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



  // Create new order (for checkout)
  app.post("/api/orders", async (req, res) => {
    try {
      console.log("Creating new order:", req.body);

      const { userId, totalAmount, status, paymentMethod, shippingAddress, items } = req.body;

      // Validation
      if (!userId || !totalAmount || !paymentMethod || !shippingAddress || !items) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
      }

      // Create the order
      const orderData = {
        userId: Number(userId),
        totalAmount: Number(totalAmount),
        status: status || 'pending',
        paymentMethod,
        shippingAddress,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      };

      const [newOrder] = await db.insert(ordersTable).values(orderData).returning();

      // Create order items
      const orderItems = items.map((item: any) => ({
        orderId: newOrder.id,
        productId: Number(item.productId),
        productName: item.productName,
        productImage: item.productImage,
        quantity: Number(item.quantity),
        price: item.price,
      }));

      await db.insert(orderItemsTable).values(orderItems);

      const orderId = `ORD-${newOrder.id.toString().padStart(3, '0')}`;

      console.log("Order created successfully:", orderId);

      res.status(201).json({
        success: true,
        message: "Order placed successfully",
        orderId,
        order: {
          ...newOrder,
          id: orderId
        }
      });

    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ 
        error: "Failed to create order",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

  // Generate sample categories for development with dynamic product count
  function generateSampleCategories() {
    const sampleProducts = generateSampleProducts();

    const baseCategories = [

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
      const db = await require('./storage').getDb();
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
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq(users.id, parseInt(userId))).limit(1);

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
      await db.update(blogPosts)
        .set({ comments: sql`${blogPosts.comments} + 1` })
        .where(eq(blogPosts.id, postId));

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
      // Filter only active categories and sort by sortOrder
      const activeCategories = categories
        .filter(cat => cat.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      res.json(activeCategories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      // Return default categories when database is unavailable
      const defaultCategories = [
        { id: 1, name: "Beauty Tips", slug: "beauty-tips", isActive: true, sortOrder: 1 },
        { id: 2, name: "Skincare", slug: "skincare", isActive: true, sortOrder: 2 },
        { id: 3, name: "Makeup", slug: "makeup", isActive: true, sortOrder: 3 },
        { id: 4, name: "Hair Care", slug: "hair-care", isActive: true, sortOrder: 4 },
        { id: 5, name: "Product Reviews", slug: "product-reviews", isActive: true, sortOrder: 5 }
      ];
      res.json(defaultCategories);
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
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
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

  // Category slider management routes
  app.get('/api/admin/categories/:categoryId/sliders', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      console.log('Fetching sliders for category ID:', categoryId);
      
      // Check if categorySliders table exists, if not return empty array
      try {
        const slidersResult = await db
          .select()
          .from(categorySliders)
          .where(eq(categorySliders.categoryId, categoryId))
          .orderBy(asc(categorySliders.sortOrder));
        
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
        .from(categories)
        .where(eq(categories.id, categoryId))
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

      const [newSlider] = await db.insert(categorySliders).values(sliderData).returning();

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
        .update(categorySliders)
        .set({
          imageUrl,
          title: title || '',
          subtitle: subtitle || '',
          isActive: isActive !== false,
          sortOrder: sortOrder || 0,
          updatedAt: new Date()
        })
        .where(eq(categorySliders.id, sliderId))
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
        .delete(categorySliders)
        .where(eq(categorySliders.id, sliderId))
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

  // Public endpoint for category sliders (for frontend display)
  app.get('/api/categories/slug/:categorySlug/sliders', async (req, res) => {
    try {
      const { categorySlug } = req.params;

      // First get the category by slug
      const category = await storage.getCategoryBySlug(categorySlug);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Get active sliders for this category
      const sliders = await db
        .select()
        .from(categorySliders)
        .where(and(
          eq(categorySliders.categoryId, category.id),
          eq(categorySliders.isActive, true)
        ))
        .orderBy(asc(categorySliders.sortOrder));

      res.json(sliders);
    } catch (error) {
      console.error('Error fetching public category sliders:', error);
      res.json([]); // Return empty array as fallback
    }
  });

  // General slider management routes
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

  // Get product shades
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

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      console.log("Updating product:", productId, "with data:", req.body);

      const product = await storage.updateProduct(productId, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Handle product images update if provided
      if (req.body.images && Array.isArray(req.body.images)) {
        try {
          console.log("Updating product images:", req.body.images);

          // Delete existing images
          await db.delete(productImages).where(eq(productImages.productId, productId));

          // Insert new images
          if (req.body.images.length > 0) {
            await Promise.all(
              req.body.images.map(async (imageUrl: string, index: number) => {
                await db.insert(productImages).values({
                  productId: productId,
                  imageUrl: imageUrl,
                  altText: `${product.name} - Image ${index + 1}`,
                  isPrimary: index === 0, // First image is primary
                  sortOrder: index
                });
              })
            );
          }

          console.log("Product images updated successfully");
        } catch (imageError) {
          console.error('Error updating product images:', imageError);
          // Continue even if image update fails
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
          console.log(`WARNING: Product ${productId} still existsafter delete operation`);
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
      const shades = await storage.getProductShades(parseInt(productId));
      res.json(shades);
    } catch (error) {
      console.error("Error fetching product shades:", error);
      res.status(500).json({ error: "Failed to fetch product shades" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}