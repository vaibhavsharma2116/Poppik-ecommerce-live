import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { OTPService } from "./otp-service";
import path from "path";
import { createAnnouncementsBroadcaster } from "./announcements-ws";
import fs from "fs";
import cookieParser from 'cookie-parser';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { adminAuthMiddleware as adminMiddleware } from "./admin-middleware";
import { IthinkInvoiceService } from "./ithink-invoice-service-wrapper";
import { IndiaPostInvoiceService } from "./india-post-invoice-service";
import nodemailer from 'nodemailer';
import { createMasterAdminRoutes } from "./master-admin-routes";
import webpush from 'web-push';
import { startNotificationScheduler } from './notificationScheduler';
import { startExpireScheduler } from './expireScheduler';
import { runExpirePassOnce } from './expireScheduler';
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

// Simple in-memory cache for product shades to reduce DB/load and avoid
// repeated computations on hot product pages. Entries expire after a short TTL.
const shadesCache: Map<string, { expires: number; data: any }> = new Map();

const pincodeExistsCache: Map<string, { expires: number; exists: boolean }> = new Map();

const pincodeValidateInFlight: Map<string, Promise<any>> = new Map();

let dataGovRateLimitUntil = 0;

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
import { eq, and, sql, or, like, isNull, asc, inArray } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../shared/schema"; // Import schema module
import { DatabaseMonitor } from "./db-monitor";
import IthinkServiceAdapter from "./ithink-service-adapter";
import type { InsertBlogCategory, InsertBlogSubcategory, InsertInfluencerApplication, PromoCode, PromoCodeUsage } from "../shared/schema";
import { users, ordersTable, orderItemsTable, cashfreePayments, affiliateApplications, affiliateClicks, affiliateSales, affiliateWallet, affiliateTransactions, blogPosts, blogCategories, blogSubcategories, contactSubmissions, categorySliders, videoTestimonials, announcements, combos, comboImages, jobPositions, influencerApplications, userWallet, userWalletTransactions, affiliateWallet as affiliateWalletSchema, affiliateApplications as affiliateApplicationsSchema } from "../shared/schema"; // Import users table explicitly
import type { Request, Response } from 'express'; // Import Request and Response types for clarity

// Initialize iThink service
const ithinkService = new IthinkServiceAdapter();
const ithinkInvoiceService = new IthinkInvoiceService(ithinkService);
const indiaPostInvoiceService = new IndiaPostInvoiceService();

async function fetchWithTimeout(url: string, init: any, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(init || {}), signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function validatePincodeViaPostalApi(pincode: string) {
  const normalized = String(pincode || '').trim();
  const url = `https://api.postalpincode.in/pincode/${normalized}`;
  const resp = await fetchWithTimeout(url, { method: 'GET' }, 10000);
  if (!resp.ok) {
    throw new Error(`postalpincode.in HTTP ${resp.status}`);
  }
  const json: any = await resp.json();
  const first = Array.isArray(json) ? json[0] : null;
  const ok = first && String(first.Status || '').toLowerCase() === 'success';
  const offices = first && Array.isArray(first.PostOffice) ? first.PostOffice : [];
  return ok && offices.length > 0;
}

async function validatePincodeBackend(pincode: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const debug: any = isDev ? { pincode: String(pincode || '').trim() } : undefined;

  const normalized = String(pincode || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    return { status: 'error', message: 'Invalid pincode format', pincode_valid: false, ...(isDev ? { debug: { ...debug, reason: 'format' } } : {}) };
  }

  const inFlight = pincodeValidateInFlight.get(normalized);
  if (inFlight) {
    try {
      return await inFlight;
    } catch (e) {
      return {
        status: 'error',
        message: 'Pincode validation service unavailable',
        pincode_valid: false,
        ...(isDev ? { debug: { ...debug, reason: 'inflight_failed' } } : {}),
      };
    }
  }

  const task = (async () => {

  if (dataGovRateLimitUntil && Date.now() < dataGovRateLimitUntil) {
    try {
      const remainingMs = dataGovRateLimitUntil - Date.now();
      console.warn('[pincode-validate] datagov cooldown active', { remainingMs });
    } catch {}

    try {
      const postalExists = await validatePincodeViaPostalApi(normalized);
      const exists = postalExists === true;
      pincodeExistsCache.set(normalized, { exists, expires: Date.now() + (exists ? 24*60*60*1000 : 6*60*60*1000) });
      return exists
        ? { status: 'success', message: 'Pincode is valid', pincode_valid: true, ...(isDev ? { debug: { ...debug, reason: 'cooldown_fallback', fallback: 'postalpincode_in' } } : {}) }
        : { status: 'invalid', message: 'Pincode does not exist', pincode_valid: false, ...(isDev ? { debug: { ...debug, reason: 'cooldown_fallback_not_found', fallback: 'postalpincode_in' } } : {}) };
    } catch (fallbackErr) {
      return {
        status: 'error',
        message: 'Pincode validation service unavailable',
        pincode_valid: false,
        ...(isDev ? { debug: { ...debug, reason: 'cooldown', remainingMs: Math.max(0, dataGovRateLimitUntil - Date.now()), fallback: 'postalpincode_in_failed', fallbackError: (fallbackErr as any)?.message || String(fallbackErr) } } : {}),
      };
    }
  }

  const cached = pincodeExistsCache.get(normalized);
  let exists = false;
  if (cached && cached.expires > Date.now()) {
    exists = cached.exists === true;
  } else {
    const apiKey = process.env.DATA_GOV_API_KEY || process.env.DATAGOV_API_KEY;
    if (!apiKey) {
      console.warn('[pincode-validate] missing api key', {
        has_DATA_GOV_API_KEY: !!process.env.DATA_GOV_API_KEY,
        has_DATAGOV_API_KEY: !!process.env.DATAGOV_API_KEY,
      });

      try {
        const postalExists = await validatePincodeViaPostalApi(normalized);
        exists = postalExists === true;
        pincodeExistsCache.set(normalized, { exists, expires: Date.now() + (exists ? 24*60*60*1000 : 6*60*60*1000) });
        return exists
          ? { status: 'success', message: 'Pincode is valid', pincode_valid: true, ...(isDev ? { debug: { ...debug, reason: 'missing_api_key_fallback', fallback: 'postalpincode_in' } } : {}) }
          : { status: 'invalid', message: 'Pincode does not exist', pincode_valid: false, ...(isDev ? { debug: { ...debug, reason: 'missing_api_key_fallback_not_found', fallback: 'postalpincode_in' } } : {}) };
      } catch (fallbackErr) {
        return {
          status: 'error',
          message: 'Pincode validation service unavailable',
          pincode_valid: false,
          ...(isDev ? { debug: { ...debug, reason: 'missing_api_key', has_DATA_GOV_API_KEY: !!process.env.DATA_GOV_API_KEY, has_DATAGOV_API_KEY: !!process.env.DATAGOV_API_KEY, fallback: 'postalpincode_in_failed', fallbackError: (fallbackErr as any)?.message || String(fallbackErr) } } : {}),
        };
      }
    }

    const RESOURCE_ID = process.env.DATAGOV_RESOURCE_ID || '5c2f62fe-5afa-4119-a499-fec9d604d5bd';
    const baseUrl = process.env.DATAGOV_BASE_URL || 'https://api.data.gov.in/resource';

    const u = new URL(String(baseUrl).replace(/\/$/, '') + '/' + RESOURCE_ID);
    u.searchParams.set('api-key', apiKey);
    u.searchParams.set('format', 'json');
    u.searchParams.set('filters[pincode]', normalized);
    u.searchParams.set('limit', '1');

    try {
      const resp = await fetchWithTimeout(u.toString(), { method: 'GET' }, 10000);
      if (!resp.ok) {
        let bodyText: string | null = null;
        try {
          bodyText = await resp.text();
        } catch {}

        console.warn('[pincode-validate] datagov non-200', {
          status: resp.status,
          statusText: resp.statusText,
          body: bodyText ? bodyText.slice(0, 300) : null,
        });

        if (isDev) {
          debug.reason = 'datagov_non_200';
          debug.httpStatus = resp.status;
          debug.httpStatusText = resp.statusText;
        }

        if (resp.status === 429) {
          const retryAfter = resp.headers.get('retry-after');
          const retrySeconds = retryAfter ? Number(retryAfter) : NaN;
          const backoffMs = Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : 5 * 60 * 1000;
          dataGovRateLimitUntil = Date.now() + backoffMs;

          try {
            const postalExists = await validatePincodeViaPostalApi(normalized);
            exists = postalExists === true;
            if (isDev) {
              debug.fallback = 'postalpincode_in';
              debug.fallbackExists = exists;
            }
          } catch (fallbackErr) {
            if (isDev) {
              debug.fallback = 'postalpincode_in_failed';
              debug.fallbackError = (fallbackErr as any)?.message || String(fallbackErr);
            }
            throw new Error('data.gov.in HTTP 429');
          }
        } else {
          throw new Error('data.gov.in HTTP ' + resp.status);
        }
      } else {
        const json: any = await resp.json();
        const records = json && Array.isArray(json.records) ? json.records : [];
        exists = Array.isArray(records) && records.length > 0;
      }
    } catch (e) {
      console.error('data.gov.in pincode validation failed:', e);
      return {
        status: 'error',
        message: 'Pincode validation service unavailable',
        pincode_valid: false,
        ...(isDev ? { debug } : {}),
      };
    }

    if (exists) {
      pincodeExistsCache.set(normalized, { exists: true, expires: Date.now() + 24*60*60*1000 });
    } else {
      pincodeExistsCache.set(normalized, { exists: false, expires: Date.now() + 6*60*60*1000 });
    }
  }

  if (!exists) {
    return { status: 'invalid', message: 'Pincode does not exist', pincode_valid: false, ...(isDev ? { debug: { ...debug, reason: 'not_found' } } : {}) };
  }

  return { status: 'success', message: 'Pincode is valid', pincode_valid: true, ...(isDev ? { debug: { ...debug, reason: 'ok' } } : {}) };
  })();

  pincodeValidateInFlight.set(normalized, task);
  try {
    return await task;
  } finally {
    pincodeValidateInFlight.delete(normalized);
  }
}

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

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

const isDataUrl = (value: unknown) => {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v.startsWith('data:image') || v.startsWith('data:video');
};

const assertNoDataUrls = (
  res: Response,
  fields: Array<{ key: string; value: unknown }>
) => {
  for (const field of fields) {
    const { key, value } = field;
    if (Array.isArray(value)) {
      if (value.some((v) => isDataUrl(v))) {
        res.status(400).json({
          error: `Invalid ${key}: data URLs are not allowed. Please upload the file and use the returned URL instead.`,
        });
        return false;
      }
    } else if (isDataUrl(value)) {
      res.status(400).json({
        error: `Invalid ${key}: data URLs are not allowed. Please upload the file and use the returned URL instead.`,
      });
      return false;
    }
  }
  return true;
};

// Helper function to safely get error properties
const getErrorProperties = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
      constraint: (error as any).constraint,
      detail: (error as any).detail,
      stack: (error as any).stack
    };
  }
  return { message: getErrorMessage(error) };
};

// Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");

  // Helper: normalize Indian mobile numbers to 10-digit form for consistency
  const normalizePhone = (raw?: string | null) => {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    // Strip country code 91 / +91
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.substring(2);
    }
    if (digits.length === 13 && digits.startsWith("091")) {
      return digits.substring(3);
    }
    if (digits.length === 11 && digits.startsWith("0")) {
      return digits.substring(1);
    }
    return digits;
  };
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
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
} as any);

// Function to send order notification email
async function sendOrderNotificationEmail(orderData: any) {
  const sendInDev = String(process.env.SEND_ORDER_EMAILS_IN_DEV || '').toLowerCase() === 'true';
  if (process.env.NODE_ENV !== 'production' && !sendInDev) return;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const { orderId, customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, totalAmount, items, deliveryPartner, deliveryType } = orderData;

  const emailSubject = `Poppik Lifestyle Order Confirmation - ${orderId}`;

  const formatRupee = (value: any) => {
    const s = String(value ?? '').trim();
    const n = parseFloat(s.replace(/[₹,\s]/g, ''));
    if (Number.isFinite(n)) return `₹${n.toFixed(2)}`;
    if (!s) return '';
    if (s.includes('₹')) return s.replace(/₹+/g, '₹');
    return `₹${s}`;
  };

  // Ensure images in emails are absolute URLs or inline attachments (CID).
  const baseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || process.env.SITE_URL || 'https://poppik.in').replace(/\/$/, '');

  // Use remote logo URL to avoid sending logo.png as an email attachment
  const logoHtmlSrc = 'https://poppik.in/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fpoppik-logo.31d60553.png&w=256&q=75';

  let itemHtml = '';
  items.forEach((item: any, idx: number) => {
    // Normalize product image to absolute URL or attach inline if file exists in uploads
    let imageSrc = item.productImage || '';

    // Handle Next.js optimized image URLs like "/_next/image?url=/path/to/file.png&w=256"
    if (imageSrc && imageSrc.includes('/_next/image')) {
      try {
        const m = imageSrc.match(/[?&]url=([^&]+)/i);
        if (m && m[1]) {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('/')) {
            imageSrc = `${baseUrl}${decoded}`;
          } else {
            imageSrc = decoded;
          }
        }
      } catch (e) {
        // If parsing fails, keep original imageSrc
      }
    }

    // If image is not an absolute URL, try to resolve it to a public URL (do NOT attach or inline images)
    if (imageSrc && !/^https?:\/\//i.test(imageSrc)) {
      if (imageSrc.startsWith('/')) {
        // Prefer public server URL for server-relative paths; do not attach
        imageSrc = `${baseUrl}${imageSrc}`;
      } else {
        // Could be just a filename stored in uploads - use public uploads URL
        imageSrc = `${baseUrl}/uploads/${imageSrc}`;
      }
    }

    // If still empty, use a placeholder image
    if (!imageSrc) {
      imageSrc = `${baseUrl}/images/placeholder.png`;
    }

    const unitPrice = formatRupee(item.price);
    const totalPrice = formatRupee(parseFloat(String(item.price).replace(/[₹,]/g, "")) * item.quantity);

    itemHtml += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 0; text-align: left;">${item.productName}</td>
        <td style="padding: 10px 0; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right;">${unitPrice}</td>
        <td style="padding: 10px 0; text-align: right;">${totalPrice}</td>
      </tr>
    `;
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px;">
        <img src="${logoHtmlSrc}" alt="Poppik Logo" style="width: 150px; margin-bottom: 10px;">
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
            <p style="margin: 0; font-size: 14px;"><strong>Total Amount:</strong> ${formatRupee(totalAmount)}</p>
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
        <p style="margin: 0 0 12px 0;">
          <a href="${baseUrl}/order-history?orderId=${encodeURIComponent(orderId)}" style="display: inline-block; background-color: #e74c3c; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Your Order</a>
        </p>
        <p style="color: #888; font-size: 13px;">
          You'll receive another email when your order ships. For any questions, please contact us at <a href="mailto:info@poppik.in" style="color: #e74c3c; text-decoration: none;">info@poppik.in</a>.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 10px;">
          2024 Poppik Lifestyle Private Limited. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    const mailOptions: any = {
      from: process.env.SMTP_FROM || 'info@poppik.in',
      to: customerEmail || process.env.SMTP_FALLBACK_TO || 'info@poppik.in',
      subject: emailSubject,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Order notification email sent successfully to ${mailOptions.to} for order ${orderId}`);
      // Send a separate detailed email to internal/admin address with action required
      try {
        const adminTo = process.env.INTERNAL_ORDER_TO || 'info@poppik.in';
        const adminSubject = `New Order Received - ${orderId}`;

        const adminItemsHtml = items.map((it: any) => {
          const unitPrice = (it.price !== undefined && it.price !== null) ? formatRupee(it.price) : 'N/A';
          return `
            <tr>
              <td style="padding:8px 0;">${it.productName}</td>
              <td style="padding:8px 0; text-align:right;">${it.quantity} units</td>
              <td style="padding:8px 0; text-align:right;">${unitPrice}</td>
            </tr>
          `;
        }).join('');

        const adminHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin:0 auto; padding:20px; background:#fff;">
            <div style="text-align:center; margin-bottom:12px;">
              <img src="${logoHtmlSrc}" alt="Poppik Logo" style="width:150px; margin-bottom:10px;" />
            </div>
            <h3>Dear POPPIK,</h3>
            <p>You have received a new order:</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <table style="width:100%; border-collapse:collapse; margin-top:12px;">
              <thead>
                <tr style="border-bottom:1px solid #eee; text-align:left;">
                  <th style="padding:6px 0;">Product</th>
                  <th style="padding:6px 0; text-align:right;">Quantity</th>
                  <th style="padding:6px 0; text-align:right;">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${adminItemsHtml}
              </tbody>
            </table>

            <div style="background-color: ${deliveryPartner === 'INDIA_POST' ? '#fff3cd' : '#d1ecf1'}; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${deliveryPartner === 'INDIA_POST' ? '#ffc107' : '#0dcaf0'};">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: ${deliveryPartner === 'INDIA_POST' ? '#856404' : '#0c5460'};">
                Delivery Partner: ${deliveryPartner === 'INDIA_POST' ? 'India Post (Manual Delivery)' : 'iThink'}
              </p>
              ${deliveryType ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: ${deliveryPartner === 'INDIA_POST' ? '#856404' : '#0c5460'};"><strong>Delivery Type:</strong> ${deliveryType}</p>` : ''}
              ${deliveryPartner === 'INDIA_POST' ? '<p style="margin: 5px 0 0 0; font-size: 13px; color: #856404;"><strong> Manual Processing Required:</strong> This order needs to be processed manually via India Post.</p>' : ''}
            </div>

            <h4 style="color:#d33;">What You Need to Do</h4>
            <p>Pack the order and mark it <strong>Ready to Dispatch</strong> by <strong>${new Date(Date.now() + 24*60*60*1000).toLocaleString()}</strong> to avoid SLA breaches, which may impact your ratings and performance.</p>
            <p>If you cannot fulfill the order within the next 3-4 days, please cancel it.</p>

            <p style="margin-top:20px;">
              <a href="${baseUrl}/admin/orders?orderId=${encodeURIComponent(orderId)}" target="_blank" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">View Detail</a>
            </p>
          </div>
        `;

        const adminMailOptions: any = {
          from: process.env.SMTP_FROM || 'no-reply@poppik.in',
          to: adminTo,
          subject: adminSubject,
          html: adminHtml,
        };

        await transporter.sendMail(adminMailOptions);
        console.log(` Admin order email sent to ${adminTo} for order ${orderId}`);
      } catch (adminEmailError) {
        console.error(` Failed to send admin order email for order ${orderId}:`, adminEmailError);
      }
  } catch (emailError) {
    console.error(` Failed to send order notification email for order ${orderId}:`, emailError);
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
      console.error('Database connection test failed:', getErrorMessage(error));
    }
    next();
  });

  // Apply rate limiting to all API routes except admin routes
  app.use("/api", (req, res, next) => {
    // Skip rate limiting for admin routes
    if (req.path.startsWith('/admin/')) {
      return next();
    }
    // Exempt product shades endpoint from the global rate limiter because
    // client code may request shades frequently while rendering product pages.
    // This prevents 429s for `/api/products/:productId/shades` while keeping
    // rate limiting for other endpoints.
    try {
      if (req.method === 'GET' && /^\/products\/\d+\/shades\/?$/.test(req.path)) {
        return next();
      }
    } catch (e) {
      // If any error occurs while testing the path, fall back to rate limiting.
      console.warn('Error checking shade path exemption:', e);
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
      dbError = getErrorMessage(error);
      console.error('Database health check failed:', getErrorMessage(error));
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
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

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
        if (decoded.role !== 'admin' && decoded.role !== 'master_admin') {
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
      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

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
      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

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
      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

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

  // File upload endpoints (multer `upload` is configured earlier)
  app.post('/api/upload', upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Error in /api/upload:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/api/upload/video', upload.single('video'), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
      // Use the /api/images/ proxy path like other upload handlers
      const videoUrl = `/api/images/${req.file.filename}`;
      console.log('Video uploaded:', req.file.filename, '->', videoUrl);
      res.json({ videoUrl });
    } catch (err) {
      console.error('Error in /api/upload/video:', err);
      res.status(500).json({ error: 'Upload failed', details: getErrorMessage(err) });
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
      if (!firstName || !lastName || !phone || !password) {
        console.log("Missing required fields:", { firstName: !!firstName, lastName: !!lastName, phone: !!phone, password: !!password });
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

      const normalizedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

      if (normalizedEmail) {
        // Email validation (only if email provided)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          console.log("Invalid email format:", normalizedEmail);
          return res.status(400).json({ error: "Please provide a valid email address" });
        }

        console.log("Checking if user exists with email:", normalizedEmail);
        // Check if user already exists by email
        const existingUser = await storage.getUserByEmail(normalizedEmail);
        if (existingUser) {
          console.log("User already exists with email:", normalizedEmail);
          return res.status(400).json({ error: "User already exists with this email" });
        }
      }

      // If phone provided, enforce uniqueness as well
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone) {
        const existingByPhone = await storage.getUserByPhone(normalizedPhone);
        if (existingByPhone) {
          console.log("User already exists with phone:", normalizedPhone);
          return res.status(400).json({ error: "An account already exists with this mobile number" });
        }
      }

      console.log("Hashing password...");
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log("Creating user in database...");
      // Create user with all the form data
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone || null,
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
        { userId: user.id, email: user.email || null, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Return user data (without password) and token
      const { password: _, ...userWithoutPassword } = user;

      console.log("Signup successful for user:", userWithoutPassword.email || userWithoutPassword.phone);
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      const errorProps = getErrorProperties(error);
      console.error("Signup error details:", {
        message: errorProps.message,
        code: errorProps.code,
        constraint: errorProps.constraint,
        detail: errorProps.detail,
        stack: process.env.NODE_ENV === 'development' ? errorProps.stack : undefined
      });

      // Handle specific database errors
      const errorCode = (error as any).code;
      const errorConstraint = (error as any).constraint;
      const errorMessage = getErrorMessage(error);
      
      if (errorCode === '23505') { // Unique constraint violation
        if (errorConstraint && errorConstraint.includes('email')) {
          return res.status(400).json({ error: "A user with this email already exists" });
        }
        return res.status(400).json({ error: "A user with this information already exists" });
      }

      if (errorCode === 'ECONNREFUSED') {
        return res.status(500).json({ error: "Database connection error. Please try again." });
      }

      if (errorMessage && errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        return res.status(500).json({ error: "Database table not found. Please contact support." });
      }

      // Generic error response
      res.status(500).json({
        error: "Failed to create user",
        details: process.env.NODE_ENV === 'development' ? errorMessage : "Please try again or contact support if the problem persists."
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const identifier = typeof email === "string" ? email.trim() : "";
      const passwordStr = typeof password === "string" ? password : String(password ?? "");

      // Validation
      if (!identifier || !passwordStr) {
        return res.status(400).json({ error: "Email/mobile and password are required" });
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      // Find user
      const user = isEmail
        ? await storage.getUserByEmail(identifier.toLowerCase())
        : await storage.getUserByPhone(normalizePhone(identifier));

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.password) {
        console.error("Login error: user record missing password hash", { userId: user.id });
        return res.status(500).json({ error: "Failed to login" });
      }

      // Check password
      const storedPassword = String(user.password);
      const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
      let isValidPassword = false;

      if (looksLikeBcrypt) {
        isValidPassword = await bcrypt.compare(passwordStr, storedPassword);
      } else {
        // Legacy support: some environments may have stored plaintext passwords.
        // If it matches, migrate to bcrypt so subsequent logins use secure hashes.
        isValidPassword = passwordStr === storedPassword;
        if (isValidPassword) {
          try {
            const migratedHash = await bcrypt.hash(passwordStr, 10);
            await storage.updateUser(user.id, { password: migratedHash });
          } catch (migrateErr) {
            console.error("Login warning: failed to migrate plaintext password to bcrypt", {
              userId: user.id,
              identifier,
              error: migrateErr,
            });
          }
        }
      }

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
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

      const identifier = typeof email === "string" ? email.trim() : "";

      console.log("🔐 Admin login attempt for identifier:", identifier);

      // Validation
      if (!identifier || !password) {
        console.log("❌ Missing identifier or password");
        return res.status(400).json({ error: "Email/mobile and password are required" });
      }

      // Find user
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      const user = isEmail
        ? await storage.getUserByEmail(identifier.toLowerCase())
        : await storage.getUserByPhone(normalizePhone(identifier));

      if (!user) {
        console.log("❌ User not found for identifier:", identifier);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("✅ User found:", { id: user.id, email: user.email, role: user.role });

      // Check if user is admin or master_admin
      if (user.role !== 'admin' && user.role !== 'master_admin') {
        console.log("❌ User does not have admin privileges. Role:", user.role);
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      // Check password
      const storedPassword = String(user.password);
      const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
      let isValidPassword = false;

      if (looksLikeBcrypt) {
        isValidPassword = await bcrypt.compare(String(password ?? ""), storedPassword);
      } else {
        isValidPassword = String(password ?? "") === storedPassword;
        if (isValidPassword) {
          try {
            const migratedHash = await bcrypt.hash(String(password ?? ""), 10);
            await storage.updateUser(user.id, { password: migratedHash });
          } catch (migrateErr) {
            console.error("Admin login warning: failed to migrate plaintext password to bcrypt", {
              userId: user.id,
              identifier,
              error: migrateErr,
            });
          }
        }
      }

      console.log("🔑 Password validation result:", isValidPassword);
      
      if (!isValidPassword) {
        console.log("❌ Invalid password for user:", identifier);
        return res.status(401).json({ error: "Invalid credentials" });
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

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Forgot password - send reset link (returns 200 regardless to avoid account enumeration)
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email is required' });

      // Lookup user
      const user = await storage.getUserByEmail(String(email).toLowerCase());

      if (!user) {
        return res.json({ message: 'If an account exists for this email, password reset instructions have been sent.' });
      }

      // Create a short-lived JWT token for password reset
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign({ uid: user.id, type: 'password_reset' }, secret, { expiresIn: '1h' });

      const baseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || process.env.SITE_URL || 'https://poppiklifestyle.com').replace(/\/$/, '');
      const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

      // Send email using configured transporter
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@poppik.in',
          to: user.email,
          subject: 'Poppik - Password reset instructions',
          html: `
            <p>Hi ${user.first_name || user.firstName || 'there'},</p>
            <p>We received a request to reset your password. Click the link below to set a new password. This link expires in 1 hour.</p>
            <p><a href="${resetLink}">Reset your password</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>— Poppik Team</p>
          `
        });
      } catch (emailErr) {
        console.error('Error sending reset email:', emailErr);
        return res.status(500).json({ error: 'Failed to send reset email' });
      }

      return res.json({ message: 'Password reset instructions sent to your email.' });
    } catch (err) {
      console.error('Error in forgot-password endpoint:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password-phone/send-otp', async (req, res) => {
    try {
      const { phoneNumber } = req.body || {};
      if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

      const normalized = normalizePhone(phoneNumber);

      if (!normalized) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      const user = await storage.getUserByPhone(normalized);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await OTPService.sendMobileOTP(normalized);
      if (!result.success) {
        return res.status(500).json({ error: result.message || 'Failed to send OTP' });
      }

      return res.json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
      console.error('Error in forgot-password-phone/send-otp endpoint:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password-phone/verify-otp', async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body || {};
      if (!phoneNumber || !otp) return res.status(400).json({ error: 'Phone number and OTP are required' });

      const normalized = normalizePhone(phoneNumber);
      if (!normalized) return res.status(400).json({ error: 'Invalid phone number' });

      const user = await storage.getUserByPhone(normalized);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await OTPService.verifyMobileOTP(normalized, String(otp));
      if (!result.success) {
        return res.status(400).json({ error: result.message || 'Invalid OTP' });
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign({ uid: user.id, type: 'password_reset' }, secret, { expiresIn: '15m' });

      return res.json({ verified: true, token });
    } catch (err) {
      console.error('Error in forgot-password-phone/verify-otp endpoint:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Change password - requires current password
  app.put('/api/auth/change-password/:id', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      // Ensure no caching for password updates
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const userId = parseInt(id);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user id' });
      }

      // Get user
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check current password
      const isValidPassword = await bcrypt.compare(String(currentPassword), user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(String(newPassword), 10);

      // Update password
      await storage.updateUserPassword(userId, hashedNewPassword);

      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  });

  const resetPasswordHandler = async (req: any, res: any) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      // Ensure no caching for password updates
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const { token, password, newPassword } = req.body || {};
      const nextPassword = newPassword ?? password;

      if (!token || !nextPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      if (String(nextPassword).length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      let payload: any;
      try {
        payload = jwt.verify(String(token), secret);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      if (!payload || payload.type !== 'password_reset' || !payload.uid) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      const userId = parseInt(String(payload.uid));
      if (Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashedNewPassword = await bcrypt.hash(String(nextPassword), 10);
      await storage.updateUserPassword(userId, hashedNewPassword);

      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Failed to reset password' });
    }
  };

  // Reset password - accepts token and new password (matches client)
  app.post('/api/auth/reset-password', resetPasswordHandler);

  // Backward-compatible alias (some clients may still call PUT)
  app.put('/api/auth/reset-password', resetPasswordHandler);

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

      // Determine a secure public host to use for Cashfree return/notify URLs.
      // Priority:
      // 1) NGROK_URL env (recommended for local dev)
      // 2) REPL_SLUG/REPL_OWNER (existing logic)
      // 3) request host (may be localhost - Cashfree requires HTTPS/public URL)
      let protocol = 'https';
      let returnHost = host;

      const ngrokUrl = process.env.NGROK_URL;
      if (ngrokUrl) {
        try {
          const parsed = new URL(ngrokUrl);
          protocol = parsed.protocol.replace(':', '') || 'https';
          returnHost = parsed.host;
        } catch (e) {
          console.warn('Invalid NGROK_URL, falling back to host:', ngrokUrl);
        }
      } else if (host && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0'))) {
        // For local development without NGROK, try replit preview domain if available
        const replitHost = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : host;
        returnHost = replitHost;
        protocol = 'https';
      }

      // Ensure customer phone is valid (Cashfree requires phone to be 10+ digits)
      let sanitizedPhone = (customerDetails.customerPhone || '9999999999').toString();
      if (sanitizedPhone.length < 10) {
        sanitizedPhone = '9999999999';
      }

      const cashfreePayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: customerDetails.customerId.toString(),
          customer_name: customerDetails.customerName.trim(),
          customer_email: customerDetails.customerEmail.trim(),
          customer_phone: sanitizedPhone
        },
        order_meta: {
          return_url: `${protocol}://${returnHost}/checkout?payment=processing&orderId=${orderId}`,
          notify_url: `${protocol}://${returnHost}/api/payments/cashfree/webhook`
        },
        order_note: (orderNote || 'Beauty Store Purchase').substring(0, 255)
      };

      console.log("Creating Cashfree order with credentials:", {
        appId: CASHFREE_APP_ID.substring(0, 8) + '...',
        mode: CASHFREE_MODE,
        baseUrl: CASHFREE_BASE_URL
      });
      
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
        // Parse error details
        const errorMessage = cashfreeResult.message || cashfreeResult.error || "Failed to create Cashfree order";
        const errorCode = cashfreeResult.code || cashfreeResult.type || "unknown";
        
        return res.status(400).json({
          error: errorMessage,
          cashfreeError: true,
          errorCode: errorCode,
          details: {
            message: cashfreeResult.message,
            code: cashfreeResult.code,
            type: cashfreeResult.type,
            timestamp: new Date().toISOString()
          }
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
        } as any);
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
        details: getErrorMessage(error)
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

      const statusResult: any = await statusResponse.json();

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
          } as any)
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
            const orderData: any = payment.orderData;

            // Check if order already exists in ordersTable
            const existingOrder = await db
              .select()
              .from(schema.ordersTable)
              .where(eq(schema.ordersTable.cashfreeOrderId, orderId))
              .limit(1);

            if (existingOrder.length === 0 && payment.userId) {
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
                estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              } as any).returning();

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
                  deliveryAddress: item.deliveryAddress || null,
                  recipientName: item.recipientName || null,
                  recipientPhone: item.recipientPhone || null,
                }));

                await db.insert(schema.orderItemsTable).values(orderItems as any);
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

                      // Ensure affiliate wallet exists (do NOT credit until delivered)
                      const existingAffiliateWallet = await db
                        .select({ id: schema.affiliateWallet.id })
                        .from(schema.affiliateWallet)
                        .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                        .limit(1);

                      if (!existingAffiliateWallet || existingAffiliateWallet.length === 0) {
                        await db.insert(schema.affiliateWallet).values({
                          userId: affiliateUserId,
                          cashbackBalance: "0.00",
                          commissionBalance: "0.00",
                          totalEarnings: "0.00",
                          totalWithdrawn: "0.00"
                        } as any);
                      }

                      // Record affiliate sale
                      await db.insert(schema.affiliateSales).values({
                        affiliateUserId,
                        affiliateCode: orderData.affiliateCode,
                        orderId: newOrder.id,
                        customerId: Number(payment.userId),
                        customerName: orderData.customerName || 'Customer',
                        customerEmail: orderData.customerEmail || null,
                        customerPhone: orderData.customerPhone || null,
                        productName: orderData.items.map((item: any) => item.productName).join(', '),
                        saleAmount: Number(payment.amount).toFixed(2),
                        commissionAmount: calculatedCommission.toFixed(2),
                        commissionRate: commissionRate.toFixed(2),
                        status: 'pending'
                      } as any);

                      // Add pending transaction record (credit on delivered)
                      await db.insert(schema.affiliateTransactions).values({
                        userId: affiliateUserId,
                        orderId: newOrder.id,
                        type: 'commission',
                        amount: calculatedCommission.toFixed(2),
                        balanceType: 'commission',
                        description: `Commission (${commissionRate}%) from Cashfree order ORD-${newOrder.id.toString().padStart(3, '0')}`,
                        status: 'pending',
                        transactionId: null,
                        notes: null,
                        processedAt: null,
                        createdAt: new Date()
                      } as any);

                      console.log(`✅ Affiliate commission pending: ₹${calculatedCommission.toFixed(2)} (${commissionRate}%) for affiliate ${affiliateUserId} (Cashfree order ${newOrder.id})`);
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

 // Delivery Address Management Routes
  app.get("/api/delivery-addresses", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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

  app.get("/api/delivery-addresses/:id", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const addressId = parseInt(req.params.id);
      if (isNaN(addressId)) {
        return res.status(400).json({ error: "Invalid address ID" });
      }

      const address = await db
        .select()
        .from(schema.deliveryAddresses)
        .where(eq(schema.deliveryAddresses.id, addressId))
        .limit(1);

      if (address.length === 0) {
        return res.status(404).json({ error: "Address not found" });
      }

      res.json(address[0]);
    } catch (error) {
      console.error("Error fetching delivery address:", error);
      res.status(500).json({ error: "Failed to fetch delivery address" });
    }
  });

  app.post("/api/delivery-addresses", async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const {
        userId,
        recipientName,
        addressLine1,
        addressLine2,
        landmark,
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

      const pinResult = await validatePincodeBackend(String(pincode));
      if (pinResult.status === 'error') {
        return res.status(503).json({ error: pinResult.message || 'Pincode validation service unavailable' });
      }
      if (pinResult.status !== 'success') {
        return res.status(400).json({ error: 'Enter valid pincode' });
      }

      // If this is set as default, unset other default addresses
      if (isDefault) {
        await db
          .update(schema.deliveryAddresses)
          .set({ isDefault: false } as any)
          .where(eq(schema.deliveryAddresses.userId, parseInt(userId)));
      }

      const [newAddress] = await db
        .insert(schema.deliveryAddresses)
        .values({
          userId: parseInt(userId),
          recipientName: recipientName.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2 ? addressLine2.trim() : null,
          landmark: landmark ? String(landmark).trim() : null,
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
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const addressId = parseInt(req.params.id);
      const {
        recipientName,
        addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        pincode,
        country,
        phoneNumber,
        deliveryInstructions,
        isDefault
      } = req.body;

      if (pincode) {
        const pinResult = await validatePincodeBackend(String(pincode));
        if (pinResult.status === 'error') {
          return res.status(503).json({ error: pinResult.message || 'Pincode validation service unavailable' });
        }
        if (pinResult.status !== 'success') {
          return res.status(400).json({ error: 'Enter valid pincode' });
        }
      }

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
          landmark: landmark !== undefined ? (landmark ? String(landmark).trim() : null) : undefined,
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
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
        .set({ isDefault: false }as any)
        .where(eq(schema.deliveryAddresses.userId, address[0].userId));

      // Set this address as default
      const [updatedAddress] = await db
        .update(schema.deliveryAddresses)
        .set({ isDefault: true, updatedAt: new Date() }as any)
        .where(eq(schema.deliveryAddresses.id, addressId))
        .returning();

      res.json(updatedAddress);
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "Failed to set default address" });
    }
  });


  app.get("/api/affiliate/my-application", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const rows = await db
        .select()
        .from(schema.affiliateApplications)
        .where(eq(schema.affiliateApplications.userId, userId))
        .orderBy(desc(schema.affiliateApplications.id))
        .limit(1);

      return res.json(rows?.[0] || null);
    } catch (error) {
      console.error("Error fetching affiliate application:", error);
      return res.status(500).json({ error: "Failed to fetch affiliate application" });
    }
  });

  app.get("/api/affiliate/wallet", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      let walletRows = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, userId))
        .limit(1);

      if (!walletRows || walletRows.length === 0) {
        const [newWallet] = await db
          .insert(schema.affiliateWallet)
          .values({
            userId,
            cashbackBalance: "0.00",
            commissionBalance: "0.00",
            totalEarnings: "0.00",
            totalWithdrawn: "0.00",
          } as any)
          .returning();
        walletRows = [newWallet];
      }

      return res.json(walletRows[0]);
    } catch (error) {
      console.error("Error fetching affiliate wallet:", error);
      return res.status(500).json({ error: "Failed to fetch affiliate wallet" });
    }
  });

  app.get("/api/affiliate/wallet/transactions", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const rows = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(eq(schema.affiliateTransactions.userId, userId))
        .orderBy(desc(schema.affiliateTransactions.createdAt));

      return res.json(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Error fetching affiliate transactions:", error);
      return res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/affiliate/wallet/withdrawals", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const rows = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(
          and(
            eq(schema.affiliateTransactions.userId, userId),
            eq(schema.affiliateTransactions.type, 'withdrawal'),
          )
        )
        .orderBy(desc(schema.affiliateTransactions.createdAt));

      const withdrawals = (Array.isArray(rows) ? rows : []).map((tx: any) => ({
        id: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        status: tx.status,
        paymentMethod: tx.balanceType || 'bank',
        requestedAt: tx.createdAt,
        processedAt: tx.processedAt || null,
        rejectedReason: null,
      }));

      return res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching affiliate withdrawals:", error);
      return res.status(500).json({ error: "Failed to fetch withdrawals" });
    }
  });

  app.post("/api/affiliate/wallet/withdraw", async (req, res) => {
    try {
      const userId = Number(req.body?.userId);
      const amountNum = Number(req.body?.amount);

      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const walletRows = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, userId))
        .limit(1);

      if (!walletRows || walletRows.length === 0) {
        return res.status(400).json({ error: "Affiliate wallet not found" });
      }

      const wallet = walletRows[0] as any;
      const currentCommission = parseFloat(String(wallet.commissionBalance || '0'));
      if (currentCommission < amountNum) {
        return res.status(400).json({ error: "Insufficient affiliate commission balance" });
      }

      const newCommissionBalance = (currentCommission - amountNum).toFixed(2);
      const currentWithdrawn = parseFloat(String(wallet.totalWithdrawn || '0'));
      const newTotalWithdrawn = (currentWithdrawn + amountNum).toFixed(2);

      await db
        .update(schema.affiliateWallet)
        .set({
          commissionBalance: newCommissionBalance,
          totalWithdrawn: newTotalWithdrawn,
          updatedAt: new Date(),
        } as any)
        .where(eq(schema.affiliateWallet.userId, userId));

      const notes = JSON.stringify({
        bankName: req.body?.bankName || null,
        branchName: req.body?.branchName || null,
        ifscCode: req.body?.ifscCode || null,
        accountNumber: req.body?.accountNumber || null,
      });

      const [tx] = await db
        .insert(schema.affiliateTransactions)
        .values({
          userId,
          type: 'withdrawal',
          amount: amountNum.toFixed(2),
          balanceType: 'commission',
          description: 'Withdrawal request',
          status: 'pending',
          notes,
          createdAt: new Date(),
        } as any)
        .returning();

      return res.json({ success: true, transaction: tx });
    } catch (error) {
      console.error("Error creating affiliate withdrawal:", error);
      return res.status(500).json({ error: "Failed to create withdrawal" });
    }
  });


  app.post("/api/products", async (req, res) => {
    try {
      console.log("Received product data:", req.body);

      res.setHeader('Pragma', 'no-cache');

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
              } as any);
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

  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      return res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      return res.status(500).json({ error: "Failed to fetch products" });
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
      res.status(500).json({ error: "Failed to fetch products by subcategory" });
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
      res.status(500).json({ error: "Failed to fetch products by category" });
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

  const generateSampleSubcategories = (): any[] => {
    return [];
  };

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

  const generateSampleSubcategoriesForCategory = (_slug: string): any[] => {
    return [];
  };

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

  // Sync existing orders with iThink
  app.post("/api/admin/sync-ithink-orders", async (req, res) => {
    try {
      console.log("Syncing existing orders with iThink...");

      // Check if iThink is configured
      if (!process.env.ITHINK_EMAIL || !process.env.ITHINK_PASSWORD) {
        return res.status(400).json({
          error: "iThink credentials not configured",
          message: "Please set ITHINK_EMAIL and ITHINK_PASSWORD environment variables"
        });
      }

      // Get orders that don't have iThink tracking
      const ordersToSync = await db
        .select()
        .from(schema.ordersTable)
        .where(and(
          isNull((schema.ordersTable as any).ithinkOrderId),
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

          const orderForiThink = {
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

          const ithinkOrderData = ithinkService.convertToIthinkFormat(orderForiThink);
          const ithinkResponse = await ithinkService.createOrder(ithinkOrderData);

          if (ithinkResponse.order_id) {
            // Update order with iThink details
            await db.update(schema.ordersTable)
              .set({
                ithinkOrderId: ithinkResponse.order_id,
                ithinkShipmentId: ithinkResponse.shipment_id || null
              } as any)
              .where(eq(schema.ordersTable.id, order.id));

            syncedCount++;
            console.log(`Synced order ${order.id} with iThink order ${ithinkResponse.order_id}`);
          } else {
            failedCount++;
            console.error(`Failed to create iThink order for order ${order.id}`);
          }

        } catch (orderError) {
          failedCount++;
          console.error(`Error syncing order ${order.id}:`, orderError);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      res.json({
        message: `iThink sync completed`,
        totalOrders: ordersToSync.length,
        syncedCount,
        failedCount,
        remaining: Math.max(0, ordersToSync.length - syncedCount - failedCount)
      });

    } catch (error) {
      console.error("Error syncing orders with iThink:", error);
      res.status(500).json({
        error: "Failed to sync orders with iThink",
        details: (error as any)?.message
      });
    }
  });

  app.post("/api/admin/sync-cashfree-orders", async (req, res) => {
    try {
      res.status(501).json({ error: "Not implemented" });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync Cashfree orders" });
    }
  });

  app.get("/api/admin/print-thermal-invoice/:orderId",  async (req, res) => {
    try {
      const rawOrderId = String(req.params.orderId || "").trim();
      const normalized = rawOrderId.startsWith("ORD-") ? rawOrderId : `ORD-${rawOrderId}`;
      const orderIdNum = Number(normalized.replace("ORD-", ""));
      if (!Number.isFinite(orderIdNum) || orderIdNum <= 0) {
        return res.status(400).json({ error: "Invalid orderId" });
      }

      const orderRows = await db.select().from(schema.ordersTable).where(eq(schema.ordersTable.id, orderIdNum)).limit(1);
      if (!orderRows || orderRows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const order: any = orderRows[0];

      const items = await db
        .select()
        .from(schema.orderItemsTable)
        .where(eq(schema.orderItemsTable.orderId, orderIdNum));

      const userRows = await db
        .select({
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          phone: schema.users.phone,
        })
        .from(schema.users)
        .where(eq(schema.users.id, order.userId))
        .limit(1);
      const user = userRows?.[0];

      const hasiThinkRef =
        Number((order as any).ithinkShipmentId) > 0 ||
        Number((order as any).ithinkOrderId) > 0 ||
        Number((order as any).ithink_order_id) > 0 ||
        Number((order as any).ithink_shipment_id) > 0;
      const deliveryPartner = String(order.deliveryPartner || (hasiThinkRef ? "ITHINK" : "INDIA_POST")).toUpperCase();
      const filename = `${normalized}-thermal-invoice.pdf`;

      if (deliveryPartner === "ITHINK") {
        const ithinkOrderId = Number((order as any).ithinkOrderId || (order as any).ithink_order_id);
        const shipmentId = Number((order as any).ithinkShipmentId || (order as any).ithink_shipment_id);
        if (!Number.isFinite(shipmentId) || shipmentId <= 0) {
          return res.status(400).json({ error: "iThink shipmentId missing for this order" });
        }

        let awbNow = String((order as any).trackingNumber || (order as any).tracking_number || "").trim();
        const existingTracking = awbNow;
        if (!existingTracking) {

          const addrText = String((order as any).shippingAddress || (order as any).shipping_address || "");
          const pincodeMatch = addrText.match(/\b\d{6}\b/);
          const deliveryPincode = pincodeMatch ? String(pincodeMatch[0]) : "";
          if (!deliveryPincode) {
            return res.status(400).json({ error: "Delivery pincode missing; cannot generate AWB" });
          }

          const pickupPincode = String(process.env.ITHINK_PICKUP_PINCODE || "400001");
          const weight = Math.max(
            0.5,
            (items || []).reduce((sum: number, it: any) => sum + (0.5 * Number(it?.quantity || 1)), 0)
          );
          const pm = String((order as any).paymentMethod || (order as any).payment_method || "");
          const cod = pm.toLowerCase().includes("cod") || pm.toLowerCase().includes("cash");

          const serviceability: any = await ithinkService.getServiceability(pickupPincode, deliveryPincode, weight, cod);
          const couriers: any[] = serviceability?.data?.available_courier_companies;
          if (!Array.isArray(couriers) || couriers.length === 0) {
            return res.status(400).json({ error: "No iThink couriers available to generate AWB" });
          } 
          const courierId = Number(
            couriers.find((c: any) => Number(c?.courier_company_id) > 0)?.courier_company_id || couriers[0]?.courier_company_id
          );
          if (!Number.isFinite(courierId) || courierId <= 0) {
            return res.status(400).json({ error: "Invalid courier_company_id returned by iThink" });
          }

          try {
            const awbResp: any = await ithinkService.generateAWB(shipmentId, courierId);
            const awb = String(
              awbResp?.awb_code ||
                awbResp?.data?.awb_code ||
                awbResp?.data?.awb ||
                awbResp?.awb ||
                ""
            ).trim();
            if (awb) {
              awbNow = awb;
              await db.update(schema.ordersTable).set({ trackingNumber: awb } as any).where(eq(schema.ordersTable.id, orderIdNum));
            }
          } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.toLowerCase().includes('awb not available')) {
              return res.status(202).json({
                status: 'pending',
                message: 'AWB not available for this order yet. Please retry in a few minutes.',
              });
            }
            throw e;
          }

          console.log("[thermal-invoice][ithink] awb after generateAWB=", awbNow || "<empty>");
        }

        // Fallback: if AWB is still missing, try fetching it from iThink order details.
        if (!awbNow) {
          try {
            const details: any = await ithinkService.getOrderDetails(String((order as any).ithinkOrderId || (order as any).ithink_order_id));
            // ... (rest of the code remains the same)

            console.log("[thermal-invoice][ithink] awb after trackOrder fallback=", awbNow || "<empty>");
          } catch (e) {
            console.warn("iThink trackOrder AWB fallback failed:", (e as any)?.message || e);
          }
        }

        if (!awbNow) {
          return res.status(202).json({
            status: 'pending',
            message: 'AWB not available for this order yet. Please retry in a few minutes.',
          });
        }

        console.log("[thermal-invoice][ithink] final awb passed to PDF overlay=", awbNow || "<empty>");
        await ithinkInvoiceService.streamThermalInvoicePdf(res, ithinkOrderId, normalized, awbNow || null, filename);
        return;
      }

      if (deliveryPartner === "INDIA_POST") {
        await indiaPostInvoiceService.streamThermalInvoicePdf(
          res,
          {
            // ... (rest of the code remains the same)
            orderId: normalized,
            createdAt: (order as any).createdAt,
            paymentMethod: (order as any).paymentMethod,
            totalAmount: (order as any).totalAmount,
            trackingNumber: String((order as any).trackingNumber || (order as any).tracking_number || "").trim() || null,
            deliveryPartner: "INDIA_POST",
            shippingAddress: (order as any).shippingAddress,
            customerName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : null,
            customerPhone: (user as any)?.phone || null,
            customerEmail: (user as any)?.email || null,
            items: (items || []).map((it: any) => ({ productName: it.productName, quantity: it.quantity, price: it.price })),
          },
          filename
        );
        return;
      }

      return res.status(400).json({ error: `Unsupported delivery partner: ${deliveryPartner}` });
    } catch (error: any) {
      const status = Number(error?.httpStatus) || 500;
      console.error("Error printing thermal invoice:", error);
      res.status(status).json({ error: "Failed to generate invoice" });
    }
  });

  app.get("/api/admin/print-thermal-label/:orderId",  async (req, res) => {
    try {
      const rawOrderId = String(req.params.orderId || "").trim();
      const normalized = rawOrderId.startsWith("ORD-") ? rawOrderId : `ORD-${rawOrderId}`;
      const orderIdNum = Number(normalized.replace("ORD-", ""));
      if (!Number.isFinite(orderIdNum) || orderIdNum <= 0) {
        return res.status(400).json({ error: "Invalid orderId" });
      }

      const orderRows = await db.select().from(schema.ordersTable).where(eq(schema.ordersTable.id, orderIdNum)).limit(1);
      if (!orderRows || orderRows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const order: any = orderRows[0];

      const items = await db
        .select()
        .from(schema.orderItemsTable)
        .where(eq(schema.orderItemsTable.orderId, orderIdNum));

      const userRows = await db
        .select({
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          phone: schema.users.phone,
        })
        .from(schema.users)
        .where(eq(schema.users.id, order.userId))
        .limit(1);
      const user = userRows?.[0];

      const hasiThinkRef =
        Number((order as any).ithinkShipmentId) > 0 ||
        Number((order as any).ithinkOrderId) > 0 ||
        Number((order as any).ithink_order_id) > 0 ||
        Number((order as any).ithink_shipment_id) > 0;
      const deliveryPartner = String(order.deliveryPartner || (hasiThinkRef ? "ITHINK" : "INDIA_POST")).toUpperCase();
      const filename = `${normalized}-thermal-label.pdf`;

      if (deliveryPartner === "ITHINK") {
        const shipmentId = Number((order as any).ithinkShipmentId || (order as any).ithink_shipment_id);
        if (!Number.isFinite(shipmentId) || shipmentId <= 0) {
          return res.status(400).json({ error: "iThink shipmentId missing for this order" });
        }

        const existingTracking = String((order as any).trackingNumber || (order as any).tracking_number || "").trim();
        if (!existingTracking) {
          const addrText = String((order as any).shippingAddress || (order as any).shipping_address || "");
          const pincodeMatch = addrText.match(/\b\d{6}\b/);
          const deliveryPincode = pincodeMatch ? String(pincodeMatch[0]) : "";
          if (!deliveryPincode) {
            return res.status(400).json({ error: "Delivery pincode missing; cannot generate AWB" });
          }

          const pickupPincode = String(process.env.ITHINK_PICKUP_PINCODE || "400001");
          const weight = Math.max(
            0.5,
            (items || []).reduce((sum: number, it: any) => sum + (0.5 * Number(it?.quantity || 1)), 0)
          );
          const pm = String((order as any).paymentMethod || (order as any).payment_method || "");
          const cod = pm.toLowerCase().includes("cod") || pm.toLowerCase().includes("cash");

          const serviceability: any = await ithinkService.getServiceability(pickupPincode, deliveryPincode, weight, cod);
          const couriers: any[] = serviceability?.data?.available_courier_companies;
          if (!Array.isArray(couriers) || couriers.length === 0) {
            return res.status(400).json({ error: "No iThink couriers available to generate AWB" });
          }

          const courierId = Number(
            couriers.find((c: any) => Number(c?.courier_company_id) > 0)?.courier_company_id || couriers[0]?.courier_company_id
          );
          if (!Number.isFinite(courierId) || courierId <= 0) {
            return res.status(400).json({ error: "Invalid courier_company_id returned by iThink" });
          }

          const awbResp: any = await ithinkService.generateAWB(shipmentId, courierId);
          const awb = String(awbResp?.awb_code || awbResp?.data?.awb_code || awbResp?.data?.awb || awbResp?.awb || "").trim();
          if (awb) {
            await db.update(schema.ordersTable).set({ trackingNumber: awb } as any).where(eq(schema.ordersTable.id, orderIdNum));
          }
        }

        await ithinkInvoiceService.streamThermalLabelPdf(res, shipmentId, filename);
        return;
      }

      if (deliveryPartner === "INDIA_POST") {
        await indiaPostInvoiceService.streamThermalLabelPdf(
          res,
          {
            orderId: normalized,
            createdAt: (order as any).createdAt,
            paymentMethod: (order as any).paymentMethod,
            totalAmount: (order as any).totalAmount,
            shippingAddress: (order as any).shippingAddress,
            customerName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : null,
            customerPhone: (user as any)?.phone || null,
            customerEmail: (user as any)?.email || null,
            items: (items || []).map((it: any) => ({ productName: it.productName, quantity: it.quantity, price: it.price })),
          },
          filename
        );
        return;
      }

      return res.status(400).json({ error: `Unsupported delivery partner: ${deliveryPartner}` });
    } catch (error: any) {
      const status = Number(error?.httpStatus) || 500;
      console.error("Error printing thermal label:", error);
      res.status(status).json({ error: "Failed to generate label" });
    }
  });

  app.get("/api/admin/orders",  async (req, res) => {
    try {
      const orders = await db
        .select()
        .from(schema.ordersTable)
        .orderBy(desc(schema.ordersTable.createdAt));

      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              id: schema.orderItemsTable.id,
              name: schema.orderItemsTable.productName,
              quantity: schema.orderItemsTable.quantity,
              price: schema.orderItemsTable.price,
              image: schema.orderItemsTable.productImage,
              deliveryAddress: schema.orderItemsTable.deliveryAddress,
              recipientName: schema.orderItemsTable.recipientName,
              recipientPhone: schema.orderItemsTable.recipientPhone,
            })
            .from(schema.orderItemsTable)
            .where(eq(schema.orderItemsTable.orderId, order.id));

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
            firstName: "Unknown",
            lastName: "Customer",
            email: "unknown@email.com",
            phone: "N/A",
          };

          return {
            id: `ORD-${order.id.toString().padStart(3, "0")}`,
            customer: {
              name: `${userData.firstName} ${userData.lastName}`.trim(),
              email: userData.email,
              phone: userData.phone || "N/A",
              address: order.shippingAddress,
            },
            date: order.createdAt ? order.createdAt.toISOString().split("T")[0] : "",
            total: `₹${order.totalAmount}`,
            status: order.status,
            items: items.length,
            paymentMethod: order.paymentMethod,
            trackingNumber: order.trackingNumber,
            awbCode: (order as any).awbCode || order.trackingNumber || null,
            estimatedDelivery: (order as any).estimatedDelivery?.toISOString?.().split("T")[0],
            products: items,
            userId: order.userId,
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress,
            deliveryPartner:
              (order as any).deliveryPartner ||
              ((Number((order as any).ithinkShipmentId) > 0 ||
                Number((order as any).ithinkOrderId) > 0 ||
                Number((order as any).ithink_order_id) > 0 ||
                Number((order as any).ithink_shipment_id) > 0)
                ? "ITHINK"
                : "INDIA_POST"),
            deliveryType: (order as any).deliveryType || null,
          };
        })
      );

      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
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
              deliveryAddress: schema.orderItemsTable.deliveryAddress,
              recipientName: schema.orderItemsTable.recipientName,
              recipientPhone: schema.orderItemsTable.recipientPhone,
            })
            .from(schema.orderItemsTable)
            .where(eq(schema.orderItemsTable.orderId, order.id));

          // Fallback: if items are missing (older orders), try extracting from shippingAddress payload
          let resolvedItems: any[] = items as any[];
          if (!resolvedItems || resolvedItems.length === 0) {
            try {
              const raw = order.shippingAddress;
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (parsed && parsed.multi && Array.isArray(parsed.items)) {
                resolvedItems = parsed.items.map((it: any, idx: number) => ({
                  id: idx + 1,
                  name: it.productName || it.name || 'Item',
                  quantity: Number(it.quantity || 1),
                  price: it.price || '₹0',
                  image: it.productImage || it.image || '',
                  deliveryAddress: it.deliveryAddress || null,
                  recipientName: it.recipientName || null,
                  recipientPhone: it.recipientPhone || null,
                }));
              } else if (Array.isArray(parsed)) {
                const extracted = parsed
                  .filter((it: any) => it && (it.productName || it.name))
                  .map((it: any, idx: number) => ({
                    id: idx + 1,
                    name: it.productName || it.name || 'Item',
                    quantity: Number(it.quantity || 1),
                    price: it.price || `₹${order.totalAmount || 0}`,
                    image: it.productImage || it.image || '',
                    deliveryAddress: it.deliveryAddress || it.address || null,
                    recipientName: it.recipientName || it.name || null,
                    recipientPhone: it.recipientPhone || it.phone || null,
                  }));
                if (extracted.length > 0) resolvedItems = extracted;
              } else if (parsed && typeof parsed === 'object') {
                const pName = (parsed as any).productName || (parsed as any).name;
                if (pName) {
                  resolvedItems = [{
                    id: 1,
                    name: pName,
                    quantity: Number((parsed as any).quantity || 1),
                    price: (parsed as any).price || `₹${order.totalAmount || 0}`,
                    image: (parsed as any).productImage || (parsed as any).image || '',
                    deliveryAddress: (parsed as any).deliveryAddress || (parsed as any).address || null,
                    recipientName: (parsed as any).recipientName || (parsed as any).name || null,
                    recipientPhone: (parsed as any).recipientPhone || (parsed as any).phone || null,
                  }];
                }
              }
            } catch (e) {
              // ignore
            }
          }

          // Also provide formatted shipping address for user-facing orders list
          let formattedShipping = order.shippingAddress;
          try {
            const parsed = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
            if (parsed && parsed.multi && Array.isArray(parsed.items)) {
              formattedShipping = parsed.items.map((it: any, idx: number) => `${idx + 1}. ${it.productName || 'Item'} → ${it.deliveryAddress || 'No address'}`).join('\n');
            }
          } catch (e) {
            // ignore
          }

          return {
            id: `ORD-${order.id.toString().padStart(3, '0')}`,
            date: order.createdAt.toISOString().split('T')[0],
            status: order.status,
            total: `₹${order.totalAmount}`,
            items: resolvedItems,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery?.toISOString().split('T')[0],
            shippingAddress: formattedShipping,
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
          deliveryAddress: schema.orderItemsTable.deliveryAddress,
          recipientName: schema.orderItemsTable.recipientName,
          recipientPhone: schema.orderItemsTable.recipientPhone,
        })
        .from(schema.orderItemsTable)
        .where(eq(schema.orderItemsTable.orderId, order[0].id));

      // Fallback: if items are missing (older orders), try extracting from shippingAddress payload
      let resolvedItems: any[] = items as any[];
      if (!resolvedItems || resolvedItems.length === 0) {
        try {
          const raw = order[0].shippingAddress;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && parsed.multi && Array.isArray(parsed.items)) {
            resolvedItems = parsed.items.map((it: any, idx: number) => ({
              id: idx + 1,
              name: it.productName || it.name || 'Item',
              quantity: Number(it.quantity || 1),
              price: it.price || '₹0',
              image: it.productImage || it.image || '',
              deliveryAddress: it.deliveryAddress || null,
              recipientName: it.recipientName || null,
              recipientPhone: it.recipientPhone || null,
            }));
          } else if (Array.isArray(parsed)) {
            const extracted = parsed
              .filter((it: any) => it && (it.productName || it.name))
              .map((it: any, idx: number) => ({
                id: idx + 1,
                name: it.productName || it.name || 'Item',
                quantity: Number(it.quantity || 1),
                price: it.price || `₹${order[0].totalAmount || 0}`,
                image: it.productImage || it.image || '',
                deliveryAddress: it.deliveryAddress || it.address || null,
                recipientName: it.recipientName || it.name || null,
                recipientPhone: it.recipientPhone || it.phone || null,
              }));
            if (extracted.length > 0) resolvedItems = extracted;
          } else if (parsed && typeof parsed === 'object') {
            const pName = (parsed as any).productName || (parsed as any).name;
            if (pName) {
              resolvedItems = [{
                id: 1,
                name: pName,
                quantity: Number((parsed as any).quantity || 1),
                price: (parsed as any).price || `₹${order[0].totalAmount || 0}`,
                image: (parsed as any).productImage || (parsed as any).image || '',
                deliveryAddress: (parsed as any).deliveryAddress || (parsed as any).address || null,
                recipientName: (parsed as any).recipientName || (parsed as any).name || null,
                recipientPhone: (parsed as any).recipientPhone || (parsed as any).phone || null,
              }];
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Format shippingAddress if it's a multi-address JSON payload
      let formattedShippingForSingle = order[0].shippingAddress;
      try {
        const parsedSingle = typeof order[0].shippingAddress === 'string' ? JSON.parse(order[0].shippingAddress) : order[0].shippingAddress;
        if (parsedSingle && parsedSingle.multi && Array.isArray(parsedSingle.items)) {
          formattedShippingForSingle = parsedSingle.items.map((it: any, idx: number) => `${idx + 1}. ${it.productName || 'Item'} → ${it.deliveryAddress || 'No address'}`).join('\n');
        }
      } catch (e) {
        // ignore
      }

      const orderWithItems = {
        id: `ORD-${order[0].id.toString().padStart(3, '0')}`,
        date: order[0].createdAt.toISOString().split('T')[0],
        status: order[0].status,
        total: `₹${order[0].totalAmount}`,
        items: resolvedItems,
        trackingNumber: order[0].trackingNumber,
        estimatedDelivery: order[0].estimatedDelivery?.toISOString().split('T')[0],
        shippingAddress: formattedShippingForSingle,
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
      } as any).returning();

      res.status(201).json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      if ((error as any).code === '23505') {
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

  // Create new gift milestone (single or batch)
  app.post("/api/admin/gift-milestones", async (req, res) => {
    try {
      const body: any = req.body;

      // Batch create: { milestones: [...] }
      if (Array.isArray(body?.milestones)) {
        const milestones = body.milestones;

        if (milestones.length === 0) {
          return res.status(400).json({ error: "milestones array cannot be empty" });
        }

        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          const hasMinAmount = m?.minAmount !== undefined && m?.minAmount !== null && m?.minAmount !== "";
          const hasGiftCount = m?.giftCount !== undefined && m?.giftCount !== null && m?.giftCount !== "";

          if (!hasMinAmount || !hasGiftCount) {
            return res.status(400).json({
              error: "Minimum amount and gift count are required",
              index: i,
            });
          }
        }

        const created = await db
          .insert(schema.giftMilestones)
          .values(
            milestones.map((m: any) => ({
              minAmount: m.minAmount.toString(),
              maxAmount: m.maxAmount ? m.maxAmount.toString() : null,
              giftCount: parseInt(m.giftCount),
              giftDescription: m.giftDescription || null,
              discountType: m.discountType || "none",
              discountValue: m.discountValue ? m.discountValue.toString() : null,
              cashbackPercentage: m.cashbackPercentage ? m.cashbackPercentage.toString() : null,
              isActive: m.isActive !== false && m.isActive !== "false",
              sortOrder: m.sortOrder ? parseInt(m.sortOrder) : 0,
            }) as any)
          )
          .returning();

        return res.status(201).json(created);
      }

      // Single create (backward-compatible)
      const {
        minAmount,
        maxAmount,
        giftCount,
        giftDescription,
        discountType,
        discountValue,
        cashbackPercentage,
        isActive,
        sortOrder,
      } = body;

      const hasMinAmount = minAmount !== undefined && minAmount !== null && minAmount !== "";
      const hasGiftCount = giftCount !== undefined && giftCount !== null && giftCount !== "";

      if (!hasMinAmount || !hasGiftCount) {
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
        } as any)
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

      const hasMinAmount = minAmount !== undefined && minAmount !== null && minAmount !== "";
      const hasGiftCount = giftCount !== undefined && giftCount !== null && giftCount !== "";

      if (!hasMinAmount || !hasGiftCount) {
        return res.status(400).json({ error: "Minimum amount and gift count are required" });
      }

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
        shippingCharge,
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

      // 🔒 CRITICAL VALIDATION: Affiliate commission fields should only affect processing when an affiliate code is present
      // If affiliate commission values are present but no affiliate code was supplied, log a warning and ignore them
      if ((affiliateCommission && Number(affiliateCommission) > 0) || (affiliateCommissionEarned && Number(affiliateCommissionEarned) > 0)) {
        if (!effectiveAffiliateCode) {
          console.warn(`⚠️ Suspicious affiliate commission fields present (affiliateCommission=${affiliateCommission}, affiliateCommissionEarned=${affiliateCommissionEarned}) without an affiliate code for user ${userId}. Ignoring these fields.`);
          // Do not reject the order; the commission will not be processed without a valid affiliate code.
        }
      }

      // Determine delivery partner and type from request or default to ITHINK
      let deliveryPartner = req.body.deliveryPartner || 'ITHINK';
      let deliveryType = req.body.deliveryType || null;

      // Re-check pincode serviceability on the server so order/email stays consistent
      const extractPincodesFromAddressText = (text: string): string[] => {
        if (!text) return [];
        const matches = text.match(/\b\d{6}\b/g);
        return Array.from(new Set((matches || []).map(m => String(m))));
      };

      const extractPincodes = (): string[] => {
        const pincodes = new Set<string>();

        try {
          if (typeof shippingAddress === 'string') {
            const trimmed = shippingAddress.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) {
                for (const it of (parsed as any).items) {
                  if (typeof it?.deliveryAddress === 'string') {
                    for (const pc of extractPincodesFromAddressText(it.deliveryAddress)) pincodes.add(pc);
                  }
                }
              }
            } else {
              for (const pc of extractPincodesFromAddressText(trimmed)) pincodes.add(pc);
            }
          }
        } catch (e) {
          // ignore parse errors and fall back to regex extraction below
        }

        if (pincodes.size === 0 && typeof shippingAddress === 'string') {
          for (const pc of extractPincodesFromAddressText(shippingAddress)) pincodes.add(pc);
        }

        if (pincodes.size === 0 && Array.isArray(items)) {
          for (const it of items) {
            if (typeof it?.deliveryAddress === 'string') {
              for (const pc of extractPincodesFromAddressText(it.deliveryAddress)) pincodes.add(pc);
            }
          }
        }

        return Array.from(pincodes);
      };

      const pincodes = extractPincodes();
      let isServiceable = true;
      if (pincodes.length > 0) {
        try {
          const pickupPincode = process.env.ITHINK_PICKUP_PINCODE || "400001";
          const weight = Array.isArray(items)
            ? Math.max(0.5, items.reduce((sum: number, it: any) => sum + (0.5 * Number(it?.quantity || 1)), 0))
            : 0.5;
          const cod = String(paymentMethod || '').toLowerCase().includes('cod') || String(paymentMethod || '').toLowerCase().includes('cash');

          for (const pc of pincodes) {
            const serviceability = await ithinkService.getServiceability(pickupPincode, pc, weight, cod);
            const hasAvailableCouriers = serviceability &&
              (serviceability as any).data &&
              Array.isArray((serviceability as any).data.available_courier_companies) &&
              (serviceability as any).data.available_courier_companies.length > 0;
            if (!hasAvailableCouriers) {
              isServiceable = false;
              break;
            }
          }
        } catch (e) {
          console.warn('iThink serviceability check failed during order placement; keeping ITHINK by default:', e);
          isServiceable = true;
        }
      }

      if (!isServiceable) {
        deliveryPartner = 'INDIA_POST';
        deliveryType = 'MANUAL';
      }

      // orders.redeem_amount is an integer column in DB schema
      const redeemToApply = Math.round(Math.max(0, Number(redeemAmount || 0)));

      // Affiliate wallet redemption (commission balance)
      const affiliateWalletToApply = Math.round(Math.max(0, Number(affiliateWalletAmount || 0)));

      // Persist shipping charge as integer (DB column orders.shipping_charge)
      const shippingChargeFromBody =
        shippingCharge ??
        (req.body as any)?.shipping ??
        (req.body as any)?.shipping_cost ??
        (req.body as any)?.shippingCost ??
        0;
      const shippingChargeToApply = Math.round(Math.max(0, Number(shippingChargeFromBody || 0)));

      // Validate wallet balance before creating the order (so we can fail fast)
      if (redeemToApply > 0) {
        const walletRows = await db
          .select()
          .from(schema.userWallet)
          .where(eq(schema.userWallet.userId, Number(userId)))
          .limit(1);

        const currentBalance = parseFloat(walletRows?.[0]?.cashbackBalance || '0');
        if (currentBalance < redeemToApply) {
          return res.status(400).json({ error: 'Insufficient cashback balance' });
        }
      }

      // Validate affiliate wallet balance before creating the order (so we can fail fast)
      if (affiliateWalletToApply > 0) {
        let walletRows = await db
          .select()
          .from(schema.affiliateWallet)
          .where(eq(schema.affiliateWallet.userId, Number(userId)))
          .limit(1);

        if (!walletRows || walletRows.length === 0) {
          const [newWallet] = await db.insert(schema.affiliateWallet).values({
            userId: Number(userId),
            cashbackBalance: '0.00',
            commissionBalance: '0.00',
            totalEarnings: '0.00',
            totalWithdrawn: '0.00',
          } as any).returning();
          walletRows = [newWallet];
        }

        const currentCommission = parseFloat(walletRows?.[0]?.commissionBalance || '0');
        if (currentCommission < affiliateWalletToApply) {
          return res.status(400).json({ error: 'Insufficient affiliate commission balance' });
        }
      }

      // Insert the order into database
      const newOrderData = {
        userId: Number(userId),
        totalAmount: Number(totalAmount),

        status: 'pending', // Default to 'pending' for COD, will be updated by webhook/payment confirmation
        paymentMethod: paymentMethod || 'Cash on Delivery',
        shippingAddress: shippingAddress,
        shippingCharge: shippingChargeToApply,
        deliveryInstructions: req.body.deliveryInstructions || null,
        saturdayDelivery: req.body.saturdayDelivery !== undefined ? req.body.saturdayDelivery : true,
        sundayDelivery: req.body.sundayDelivery !== undefined ? req.body.sundayDelivery : true,
        affiliateCode: effectiveAffiliateCode || null,
        deliveryPartner: deliveryPartner,
        deliveryType: deliveryType,
        redeemAmount: redeemToApply > 0 ? redeemToApply : 0,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      };

      console.log("Inserting order data:", newOrderData);

      const [newOrder] = await db.insert(ordersTable).values(newOrderData).returning();

      const orderId = newOrder.id;

      console.log('✅ Order created successfully:', orderId);

      // Deduct redeemed cashback from user wallet (if applied)
      if (redeemToApply > 0) {
        const existingRedeemTx = await db
          .select({ id: schema.userWalletTransactions.id })
          .from(schema.userWalletTransactions)
          .where(
            and(
              eq(schema.userWalletTransactions.userId, Number(userId)),
              eq(schema.userWalletTransactions.orderId, orderId),
              eq(schema.userWalletTransactions.type, 'redeem'),
              eq(schema.userWalletTransactions.status, 'completed')
            )
          )
          .limit(1);

        if (!existingRedeemTx || existingRedeemTx.length === 0) {
          let walletRows = await db
            .select()
            .from(schema.userWallet)
            .where(eq(schema.userWallet.userId, Number(userId)))
            .limit(1);

          if (!walletRows || walletRows.length === 0) {
            const [newWallet] = await db
              .insert(schema.userWallet)
              .values({
                userId: Number(userId),
                cashbackBalance: "0.00",
                totalEarned: "0.00",
                totalRedeemed: "0.00",
              } as any)
              .returning();
            walletRows = [newWallet];
          }

          const currentBalance = parseFloat(walletRows?.[0]?.cashbackBalance || '0');
          const currentRedeemed = parseFloat(walletRows?.[0]?.totalRedeemed || '0');

          if (currentBalance < redeemToApply) {
            return res.status(400).json({ error: 'Insufficient cashback balance' });
          }

          const newBalance = currentBalance - redeemToApply;

          await db
            .update(schema.userWallet)
            .set({
              cashbackBalance: newBalance.toFixed(2),
              totalRedeemed: (currentRedeemed + redeemToApply).toFixed(2),
              updatedAt: new Date(),
            } as any)
            .where(eq(schema.userWallet.userId, Number(userId)));

          await db.insert(schema.userWalletTransactions).values({
            userId: Number(userId),
            orderId: newOrder.id,
            type: 'redeem',
            amount: redeemToApply.toFixed(2),
            description: `Cashback redeemed for order ORD-${newOrder.id.toString().padStart(3, '0')}`,
            balanceBefore: currentBalance.toFixed(2),
            balanceAfter: newBalance.toFixed(2),
            status: 'completed',
          } as any);
        }
      }

      // Deduct affiliate wallet commission (if applied)
      if (affiliateWalletToApply > 0) {
        const existingAffiliateRedeemTx = await db
          .select({ id: schema.affiliateTransactions.id })
          .from(schema.affiliateTransactions)
          .where(
            and(
              eq(schema.affiliateTransactions.userId, Number(userId)),
              eq(schema.affiliateTransactions.orderId, orderId),
              eq(schema.affiliateTransactions.type, 'redemption'),
              eq(schema.affiliateTransactions.status, 'completed')
            )
          )
          .limit(1);

        if (!existingAffiliateRedeemTx || existingAffiliateRedeemTx.length === 0) {
          let affiliateWalletRows = await db
            .select()
            .from(schema.affiliateWallet)
            .where(eq(schema.affiliateWallet.userId, Number(userId)))
            .limit(1);

          if (!affiliateWalletRows || affiliateWalletRows.length === 0) {
            const [newWallet] = await db.insert(schema.affiliateWallet).values({
              userId: Number(userId),
              cashbackBalance: '0.00',
              commissionBalance: '0.00',
              totalEarnings: '0.00',
              totalWithdrawn: '0.00',
            } as any).returning();
            affiliateWalletRows = [newWallet];
          }

          const currentCommission = parseFloat(affiliateWalletRows?.[0]?.commissionBalance || '0');
          if (currentCommission < affiliateWalletToApply) {
            return res.status(400).json({ error: 'Insufficient affiliate commission balance' });
          }

          const newCommissionBalance = currentCommission - affiliateWalletToApply;

          await db
            .update(schema.affiliateWallet)
            .set({
              commissionBalance: newCommissionBalance.toFixed(2),
              updatedAt: new Date(),
            } as any)
            .where(eq(schema.affiliateWallet.userId, Number(userId)));

          await db.insert(schema.affiliateTransactions).values({
            userId: Number(userId),
            type: 'redemption',
            amount: affiliateWalletToApply.toFixed(2),
            balanceType: 'commission',
            description: `Affiliate wallet redeemed for order ORD-${newOrder.id.toString().padStart(3, '0')}`,
            orderId: newOrder.id,
            status: 'completed',
            transactionId: null,
            notes: null,
            processedAt: null,
            createdAt: new Date(),
          } as any);
        }
      }

      // Create order items (critical for order history + invoice)
      try {
        if (items && Array.isArray(items) && items.length > 0) {
          const orderItems: any[] = [];

          const toSafeQuantity = (v: any) => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
          };

          const toSafePrice = (v: any, fallback: any) => {
            const raw = v ?? fallback;
            const s = String(raw ?? '').trim();
            return s.length > 0 ? s : '₹0';
          };

          const toSafeText = (v: any, fallback: any) => {
            const s = String(v ?? fallback ?? '').trim();
            return s.length > 0 ? s : String(fallback ?? '');
          };

          for (let idx = 0; idx < items.length; idx++) {
            const item: any = items[idx];

            const isComboItem = !!(item?.comboId || item?.isCombo);
            const comboId = item?.comboId ? Number(item.comboId) : null;

            if (isComboItem && comboId) {
              try {
                const comboRows = await db
                  .select({
                    name: schema.combos.name,
                    products: schema.combos.products,
                    imageUrl: schema.combos.imageUrl,
                  })
                  .from(schema.combos)
                  .where(eq(schema.combos.id, comboId))
                  .limit(1);

                const comboProductsRaw = comboRows?.[0]?.products;
                const parsedIds = (() => {
                  const raw = comboProductsRaw;
                  if (!raw) return [];
                  const rawStr = String(raw).trim();

                  // JSON array (either [1,2] or [{id:1}, ...])
                  if (rawStr.startsWith('[') || rawStr.startsWith('{')) {
                    try {
                      const v = JSON.parse(rawStr);
                      if (Array.isArray(v)) {
                        if (v.every((x: any) => typeof x === 'object' && 'id' in x)) {
                          return v.map((x: any) => x.id);
                        }
                        return v;
                      }
                      if (v && typeof v === 'object' && Array.isArray((v as any).products)) {
                        return (v as any).products.map((x: any) => x.id);
                      }
                      if (Array.isArray(v)) return v;
                      if (v && typeof v === 'object' && Array.isArray((v as any).products)) return (v as any).products;
                    } catch {
                      // fall through
                    }
                  }

                  // Comma-separated list: "1,2,3"
                  if (rawStr.includes(',')) {
                    return rawStr.split(',').map((s) => s.trim()).filter(Boolean);
                  }

                  // Single id
                  return [rawStr];
                })();

                // Normalize IDs from common shapes
                const normalizedParsedIds = parsedIds.map((x: any) =>
                  x && typeof x === 'object' ? (x.id ?? x.productId ?? x.value) : x,
                );

                let productIds: number[] = Array.from(
                  new Set(
                    normalizedParsedIds
                      .map((x: any) => Number(x))
                      .filter((n: any) => Number.isFinite(n) && n > 0),
                  ),
                );

                // Fallback: If combo.products is malformed/missing, derive product ids from selectedShades keys
                if (productIds.length === 0 && item?.selectedShades && typeof item.selectedShades === 'object') {
                  const fromSelected = Object.keys(item.selectedShades)
                    .map((k: any) => Number(k))
                    .filter((n: any) => Number.isFinite(n) && n > 0);
                  if (fromSelected.length > 0) {
                    productIds = Array.from(new Set(fromSelected));
                  }
                }

                if (productIds.length > 0) {
                  const comboName = toSafeText(comboRows?.[0]?.name || item.productName || item.name, `Combo ${comboId}`);
                  const comboImage = (() => {
                    const fromDb = comboRows?.[0]?.imageUrl as any;
                    if (Array.isArray(fromDb) && fromDb.length > 0) return String(fromDb[0] || '');
                    return '';
                  })();

                  // Header row so UI shows combo name in order items
                  orderItems.push({
                    orderId: newOrder.id,
                    productId: null,
                    comboId: null,
                    productName: comboName,
                    productImage: toSafeText(comboImage || item.productImage || item.image || '', ''),
                    quantity: toSafeQuantity(item.quantity),
                    price: toSafePrice(item.price, `₹${Number(item.unitPrice || item.amount || 0)}`),
                    deliveryAddress: item.deliveryAddress || null,
                    recipientName: item.recipientName || null,
                    recipientPhone: item.recipientPhone || null,
                  });

                  const dbProducts = await db
                    .select({
                      id: schema.products.id,
                      name: schema.products.name,
                      imageUrl: schema.products.imageUrl,
                    })
                    .from(schema.products)
                    .where(inArray(schema.products.id, productIds as any));

                  const productById = new Map<number, any>(dbProducts.map((p: any) => [Number(p.id), p]));

                  for (const pid of productIds) {
                    const pidNum = Number(pid);
                    const p = productById.get(pidNum);
                    const baseName = String(p?.name || `Item ${idx + 1}`).trim();

                    const shadeObj =
                      (item.selectedShades && typeof item.selectedShades === 'object'
                        ? (item.selectedShades[String(pidNum)] ?? (item.selectedShades as any)[pidNum])
                        : null) || null;
                    const shadeName = String(shadeObj?.name || '').trim();
                    const productName = shadeName ? `${baseName} (Shade: ${shadeName})` : baseName;

                    orderItems.push({
                      orderId: newOrder.id,
                      productId: pidNum,
                      comboId: null,
                      productName: toSafeText(productName, `Item ${idx + 1}`),
                      productImage: toSafeText(p?.imageUrl || item.productImage || item.image || '', ''),
                      quantity: toSafeQuantity(item.quantity),
                      price: toSafePrice(item.price, `₹${Number(item.unitPrice || item.amount || 0)}`),
                      deliveryAddress: item.deliveryAddress || null,
                      recipientName: item.recipientName || null,
                      recipientPhone: item.recipientPhone || null,
                    });
                  }

                  continue;
                }
              } catch (err) {
                console.warn('⚠️ Failed to expand combo order item, falling back to combo row insert:', err);
              }
            }

            // Default (single product / non-expandable combo): insert as-is
            orderItems.push({
              orderId: newOrder.id,
              productId: item.productId ? Number(item.productId) : null,
              comboId: null,
              productName: toSafeText(item.productName || item.name, `Item ${idx + 1}`),
              productImage: toSafeText(item.productImage || item.image || '', ''),
              quantity: toSafeQuantity(item.quantity),
              price: toSafePrice(item.price, `₹${Number(item.unitPrice || item.amount || 0)}`),
              deliveryAddress: item.deliveryAddress || null,
              recipientName: item.recipientName || null,
              recipientPhone: item.recipientPhone || null,
            });
          }

          await db.insert(schema.orderItemsTable).values(orderItems);
          console.log(`✅ Inserted ${orderItems.length} order items for order ${newOrder.id}`);
        }
      } catch (e) {
        console.error('❌ Failed to insert order items:', e);
        // Fail-safe: do not allow an order to exist without order items.
        // Roll back the created order so user/admin/order-history/invoice don't show empty items.
        try {
          await db.delete(schema.ordersTable).where(eq(schema.ordersTable.id, newOrder.id));
        } catch (rollbackErr) {
          console.error('❌ Failed to rollback order after order_items insert failure:', rollbackErr);
        }
        const errAny = e as any;

        let schemaDebug: any = null;
        try {
          const orderIdCols = await db.execute(sql`
            select column_name, data_type, udt_name
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'orders'
              and column_name in ('id')
          `);
          const orderItemsCols = await db.execute(sql`
            select column_name, data_type, udt_name
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'order_items'
              and column_name in ('order_id')
          `);

          // Cross-check using pg_catalog (more authoritative than information_schema)
          const pgTypeCheck = await db.execute(sql`
            select
              c.relname as table_name,
              a.attname as column_name,
              t.typname as pg_type
            from pg_attribute a
            join pg_class c on c.oid = a.attrelid
            join pg_type t on t.oid = a.atttypid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public'
              and c.relname in ('orders', 'order_items')
              and a.attname in ('id', 'order_id')
              and a.attnum > 0
              and not a.attisdropped
            order by c.relname, a.attname
          `);

          const uuidColumns = await db.execute(sql`
            select
              c.relname as table_name,
              a.attname as column_name
            from pg_attribute a
            join pg_class c on c.oid = a.attrelid
            join pg_type t on t.oid = a.atttypid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public'
              and t.typname = 'uuid'
              and a.attnum > 0
              and not a.attisdropped
            order by c.relname, a.attname
          `);

          let errorColumnType: any = null;
          if (errAny?.table && errAny?.column) {
            try {
              const rows = await db.execute(sql`
                select
                  c.relname as table_name,
                  a.attname as column_name,
                  t.typname as pg_type
                from pg_attribute a
                join pg_class c on c.oid = a.attrelid
                join pg_type t on t.oid = a.atttypid
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public'
                  and c.relname = ${String(errAny.table)}
                  and a.attname = ${String(errAny.column)}
                  and a.attnum > 0
                  and not a.attisdropped
                limit 1
              `);
              errorColumnType = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : rows);
            } catch {}
          }

          schemaDebug = {
            orders: (orderIdCols as any)?.rows ?? orderIdCols,
            order_items: (orderItemsCols as any)?.rows ?? orderItemsCols,
            pg_catalog: (pgTypeCheck as any)?.rows ?? pgTypeCheck,
            uuid_columns: (uuidColumns as any)?.rows ?? uuidColumns,
            error_column_type: errorColumnType,
          };
        } catch (schemaErr) {
          console.error('❌ Failed to read DB schema for debug:', schemaErr);
        }

        const debug = {
          message: errAny?.message,
          code: errAny?.code,
          detail: errAny?.detail,
          constraint: errAny?.constraint,
          table: errAny?.table,
          column: errAny?.column,
          dataType: errAny?.dataType,
          where: errAny?.where,
          schema: schemaDebug,
        };

        return res.status(500).json({
          error: 'Failed to create order items',
          ...(process.env.NODE_ENV !== 'production' ? { debug } : {}),
        });
      }

      // 🔒 SINGLE UNIFIED AFFILIATE COMMISSION PROCESSING
      // Only process commission once per order - avoid duplicate entries
      if (effectiveAffiliateCode && effectiveAffiliateCode.startsWith('POPPIKAP')) {
        const affiliateUserId = parseInt(effectiveAffiliateCode.replace('POPPIKAP', ''));

        console.log(`🔍 Processing affiliate commission for order: ${effectiveAffiliateCode}, userId: ${affiliateUserId}`);

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
              // 💡 Calculate commission from product-level settings, not from checkout
              // This ensures the exact commission admin configured is used
              let totalOrderCommission = 0;
              const commissionBreakdown = [];

              for (const item of items) {
                let itemCommissionRate = 0;

                if (item.productId && !isNaN(Number(item.productId))) {
                  try {
                    const product = await db
                      .select({ affiliateCommission: schema.products.affiliateCommission })
                      .from(schema.products)
                      .where(eq(schema.products.id, Number(item.productId)))
                      .limit(1);

                    if (product.length > 0) {
                      itemCommissionRate = parseFloat(String(product[0].affiliateCommission || 0));
                    }
                  } catch (err) {
                    console.warn(`Could not fetch product ${item.productId} commission`);
                  }
                } else if (item.comboId && !isNaN(Number(item.comboId))) {
                  try {
                    const combo = await db
                      .select({ affiliateCommission: schema.combos.affiliateCommission })
                      .from(schema.combos)
                      .where(eq(schema.combos.id, Number(item.comboId)))
                      .limit(1);

                    if (combo.length > 0) {
                      itemCommissionRate = parseFloat(String(combo[0].affiliateCommission || 0));
                    }
                  } catch (err) {
                    console.warn(`Could not fetch combo ${item.comboId} commission`);
                  }
                } else if (item.offerId && !isNaN(Number(item.offerId))) {
                  try {
                    const offer = await db
                      .select({ affiliateCommission: schema.offers.affiliateCommission })
                      .from(schema.offers)
                      .where(eq(schema.offers.id, Number(item.offerId)))
                      .limit(1);

                    if (offer.length > 0) {
                      itemCommissionRate = parseFloat(String(offer[0].affiliateCommission || 0));
                    }
                  } catch (err) {
                    console.warn(`Could not fetch offer ${item.offerId} commission`);
                  }
                }

                const itemPrice = parseFloat(String(item.price).replace(/[₹,]/g, '') || '0');
                const itemQuantity = Number(item.quantity || 1);
                const itemTotal = itemPrice * itemQuantity;
                const itemCommission = (itemTotal * itemCommissionRate) / 100;

                totalOrderCommission += itemCommission;
                commissionBreakdown.push({
                  product: item.productName || item.name,
                  price: itemPrice,
                  quantity: itemQuantity,
                  rate: itemCommissionRate,
                  commission: itemCommission
                });
              }

              const commissionRate = totalOrderCommission > 0 && Number(totalAmount) > 0 
                ? ((totalOrderCommission / Number(totalAmount)) * 100).toFixed(2)
                : '0.00';

              console.log(`💰 Calculated commission from product settings: ₹${totalOrderCommission.toFixed(2)} (${commissionRate}%)`, commissionBreakdown);

              if (totalOrderCommission > 0) {
                const existingAffiliateWallet = await db
                  .select({ id: schema.affiliateWallet.id })
                  .from(schema.affiliateWallet)
                  .where(eq(schema.affiliateWallet.userId, affiliateUserId))
                  .limit(1);

                if (!existingAffiliateWallet || existingAffiliateWallet.length === 0) {
                  await db.insert(schema.affiliateWallet).values({
                    userId: affiliateUserId,
                    cashbackBalance: "0.00",
                    commissionBalance: "0.00",
                    totalEarnings: "0.00",
                    totalWithdrawn: "0.00"
                  } as any);
                }

                await db.insert(schema.affiliateSales).values({
                  affiliateUserId,
                  affiliateCode: effectiveAffiliateCode,
                  orderId: newOrder.id,
                  customerId: Number(userId),
                  customerName: customerName,
                  customerEmail: customerEmail,
                  customerPhone: customerPhone || null,
                  productName: items.map((it: any) => it.productName || it.name).join(', '),
                  saleAmount: Number(totalAmount).toFixed(2),
                  commissionAmount: totalOrderCommission.toFixed(2),
                  commissionRate: commissionRate,
                  status: 'pending'
                } as any);

                await db.insert(schema.affiliateTransactions).values({
                  userId: affiliateUserId,
                  orderId: newOrder.id,
                  type: 'commission',
                  amount: totalOrderCommission.toFixed(2),
                  balanceType: 'commission',
                  description: `Commission (${commissionRate}%) from order ORD-${newOrder.id.toString().padStart(3, '0')}`,
                  status: 'pending',
                  transactionId: null,
                  notes: null,
                  processedAt: null,
                  createdAt: new Date(),
                } as any);

                console.log(`✅ Affiliate commission pending: ₹${totalOrderCommission.toFixed(2)} (${commissionRate}%) for affiliate ${affiliateUserId} (order ${newOrder.id})`);
              }
            }
          } catch (err) {
            console.error(`Failed to process affiliate commission for order ${newOrder.id}:`, err);
          }
        }
      }

      try {
        const cashbackRows: { name: string; amount: number }[] = [];
        for (const it of items || []) {
          if (it?.cashbackPrice && it?.cashbackPercentage) {
            const cashbackAmount = Number(it.cashbackPrice) * (Number(it.quantity) || 1);

            if (cashbackAmount > 0) {
              cashbackRows.push({
                name: it.productName || it.name || 'Item',
                amount: cashbackAmount,
              });
            }
          }
        }

        const giftMilestoneCashbackFromBody = Math.round(
          Math.max(0, Number((req.body as any)?.giftMilestoneCashback || 0))
        );
        if (giftMilestoneCashbackFromBody > 0) {
          cashbackRows.push({
            name: 'Gift Milestone Cashback',
            amount: giftMilestoneCashbackFromBody,
          });
        }

        if (cashbackRows.length > 0) {
          let walletRows = await db
            .select()
            .from(schema.userWallet)
            .where(eq(schema.userWallet.userId, Number(userId)))
            .limit(1);

          if (!walletRows || walletRows.length === 0) {
            const [newWallet] = await db
              .insert(schema.userWallet)
              .values({
                userId: Number(userId),
                cashbackBalance: '0.00',
                totalEarned: '0.00',
                totalRedeemed: '0.00',
              } as any)
              .returning();
            walletRows = [newWallet];
          }

          const currentBalance = parseFloat(walletRows?.[0]?.cashbackBalance || '0');

          for (const row of cashbackRows) {
            const description = `Cashback from ${row.name}`;
            const existingRow = await db
              .select({ id: schema.userWalletTransactions.id })
              .from(schema.userWalletTransactions)
              .where(
                and(
                  eq(schema.userWalletTransactions.userId, Number(userId)),
                  eq(schema.userWalletTransactions.orderId, newOrder.id),
                  eq(schema.userWalletTransactions.amount, row.amount.toFixed(2)),
                  eq(schema.userWalletTransactions.description, description),
                  or(
                    eq(schema.userWalletTransactions.status, 'pending'),
                    eq(schema.userWalletTransactions.status, 'completed')
                  )
                )
              )
              .limit(1);

            if (existingRow && existingRow.length > 0) continue;

            await db.insert(schema.userWalletTransactions).values({
              userId: Number(userId),
              orderId: newOrder.id,
              type: 'pending',
              amount: row.amount.toFixed(2),
              description,
              balanceBefore: currentBalance.toFixed(2),
              balanceAfter: currentBalance.toFixed(2),
              status: 'pending',
              eligibleAt: null,
            } as any);
          }
        }
      } catch (e) {
        console.error('Failed to create pending cashback transactions:', e);
      }

      let ithinkAwb = null;
      let ithinkOrderId = null;
      let ithinkShipmentId = null;
      let ithinkError = null;

      // Prepare a user placeholder so it's available outside the iThink block
      let user: any = [];

      // Check if iThink is configured
      if (deliveryPartner === 'ITHINK' && process.env.ITHINK_EMAIL && process.env.ITHINK_PASSWORD) {
        try {
          console.log('Starting iThink order creation for:', orderId);

          // Get user details from database
          user = await db
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

          console.log('Customer data for iThink:', customerData);
          console.log('Full shipping address:', shippingAddress);

          // Prepare iThink order with correct pickup location
          // NOTE: If env is missing, default to 'Office' since many iThink accounts use it
          const pickupLocation = String(process.env.ITHINK_PICKUP_LOCATION || 'Office');
          const ithinkOrderData = ithinkService.convertToIthinkFormat({
            id: orderId,
            createdAt: newOrder.createdAt,
            totalAmount: Number(totalAmount),
            paymentMethod: paymentMethod,
            shippingAddress: shippingAddress,
            items: items,
            customer: customerData
          }, pickupLocation);

          console.log('iThink order payload:', JSON.stringify(ithinkOrderData, null, 2));

          // Create order on iThink
          const ithinkResponse = await ithinkService.createOrder(ithinkOrderData);
          console.log('iThink API response:', JSON.stringify(ithinkResponse, null, 2));

          if (ithinkResponse && ithinkResponse.order_id) {
            ithinkOrderId = ithinkResponse.order_id;
            ithinkShipmentId = ithinkResponse.shipment_id || null;
            ithinkAwb = ithinkResponse.awb_code || null;

            console.log(`iThink order created: ${ithinkOrderId} shipment_id=${ithinkShipmentId || 'Pending'} awb=${ithinkAwb || 'Pending'}`);

            // Update order with iThink details immediately
            await db.update(schema.ordersTable)
              .set({
                ithinkOrderId: ithinkOrderId,
                ithinkShipmentId: ithinkShipmentId,
                trackingNumber: ithinkAwb || undefined,
                status: 'processing' // Set status to processing since it's now with iThink
              } as any)
              .where(eq(schema.ordersTable.id, newOrder.id));

            console.log(`Database updated with iThink details for order ${orderId}`);
          } else {
            ithinkError = 'Invalid iThink response - no order_id';
            console.error('iThink response missing order_id:', ithinkResponse);
          }
        } catch (ithinkErrorCatch) {
          ithinkError = ithinkErrorCatch.message;
          console.error('iThink order creation failed:', {
            orderId: orderId,
            error: ithinkErrorCatch.message,
            stack: ithinkErrorCatch.stack
          });

          // Save error to database for debugging
          await db.update(schema.ordersTable)
            .set({
              notes: `iThink Error: ${ithinkErrorCatch.message}`
            } as any)
            .where(eq(schema.ordersTable.id, newOrder.id));
        }
      } else {
        ithinkError = deliveryPartner !== 'ITHINK'
          ? 'Manual dispatch (India Post) - iThink integration skipped'
          : 'iThink credentials not configured';
        console.warn('Skipping iThink integration:', ithinkError);
      }

      // Send order notification email to info@poppik.in
      void sendOrderNotificationEmail({
        orderId: orderId,
        customerName: customerName || `${user[0]?.firstName || ''} ${user[0]?.lastName || ''}`.trim(),
        customerEmail: customerEmail || user[0]?.email || 'customer@example.com',
        customerPhone: customerPhone || user[0]?.phone,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        deliveryPartner: deliveryPartner,
        deliveryType: deliveryType,
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
        ithinkIntegrated: !!ithinkOrderId,
        ithinkOrderId: ithinkOrderId,
        ithinkError: ithinkError,
        order: {
          id: orderId,
          ...newOrder,
          ithinkOrderId: ithinkOrderId || null,
          ithinkShipmentId: ithinkShipmentId || null
        }
      });

    } catch (error) {
      console.error("Order creation error:", error);
      const errorProps = getErrorProperties(error);
      console.error("Error details:", {
        message: errorProps.message,
        stack: errorProps.stack,
        code: errorProps.code
      });
      res.status(500).json({
        error: "Failed to create order",
        details: errorProps.message || "Unknown error occurred"
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

      if (status === 'delivered') {
        const order = await db
          .select({ id: schema.ordersTable.id, userId: schema.ordersTable.userId })
          .from(schema.ordersTable)
          .where(eq(schema.ordersTable.id, Number(orderId)))
          .limit(1);

        if (order && order.length > 0) {
          const userId = order[0].userId;

          let wallet = await db
            .select()
            .from(schema.userWallet)
            .where(eq(schema.userWallet.userId, userId))
            .limit(1);

          if (!wallet || wallet.length === 0) {
            const [newWallet] = await db
              .insert(schema.userWallet)
              .values({
                userId,
                cashbackBalance: '0.00',
                totalEarned: '0.00',
                totalRedeemed: '0.00',
              } as any)
              .returning();
            wallet = [newWallet];
          }

          const pendingCashbacks = await db
            .select()
            .from(schema.userWalletTransactions)
            .where(
              and(
                eq(schema.userWalletTransactions.orderId, Number(orderId)),
                eq(schema.userWalletTransactions.userId, userId),
                eq(schema.userWalletTransactions.status, 'pending')
              )
            )
            .orderBy(asc(schema.userWalletTransactions.id));

          let runningBalance = parseFloat(wallet[0].cashbackBalance || '0');
          let runningTotalEarned = parseFloat(wallet[0].totalEarned || '0');

          for (const tx of pendingCashbacks) {
            const creditAmount = parseFloat(tx.amount as any);
            const newBalance = runningBalance + creditAmount;
            const newTotalEarned = runningTotalEarned + creditAmount;

            await db
              .update(schema.userWallet)
              .set({
                cashbackBalance: newBalance.toFixed(2),
                totalEarned: newTotalEarned.toFixed(2),
                updatedAt: new Date(),
              } as any)
              .where(eq(schema.userWallet.userId, userId));

            await db
              .update(schema.userWalletTransactions)
              .set({
                status: 'completed',
                type: 'credit',
                balanceBefore: runningBalance.toFixed(2),
                balanceAfter: newBalance.toFixed(2),
              } as any)
              .where(eq(schema.userWalletTransactions.id, tx.id));

            runningBalance = newBalance;
            runningTotalEarned = newTotalEarned;
          }

          const pendingAffiliateTxs = await db
            .select()
            .from(schema.affiliateTransactions)
            .where(
              and(
                eq(schema.affiliateTransactions.orderId, Number(orderId)),
                eq(schema.affiliateTransactions.type, 'commission'),
                eq(schema.affiliateTransactions.status, 'pending')
              )
            )
            .orderBy(asc(schema.affiliateTransactions.id));

          for (const tx of pendingAffiliateTxs) {
            const affiliateUserId = Number(tx.userId);
            const creditAmount = parseFloat(tx.amount as any);
            if (!affiliateUserId || isNaN(creditAmount) || creditAmount <= 0) continue;

            let affiliateWallet = await db
              .select()
              .from(schema.affiliateWallet)
              .where(eq(schema.affiliateWallet.userId, affiliateUserId))
              .limit(1);

            if (!affiliateWallet || affiliateWallet.length === 0) {
              const [newWallet] = await db.insert(schema.affiliateWallet).values({
                userId: affiliateUserId,
                cashbackBalance: '0.00',
                commissionBalance: '0.00',
                totalEarnings: '0.00',
                totalWithdrawn: '0.00'
              } as any).returning();
              affiliateWallet = [newWallet];
            }

            const currentCommission = parseFloat(affiliateWallet[0].commissionBalance || '0');
            const currentEarnings = parseFloat(affiliateWallet[0].totalEarnings || '0');
            const newCommission = currentCommission + creditAmount;
            const newEarnings = currentEarnings + creditAmount;

            await db
              .update(schema.affiliateWallet)
              .set({
                commissionBalance: newCommission.toFixed(2),
                totalEarnings: newEarnings.toFixed(2),
                updatedAt: new Date(),
              } as any)
              .where(eq(schema.affiliateWallet.userId, affiliateUserId));

            await db
              .update(schema.affiliateTransactions)
              .set({
                status: 'completed',
                processedAt: new Date(),
              } as any)
              .where(eq(schema.affiliateTransactions.id, tx.id));
          }

          await db
            .update(schema.affiliateSales)
            .set({
              status: 'paid',
              paidAt: new Date(),
            } as any)
            .where(
              and(
                eq(schema.affiliateSales.orderId, Number(orderId)),
                eq(schema.affiliateSales.status, 'pending')
              )
            );
        }
      }

      if (status === 'cancelled' || status === 'returned' || status === 'refunded') {
        await db
          .update(schema.userWalletTransactions)
          .set({ status: 'failed' } as any)
          .where(
            and(
              eq(schema.userWalletTransactions.orderId, Number(orderId)),
              eq(schema.userWalletTransactions.status, 'pending')
            )
          );

        await db
          .update(schema.affiliateTransactions)
          .set({ status: 'failed', processedAt: new Date() } as any)
          .where(
            and(
              eq(schema.affiliateTransactions.orderId, Number(orderId)),
              eq(schema.affiliateTransactions.type, 'commission'),
              eq(schema.affiliateTransactions.status, 'pending')
            )
          );

        await db
          .update(schema.affiliateSales)
          .set({ status: 'failed' } as any)
          .where(
            and(
              eq(schema.affiliateSales.orderId, Number(orderId)),
              eq(schema.affiliateSales.status, 'pending')
            )
          );
      }

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
  const generateTrackingTimeline = (status: string, createdAt: Date, estimatedDelivery: Date | null) => {
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
        date: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: "Your order has been cancelled. If you have any questions, please contact our support team."
      });
      return timeline;
    }

    if (status === 'confirmed') {
      timeline.push({
        step: "Order Confirmed",
        status: "completed",
        date: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0],
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
  };

  // Helper function to get current step
  const getCurrentStep = (status: string): number => {
    switch (status) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return 1;
      default: return 0;
    }
  };

  // Check pincode serviceability endpoint
  app.get("/api/check-pincode", async (req, res) => {
    try {
      const { pincode } = req.query;

      if (!pincode || typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({
          error: "Valid 6-digit pincode is required"
        });
      }

      const result = await validatePincodeBackend(pincode);

      return res.json({
        ...result,
        available: (result as any)?.pincode_valid === true,
      });
    } catch (error) {
      console.error("Error checking pincode serviceability:", error);
      return res.status(500).json({
        status: 'error',
        message: 'Pincode validation service unavailable',
        pincode_valid: false,
        available: false,
        ...(process.env.NODE_ENV !== 'production'
          ? { debug: { pincode: String(req.query.pincode || ''), error: (error as any)?.message || String(error) } }
          : {}),
      });
    }
  });

  app.get("/api/pincode/validate", async (req, res) => {
    try {
      const { pincode } = req.query;

      if (!pincode || typeof pincode !== 'string' || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid 6-digit pincode is required',
          pincode_valid: false,
        });
      }

      const result = await validatePincodeBackend(pincode);
      if ((result as any)?.status === 'error') {
        return res.status(503).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("Error validating pincode:", error);
      return res.status(503).json({
        status: 'error',
        message: 'Pincode validation service unavailable',
        pincode_valid: false,
        ...(process.env.NODE_ENV !== 'production'
          ? { debug: { pincode: String((req as any)?.query?.pincode || ''), error: (error as any)?.message || String(error) } }
          : {}),
      });
    }
  });

  // iThink serviceability endpoint for shipping cost
  app.get("/api/ithink/serviceability", async (req, res) => {
    try {
      const { deliveryPincode, weight, cod, productMrp } = req.query;

      if (!deliveryPincode || !weight) {
        return res.status(400).json({
          error: "Missing required parameters: deliveryPincode and weight"
        });
      }

      const pickupPincode = process.env.ITHINK_PICKUP_PINCODE || "400001";

      try {
        const serviceability = await ithinkService.getServiceability(
          pickupPincode,
          deliveryPincode as string,
          Number(weight),
          cod === 'true',
          productMrp !== undefined ? Number(productMrp) : undefined
        );

        const companies = (serviceability as any)?.data?.available_courier_companies;
        if (Array.isArray(companies)) {
          return res.json({
            ...(serviceability as any),
            serviceable: companies.length > 0,
            error: false,
          });
        }

        return res.json({
          data: { available_courier_companies: [] },
          serviceable: false,
          error: false,
        });
      } catch (ithinkError) {
        console.warn("iThink serviceability check failed:", ithinkError);
        return res.json({
          data: { available_courier_companies: [] },
          serviceable: null,
          error: true,
          message: "iThink serviceability check failed",
          ...(process.env.NODE_ENV !== 'production'
            ? { debug: { error: (ithinkError as any)?.message || String(ithinkError) } }
            : {}),
        });
      }
    } catch (error) {
      console.error("Error checking iThink serviceability:", error);
      return res.status(500).json({
        error: "Failed to check shipping serviceability",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // iThink tracking endpoint
  app.get("/api/orders/:orderId/track-ithink", async (req, res) => {
    try {
      const orderId = req.params.orderId.replace('ORD-', '');
      const numericId = parseInt(orderId.replace(/\D/g, ''), 10);

      if (isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const order = await db
        .select()
        .from(schema.ordersTable)
        .where(eq(schema.ordersTable.id, numericId))
        .limit(1);

      if (!order || order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData: any = order[0];

      if (!orderData.ithinkOrderId) {
        return res.json({
          orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
          ithinkOrderId: null,
          status: orderData.status,
          trackingNumber: orderData.trackingNumber,
          estimatedDelivery: orderData.estimatedDelivery?.toISOString?.().split('T')[0],
          hasiThinkTracking: false,
          realTimeTracking: false,
        });
      }

      const trackingDetails = await ithinkService.trackOrder(String(orderData.ithinkOrderId));
      const currentStatus =
        trackingDetails?.tracking_data?.shipment_track?.[0]?.current_status ||
        trackingDetails?.tracking_data?.shipment_track?.[0]?.shipment_status ||
        null;

      const statusText = String(currentStatus || '').toLowerCase();
      let finalStatus = orderData.status;
      if (statusText.includes('deliver')) finalStatus = 'delivered';
      else if (statusText.includes('ship') || statusText.includes('out for delivery') || statusText.includes('in transit')) finalStatus = 'shipped';

      return res.json({
        orderId: `ORD-${orderData.id.toString().padStart(3, '0')}`,
        ithinkOrderId: orderData.ithinkOrderId,
        status: finalStatus,
        trackingNumber: orderData.trackingNumber,
        estimatedDelivery: orderData.estimatedDelivery?.toISOString?.().split('T')[0],
        hasiThinkTracking: true,
        realTimeTracking: true,
        ithinkStatus: currentStatus,
      });
    } catch (error) {
      console.error("Error fetching iThink tracking:", error);
      return res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });

  app.post('/api/webhooks/ithink', async (req, res) => {
    try {
      const configuredSecret = process.env.ITHINK_WEBHOOK_SECRET;
      if (configuredSecret) {
        const providedSecret =
          (req.headers['x-api-key'] as string) ||
          (req.headers['x-ithink-webhook-secret'] as string) ||
          (req.headers['x-webhook-secret'] as string) ||
          (req.query.secret as string);

        if (!providedSecret || providedSecret !== configuredSecret) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }

      const payload: any = req.body || {};

      const rawiThinkOrderId =
        payload.order_id ||
        payload.orderId ||
        payload.ithink_order_id ||
        payload.ithinkOrderId ||
        payload?.tracking_data?.shipment_track?.[0]?.order_id;

      let orderRow: any = null;

      if (rawiThinkOrderId !== undefined && rawiThinkOrderId !== null && String(rawiThinkOrderId).trim() !== '') {
        const ithinkOrderId = parseInt(String(rawiThinkOrderId).replace(/\D/g, ''), 10);
        if (!isNaN(ithinkOrderId)) {
          const rows = await db
            .select({ id: schema.ordersTable.id, userId: schema.ordersTable.userId })
            .from(schema.ordersTable)
            .where(eq((schema.ordersTable as any).ithinkOrderId, ithinkOrderId))
            .limit(1);
          orderRow = rows?.[0] || null;
        }
      }

      if (!orderRow) {
        const merchantOrderId =
          payload.channel_order_id ||
          payload.channelOrderId ||
          payload.order_code ||
          payload.orderCode ||
          payload?.tracking_data?.shipment_track?.[0]?.channel_order_id;

        if (merchantOrderId) {
          const numericId = parseInt(String(merchantOrderId).replace(/\D/g, ''), 10);
          if (!isNaN(numericId)) {
            const rows = await db
              .select({ id: schema.ordersTable.id, userId: schema.ordersTable.userId })
              .from(schema.ordersTable)
              .where(eq(schema.ordersTable.id, numericId))
              .limit(1);
            orderRow = rows?.[0] || null;
          }
        }
      }

      if (!orderRow) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const rawStatus =
        payload.current_status ||
        payload.status ||
        payload.shipment_status ||
        payload?.tracking_data?.shipment_track?.[0]?.current_status ||
        payload?.tracking_data?.shipment_track?.[0]?.shipment_status;

      const statusText = String(rawStatus || '').toLowerCase();

      let newStatus: string | null = null;
      if (statusText.includes('deliver')) newStatus = 'delivered';
      else if (statusText.includes('ship') || statusText.includes('in transit') || statusText.includes('out for delivery')) newStatus = 'shipped';
      else if (statusText.includes('pick') || statusText.includes('process') || statusText.includes('manifest')) newStatus = 'processing';
      else if (statusText.includes('cancel')) newStatus = 'cancelled';
      else if (statusText.includes('return') || statusText.includes('rto')) newStatus = 'returned';
      else if (statusText.includes('refund')) newStatus = 'refunded';

      if (!newStatus) {
        return res.json({ success: true, message: 'Ignored (unmapped status)' });
      }

      const updateData: any = { status: newStatus, updatedAt: new Date() };
      if (newStatus === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await db
        .update(schema.ordersTable)
        .set(updateData)
        .where(eq(schema.ordersTable.id, orderRow.id));

      if (newStatus === 'delivered') {
        const userId = orderRow.userId;

        let wallet = await db
          .select()
          .from(schema.userWallet)
          .where(eq(schema.userWallet.userId, userId))
          .limit(1);

        if (!wallet || wallet.length === 0) {
          const [newWallet] = await db
            .insert(schema.userWallet)
            .values({
              userId,
              cashbackBalance: '0.00',
              totalEarned: '0.00',
              totalRedeemed: '0.00',
            } as any)
            .returning();
          wallet = [newWallet];
        }

        const pendingCashbacks = await db
          .select()
          .from(schema.userWalletTransactions)
          .where(
            and(
              eq(schema.userWalletTransactions.orderId, orderRow.id),
              eq(schema.userWalletTransactions.userId, userId),
              eq(schema.userWalletTransactions.status, 'pending')
            )
          )
          .orderBy(asc(schema.userWalletTransactions.id));

        let runningBalance = parseFloat(wallet[0].cashbackBalance || '0');
        let runningTotalEarned = parseFloat(wallet[0].totalEarned || '0');

        for (const tx of pendingCashbacks) {
          const creditAmount = parseFloat(tx.amount as any);
          const newBalance = runningBalance + creditAmount;
          const newTotalEarned = runningTotalEarned + creditAmount;

          await db
            .update(schema.userWallet)
            .set({
              cashbackBalance: newBalance.toFixed(2),
              totalEarned: newTotalEarned.toFixed(2),
              updatedAt: new Date(),
            } as any)
            .where(eq(schema.userWallet.userId, userId));

          await db
            .update(schema.userWalletTransactions)
            .set({
              status: 'completed',
              type: 'credit',
              balanceBefore: runningBalance.toFixed(2),
              balanceAfter: newBalance.toFixed(2),
            } as any)
            .where(eq(schema.userWalletTransactions.id, tx.id));

          runningBalance = newBalance;
          runningTotalEarned = newTotalEarned;
        }

        const pendingAffiliateTxs = await db
          .select()
          .from(schema.affiliateTransactions)
          .where(
            and(
              eq(schema.affiliateTransactions.orderId, orderRow.id),
              eq(schema.affiliateTransactions.type, 'commission'),
              eq(schema.affiliateTransactions.status, 'pending')
            )
          )
          .orderBy(asc(schema.affiliateTransactions.id));

        for (const tx of pendingAffiliateTxs) {
          const affiliateUserId = Number(tx.userId);
          const creditAmount = parseFloat(tx.amount as any);
          if (!affiliateUserId || isNaN(creditAmount) || creditAmount <= 0) continue;

          let affiliateWallet = await db
            .select()
            .from(schema.affiliateWallet)
            .where(eq(schema.affiliateWallet.userId, affiliateUserId))
            .limit(1);

          if (!affiliateWallet || affiliateWallet.length === 0) {
            const [newWallet] = await db.insert(schema.affiliateWallet).values({
              userId: affiliateUserId,
              cashbackBalance: '0.00',
              commissionBalance: '0.00',
              totalEarnings: '0.00',
              totalWithdrawn: '0.00'
            } as any).returning();
            affiliateWallet = [newWallet];
          }

          const currentCommission = parseFloat(affiliateWallet[0].commissionBalance || '0');
          const currentEarnings = parseFloat(affiliateWallet[0].totalEarnings || '0');
          const newCommission = currentCommission + creditAmount;
          const newEarnings = currentEarnings + creditAmount;

          await db
            .update(schema.affiliateWallet)
            .set({
              commissionBalance: newCommission.toFixed(2),
              totalEarnings: newEarnings.toFixed(2),
              updatedAt: new Date(),
            } as any)
            .where(eq(schema.affiliateWallet.userId, affiliateUserId));

          await db
            .update(schema.affiliateTransactions)
            .set({
              status: 'completed',
              processedAt: new Date(),
            } as any)
            .where(eq(schema.affiliateTransactions.id, tx.id));
        }

        await db
          .update(schema.affiliateSales)
          .set({
            status: 'paid',
            paidAt: new Date(),
          } as any)
          .where(
            and(
              eq(schema.affiliateSales.orderId, orderRow.id),
              eq(schema.affiliateSales.status, 'pending')
            )
          );
      }

      if (newStatus === 'cancelled' || newStatus === 'returned' || newStatus === 'refunded') {
        await db
          .update(schema.userWalletTransactions)
          .set({ status: 'failed' } as any)
          .where(
            and(
              eq(schema.userWalletTransactions.orderId, orderRow.id),
              eq(schema.userWalletTransactions.status, 'pending')
            )
          );

        await db
          .update(schema.affiliateTransactions)
          .set({ status: 'failed', processedAt: new Date() } as any)
          .where(
            and(
              eq(schema.affiliateTransactions.orderId, orderRow.id),
              eq(schema.affiliateTransactions.type, 'commission'),
              eq(schema.affiliateTransactions.status, 'pending')
            )
          );

        await db
          .update(schema.affiliateSales)
          .set({ status: 'failed' } as any)
          .where(
            and(
              eq(schema.affiliateSales.orderId, orderRow.id),
              eq(schema.affiliateSales.status, 'pending')
            )
          );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('iThink webhook error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // Blog API Routes

  // Public blog routes
  app.get("/api/blog/posts", async (req, res) => {
    try {
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
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
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
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
        { id: 2, name: "Makeup", slug: "makeup", description: "All about makeup", isActive: true, sortOrder: 2 },
        { id: 3, name: "Haircare", slug: "haircare", description: "All about haircare", isActive: true, sortOrder: 3 }
      ]);
    }
  });

  // Admin blog routes
  app.get("/api/admin/blog/posts", async (req, res) => {
    try {
      // Set aggressive no-cache headers for admin
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
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

  app.get("/api/admin/blog/categories", async (req, res) => {
    try {
      // Set aggressive no-cache headers for admin
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: "Failed to fetch blog categories" });
    }
  });

  app.get("/api/admin/blog/subcategories", async (req, res) => {
    try {
      // Set aggressive no-cache headers for admin
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const subcategories = await storage.getBlogSubcategories();
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching blog subcategories:", error);
      res.status(500).json({ error: "Failed to fetch blog subcategories" });
    }
  });

  app.get("/api/admin/blog/categories/:categoryId/subcategories", async (req, res) => {
    try {
      // Set aggressive no-cache headers for admin
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
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
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      const { name, description, isActive, sortOrder } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData: any = {
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
        error: errorMessage,
        details: error.message || "Unknown error"
      });
    }
  });

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
      const post = await db.select().from(blogPosts)
        .where(eq(blogPosts.id, postId))
        .limit(1);

      if (!post || post.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // For simplicity, just increment/decrement likes count
      // In a real app, you'd track individual user likes
      const currentLikes = post[0].likes || 0;
      const newLikes = currentLikes + 1;

      await db.update(require('../shared/schema').blogPosts)
        .set(({ likes: newLikes } as any))
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
        lastName: schema.users.lastName,
      }).from(schema.users).where(eq(schema.users.id, parseInt(userId))).limit(1);

      const userData = user[0] || { firstName: 'Customer', lastName: 'Name', email: 'customer@email.com', phone: null };

      // Update post comment count
      await db.update(schema.blogPosts)
        .set(({ comments: sql`${schema.blogPosts.comments} + 1` } as any))
        .where(eq(schema.blogPosts.id, postId));

      res.json({
        success: true,
        comment: {
          id: Date.now(),
          author: `${userData.firstName} ${userData.lastName}`,
          content: content.trim(),
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          userId: parseInt(userId)
        },
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
        { id: 2, name: "Makeup", slug: "makeup", description: "All about makeup", isActive: true, sortOrder: 2 },
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
    { name: 'thumbnail', maxCount: 1 },
    { name: 'hero', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'contentVideos', maxCount: 10 }
  ]), async (req, res) => {
    try {
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let imageUrl = req.body.imageUrl;
      let thumbnailUrl = req.body.thumbnailUrl;
      let heroImageUrl = req.body.heroImageUrl;
      let videoUrl = req.body.videoUrl;
      const contentVideoUrls: string[] = [];

      // Handle thumbnail upload (maps to imageUrl for API compatibility)
      if (files?.thumbnail?.[0]) {
        thumbnailUrl = `/api/images/${files.thumbnail[0].filename}`;
        imageUrl = thumbnailUrl; // Set imageUrl as fallback
      }

      // Handle hero upload
      if (files?.hero?.[0]) {
        heroImageUrl = `/api/images/${files.hero[0].filename}`;
      }

      // Handle image upload (legacy field, maps to thumbnail if not provided)
      if (files?.image?.[0]) {
        imageUrl = `/api/images/${files.image[0].filename}`;
        if (!thumbnailUrl) thumbnailUrl = imageUrl;
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

      const postData: any = {
        title: req.body.title,
        excerpt: req.body.excerpt,
        content: content,
        author: req.body.author,
        category: req.body.category,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
        thumbnailUrl: thumbnailUrl || imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
        heroImageUrl: heroImageUrl || imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400',
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
    { name: 'thumbnail', maxCount: 1 },
    { name: 'hero', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'contentVideos', maxCount: 10 }
  ]), async (req, res) => {
    try {
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

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

      // Handle thumbnail upload (maps to imageUrl for API compatibility)
      if (files?.thumbnail?.[0]) {
        updateData.thumbnailUrl = `/api/images/${files.thumbnail[0].filename}`;
        updateData.imageUrl = updateData.thumbnailUrl; // Set imageUrl as fallback
      } else if (req.body.thumbnailUrl) {
        updateData.thumbnailUrl = req.body.thumbnailUrl;
      }

      // Handle hero upload
      if (files?.hero?.[0]) {
        updateData.heroImageUrl = `/api/images/${files.hero[0].filename}`;
      } else if (req.body.heroImageUrl) {
        updateData.heroImageUrl = req.body.heroImageUrl;
      }

      // Handle image upload (legacy field, maps to thumbnail if not provided)
      if (files?.image?.[0]) {
        updateData.imageUrl = `/api/images/${files.image[0].filename}`;
        if (!updateData.thumbnailUrl) updateData.thumbnailUrl = updateData.imageUrl;
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
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

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

      const section = await (storage as any).createFeaturedSection(sectionData);
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

      const section = await (storage as any).updateFeaturedSection(parseInt(id), sectionData);
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
      await (storage as any).deleteFeaturedSection(parseInt(id));
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

      const categoryData: any = {
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
        error: errorMessage,
        details: error.message || "Unknown error"
      });
    }
  });

  app.put("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      const { id } = req.params;
      const { name, description, isActive, sortOrder } = req.body;

      const updateData: any = {};

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
      res.status(500).json({
        error: errorMessage,
        details: error.message || "Unknown error"
      });
    }
  });

  app.delete("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

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
        error: errorMessage,
        details: error.message || "Unknown error"
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

      const subcategoryData: any = {
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

      const updateData: any = {};

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
        error: errorMessage,
        details: error.message || "Unknown error"
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
        error: errorMessage,
        details: error.message || "Unknown error"
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
      // // 1. Send an email notification to your support team
      // 2. Send a confirmation email to the customer

      // Ensure mutation responses are not cached
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({
        message: "Thank you for your message! We'll get back to you within 24 hours.",
        success: true,
        submissionId: savedSubmission.id,
        submission: savedSubmission
      });
    } catch (error) {
      console.error("Contact form submission error:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Contact submissions management endpoints (Admin)
  app.get("/api/admin/contact-submissions", async (req, res) => {
    try {
      // No caching - always serve fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
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

      // Prevent caching of mutation responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
      // Prevent caching of mutation responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.json({ success: true, message: "Contact submission deleted successfully", id: parseInt(id) });
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

      // Fallback: if items are missing (older orders), try extracting from shippingAddress payload
      let resolvedItems: any[] = items as any[];
      if (!resolvedItems || resolvedItems.length === 0) {
        try {
          const raw = order[0].shippingAddress;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && parsed.multi && Array.isArray(parsed.items)) {
            resolvedItems = parsed.items.map((it: any, idx: number) => ({
              id: idx + 1,
              name: it.productName || it.name || 'Item',
              quantity: Number(it.quantity || 1),
              price: it.price || '₹0',
              image: it.productImage || it.image || '',
            }));
          } else if (Array.isArray(parsed)) {
            // Some older orders stored an array of address objects with product fields
            const extracted = parsed
              .filter((it: any) => it && (it.productName || it.name))
              .map((it: any, idx: number) => ({
                id: idx + 1,
                name: it.productName || it.name || 'Item',
                quantity: Number(it.quantity || 1),
                price: it.price || `₹${order[0].totalAmount || 0}`,
                image: it.productImage || it.image || '',
              }));
            if (extracted.length > 0) resolvedItems = extracted;
          } else if (parsed && typeof parsed === 'object') {
            // Single-address JSON payload may contain product fields
            const pName = (parsed as any).productName || (parsed as any).name;
            if (pName) {
              resolvedItems = [{
                id: 1,
                name: pName,
                quantity: Number((parsed as any).quantity || 1),
                price: (parsed as any).price || `₹${order[0].totalAmount || 0}`,
                image: (parsed as any).productImage || (parsed as any).image || '',
              }];
            }
          }
        } catch (e) {
          // ignore
        }
      }

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

      const userData = user[0] || { firstName: 'Customer', lastName: 'Name', email: 'customer@email.com', phone: null };

      // Generate HTML invoice
      const invoiceHtml = generateInvoiceHTML({
        order: order[0],
        items: resolvedItems,
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
  const generateInvoiceHTML = ({ order, items, customer, orderId }: any) => {

    // Embed logo if present (so invoice works as a standalone HTML file)
    let logoDataUri = '';
    try {
      const logoPath = path.join(process.cwd(), 'attached_assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const buf = fs.readFileSync(logoPath);
        logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      // ignore
    }

    const subtotal = items.reduce((sum: number, item: any) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return sum + (price * item.quantity);
    }, 0);

    // IMPORTANT:
    // Checkout payable total is stored as orders.total_amount. Invoice should follow it
    // (otherwise GST/discounts get double-counted).
    const shipping = Math.round(Math.max(0, Number(order?.shippingCharge ?? (order as any)?.shipping_charge ?? 0)));
    const paidTotal = Math.round(Math.max(0, Number(order?.totalAmount ?? (order as any)?.total_amount ?? 0)));
    const discount = Math.max(0, Math.round(subtotal + shipping - paidTotal));

    // Prepare readable shipping address HTML (handles JSON, arrays or plain strings)
    const escapeHtml = (str: any) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const formatSingleAddress = (a: any) => {
      const addr = a.deliveryAddress || a.address || '';
      const name = a.recipientName || a.name || '';
      const phone = a.recipientPhone || a.phone || '';
      const prod = a.productName ? `<strong>Product:</strong> ${escapeHtml(a.productName)}<br>` : '';
      const qty = a.quantity ? `<strong>Qty:</strong> ${escapeHtml(a.quantity)}<br>` : '';
      let parts = '';
      if (prod) parts += prod;
      if (qty) parts += qty;
      parts += `<strong>Address:</strong> ${escapeHtml(addr)}<br>`;
      if (name) parts += `<strong>Name:</strong> ${escapeHtml(name)}<br>`;
      if (phone) parts += `<strong>Phone:</strong> ${escapeHtml(phone)}<br>`;
      return parts;
    };

    let shippingHtml = '';
    try {
      const raw = order.shippingAddress;
      let parsed = raw;
      if (typeof raw === 'string') {
        // try parse JSON, otherwise keep as string
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = raw;
        }
      }

      if (Array.isArray(parsed)) {
        shippingHtml = parsed.map(formatSingleAddress).join('<br>----<br>');
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.multi && Array.isArray(parsed.items)) {
          shippingHtml = parsed.items.map(formatSingleAddress).join('<br>----<br>');
        } else if (parsed.deliveryAddress || parsed.recipientName || parsed.recipientPhone) {
          shippingHtml = formatSingleAddress(parsed);
        } else {
          // unknown object shape - stringify safely
          shippingHtml = escapeHtml(JSON.stringify(parsed, null, 2)).replace(/\n/g, '<br>');
        }
      } else {
        // plain string
        shippingHtml = escapeHtml(String(parsed || ''));
      }
    } catch (e) {
      shippingHtml = escapeHtml(String(order.shippingAddress || ''));
    }

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
            ${logoDataUri ? `<img src="${logoDataUri}" alt="Poppik Logo" style="width: 140px; display:block; margin: 0 auto 10px auto;" />` : ''}
            <div class="company-name">Poppik Lifestyle Private Limited</div>
            <div class="company-details">
                Pure, Premium, Perfect for Your Skin.<br>
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
                <p>${shippingHtml}</p>
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
                    <td class="text-right">Included</td>
                </tr>
                <tr>
                    <td>Shipping:</td>
                    <td class="text-right">${shipping === 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                    <td>Discount:</td>
                    <td class="text-right">-₹${discount.toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
                <tr class="grand-total">
                    <td><strong>Grand Total:</strong></td>
                    <td class="text-right"><strong>₹${paidTotal.toLocaleString('en-IN')}</strong></td>
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
      const queryStr = typeof query === 'string' ? query : Array.isArray(query) ? String(query[0] ?? '') : String(query ?? '');

      if (!queryStr || queryStr.trim().length === 0) {
        return res.json([]);
      }

      const products = await storage.searchProducts(queryStr);
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
        total: `₹${order.totalAmount}`
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
      const queryStr = typeof query === 'string' ? query : Array.isArray(query) ? String(query[0] ?? '') : String(query ?? '');

      if (!queryStr || queryStr.trim().length === 0) {
        return res.json({ products: [], customers: [], orders: [] });
      }

      console.log("Admin search query:", queryStr);

      const searchTerm = queryStr.toString().toLowerCase();

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

      // Invalidate shades cache so front-end sees updates immediately
      try {
        shadesCache.clear();
        console.log('Cleared shades cache after creating a shade');
      } catch (e) {
        console.warn('Failed to clear shades cache after create:', e);
      }

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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      try {
        shadesCache.clear();
        console.log('Cleared shades cache after updating a shade');
      } catch (e) {
        console.warn('Failed to clear shades cache after update:', e);
      }

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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      try {
        shadesCache.clear();
        console.log('Cleared shades cache after deleting a shade');
      } catch (e) {
        console.warn('Failed to clear shades cache after delete:', e);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shade:", error);
      res.status(500).json({ error: "Failed to delete shade" });
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
      }

      const [slider] = await db
        .insert(schema.comboSliders)
        .values(({
          imageUrl: imageUrl.trim(),
          title: title?.trim() || null,
          subtitle: subtitle?.trim() || null,
          isActive: isActive === 'true' || isActive === true,
          sortOrder: parseInt(sortOrder) || 0,
        } as any))
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
        .set(({
          ...(imageUrl && { imageUrl: imageUrl.trim() }),
          title: title?.trim() || null,
          subtitle: subtitle?.trim() || null,
          isActive: isActive === 'true' || isActive === true,
          sortOrder: parseInt(sortOrder) || 0,
          updatedAt: new Date()
        } as any))
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

  // Get offer reviews
  app.get('/api/offers/:offerId/reviews', async (req, res) => {
    try {
      const offerId = parseInt(req.params.offerId);
      if (isNaN(offerId)) return res.status(400).json({ error: 'Invalid offerId' });

      const rows = await db
        .select({
          id: schema.offerReviews.id,
          userId: schema.offerReviews.userId,
          offerId: schema.offerReviews.offerId,
          rating: schema.offerReviews.rating,
          title: schema.offerReviews.title,
          comment: schema.offerReviews.comment,
          userName: schema.offerReviews.userName,
          createdAt: schema.offerReviews.createdAt,
        })
        .from(schema.offerReviews)
        .where(eq(schema.offerReviews.offerId, offerId))
        .orderBy(desc(schema.offerReviews.createdAt));

      res.json(rows);
    } catch (error) {
      console.error('Error fetching offer reviews:', error);
      res.status(500).json({ error: 'Failed to fetch offer reviews' });
    }
  });

  // Check if user can review offer
  app.get('/api/offers/:offerId/can-review', async (req, res) => {
    try {
      const offerId = parseInt(req.params.offerId);
      const { userId } = req.query;

      if (!userId) {
        return res.json({
          canReview: false,
          message: 'Please login to submit a review',
        });
      }

      const result = await storage.checkUserCanReviewOffer(parseInt(userId as string), offerId);
      res.json(result);
    } catch (error) {
      console.error('Error checking offer review eligibility:', error);
      res.status(500).json({
        canReview: false,
        message: 'Error checking review eligibility',
      });
    }
  });

  // Create offer review
  app.post('/api/offers/:offerId/reviews', async (req, res) => {
    try {
      const offerId = parseInt(req.params.offerId);
      const { rating, title, comment, userName, orderId } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Please login to submit a review' });
      }

      const canReview = await storage.checkUserCanReviewOffer(user.id, offerId);
      if (!canReview.canReview) {
        return res.status(403).json({ error: canReview.message });
      }

      const reviewData = {
        userId: user.id,
        offerId,
        orderId: orderId || canReview.orderId,
        rating: parseInt(rating),
        title: title || null,
        comment: comment || null,
        userName: userName || `${user.firstName} ${user.lastName}`,
        isVerified: true,
      };

      const inserted = await db.insert(schema.offerReviews).values(reviewData).returning();
      res.json(inserted[0]);
    } catch (error) {
      console.error('Error creating offer review:', error);
      res.status(500).json({ error: 'Failed to create offer review' });
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
        ,affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0
        ,affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0
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
        updatedAt: new Date(),
        affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0,
        affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0
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
      try {
        // broadcast if broadcaster available
        if (typeof (global as any).announcementsBroadcaster !== 'undefined' && (global as any).announcementsBroadcaster) {
          (global as any).announcementsBroadcaster.broadcast('created', announcement);
        }
      } catch (e) {
        console.warn('Announcements broadcast failed:', e);
      }
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
      try {
        if (typeof (global as any).announcementsBroadcaster !== 'undefined' && (global as any).announcementsBroadcaster) {
          (global as any).announcementsBroadcaster.broadcast('updated', updatedAnnouncement);
        }
      } catch (e) {
        console.warn('Announcements broadcast failed:', e);
      }
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
      try {
        if (typeof (global as any).announcementsBroadcaster !== 'undefined' && (global as any).announcementsBroadcaster) {
          (global as any).announcementsBroadcaster.broadcast('deleted', { id });
        }
      } catch (e) {
        console.warn('Announcements broadcast failed:', e);
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

  // Contests - Public and Admin endpoints
  app.get('/api/contests', async (req, res) => {
    try {
      // Allow admins to preview all contests (including drafts) when they send a valid admin JWT
      let isAdminPreview = false;
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          if (decoded && (decoded.role === 'admin' || decoded.role === 'master_admin')) {
            isAdminPreview = true;
          }
        } catch (e) {
          // Invalid token - ignore preview
        }
      }

      // Mirror offers behavior: only return contests marked active publicly.
      // Allow admin preview to see all contests when sending a valid admin JWT.
      if (isAdminPreview) {
        const rows = await db.select().from(schema.contests).orderBy(desc(schema.contests.createdAt));
        console.log('📣 Admin preview requested for /api/contests - returning all contests');
        return res.json(rows || []);
      }

      const rows = await db
        .select()
        .from(schema.contests)
        .where(eq(schema.contests.isActive, true))
        .orderBy(desc(schema.contests.createdAt));

      res.json(rows || []);
    } catch (error) {
      console.error('Error fetching public contests:', error);
      res.status(500).json({ error: 'Failed to fetch contests' });
    }
  });

  app.get('/api/contests/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      // Allow admins to preview a contest (including inactive/draft) with a valid admin JWT
      let isAdminPreview = false;

      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
          if (decoded && (decoded.role === 'admin' || decoded.role === 'master_admin')) {
            isAdminPreview = true;
          }
        } catch (e) {
          // Invalid token - ignore preview
        }
      }

      let q: any = db.select().from(schema.contests).where(eq(schema.contests.slug, slug));
      if (!isAdminPreview) q = q.where(eq(schema.contests.isActive, true));
      const rows = await q.limit(1);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Contest not found' });
      const c = rows[0];
      res.json(c);
    } catch (error) {
      console.error('Error fetching contest by slug:', error);

      res.status(500).json({ error: 'Failed to fetch contest' });
    }
  });

  // Admin: list all contests
  app.get('/api/admin/contests', async (req, res) => {
    try {
      const contests = await db.select().from(schema.contests).orderBy(desc(schema.contests.createdAt));
      res.json(contests);
    } catch (error) {
      console.error('Error fetching admin contests:', error);
      res.status(500).json({ error: 'Failed to fetch contests' });
    }
  });

  // Admin: get single contest by id (returns full contest including rich content)
  app.get('/api/admin/contests/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid contest id' });
      const rows = await db.select().from(schema.contests).where(eq(schema.contests.id, id)).limit(1);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Contest not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching admin contest by id:', error);
      res.status(500).json({ error: 'Failed to fetch contest' });
    }
  });

  // Admin: create contest (accepts JSON or multipart/form-data with optional image)
  app.post('/api/admin/contests', (req, res, next) => {
    // Only use multer for multipart/form-data, skip for JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return upload.single('image')(req, res, next);
    }
    next();
  }, async (req, res) => {
    try {
      const body = req.body || {};
      console.log('📝 [POST /api/admin/contests] body keys:', Object.keys(body));
      console.log('📝 [POST /api/admin/contests] body.content type:', typeof body.content, 'length:', (body.content || '').toString().length);

      // Support both JSON and multipart/form-data (when using FormData in client)
      const title = (body.title || '').toString().trim();
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const slugFromBody = body.slug && body.slug.toString().trim();
      const slug = slugFromBody || title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

      let imageUrl = body.imageUrl || null;
      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      }

      const validFrom = body.validFrom ? new Date(body.validFrom.toString()) : new Date();
      const validUntil = body.validUntil ? new Date(body.validUntil.toString()) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

      const contestData: any = {
        title,
        slug,
        description: body.description ? body.description.toString() : null,
        content: (body.content || body.detailedDescription) ? (body.content || body.detailedDescription).toString() : '',
        imageUrl,
        bannerImageUrl: body.bannerImageUrl ? body.bannerImageUrl.toString() : null,
        validFrom,
        validUntil,
        isActive: body.isActive === 'true' || body.isActive === true,
        featured: body.featured === 'true' || body.featured === true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📝 [POST] Saving contest with:', { title: contestData.title, contentLength: contestData.content.length, contentPreview: contestData.content.substring(0, 100) });
      const [newContest] = await db.insert(schema.contests).values(contestData).returning();
      console.log('✅ [POST] Saved contest id:', newContest.id, 'content field exists:', !!newContest.content, 'length:', (newContest.content || '').toString().length);
      res.json(newContest);
    } catch (error) {
      console.error('Error creating contest:', error);
      res.status(500).json({ error: 'Failed to create contest', details: error.message });
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

      const comboData: any = {
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
        affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0,
        affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0,
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
        .values((comboData as any))
        .returning();

      console.log("Combo created successfully:", combo);
      
      // Insert images into combo_images table
      if (imageUrls.length > 0) {
        try {
          await Promise.all(
            imageUrls.map(async (url, index) => {
              await db.insert(schema.comboImages).values({
                comboId: combo.id,
                imageUrl: url,
                altText: `${combo.name} - Image ${index + 1}`,
                isPrimary: index === 0,
                sortOrder: index
              } as any);
            })
          );
        } catch (imgErr) {
          console.warn('Failed to insert combo images:', imgErr);
        }
      }

      // Return combo with imageUrls for frontend sync
      res.json({
        ...combo,
        imageUrls: imageUrls
      });
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
        affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0,
        affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0,
        products: JSON.stringify(products),
        rating: parseFloat(req.body.rating) || 5.0,
        reviewCount: parseInt(req.body.reviewCount) || 0,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        updatedAt: new Date()
      };

      // Handle image updates
      let allImageUrls: string[] = [];
      if (files?.images && files.images.length > 0) {
        // New uploaded image URLs
        const newUploaded = files.images.map(file => `/api/images/${file.filename}`);

        // Fetch existing combo to preserve its existing images
        const existingComboRow = await db.select().from(schema.combos).where(eq(schema.combos.id, id)).limit(1);
        const existingImages = (existingComboRow && existingComboRow.length > 0 && existingComboRow[0].imageUrl)
          ? (Array.isArray(existingComboRow[0].imageUrl) ? existingComboRow[0].imageUrl : [existingComboRow[0].imageUrl])
          : [];

        // Append new images to existing list
        allImageUrls = [...existingImages, ...newUploaded];
        updateData.imageUrl = allImageUrls;

        // Insert only the newly uploaded images into combo_images table
        const existingCount = existingImages.length;
        await Promise.all(
          newUploaded.map(async (url, idx) => {
            await db.insert(schema.comboImages).values({
              comboId: id,
              imageUrl: url,
              altText: `${updateData.name} - Image ${existingCount + idx + 1}`,
              isPrimary: existingCount === 0 && idx === 0,
              sortOrder: existingCount + idx
            } as any);
          })
        );
      } else if (req.body.imageUrl) {
        // Coerce imageUrl (may come as JSON string, comma-separated string, or array)
        let imgVal: any = req.body.imageUrl;
        if (typeof imgVal === 'string') {
          // Try parse JSON first
          try {
            const parsed = JSON.parse(imgVal);
            imgVal = parsed;
          } catch (e) {
            // Fallback: split comma-separated string
            imgVal = imgVal.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        if (!Array.isArray(imgVal)) imgVal = [imgVal];
        updateData.imageUrl = imgVal;
        allImageUrls = imgVal;
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

      // Return combo with imageUrls for frontend sync
      res.json({
        ...combo,
        imageUrls: allImageUrls.length > 0 ? allImageUrls : (combo.imageUrl || [])
      });
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
          totalRedeemed: "0.00",
        } as any).returning();

        wallet = [newWallet];
      }

      const now = new Date();

      const pendingSumRows = await db
        .select({
          pendingCashback: sql<number>`coalesce(sum(${schema.userWalletTransactions.amount}), 0)`,
        })
        .from(schema.userWalletTransactions)
        .where(
          and(
            eq(schema.userWalletTransactions.userId, parseInt(userId as string)),
            eq(schema.userWalletTransactions.type, 'pending'),
            eq(schema.userWalletTransactions.status, 'pending'),
            and(
              sql`${schema.userWalletTransactions.eligibleAt} is not null`,
              sql`${schema.userWalletTransactions.eligibleAt} > ${now}`,
            ),
          ),
        );

      const pendingCashback = Number(pendingSumRows?.[0]?.pendingCashback || 0);
      const baseCashbackBalance = parseFloat(wallet[0].cashbackBalance);
      const displayCashbackBalance = baseCashbackBalance + pendingCashback;

      res.json({
        userId: parseInt(userId as string),
        cashbackBalance: baseCashbackBalance,
        pendingCashback,
        displayCashbackBalance,
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

      const now = new Date();

      const transactions = await db
        .select()
        .from(schema.userWalletTransactions)
        .where(
          and(
            eq(schema.userWalletTransactions.userId, parseInt(userId as string)),
            or(
              eq(schema.userWalletTransactions.status, 'completed'),
              eq(schema.userWalletTransactions.status, 'failed'),
              and(
                eq(schema.userWalletTransactions.status, 'pending'),
                or(
                  isNull(schema.userWalletTransactions.eligibleAt),
                  sql`${schema.userWalletTransactions.eligibleAt} > ${now}`
                )
              )
            )
          )
        )
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

      const parsedUserId = parseInt(userId);
      const parsedOrderId = orderId ? parseInt(orderId) : null;
      const creditAmount = parseFloat(amount);

      if (parsedOrderId) {
        const orderRows = await db
          .select({ id: schema.ordersTable.id, userId: schema.ordersTable.userId, status: schema.ordersTable.status })
          .from(schema.ordersTable)
          .where(eq(schema.ordersTable.id, parsedOrderId))
          .limit(1);

        if (!orderRows || orderRows.length === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        if (orderRows[0].userId !== parsedUserId) {
          return res.status(400).json({ error: 'Order does not belong to user' });
        }

        const orderStatus = String(orderRows[0].status || '').toLowerCase();
        if (orderStatus !== 'delivered') {
          const existingTx = await db
            .select({ id: schema.userWalletTransactions.id })
            .from(schema.userWalletTransactions)
            .where(
              and(
                eq(schema.userWalletTransactions.userId, parsedUserId),
                eq(schema.userWalletTransactions.orderId, parsedOrderId),
                eq(schema.userWalletTransactions.amount, creditAmount.toFixed(2)),
                or(
                  eq(schema.userWalletTransactions.status, 'pending'),
                  eq(schema.userWalletTransactions.status, 'completed')
                )
              )
            )
            .limit(1);

          if (!existingTx || existingTx.length === 0) {
            let wallet = await db
              .select()
              .from(schema.userWallet)
              .where(eq(schema.userWallet.userId, parsedUserId))
              .limit(1);

            if (!wallet || wallet.length === 0) {
              const [newWallet] = await db.insert(schema.userWallet).values({
                userId: parsedUserId,
                cashbackBalance: '0.00',
                totalEarned: '0.00',
                totalRedeemed: '0.00'
              } as any).returning();
              wallet = [newWallet];
            }

            const currentBalance = parseFloat(wallet[0].cashbackBalance);
            await db.insert(schema.userWalletTransactions).values({
              userId: parsedUserId,
              type: 'pending',
              amount: creditAmount.toFixed(2),
              description: description || 'Cashback pending (order not delivered)',
              orderId: parsedOrderId,
              balanceBefore: currentBalance.toFixed(2),
              balanceAfter: currentBalance.toFixed(2),
              status: 'pending'
            } as any);
          }

          return res.json({
            success: true,
            status: 'pending',
            message: 'Cashback will be credited after order is delivered'
          });
        }
      }

      let wallet = await db
        .select()
        .from(schema.userWallet)
        .where(eq(schema.userWallet.userId, parsedUserId))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        const [newWallet] = await db.insert(schema.userWallet).values({
          userId: parsedUserId,
          cashbackBalance: '0.00',
          totalEarned: '0.00',
          totalRedeemed: '0.00'
        } as any).returning();
        wallet = [newWallet];
      }

      const currentBalance = parseFloat(wallet[0].cashbackBalance);
      const newBalance = currentBalance + creditAmount;

      if (parsedOrderId) {
        const existingCompletedTx = await db
          .select({ id: schema.userWalletTransactions.id })
          .from(schema.userWalletTransactions)
          .where(
            and(
              eq(schema.userWalletTransactions.userId, parsedUserId),
              eq(schema.userWalletTransactions.orderId, parsedOrderId),
              eq(schema.userWalletTransactions.amount, creditAmount.toFixed(2)),
              eq(schema.userWalletTransactions.status, 'completed')
            )
          )
          .limit(1);

        if (existingCompletedTx && existingCompletedTx.length > 0) {
          return res.json({
            success: true,
            message: 'Cashback already credited for this order',
            newBalance: currentBalance.toFixed(2)
          });
        }
      }

      await db
        .update(schema.userWallet)
        .set({
          cashbackBalance: newBalance.toFixed(2),
          totalEarned: (parseFloat(wallet[0].totalEarned) + creditAmount).toFixed(2),
          updatedAt: new Date()
        } as any)
        .where(eq(schema.userWallet.userId, parsedUserId));

      await db.insert(schema.userWalletTransactions).values({
        userId: parsedUserId,
        type: 'credit',
        amount: creditAmount.toFixed(2),
        description: description || 'Cashback credited',
        orderId: parsedOrderId,
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        status: 'completed'
      } as any);

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
        } as any)
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
      } as any);

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
      if (!userId || !firstName || !lastName || !email || !phone  || !country) {
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
      const savedApplication = await db.insert(schema.affiliateApplications).values(({
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
      } as any)).returning();

      console.log('Affiliate application saved:', savedApplication[0].id);

      res.json({
        success: true,
        message: 'Application submitted successfully! Our team will review your application and get back to you within 5-7 business days.',
        applicationId: savedApplication[0].id,
      });

    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message 
      });
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
      console.error('Error fetching affiliate withdrawals (admin):', error);
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

      const withdrawal = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(eq(schema.affiliateTransactions.id, id))
        .limit(1);

      if (!withdrawal || withdrawal.length === 0) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }

      const w = withdrawal[0];
      if (w.type !== 'withdrawal') {
        return res.status(400).json({ error: 'Invalid withdrawal request' });
      }

      if (w.status !== 'pending') {
        return res.status(400).json({ error: `Only pending withdrawals can be approved (current: ${w.status})` });
      }

      const withdrawAmount = parseFloat(w.amount);
      if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount' });
      }

      const isHeldWithdrawal = String(w.description || '').includes('[WITHDRAWAL_HELD]');

      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, w.userId))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const commissionBalance = parseFloat(wallet[0].commissionBalance || '0');

      // If this withdrawal was NOT held at request time (legacy), deduct now.
      // If it was held, do NOT deduct again.
      if (!isHeldWithdrawal) {
        if (commissionBalance < withdrawAmount) {
          return res.status(400).json({ error: 'Insufficient commission balance' });
        }

        await db
          .update(schema.affiliateWallet)
          .set({
            commissionBalance: (commissionBalance - withdrawAmount).toFixed(2),
            updatedAt: new Date(),
          }as any)
          .where(eq(schema.affiliateWallet.userId, w.userId));
      }

      // Always track successful payouts in totalWithdrawn
      await db
        .update(schema.affiliateWallet)
        .set({
          totalWithdrawn: (parseFloat(wallet[0].totalWithdrawn || '0') + withdrawAmount).toFixed(2),
          updatedAt: new Date(),
        }as any)
        .where(eq(schema.affiliateWallet.userId, w.userId));

      const [updatedTransaction] = await db
        .update(schema.affiliateTransactions)
        .set({ 
          status: 'completed',
          transactionId,
          notes: notes || null,
          processedAt: new Date(),
        }as any)
        .where(eq(schema.affiliateTransactions.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        transaction: updatedTransaction,
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

      const transaction = await db
        .select()
        .from(schema.affiliateTransactions)
        .where(eq(schema.affiliateTransactions.id, id))
        .limit(1);

      if (!transaction || transaction.length === 0) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }

      if (transaction[0].status !== 'pending') {
        return res.status(400).json({ error: `Only pending withdrawals can be rejected (current: ${transaction[0].status})` });
      }

      const w = transaction[0];
      const withdrawAmount = parseFloat(w.amount);
      const isHeldWithdrawal = String(w.description || '').includes('[WITHDRAWAL_HELD]');

      // If this withdrawal was held (deducted at request time), refund on reject.
      if (isHeldWithdrawal && Number.isFinite(withdrawAmount) && withdrawAmount > 0) {
        const wallet = await db
          .select()
          .from(schema.affiliateWallet)
          .where(eq(schema.affiliateWallet.userId, w.userId))
          .limit(1);

        if (wallet && wallet.length > 0) {
          const commissionBalance = parseFloat(wallet[0].commissionBalance || '0');
          await db
            .update(schema.affiliateWallet)
            .set({
              commissionBalance: (commissionBalance + withdrawAmount).toFixed(2),
              updatedAt: new Date(),
            }as any)
            .where(eq(schema.affiliateWallet.userId, w.userId));
        }
      }

      const [updatedTransaction] = await db
        .update(schema.affiliateTransactions)
        .set({
          status: 'rejected',
          notes: notes || 'Rejected by admin',
          processedAt: new Date(),
        } as any)
        .where(eq(schema.affiliateTransactions.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Withdrawal rejected',
        transaction: updatedTransaction,
      });
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
  });

  // Process affiliate wallet withdrawal (creates pending request; deduction happens on admin approval)
  app.post('/api/affiliate/wallet/withdraw', async (req, res) => {
    try {
      const { userId, amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: 'User ID and amount required' });
      }

      const withdrawAmount = parseFloat(amount);

      if (withdrawAmount < 500) {
        return res.status(400).json({ error: 'Minimum withdrawal amount is ₹500' });
      }

      const wallet = await db
        .select()
        .from(schema.affiliateWallet)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId)))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const commissionBalance = parseFloat(wallet[0].commissionBalance || '0');
      if (commissionBalance < withdrawAmount) {
        return res.status(400).json({ error: 'Insufficient commission balance' });
      }

      // Deduct immediately (hold) so user cannot re-request beyond available balance.
      const newCommissionBalance = Math.max(0, commissionBalance - withdrawAmount);
      await db
        .update(schema.affiliateWallet)
        .set({
          commissionBalance: newCommissionBalance.toFixed(2),
          updatedAt: new Date(),
        }as any)
        .where(eq(schema.affiliateWallet.userId, parseInt(userId)));

      await db.insert(schema.affiliateTransactions).values({
        userId: parseInt(userId),
        type: 'withdrawal',
        amount: withdrawAmount.toFixed(2),
        balanceType: 'commission',
        description: `[WITHDRAWAL_HELD] Withdrawal request of ₹${withdrawAmount.toFixed(2)}`,
        status: 'pending',
        transactionId: null,
        notes: null,
        processedAt: null,
        createdAt: new Date(),
      }as any);

      // If bank details provided, upsert into affiliate_applications for admin visibility
      try {
        const { bankName, branchName, ifscCode, accountNumber } = req.body as any;
        if (bankName || branchName || ifscCode || accountNumber) {
          const existing = await db
            .select()
            .from(schema.affiliateApplications)
            .where(eq(schema.affiliateApplications.userId, parseInt(userId)))
            .limit(1);

          if (existing && existing.length > 0) {
            await db
              .update(schema.affiliateApplications)
              .set({
                bankName: bankName || existing[0].bankName || null,
                branchName: branchName || existing[0].branchName || null,
                ifscCode: ifscCode || existing[0].ifscCode || null,
                accountNumber: accountNumber || existing[0].accountNumber || null,
                updatedAt: new Date(),
              }as any)
              .where(eq(schema.affiliateApplications.userId, parseInt(userId)));
          } else {
            await db.insert(schema.affiliateApplications).values({
              userId: parseInt(userId),
              firstName: null,
              lastName: null,
              email: null,
              phone: null,
              address: null,
              city: null,
              state: null,
              pincode: null,
              landmark: null,
              country: null,
              bankName: bankName || null,
              branchName: branchName || null,
              ifscCode: ifscCode || null,
              accountNumber: accountNumber || null,
              status: 'pending',
            }as any);
          }
        }
      } catch (e) {
        console.warn('Failed to upsert affiliate bank details:', e);
      }

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        newBalance: newCommissionBalance.toFixed(2),
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  });

   // Get all combos for admin (including inactive)
  app.get("/api/admin/combos", async (req, res) => {
    try {
      // Set aggressive no-cache headers to prevent any caching
       res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      const token = req.headers.authorization?.substring(7);
  

      const decoded = jwt.verify(token || "", process.env.JWT_SECRET || "your-secret-key") as any;
      if (decoded.role !== 'admin' && decoded.role !== 'master_admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      const allCombos = await db
        .select()
        .from(schema.combos)
        .orderBy(desc(schema.combos.sortOrder), desc(schema.combos.createdAt));

      console.log(`📦 Admin combos fetched: ${allCombos.length} items`);
      res.json(allCombos);
    } catch (error) {
      console.error("Error fetching admin combos:", error);
      res.status(500).json({ error: "Failed to fetch combos" });
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
        affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0,
        affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0,
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
        .values(comboData as any)
        .returning();

      console.log("Combo created successfully:", combo);
      
      // Insert images into combo_images table
      if (imageUrls.length > 0) {
        try {
          await Promise.all(
            imageUrls.map(async (url, index) => {
              await db.insert(schema.comboImages).values({
                comboId: combo.id,
                imageUrl: url,
                altText: `${combo.name} - Image ${index + 1}`,
                isPrimary: index === 0,
                sortOrder: index
              } as any);
            })
          );
        } catch (imgErr) {
          console.warn('Failed to insert combo images:', imgErr);
        }
      }
      
      // Return combo with imageUrls for frontend sync
      res.json({
        ...combo,
        imageUrls: imageUrls
      });
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
        affiliateCommission: req.body.affiliateCommission ? parseFloat(req.body.affiliateCommission) : 0,
        affiliateUserDiscount: req.body.affiliateUserDiscount ? parseFloat(req.body.affiliateUserDiscount) : 0,
        products: JSON.stringify(products),
        rating: parseFloat(req.body.rating) || 5.0,
        reviewCount: parseInt(req.body.reviewCount) || 0,
        isActive: req.body.isActive !== 'false',
        sortOrder: parseInt(req.body.sortOrder) || 0,
        updatedAt: new Date()
      };

      // Handle image updates
      let allImageUrls: string[] = [];
      if (files?.images && files.images.length > 0) {
        // New uploaded image URLs
        const newUploaded = files.images.map(file => `/api/images/${file.filename}`);

        // Fetch existing combo to preserve its existing images
        const existingComboRow = await db.select().from(schema.combos).where(eq(schema.combos.id, id)).limit(1);
        const existingImages = (existingComboRow && existingComboRow.length > 0 && existingComboRow[0].imageUrl)
          ? (Array.isArray(existingComboRow[0].imageUrl) ? existingComboRow[0].imageUrl : [existingComboRow[0].imageUrl])
          : [];

        // Append new images to existing list
        allImageUrls = [...existingImages, ...newUploaded];
        updateData.imageUrl = allImageUrls;

        // Insert only the newly uploaded images into combo_images table
        const existingCount = existingImages.length;
        await Promise.all(
          newUploaded.map(async (url, idx) => {
            await db.insert(schema.comboImages).values({
              comboId: id,
              imageUrl: url,
              altText: `${updateData.name} - Image ${existingCount + idx + 1}`,
              isPrimary: existingCount === 0 && idx === 0,
              sortOrder: existingCount + idx
            } as any);
          })
        );
      } else if (req.body.imageUrl) {
        // Coerce imageUrl (may come as JSON string, comma-separated string, or array)
        let imgVal: any = req.body.imageUrl;
        if (typeof imgVal === 'string') {
          // Try parse JSON first
          try {
            const parsed = JSON.parse(imgVal);
            imgVal = parsed;
          } catch (e) {
            // Fallback: split comma-separated string
            imgVal = imgVal.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        if (!Array.isArray(imgVal)) imgVal = [imgVal];
        updateData.imageUrl = imgVal;
        allImageUrls = imgVal;
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

      // Return combo with imageUrls for frontend sync
      res.json({
        ...combo,
        imageUrls: allImageUrls.length > 0 ? allImageUrls : (combo.imageUrl || [])
      });
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
        }as any)
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
            }as any);
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
app.get('/api/influencer-videos', async (req, res) => {
    try {
      const { isActive, category } = req.query;
      let query: any = db.select().from(schema.influencerVideos);
      if (isActive !== undefined) {
        query = query.where(eq(schema.influencerVideos.isActive, isActive === 'true'));
      }
      if (category) {
        query = query.where(eq(schema.influencerVideos.category, category as string));
      }
      query = query.orderBy(asc(schema.influencerVideos.sortOrder), desc(schema.influencerVideos.createdAt));
      const list = await query;
      res.json(list);
    } catch (error) {
      console.error('Error fetching influencer videos:', error);
      res.status(500).json({ error: 'Failed to fetch influencer videos' });
    }
  });

  // Get single influencer video
  app.get('/api/influencer-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.influencerVideos).where(eq(schema.influencerVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching influencer video:', error);
      res.status(500).json({ error: 'Failed to fetch influencer video' });
    }
  });

  // Click tracking for influencer video
  app.post('/api/influencer-videos/:id/click', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.influencerVideos).where(eq(schema.influencerVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await db
        .update(schema.influencerVideos)
        .set(({ clickCount: (rows[0].clickCount || 0) + 1 } as any))
        .where(eq(schema.influencerVideos.id, id));
      res.json({ redirectUrl: rows[0].redirectUrl || rows[0].videoUrl });
    } catch (error) {
      console.error('Error tracking influencer video click:', error);
      res.status(500).json({ error: 'Failed to track click' });
    }
  });
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
      const [savedApplication] = await db.insert(schema.influencerApplications).values(({
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
      } as any)).returning();

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

      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Auto-expire old job positions
      try {
        await storage.autoExpireJobPositions();
      } catch (expireError) {
        console.log('Auto-expire error (continuing):', expireError.message);
      }

      // Get only active (non-expired) positions
      const positions = await storage.getActiveJobPositions();
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

      const now = Date.now();
      const exp = position.expiresAt ? new Date(position.expiresAt as any).getTime() : null;
      const isExpired = exp !== null && !isNaN(exp) && exp <= now;
         
      if (!position.isActive || isExpired) {
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

  const jobPositionsSSEClients = new Set<any>();
  const jobApplicationsSSEClients = new Set<any>();

  app.get('/api/admin/job-positions/stream', async (req, res) => {
    // Allow only GET
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send an initial comment to establish the stream
    res.write(': connected to job positions stream\n\n');

    jobPositionsSSEClients.add(res);

    req.on('close', () => {
      jobPositionsSSEClients.delete(res);
    });
  });

   // Admin job applications endpoints
  // Server-Sent Events for realtime job applications updates (admin)

  app.get('/api/admin/job-applications/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send an initial comment to establish the stream
    res.write(': connected to job applications stream\n\n');

    jobApplicationsSSEClients.add(res);

    req.on('close', () => {
      jobApplicationsSSEClients.delete(res);
    });
  });

  app.get('/api/admin/job-applications', async (req, res) => {
    try {
      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
        }as any)
        .where(eq(schema.jobApplications.id, id))
        .returning();

      if (!updatedApplication) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Broadcast update to admin SSE clients
      try {
       jobApplicationsSSEClients.forEach((client: any) => {
  try {
    client.write('event: jobApplicationUpdated\n');
    client.write('data: ' + JSON.stringify(updatedApplication) + '\n\n');
  } catch (e) {
    // ignore individual client errors
  }
});
      } catch (e) {
        console.error('Error broadcasting job application update event:', e);
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
      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const id = parseInt(req.params.id);

      const [deleted] = await db
        .delete(schema.jobApplications)
        .where(eq(schema.jobApplications.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Broadcast deletion to admin SSE clients
      try {
        jobApplicationsSSEClients.forEach((client: any) => {
          try {
            client.write('event: jobApplicationDeleted\n');
            client.write('data: ' + JSON.stringify({ id }) + '\n\n');
          } catch (e) {
            // ignore individual client errors
          }
        });
      } catch (e) {
        console.error('Error broadcasting job application delete event:', e);
      }

      res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
      console.error('Error deleting job application:', error);
      res.status(500).json({ error: 'Failed to delete job application' });
    }
  });

  // Admin endpoints for job positions management
  app.get('/api/admin/job-positions', async (req, res) => {
    try {
      console.log('GET /api/admin/job-positions - Fetching all job positions for admin');

      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
        responsibilities: (() => {
          const r = req.body.responsibilities;
          if (Array.isArray(r)) return r;
          if (typeof r === 'string') {
            try {
              const parsed = JSON.parse(r);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              return [r];
            }
          }
          return [];
        })(),
        requirements: (() => {
          const r = req.body.requirements;
          if (Array.isArray(r)) return r;
          if (typeof r === 'string') {
            try {
              const parsed = JSON.parse(r);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              return [r];
            }
          }
          return [];
        })(),
        skills: (() => {
          const s = req.body.skills;
          if (Array.isArray(s)) return s;
          if (typeof s === 'string') {
            try {
              const parsed = JSON.parse(s);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              return [s];
            }
          }
          return [];
        })(),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        expiresAt,
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };

      console.log('Processed position data:', positionData);

      const position = await storage.createJobPosition(positionData);
      console.log('Job position created successfully:', position);
      // Broadcast to SSE clients about the new position
      try {
        for (const client of Array.from(jobPositionsSSEClients)) {
          try {
            client.write('event: jobPositionCreated\n');
            client.write('data: ' + JSON.stringify(position) + '\n\n');
          } catch (e) {
            // ignore write errors for individual clients
          }
        }
      } catch (e) {
        console.error('Error broadcasting job position create event:', e);
      }
      // Set strict no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
      // Broadcast update to SSE clients
      try {
        for (const client of Array.from(jobPositionsSSEClients)) {
          try {
            client.write('event: jobPositionUpdated\n');
            client.write('data: ' + JSON.stringify(position) + '\n\n');
          } catch (e) {
            // ignore individual client errors
          }
        }
      } catch (e) {
        console.error('Error broadcasting job position update event:', e);
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
      // Broadcast deletion to SSE clients
      try {
        for (const client of Array.from(jobPositionsSSEClients)) {
          try {
            client.write('event: jobPositionDeleted\n');
            client.write('data: ' + JSON.stringify({ id }) + '\n\n');
          } catch (e) {
            // ignore individual client errors
          }
        }
      } catch (e) {
        console.error('Error broadcasting job position delete event:', e);
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
        instagramUrl: t.instagramUrl,
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
        instagramUrl: req.body.instagramUrl || null,
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
        instagramUrl: req.body.instagramUrl || null,
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

      const [newSlider] = await db.insert(schema.sliders).values(({
        title: 'Uploaded Image', // Default title
        subtitle: '',
        description: 'New slider image uploaded',
        imageUrl: imageUrl,
        badge: '',
        primaryActionText: '',
        primaryActionUrl: '',
        isActive: true,
        sortOrder: 0
      } as any)).returning();

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
      if (req.file) {
        imageUrl = `/api/images/${req.file?.filename}`;
      }

      const [updatedSlider] = await db.update(schema.sliders)
        .set(({
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
        } as any))
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

      // Check short-lived cache first
      try {
        const cacheKey = `productShades:${productId}`;
        const cached = shadesCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
          console.log(`Serving product ${productId} shades from cache`);
          return res.json(cached.data);
        }
      } catch (e) {
        console.warn('Error reading shades cache:', e);
      }

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
      try {
        const cacheKey = `productShades:${productId}`;
        // Cache for 30 seconds
        shadesCache.set(cacheKey, { expires: Date.now() + 30 * 1000, data: applicableShades });
      } catch (e) {
        console.warn('Error setting shades cache:', e);
      }
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

      const result = await storage.checkUserCanReview(
        parseInt(String(userId)),
        parseInt(productId),
      );
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

      // Ensure no caching for CRUD operations
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');

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
              await db.insert(schema.productImages).values(({
                productId: parseInt(id),
                imageUrl: imageUrl,
                altText: `${req.body.name || 'Product'} - Image ${index + 1}`,
                isPrimary: index === 0,
                sortOrder: index
              } as any));
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

      // Ensure no caching for CRUD operations
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');

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
      let productIds: any[] = [];
      try {
        productIds = typeof combo.products === 'string'
          ? JSON.parse(combo.products)
          : combo.products || [];
      } catch (e) {
        console.error("Error parsing combo products:", e);
        productIds = [];
      }

      // Fetch full product details for each product ID
      let fullProducts: any[] = [];
      if (Array.isArray(productIds) && productIds.length > 0) {
        try {
          // Filter out null/invalid IDs and convert to numbers
          const validProductIds = productIds
            .filter(pid => pid !== null && pid !== undefined && pid !== '')
            .map(pid => typeof pid === 'string' ? parseInt(pid) : pid)
            .filter(pid => !isNaN(pid));

          if (validProductIds.length > 0) {
            fullProducts = await db
              .select()
              .from(schema.products)
              .where(inArray(schema.products.id, validProductIds));

            // Fetch product images for each product
            for (let i = 0; i < fullProducts.length; i++) {
              try {
                const productImages = await db
                  .select()
                  .from(schema.productImages)
                  .where(eq(schema.productImages.productId, fullProducts[i].id))
                  .orderBy(asc(schema.productImages.sortOrder));

                if (productImages.length > 0) {
                  // Use images from product_images table
                  fullProducts[i].images = productImages.map(img => img.imageUrl);
                  fullProducts[i].imageUrls = productImages.map(img => img.imageUrl);
                } else if (fullProducts[i].imageUrl) {
                  // Fall back to product's own imageUrl (which might be base64 or a real URL)
                  fullProducts[i].images = [fullProducts[i].imageUrl];
                  fullProducts[i].imageUrls = [fullProducts[i].imageUrl];
                } else {
                  fullProducts[i].images = [];
                  fullProducts[i].imageUrls = [];
                }
              } catch (imgErr) {
                console.error(`Error fetching images for product ${fullProducts[i].id}:`, imgErr);
                // Ensure images arrays exist even on error
                if (fullProducts[i].imageUrl) {
                  fullProducts[i].images = [fullProducts[i].imageUrl];
                  fullProducts[i].imageUrls = [fullProducts[i].imageUrl];
                } else {
                  fullProducts[i].images = [];
                  fullProducts[i].imageUrls = [];
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching product details:", e);
          fullProducts = [];
        }
      }

      let fallbackImages: any[] = [];
      if (images.length === 0) {
        // Fallback: use imageUrl from combo
        if (Array.isArray(combo.imageUrl)) {
          fallbackImages = combo.imageUrl;
        } else if (combo.imageUrl) {
          fallbackImages = [combo.imageUrl];
        }
      }

      const comboData = {
        ...combo,
        products: fullProducts.length > 0 ? fullProducts : productIds,
        imageUrls: images.length > 0 
          ? images.map(img => img.imageUrl)
          : fallbackImages
      };

      // Debug log with detailed product info
      if (fullProducts.length > 0) {
        console.log(`📦 Combo ${comboId} - Returning ${fullProducts.length} products`);
        fullProducts.forEach(p => {
          console.log(`  Product ${p.id}: ${p.name}`);
          console.log(`    - images array: ${p.images && p.images.length ? 'YES (' + p.images.length + ')' : 'NO'}`);
          console.log(`    - imageUrls array: ${p.imageUrls && p.imageUrls.length ? 'YES (' + p.imageUrls.length + ')' : 'NO'}`);
          console.log(`    - imageUrl field: ${p.imageUrl ? 'YES (' + String(p.imageUrl).substring(0, 50) + '...)' : 'NO'}`);
        });
      }

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
        message: "Error checking review eligibility",
        ...(process.env.NODE_ENV === 'development'
          ? { details: (error as any)?.message || String(error) }
          : {})
      });
    }
  });

  // Create combo review
  app.post("/api/combos/:comboId/reviews", async (req, res) => {
    try {
      const { comboId } = req.params;
      const { rating, title, comment, userName, orderId } = req.body;
      const user = (req as any).user; // Assuming user is attached to req after auth middleware

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

      res.status(500).json({ error: "Failed to create combo review" });
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

      console.log("📥 POST /api/notifications/subscribe called");
      console.log("📧 Email:", email);
      console.log("📅 Timestamp:", timestamp);
      console.log(
        "🔔 Subscription endpoint:",
        subscription?.endpoint ? subscription.endpoint.substring(0, 50) + "..." : "(missing)",
      );

      if (!subscription || !subscription.endpoint) {
        console.error("❌ Invalid subscription data received");
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      const endpoint: string | undefined = subscription?.endpoint;
      const auth: string | undefined = subscription?.keys?.auth;
      const p256dh: string | undefined = subscription?.keys?.p256dh;

      if (!endpoint || !auth || !p256dh) {
        console.error("❌ Invalid subscription keys received", {
          hasEndpoint: Boolean(endpoint),
          hasAuth: Boolean(auth),
          hasP256dh: Boolean(p256dh),
        });
        return res.status(400).json({
          error: "Invalid subscription data",
          details: "Missing endpoint/auth/p256dh",
        });
      }

      // Decode JWT to get user info if authenticated
      let userId: number | null = null;
      if (token) {
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
          const decodedUserId = Number(decoded?.userId ?? decoded?.id ?? null);
          userId = !Number.isNaN(decodedUserId) && decodedUserId > 0 ? decodedUserId : null;
        } catch (error) {
          console.warn("⚠️ Invalid JWT token for push subscription");
        }
      }

      const userAgent = req.headers["user-agent"] as string;
      const now = new Date();

      const upserted = await db
        .insert(schema.pushSubscriptions)
        .values({
          userId,
          endpoint,
          auth,
          p256dh,
          userAgent,
          email: email || null,
          isActive: true,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: schema.pushSubscriptions.endpoint,
          set: ({
            userId,
            auth,
            p256dh,
            userAgent,
            email: email || null,
            isActive: true,
            updatedAt: now,
          } as any),
        })
        .returning();

      console.log(
        "✅ Push subscription upserted:",
        endpoint.substring(0, 50) + "...",
        email ? `| Email: ${email}` : "",
      );
      console.log("💾 Saved to DB with ID:", upserted[0].id);

      res.json({
        success: true,
        message: "Subscription saved",
        subscriptionId: upserted[0].id,
      });
    } catch (error) {
      console.error("❌ Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription", details: String(error) });
    }
  });

  app.get(
    "/api/admin/notifications/subscribers",
    async (req: Request, res: Response) => {
      try {
        const rows = await db
          .select()
          .from(schema.pushSubscriptions)
          .orderBy(desc(schema.pushSubscriptions.updatedAt));

        res.json(
          rows.map((s) => ({
            ...s,
            endpointPreview: s.endpoint ? `${s.endpoint.substring(0, 50)}...` : null,
          }))
        );
      } catch (error) {
        console.error("❌ Failed to load push subscribers:", error);
        res.status(500).json({ error: "Failed to load subscribers" });
      }
    },
  );

  app.head(
    "/api/admin/notifications",
    async (req: Request, res: Response) => {
      try {
        res.status(200).end();
      } catch (error) {
        console.error("❌ Error handling admin notifications HEAD:", error);
        res.status(500).json({ error: "Failed to handle request" });
      }
    },
  );

  app.post(
    "/api/admin/notifications",
    async (req: Request, res: Response) => {
      try {
        const { title, body, image, url, recipients } = req.body as {
          title?: string;
          body?: string;
          image?: string;
          url?: string;
          recipients?: number[];
        };

        if (!title || !body) {
          return res.status(400).json({ error: "Title and body are required" });
        }

        let subscriptions;
        if (Array.isArray(recipients) && recipients.length > 0) {
          subscriptions = await db
            .select()
            .from(schema.pushSubscriptions)
            .where(
              and(
                inArray(schema.pushSubscriptions.id, recipients),
                eq(schema.pushSubscriptions.isActive, true),
              ),
            );
        } else {
          subscriptions = await db
            .select()
            .from(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.isActive, true));
        }

        const total = subscriptions.length;
        if (total === 0) {
          return res
            .status(404)
            .json({ error: "No active subscriptions found", sent: 0, total: 0 });
        }

        const payload = {
          title,
          body,
          image: image || undefined,
          tag: `admin-${Date.now()}`,
          icon: "/favicon.png",
          badge: "/favicon.png",
          data: {
            url: url || "/",
          },
        };

        let sent = 0;
        for (const s of subscriptions) {
          try {
            const pushSubscription = {
              endpoint: s.endpoint,
              keys: { auth: s.auth, p256dh: s.p256dh },
            };

            await webpush.sendNotification(pushSubscription as any, JSON.stringify(payload));

            await db
              .update(schema.pushSubscriptions)
              .set(({ lastUsedAt: new Date(), updatedAt: new Date() } as any))
              .where(eq(schema.pushSubscriptions.id, s.id));

            sent++;
          } catch (err: any) {
            if (err && (err.statusCode === 410 || err.statusCode === 404)) {
              await db
                .update(schema.pushSubscriptions)
                .set(({ isActive: false, updatedAt: new Date() } as any))
                .where(eq(schema.pushSubscriptions.id, s.id));
            } else {
              console.error(
                "❌ Failed to send push notification:",
                s.id,
                err && err.message ? err.message : err,
              );
            }
          }
        }

        res.json({ success: true, sent, total });
      } catch (error) {
        console.error("❌ Error sending admin notifications:", error);
        res.status(500).json({ error: "Failed to send notifications" });
      }
    },
  );

  // Public media links endpoint (for front-end gallery)
  // In-memory list of Server-Sent-Events subscribers for media updates
  const mediaSubscribers: any[] = [];

  // SSE endpoint - clients subscribe to this to receive real-time media changes
  app.get('/api/media/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
    // initial comment to keep connection alive
    res.write('retry: 10000\n\n');

    mediaSubscribers.push(res);

    req.on('close', () => {
      const idx = mediaSubscribers.indexOf(res);
      if (idx !== -1) mediaSubscribers.splice(idx, 1);
    });
  });

  app.get('/api/media', async (req, res) => {
    // Force no caching for public media list
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    try {
      console.log('GET /api/media called with query:', req.query);
      const { isActive, category, type } = req.query as any;

      // Build base query
      let query: any = db.select().from(schema.mediaLinks as any);

      // Add filters if provided
      const whereClauses: any[] = [];

      if (typeof isActive !== 'undefined') {
        const active = isActive === 'true' || isActive === true;
        whereClauses.push(eq(schema.mediaLinks.isActive, active));
      }

      if (category) {
        whereClauses.push(eq(schema.mediaLinks.category, category));
      }

      if (type) {
        whereClauses.push(eq(schema.mediaLinks.type, type));
      }

      // Date filtering: by default include only items valid now; if `ignoreDates=true` is passed, skip this filter
      const ignoreDates = (req.query as any).ignoreDates === 'true' || (req.query as any).ignoreDates === true;
      const now = new Date();
      if (ignoreDates) {
        console.log('GET /api/media skipping validFrom/validUntil filtering due to ignoreDates flag');
      }

      if (whereClauses.length > 0) {
        query = (query as any).where(and(...whereClauses));
      }

      // Order by explicit sort order then newest first
      let mediaList = await query.orderBy(asc(schema.mediaLinks.sortOrder), desc(schema.mediaLinks.createdAt));

      // If date filtering is enabled, apply it in JS to handle null/string dates robustly
      if (!ignoreDates) {
        const filtered = (mediaList || []).filter((row: any) => {
          try {
            const vf = row.validFrom ? new Date(row.validFrom) : null;
            const vu = row.validUntil ? new Date(row.validUntil) : null;

            if (!vf && !vu) return true;
            if (vf && vu) return vf.getTime() <= now.getTime() && vu.getTime() >= now.getTime();
            if (vf && !vu) return vf.getTime() <= now.getTime();
            if (!vf && vu) return vu.getTime() >= now.getTime();
            return false;
          } catch (e) {
            // If date parsing fails, include the row to avoid hiding content
            console.warn('Date parse error for media row', row.id, e);
            return true;
          }
        });
        mediaList = filtered;
      }

      console.log(`GET /api/media returning ${Array.isArray(mediaList) ? mediaList.length : 0} items`);

      // Ensure we always return an array
      res.json(mediaList || []);
    } catch (error) {
      console.error('Error fetching public media links:', error);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  });
  // Debug endpoint - return raw media rows (ignores validFrom/validUntil)
  // NOTE: temporary, remove in production
  app.get('/api/media/debug', async (req, res) => {
    try {
      console.log('GET /api/media/debug called');
      // No-cache for debug endpoint as well
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const all = await db.select().from(schema.mediaLinks).orderBy(asc(schema.mediaLinks.sortOrder), desc(schema.mediaLinks.createdAt));
      console.log(`GET /api/media/debug returning ${Array.isArray(all) ? all.length : 0} items`);
      res.json(all || []);
    } catch (error) {
      console.error('Error fetching debug media list:', error);
      res.status(500).json({ error: 'Failed to fetch debug media' });
    }
  });
  app.get("/api/admin/media", async (req, res) => {
    try {
      // Ensure admin list is returned fresh (no caching)
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const mediaList = await db
        .select()
        .from(schema.mediaLinks)
        .orderBy(asc(schema.mediaLinks.sortOrder), desc(schema.mediaLinks.createdAt));
      
      res.json(mediaList);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  // Create new media (admin)
  app.post("/api/admin/media", async (req, res) => {
    try {
      console.log("📝 Creating media with data:", req.body);
      
      const mediaData = {
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl,
        category: req.body.category || "media",
        type: req.body.type || "image",
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
        metadata: req.body.metadata || null,
      };

      console.log("📝 Processed media data:", mediaData);
      
      const newMedia = await db.insert(schema.mediaLinks).values(mediaData).returning();
      console.log("✅ Media created successfully:", newMedia[0]);
      res.json(newMedia[0]);

      // Broadcast create to SSE subscribers
      try {
        console.log('📣 Broadcasting media create to SSE subscribers:', newMedia[0].id);
        for (const s of mediaSubscribers) {
          try {
            s.write(`event: media\ndata: ${JSON.stringify({ action: 'create', item: newMedia[0] })}\n\n`);
          } catch (e) {
            // ignore individual client errors
          }
        }
      } catch (e) {
        console.warn('Error broadcasting media create:', e);
      }
    } catch (error) {
      console.error("❌ Error creating media:", error);
      res.status(500).json({ 
        error: "Failed to create media",
        details: (error as any).message,
        code: (error as any).code
      });
    }
  });

  // Update media (admin)
  app.put("/api/admin/media/:id", async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const mediaData = {
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl,
        category: req.body.category,
        type: req.body.type,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : null,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null,
        metadata: req.body.metadata || null,
        updatedAt: new Date(),
      };

      const updatedMedia = await db
        .update(schema.mediaLinks)
        .set(mediaData)
        .where(eq(schema.mediaLinks.id, mediaId))
        .returning();

      if (updatedMedia.length === 0) {
        return res.status(404).json({ error: "Media not found" });
      }

      res.json(updatedMedia[0]);

      try {
        console.log('📣 Broadcasting media update to SSE subscribers:', updatedMedia[0].id);
        for (const s of mediaSubscribers) {
          try {
            s.write(`event: media\ndata: ${JSON.stringify({ action: 'update', item: updatedMedia[0] })}\n\n`);
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error broadcasting media update:', e);
      }
    } catch (error) {
      console.error("❌ Error updating media:", error);
      res.status(500).json({ 
        error: "Failed to update media",
        details: (error as any).message
      });
    }
  });

  // Delete media (admin)
  app.delete("/api/admin/media/:id", async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      console.log("🗑️ Deleting media with ID:", mediaId);
      
      const deletedMedia = await db
        .delete(schema.mediaLinks)
        .where(eq(schema.mediaLinks.id, mediaId))
        .returning();
      
      console.log("✅ Media deleted:", deletedMedia);
      
      if (deletedMedia.length === 0) {
        return res.status(404).json({ error: "Media not found" });
      }
      
      res.json({ message: "Media deleted successfully", deletedMedia: deletedMedia[0] });

      try {
        console.log('📣 Broadcasting media delete to SSE subscribers:', deletedMedia[0].id);
        for (const s of mediaSubscribers) {
          try {
            s.write(`event: media\ndata: ${JSON.stringify({ action: 'delete', item: deletedMedia[0] })}\n\n`);
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error broadcasting media delete:', e);
      }
    } catch (error) {
      console.error("❌ Error deleting media:", error);
      res.status(500).json({ 
        error: "Failed to delete media",
        details: (error as any).message
      });
    }
  });

  // Bulk update sort order (admin)
  app.post("/api/admin/media/reorder", async (req, res) => {
    try {
      const items: Array<{ id: number; sortOrder: number }> = req.body.items;
      
      for (const item of items) {
        await db
          .update(schema.mediaLinks)
          .set(({ sortOrder: item.sortOrder, updatedAt: new Date() } as any))
          .where(eq(schema.mediaLinks.id, item.id));
      }

      try {
        const snapshot = await db.select().from(schema.mediaLinks).orderBy(asc(schema.mediaLinks.sortOrder), desc(schema.mediaLinks.createdAt));
        console.log('📣 Broadcasting media reorder to SSE subscribers (items):', snapshot.length);
        for (const s of mediaSubscribers) {
          try {
            s.write(`event: media\ndata: ${JSON.stringify({ action: 'reorder', items: snapshot })}\n\n`);
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error broadcasting media reorder:', e);
      }

      res.json({ message: "Sort order updated successfully" });
    } catch (error) {
      console.error("Error updating sort order:", error);
      res.status(500).json({ error: "Failed to update sort order" });
    }
  });
  app.get('/api/admin/influencer-videos', async (req, res) => {
    try {
      const list = await db.select().from(schema.influencerVideos).orderBy(desc(schema.influencerVideos.createdAt));
      res.json(list);
    } catch (error) {
      console.error('Error fetching admin influencer videos:', error);
      res.status(500).json({ error: 'Failed to fetch influencer videos' });
    }
  });

  // Admin: create influencer video
  app.post('/api/admin/influencer-videos', async (req, res) => {
    try {
      const data = {
        influencerName: req.body.influencerName,
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category || 'influencer',
        type: req.body.type || 'video',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        metadata: req.body.metadata || null,
      };
      const inserted = await db.insert(schema.influencerVideos).values(data).returning();
      res.json(inserted[0]);
    } catch (error) {
      console.error('Error creating influencer video:', error);
      res.status(500).json({ error: 'Failed to create influencer video', details: (error as any).message });
    }
  });

  // Admin: update influencer video
  app.put('/api/admin/influencer-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = {
        influencerName: req.body.influencerName,
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category,
        type: req.body.type,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        metadata: req.body.metadata || null,
        updatedAt: new Date(),
      };
      const updated = await db.update(schema.influencerVideos).set(data).where(eq(schema.influencerVideos.id, id)).returning();
      if (!updated || updated.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating influencer video:', error);
      res.status(500).json({ error: 'Failed to update influencer video', details: (error as any).message });
    }
  });

  // Admin: delete influencer video
  app.delete('/api/admin/influencer-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await db.delete(schema.influencerVideos).where(eq(schema.influencerVideos.id, id)).returning();
      if (!deleted || deleted.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted', deleted: deleted[0] });
    } catch (error) {
      console.error('Error deleting influencer video:', error);
      res.status(500).json({ error: 'Failed to delete influencer video', details: (error as any).message });
    }
  });

  // ==================== AFFILIATE VIDEOS ROUTES ====================

  // Public: get affiliate videos
  app.get('/api/affiliate-videos', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const { isActive, category } = req.query;
      let query: any = db.select().from(schema.affiliateVideos);
      if (isActive !== undefined) {
        query = query.where(eq(schema.affiliateVideos.isActive, isActive === 'true'));
      }
      if (category) {
        query = query.where(eq(schema.affiliateVideos.category, category as string));
      }
      query = query.orderBy(asc(schema.affiliateVideos.sortOrder), desc(schema.affiliateVideos.createdAt));
      const list = await query;
      res.json(list);
    } catch (error) {
      console.error('Error fetching affiliate videos:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate videos' });
    }
  });

  // Get single affiliate video
  app.get('/api/affiliate-videos/:id', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.affiliateVideos).where(eq(schema.affiliateVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching affiliate video:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate video' });
    }
  });

  // Click tracking for affiliate video
  app.post('/api/affiliate-videos/:id/click', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.affiliateVideos).where(eq(schema.affiliateVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await db.update(schema.affiliateVideos).set(({ clickCount: (rows[0].clickCount || 0) + 1 } as any)).where(eq(schema.affiliateVideos.id, id));
      res.json({ redirectUrl: rows[0].redirectUrl || rows[0].videoUrl });
    } catch (error) {
      console.error('Error tracking affiliate video click:', error);
      res.status(500).json({ error: 'Failed to track click' });
    }
  });

  // Share page for affiliate video (returns HTML with Open Graph tags)
  app.get('/share/affiliate-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.affiliateVideos).where(eq(schema.affiliateVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).send('Not found');

      const video = rows[0];
      const escapeHtml = (str: any) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      const host = req.get('host') || 'localhost';
      const forwarded = (req.headers['x-forwarded-proto'] as string) || '';
      const protocol = forwarded.split(',')[0] || req.protocol || 'https';

      const makeAbsolute = (url: string | null) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${protocol}://${host}${path}`;
      };

      const ogImage = makeAbsolute(video.imageUrl || '');
      const pageUrl = `${protocol}://${host}${req.originalUrl}`;
      const title = (video.title || video.affiliateName || 'Affiliate Video').toString();
      const description = (video.description || '').toString();

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <main style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,Helvetica,sans-serif;">
    <div style="text-align:center;max-width:680px;margin:0 16px;">
      <h1 style="font-size:20px;margin-bottom:8px;">${escapeHtml(title)}</h1>
      <p style="color:#666;margin-bottom:16px;">${escapeHtml(description)}</p>
      <p><a href="${escapeHtml(video.redirectUrl || video.videoUrl || '#')}" style="background:#e74c3c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Video</a></p>
      <p style="margin-top:18px;color:#999;font-size:13px;">If the video doesn't open automatically, click the button above.</p>
    </div>
  </main>
  <script>
    (function(){
      try{
        var target = ${JSON.stringify(video.redirectUrl || video.videoUrl || '')};
        if(target) setTimeout(function(){ window.location.href = target; }, 1200);
      }catch(e){}
    })();
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Error rendering share page for affiliate video:', error);
      res.status(500).send('Failed to render share page');
    }
  });

  // Admin: get all affiliate videos
  app.get('/api/admin/affiliate-videos', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const list = await db.select().from(schema.affiliateVideos).orderBy(desc(schema.affiliateVideos.createdAt));
      res.json(list);
    } catch (error) {
      console.error('Error fetching admin affiliate videos:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate videos' });
    }
  });

  // Admin: create affiliate video
  app.post('/api/admin/affiliate-videos', async (req, res) => {
    try {
      // Validate required fields - title is mandatory
      if (!req.body.title || !req.body.title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const data = {
        affiliateName: req.body.affiliateName || null,
        title: req.body.title.trim(),
        description: req.body.description || null,
        imageUrl: req.body.imageUrl ? req.body.imageUrl.trim() : null,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category || 'affiliate',
        type: req.body.type || 'video',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : 0,
        metadata: req.body.metadata || null,
      };
      const inserted = await db.insert(schema.affiliateVideos).values(data).returning();
      res.json(inserted[0]);
    } catch (error) {
      console.error('Error creating affiliate video:', error);
      res.status(500).json({ error: 'Failed to create affiliate video', details: (error as any).message });
    }
  });

  // Admin: update affiliate video
  app.put('/api/admin/affiliate-videos/:id', async (req, res) => {
    try {
      // Validate required fields - title is mandatory
      if (!req.body.title || !req.body.title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const id = parseInt(req.params.id);
      const data = {
        affiliateName: req.body.affiliateName || null,
        title: req.body.title.trim(),
        description: req.body.description || null,
        imageUrl: req.body.imageUrl ? req.body.imageUrl.trim() : null,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category,
        type: req.body.type,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder !== undefined ? parseInt(req.body.sortOrder) : 0,
        metadata: req.body.metadata || null,
        updatedAt: new Date(),
      };
      const updated = await db.update(schema.affiliateVideos).set(data).where(eq(schema.affiliateVideos.id, id)).returning();
      if (!updated || updated.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating affiliate video:', error);
      res.status(500).json({ error: 'Failed to update affiliate video', details: (error as any).message });
    }
  });

  // Admin: delete affiliate video
  app.delete('/api/admin/affiliate-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await db.delete(schema.affiliateVideos).where(eq(schema.affiliateVideos.id, id)).returning();
      if (!deleted || deleted.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted', deleted: deleted[0] });
    } catch (error) {
      console.error('Error deleting affiliate video:', error);
      res.status(500).json({ error: 'Failed to delete affiliate video', details: (error as any).message });
    }
  });

  // ==================== CHANNEL PARTNER VIDEOS ROUTES ====================

  // Public: get channel partner videos
  app.get('/api/channel-partner-videos', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const { isActive, category } = req.query;
      let query: any = db.select().from(schema.channelPartnerVideos);
      if (isActive !== undefined) {
        query = query.where(eq(schema.channelPartnerVideos.isActive, isActive === 'true'));
      }
      if (category) {
        query = query.where(eq(schema.channelPartnerVideos.category, category as string));
      }
      query = query.orderBy(asc(schema.channelPartnerVideos.sortOrder), desc(schema.channelPartnerVideos.createdAt));
      const list = await query;
      res.json(list);
    } catch (error) {
      console.error('Error fetching channel partner videos:', error);
      res.status(500).json({ error: 'Failed to fetch channel partner videos' });
    }
  });

  // Get single channel partner video
  app.get('/api/channel-partner-videos/:id', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.channelPartnerVideos).where(eq(schema.channelPartnerVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching channel partner video:', error);
      res.status(500).json({ error: 'Failed to fetch channel partner video' });
    }
  });

  // Click tracking for channel partner video
  app.post('/api/channel-partner-videos/:id/click', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.channelPartnerVideos).where(eq(schema.channelPartnerVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await db.update(schema.channelPartnerVideos).set(({ clickCount: (rows[0].clickCount || 0) + 1 } as any)).where(eq(schema.channelPartnerVideos.id, id));
      res.json({ redirectUrl: rows[0].redirectUrl || rows[0].videoUrl });
    } catch (error) {
      console.error('Error tracking channel partner video click:', error);
      res.status(500).json({ error: 'Failed to track click' });
    }
  });

  // Share page for channel partner video (returns HTML with Open Graph tags)
  app.get('/share/channel-partner-videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(schema.channelPartnerVideos).where(eq(schema.channelPartnerVideos.id, id));
      if (!rows || rows.length === 0) return res.status(404).send('Not found');

      const video = rows[0];
      const escapeHtml = (str: any) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      const host = req.get('host') || 'localhost';
      const forwarded = (req.headers['x-forwarded-proto'] as string) || '';
      const protocol = forwarded.split(',')[0] || req.protocol || 'https';

      const makeAbsolute = (url: string | null) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${protocol}://${host}${path}`;
      };

      const ogImage = makeAbsolute(video.imageUrl || '');
      const pageUrl = `${protocol}://${host}${req.originalUrl}`;
      const title = (video.title || video.partnerName || 'Channel Partner Video').toString();
      const description = (video.description || '').toString();

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <main style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,Helvetica,sans-serif;">
    <div style="text-align:center;max-width:680px;margin:0 16px;">
      <h1 style="font-size:20px;margin-bottom:8px;">${escapeHtml(title)}</h1>
      <p style="color:#666;margin-bottom:16px;">${escapeHtml(description)}</p>
      <p><a href="${escapeHtml(video.redirectUrl || video.videoUrl || '#')}" style="background:#e74c3c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Video</a></p>
      <p style="margin-top:18px;color:#999;font-size:13px;">If the video doesn't open automatically, click the button above.</p>
    </div>
  </main>
  <script>
    (function(){
      try{
        var target = ${JSON.stringify(video.redirectUrl || video.videoUrl || '')};
        if(target) setTimeout(function(){ window.location.href = target; }, 1200);
      }catch(e){}
    })();
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Error rendering share page for channel partner video:', error);
      res.status(500).send('Failed to render share page');
    }
  });

  // Admin: get all channel partner videos
  app.get('/api/admin/channel-partner-videos', async (req, res) => {
    try {
      // No cache - always fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const list = await db.select().from(schema.channelPartnerVideos).orderBy(desc(schema.channelPartnerVideos.createdAt));
      res.json(list);
    } catch (error) {
      console.error('Error fetching admin channel partner videos:', error);
      res.status(500).json({ error: 'Failed to fetch channel partner videos' });
    }
  });

  // Admin: create channel partner video
  app.post('/api/admin/channel-partner-videos', async (req, res) => {
    try {
      // No cache headers
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const data = {
        partnerName: req.body.partnerName,
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category || 'channel-partner',
        type: req.body.type || 'video',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        metadata: req.body.metadata || null,
      };
      const inserted = await db.insert(schema.channelPartnerVideos).values(data).returning();
      res.json(inserted[0]);
    } catch (error) {
      console.error('Error creating channel partner video:', error);
      res.status(500).json({ error: 'Failed to create channel partner video', details: (error as any).message });
    }
  });

  // Admin: update channel partner video
  app.put('/api/admin/channel-partner-videos/:id', async (req, res) => {
    try {
      // No cache headers
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const id = parseInt(req.params.id);
      const data = {
        partnerName: req.body.partnerName,
        title: req.body.title,
        description: req.body.description || null,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl || null,
        redirectUrl: req.body.redirectUrl || null,
        category: req.body.category,
        type: req.body.type,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        sortOrder: req.body.sortOrder || 0,
        metadata: req.body.metadata || null,
        updatedAt: new Date(),
      };
      const updated = await db.update(schema.channelPartnerVideos).set(data).where(eq(schema.channelPartnerVideos.id, id)).returning();
      if (!updated || updated.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating channel partner video:', error);
      res.status(500).json({ error: 'Failed to update channel partner video', details: (error as any).message });
    }
  });

  // Admin: delete channel partner video
  app.delete('/api/admin/channel-partner-videos/:id', async (req, res) => {
    try {
      // No cache headers
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const id = parseInt(req.params.id);
      const deleted = await db.delete(schema.channelPartnerVideos).where(eq(schema.channelPartnerVideos.id, id)).returning();
      if (!deleted || deleted.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted', deleted: deleted[0] });
    } catch (error) {
      console.error('Error deleting channel partner video:', error);
      res.status(500).json({ error: 'Failed to delete channel partner video', details: (error as any).message });
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
      const errorProps = getErrorProperties(error);
      console.error('Error details:', {
        message: errorProps.message,
        code: errorProps.code,
        constraint: errorProps.constraint,
        detail: errorProps.detail
      });

      if (errorProps.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'A slider with similar data already exists' });
      }

      if (errorProps.code === '23503') { // Foreign key constraint violation
        return res.status(400).json({ error: 'Invalid category reference' });
      }

      res.status(500).json({
        error: 'Failed to create category slider',
        details: process.env.NODE_ENV === 'development' ? errorProps.message : undefined
      });
    }
  });

  app.put('/api/admin/categories/:categoryId/sliders/:sliderId', async (req, res) => {
    try {
      const sliderId = parseInt(req.params.sliderId);
      const { imageUrl, title, subtitle, isActive, sortOrder } = req.body;

      const [updatedSlider] = await db
        .update(schema.categorySliders)
        .set(({
          imageUrl,
          title: title || '',
          subtitle: subtitle || '',
          isActive: isActive !== false,
          sortOrder: sortOrder || 0,
          updatedAt: new Date()
        } as any))
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
    // Mobile OTP routes
  app.post("/api/auth/send-mobile-otp", async (req, res) => {
    try {
      const { phoneNumber, forSignup } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Basic phone number validation
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(String(phoneNumber).replace(/\s+/g, ""))) {
        return res
          .status(400)
          .json({ error: "Please enter a valid Indian mobile number" });
      }

      const normalized = normalizePhone(phoneNumber);

      // For signup flow, do not send OTP if phone already mapped to another user
      if (forSignup) {
        const existingByPhone = await storage.getUserByPhone(normalized);
        if (existingByPhone) {
          return res.status(400).json({
            error:
              "An account already exists with this mobile number. Please log in instead.",
          });
        }
      }

      const result = await OTPService.sendMobileOTP(phoneNumber);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
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
  // Admin: delete channel partner video
  app.delete('/api/admin/channel-partner-videos/:id', async (req, res) => {
    try {
      // No cache headers
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const id = parseInt(req.params.id);
      const deleted = await db.delete(schema.channelPartnerVideos).where(eq(schema.channelPartnerVideos.id, id)).returning();
      if (!deleted || deleted.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted', deleted: deleted[0] });
    } catch (error) {
      console.error('Error deleting channel partner video:', error);
      res.status(500).json({ error: 'Failed to delete channel partner video', details: (error as any).message });
    }
  });

  const httpServer = createServer(app);
  try {
    const announcer = createAnnouncementsBroadcaster();
    announcer.setup(httpServer);
    (global as any).announcementsBroadcaster = announcer;
    console.log('✅ Announcements broadcaster setup complete');
  } catch (e) {
    console.warn('⚠️ Failed to setup announcements broadcaster:', e);
  }
  return httpServer;
}

// Start expire scheduler (handles auto-activating/expiring offers & contests)
try {
  startExpireScheduler();
} catch (e) {
  console.warn('⚠️ Failed to start expire scheduler:', e);
}