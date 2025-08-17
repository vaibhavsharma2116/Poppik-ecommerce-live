
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
      
      // Check if user has admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: "Invalid token." });
    }
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(500).json({ error: "Server error during authentication." });
  }
};
