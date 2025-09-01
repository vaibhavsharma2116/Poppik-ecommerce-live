
import { Router } from "express";
import { DatabaseOptimizer } from "./db-optimizer";
import { DatabaseMonitor } from "./db-monitor";
import { Pool } from "pg";

export function createPerformanceRoutes(pool: Pool) {
  const router = Router();
  const optimizer = new DatabaseOptimizer(pool);
  const monitor = new DatabaseMonitor(pool);

  // Get database performance overview
  router.get("/api/admin/performance", async (req, res) => {
    try {
      const analysis = await optimizer.analyzePerformance();
      res.json(analysis);
    } catch (error) {
      console.error("Performance analysis error:", error);
      res.status(500).json({ error: "Failed to analyze performance" });
    }
  });

  // Get slow queries
  router.get("/api/admin/slow-queries", async (req, res) => {
    try {
      const minDuration = parseInt(req.query.minDuration as string) || 1000;
      const slowQueries = await optimizer.getSlowQueries(minDuration);
      res.json(slowQueries);
    } catch (error) {
      console.error("Slow queries error:", error);
      res.status(500).json({ error: "Failed to get slow queries" });
    }
  });

  // Get active connections
  router.get("/api/admin/connections", async (req, res) => {
    try {
      const connections = await optimizer.getActiveConnections();
      res.json(connections);
    } catch (error) {
      console.error("Active connections error:", error);
      res.status(500).json({ error: "Failed to get connections" });
    }
  });

  // Close idle connections
  router.post("/api/admin/close-idle", async (req, res) => {
    try {
      const maxIdleMinutes = parseInt(req.body.maxIdleMinutes) || 60;
      const result = await optimizer.closeIdleConnections(maxIdleMinutes);
      res.json({ closed: result.length, connections: result });
    } catch (error) {
      console.error("Close idle connections error:", error);
      res.status(500).json({ error: "Failed to close idle connections" });
    }
  });

  // Kill long running queries
  router.post("/api/admin/kill-queries", async (req, res) => {
    try {
      const maxDurationMinutes = parseInt(req.body.maxDurationMinutes) || 30;
      const result = await optimizer.killLongRunningQueries(maxDurationMinutes);
      res.json({ killed: result.length, queries: result });
    } catch (error) {
      console.error("Kill queries error:", error);
      res.status(500).json({ error: "Failed to kill queries" });
    }
  });

  return router;
}
