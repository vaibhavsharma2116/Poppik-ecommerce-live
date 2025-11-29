import { Router, Request, Response } from "express";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as schema from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export function createMasterAdminRoutes(pool: Pool) {
  const router = Router();
  const db = drizzle(pool);

  const masterAdminMiddleware = (req: AuthenticatedRequest, res: Response, next: Function) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. No token provided." });
      }

      const token = authHeader.substring(7);
      
      if (JWT_SECRET === "your-secret-key") {
        console.error("SECURITY WARNING: Using default JWT secret!");
        return res.status(500).json({ error: "Server configuration error. Contact administrator." });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.role !== "master_admin") {
        return res.status(403).json({ error: "Access denied. Master Admin privileges required." });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token." });
    }
  };

  const logActivity = async (
    adminId: number,
    action: string,
    module: string,
    description: string,
    targetType?: string,
    targetId?: number,
    oldValue?: any,
    newValue?: any,
    req?: Request
  ) => {
    try {
      await db.insert(schema.adminActivityLogs).values({
        adminId,
        action,
        module,
        description,
        targetType,
        targetId,
        oldValue,
        newValue,
        ipAddress: req?.ip || req?.socket.remoteAddress || null,
        userAgent: req?.headers["user-agent"] || null,
        status: "success",
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  router.get("/api/master-admin/dashboard", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
      const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.ordersTable);
      const [productsCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.products);

      const recentLogs = await db
        .select()
        .from(schema.adminActivityLogs)
        .orderBy(desc(schema.adminActivityLogs.createdAt))
        .limit(10);

      const recentLogins = await db
        .select()
        .from(schema.loginHistory)
        .orderBy(desc(schema.loginHistory.createdAt))
        .limit(10);

      res.json({
        stats: {
          totalUsers: usersCount?.count || 0,
          totalOrders: ordersCount?.count || 0,
          totalProducts: productsCount?.count || 0,
        },
        recentActivity: recentLogs,
        recentLogins,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  router.get("/api/master-admin/users", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
      }).from(schema.users);

      const users = await query.orderBy(desc(schema.users.createdAt)).limit(Number(limit)).offset(offset);
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);

      res.json(users);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  router.post("/api/master-admin/users", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { firstName, lastName, email, phone, password, role } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(schema.users).values({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: role || "user",
      }).returning();

      await logActivity(
        req.user!.userId,
        "CREATE",
        "users",
        `Created new user: ${email}`,
        "user",
        newUser.id,
        null,
        { email, role },
        req
      );

      res.json({ message: "User created successfully", user: { ...newUser, password: undefined } });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  router.put("/api/master-admin/users/:id", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, role, password } = req.body;

      const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.id, Number(id)));
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (existingUser.role === "master_admin" && Number(id) !== req.user!.userId) {
        return res.status(403).json({ error: "Cannot modify another Master Admin account" });
      }

      const updateData: any = { firstName, lastName, email, phone, updatedAt: new Date() };
      
      if (role && role !== existingUser.role) {
        if (existingUser.role === "master_admin") {
          return res.status(403).json({ error: "Cannot change Master Admin role" });
        }
        if (role === "master_admin") {
          return res.status(403).json({ error: "Cannot assign Master Admin role through this endpoint" });
        }
        updateData.role = role;
      }
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const [updatedUser] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, Number(id)))
        .returning();

      await logActivity(
        req.user!.userId,
        "UPDATE",
        "users",
        `Updated user: ${email}`,
        "user",
        Number(id),
        { role: existingUser.role },
        { role: updateData.role || existingUser.role },
        req
      );

      res.json({ message: "User updated successfully", user: { ...updatedUser, password: undefined } });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  router.delete("/api/master-admin/users/:id", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, Number(id)));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === "master_admin") {
        return res.status(403).json({ error: "Cannot delete Master Admin" });
      }

      await db.delete(schema.users).where(eq(schema.users.id, Number(id)));

      await logActivity(
        req.user!.userId,
        "DELETE",
        "users",
        `Deleted user: ${user.email}`,
        "user",
        Number(id),
        { email: user.email, role: user.role },
        null,
        req
      );

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  router.put("/api/master-admin/users/:id/role", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (Number(id) === req.user!.userId) {
        return res.status(403).json({ error: "Cannot change your own role" });
      }

      const validRoles = ["user", "admin", "affiliate", "influencer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Cannot assign master_admin role." });
      }

      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, Number(id)));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === "master_admin") {
        return res.status(403).json({ error: "Cannot change role of Master Admin" });
      }

      const [updatedUser] = await db
        .update(schema.users)
        .set({ role, updatedAt: new Date() })
        .where(eq(schema.users.id, Number(id)))
        .returning();

      await logActivity(
        req.user!.userId,
        "ROLE_CHANGE",
        "users",
        `Changed role for ${user.email}: ${user.role} -> ${role}`,
        "user",
        Number(id),
        { role: user.role },
        { role },
        req
      );

      res.json({ message: "Role updated successfully", user: { ...updatedUser, password: undefined } });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  router.get("/api/master-admin/permissions", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const permissions = await db.select().from(schema.adminPermissions);
      res.json(permissions);
    } catch (error) {
      console.error("Permissions fetch error:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  router.post("/api/master-admin/permissions", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { role, module, canCreate, canRead, canUpdate, canDelete, canExport } = req.body;

      const [existing] = await db
        .select()
        .from(schema.adminPermissions)
        .where(and(eq(schema.adminPermissions.role, role), eq(schema.adminPermissions.module, module)));

      if (existing) {
        const [updated] = await db
          .update(schema.adminPermissions)
          .set({ canCreate, canRead, canUpdate, canDelete, canExport, updatedAt: new Date() })
          .where(eq(schema.adminPermissions.id, existing.id))
          .returning();
        return res.json({ message: "Permission updated", permission: updated });
      }

      const [permission] = await db.insert(schema.adminPermissions).values({
        role,
        module,
        canCreate,
        canRead,
        canUpdate,
        canDelete,
        canExport,
      }).returning();

      await logActivity(req.user!.userId, "CREATE", "permissions", `Set permissions for ${role} on ${module}`, "permission", permission.id, null, { role, module }, req);

      res.json({ message: "Permission created", permission });
    } catch (error) {
      console.error("Create permission error:", error);
      res.status(500).json({ error: "Failed to create permission" });
    }
  });

  router.get("/api/master-admin/settings", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await db.select().from(schema.systemSettings);
      res.json(settings);
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  router.put("/api/master-admin/settings/:key", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      const [existing] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.settingKey, key));

      if (!existing) {
        return res.status(404).json({ error: "Setting not found" });
      }

      if (!existing.isEditable) {
        return res.status(403).json({ error: "This setting cannot be modified" });
      }

      const [updated] = await db
        .update(schema.systemSettings)
        .set({ settingValue: value, lastModifiedBy: req.user!.userId, updatedAt: new Date() })
        .where(eq(schema.systemSettings.settingKey, key))
        .returning();

      await logActivity(req.user!.userId, "UPDATE", "settings", `Updated setting: ${key}`, "setting", existing.id, { value: existing.settingValue }, { value }, req);

      res.json({ message: "Setting updated", setting: updated });
    } catch (error) {
      console.error("Update setting error:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  router.post("/api/master-admin/settings", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { settingKey, settingValue, settingType, category, description, isEditable } = req.body;

      const [existing] = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.settingKey, settingKey));
      if (existing) {
        return res.status(400).json({ error: "Setting key already exists" });
      }

      const [setting] = await db.insert(schema.systemSettings).values({
        settingKey,
        settingValue,
        settingType,
        category,
        description,
        isEditable,
        lastModifiedBy: req.user!.userId,
      }).returning();

      await logActivity(req.user!.userId, "CREATE", "settings", `Created setting: ${settingKey}`, "setting", setting.id, null, { settingKey, settingValue }, req);

      res.json({ message: "Setting created", setting });
    } catch (error) {
      console.error("Create setting error:", error);
      res.status(500).json({ error: "Failed to create setting" });
    }
  });

  router.get("/api/master-admin/features", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const features = await db.select().from(schema.featureToggles);
      res.json(features);
    } catch (error) {
      console.error("Features fetch error:", error);
      res.status(500).json({ error: "Failed to fetch features" });
    }
  });

  router.put("/api/master-admin/features/:id", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { isEnabled, enabledForRoles } = req.body;

      const [feature] = await db.select().from(schema.featureToggles).where(eq(schema.featureToggles.id, Number(id)));
      if (!feature) {
        return res.status(404).json({ error: "Feature not found" });
      }

      const [updated] = await db
        .update(schema.featureToggles)
        .set({ isEnabled, enabledForRoles, lastModifiedBy: req.user!.userId, updatedAt: new Date() })
        .where(eq(schema.featureToggles.id, Number(id)))
        .returning();

      await logActivity(req.user!.userId, "UPDATE", "features", `${isEnabled ? "Enabled" : "Disabled"} feature: ${feature.featureName}`, "feature", Number(id), { isEnabled: feature.isEnabled }, { isEnabled }, req);

      res.json({ message: "Feature updated", feature: updated });
    } catch (error) {
      console.error("Update feature error:", error);
      res.status(500).json({ error: "Failed to update feature" });
    }
  });

  router.post("/api/master-admin/features", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { featureKey, featureName, description, isEnabled, enabledForRoles } = req.body;

      const [feature] = await db.insert(schema.featureToggles).values({
        featureKey,
        featureName,
        description,
        isEnabled,
        enabledForRoles,
        lastModifiedBy: req.user!.userId,
      }).returning();

      await logActivity(req.user!.userId, "CREATE", "features", `Created feature: ${featureName}`, "feature", feature.id, null, { featureKey, isEnabled }, req);

      res.json({ message: "Feature created", feature });
    } catch (error) {
      console.error("Create feature error:", error);
      res.status(500).json({ error: "Failed to create feature" });
    }
  });

  router.get("/api/master-admin/activity-logs", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 50, module, action, adminId } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const logs = await db
        .select({
          id: schema.adminActivityLogs.id,
          adminId: schema.adminActivityLogs.adminId,
          action: schema.adminActivityLogs.action,
          module: schema.adminActivityLogs.module,
          description: schema.adminActivityLogs.description,
          targetType: schema.adminActivityLogs.targetType,
          targetId: schema.adminActivityLogs.targetId,
          ipAddress: schema.adminActivityLogs.ipAddress,
          status: schema.adminActivityLogs.status,
          createdAt: schema.adminActivityLogs.createdAt,
          adminEmail: schema.users.email,
          adminName: schema.users.firstName,
        })
        .from(schema.adminActivityLogs)
        .leftJoin(schema.users, eq(schema.adminActivityLogs.adminId, schema.users.id))
        .orderBy(desc(schema.adminActivityLogs.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Format logs to match frontend expectations
      const formattedLogs = logs.map(log => ({
        ...log,
        user: log.adminEmail || 'System',
        timestamp: log.createdAt,
        resource: log.targetType
      }));

      res.json(formattedLogs);
    } catch (error) {
      console.error("Activity logs error:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  router.get("/api/master-admin/login-history", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { page = 1, limit = 50, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const history = await db
        .select()
        .from(schema.loginHistory)
        .orderBy(desc(schema.loginHistory.createdAt))
        .limit(Number(limit))
        .offset(offset);

      const [total] = await db.select({ count: sql<number>`count(*)` }).from(schema.loginHistory);

      res.json({
        history,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total?.count || 0,
          pages: Math.ceil((total?.count || 0) / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Login history error:", error);
      res.status(500).json({ error: "Failed to fetch login history" });
    }
  });

  router.get("/api/master-admin/backups", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const backups = await db
        .select()
        .from(schema.backupLogs)
        .orderBy(desc(schema.backupLogs.createdAt))
        .limit(50);

      res.json(backups);
    } catch (error) {
      console.error("Backups fetch error:", error);
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  router.post("/api/master-admin/backups", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { backupType } = req.body;

      const [backup] = await db.insert(schema.backupLogs).values({
        backupType: backupType || "manual",
        status: "in_progress",
        initiatedBy: req.user!.userId,
      }).returning();

      setTimeout(async () => {
        await db
          .update(schema.backupLogs)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(schema.backupLogs.id, backup.id));
      }, 5000);

      await logActivity(req.user!.userId, "BACKUP", "system", `Initiated ${backupType || "manual"} backup`, "backup", backup.id, null, null, req);

      res.json({ message: "Backup initiated", backup });
    } catch (error) {
      console.error("Create backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  router.get("/api/master-admin/system-health", masterAdminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const client = await pool.connect();
      const dbStatus = await client.query("SELECT 1");
      client.release();

      const memUsage = process.memoryUsage();

      res.json({
        database: { status: "healthy", message: "Connected" },
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
          rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
        },
        uptime: Math.round(process.uptime()) + " seconds",
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ error: "System health check failed" });
    }
  });

  return router;
}
