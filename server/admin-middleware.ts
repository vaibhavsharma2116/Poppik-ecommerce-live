
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const adminAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Support multiple token locations to be resilient to different clients
    const authHeader = req.headers.authorization as string | undefined;
    const xAdminToken = (req.headers['x-admin-token'] || req.headers['x-access-token']) as string | undefined;
    // If cookies are used elsewhere in the app, they may be present (requires cookie-parser)
    // @ts-ignore
    const cookieToken = req.cookies?.adminToken || req.cookies?.token;
    const bodyToken = (req as any).body?.token as string | undefined;
    const queryToken = req.query?.token as string | undefined;

    let token: string | undefined;

    const normalizeToken = (raw: any) => {
      if (!raw) return undefined;
      let t = String(raw).trim();
      // Some clients accidentally send quotes in querystring or headers
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        t = t.slice(1, -1).trim();
      }
      // Some clients send "Bearer <token>" even when using query params
      if (t.toLowerCase().startsWith('bearer ')) {
        t = t.slice(7).trim();
      }
      return t || undefined;
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (xAdminToken) {
      token = xAdminToken;
    } else if (cookieToken) {
      token = cookieToken;
    } else if (bodyToken) {
      token = bodyToken;
    } else if (queryToken) {
      token = queryToken;
    }

    token = normalizeToken(token);

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;

      // Check if user has admin or master_admin role
      if (decoded.role !== 'admin' && decoded.role !== 'master_admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('Admin JWT verification failed:', jwtError);
      return res.status(401).json({ error: "Invalid token." });
    }
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(500).json({ error: "Server error during authentication." });
  }
};
