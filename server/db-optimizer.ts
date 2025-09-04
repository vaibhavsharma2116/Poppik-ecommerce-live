import { Pool } from "pg";

export class DatabaseOptimizer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Emergency CPU reduction
  async emergencyCPUCleanup(): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      // Kill all long running queries (> 30 seconds)
      const result = await client.query(`
        SELECT 
          pg_terminate_backend(pid) as terminated,
          pid,
          query,
          EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds
        FROM pg_stat_activity 
        WHERE state IN ('active', 'idle in transaction')
          AND EXTRACT(EPOCH FROM (now() - query_start)) > 30
          AND pid <> pg_backend_pid()
          AND usename != 'postgres'
      `);

      // Also cancel all running queries
      await client.query(`
        SELECT pg_cancel_backend(pid)
        FROM pg_stat_activity 
        WHERE state = 'active'
          AND pid <> pg_backend_pid()
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Optimize PostgreSQL configuration for high load
  async optimizeForHighLoad(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Set more aggressive timeout settings
      await client.query("SET statement_timeout = '30s'");
      await client.query("SET idle_in_transaction_session_timeout = '60s'");
      await client.query("SET lock_timeout = '5s'");

      // Reduce work_mem to prevent memory issues
      await client.query("SET work_mem = '2MB'");

      console.log("Applied high-load optimizations to PostgreSQL");
    } catch (error) {
      console.error("Error optimizing for high load:", error);
    } finally {
      client.release();
    }
  }

  // Enable pg_stat_statements extension
  async enableStatements(): Promise<void> {
    let client;
    try {
      // Set a shorter timeout for this specific operation
      client = await Promise.race([
        this.pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]) as any;

      // Quick test query with timeout
      await Promise.race([
        client.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      ]);

      // Check if extension is available first
      const extensionCheck = await Promise.race([
        client.query(`
          SELECT EXISTS(
            SELECT 1 FROM pg_available_extensions 
            WHERE name = 'pg_stat_statements'
          ) as available;
        `),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Extension check timeout')), 5000)
        )
      ]) as any;

      if (extensionCheck.rows[0]?.available) {
        await client.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`);
        console.log("pg_stat_statements extension enabled");
      } else {
        console.log("pg_stat_statements extension not available - using alternative monitoring");
      }
    } catch (error) {
      console.log("pg_stat_statements extension not available - using alternative monitoring");
      console.log("Error details:", error.message);
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.log("Error releasing client:", releaseError.message);
        }
      }
    }
  }

  // Get slow queries
  async getSlowQueries(minDurationMs: number = 1000) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          min_exec_time,
          max_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_exec_time > $1
        ORDER BY total_exec_time DESC
        LIMIT 20;
      `, [minDurationMs]);

      return result.rows;
    } catch (error) {
      console.log("pg_stat_statements extension not available");
      return [];
    } finally {
      client.release();
    }
  }

  // Get current active connections
  async getActiveConnections() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          backend_start,
          query_start,
          state,
          LEFT(query, 100) as query_preview,
          EXTRACT(EPOCH FROM (now() - query_start)) as query_duration_seconds
        FROM pg_stat_activity 
        WHERE state != 'idle'
          AND pid != pg_backend_pid()
        ORDER BY query_start DESC;
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get idle connections
  async getIdleConnections() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          backend_start,
          state_change,
          EXTRACT(EPOCH FROM (now() - state_change))/60 as idle_minutes
        FROM pg_stat_activity 
        WHERE state = 'idle'
          AND pid != pg_backend_pid()
        ORDER BY state_change ASC;
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Kill long running queries
  async killLongRunningQueries(maxDurationMinutes: number = 30) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pg_terminate_backend(pid) as terminated,
          pid,
          LEFT(query, 100) as query_preview,
          EXTRACT(EPOCH FROM (now() - query_start))/60 as duration_minutes
        FROM pg_stat_activity 
        WHERE state != 'idle'
          AND EXTRACT(EPOCH FROM (now() - query_start))/60 > $1
          AND pid != pg_backend_pid();
      `, [maxDurationMinutes]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Close idle connections
  async closeIdleConnections(maxIdleMinutes: number = 60) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pg_terminate_backend(pid) as terminated,
          pid,
          usename,
          EXTRACT(EPOCH FROM (now() - state_change))/60 as idle_minutes
        FROM pg_stat_activity 
        WHERE state = 'idle'
          AND EXTRACT(EPOCH FROM (now() - state_change))/60 > $1
          AND pid != pg_backend_pid();
      `, [maxIdleMinutes]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get table statistics
  async getTableStats() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get index usage statistics
  async getIndexStats() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        ORDER BY tablename;
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Analyze database performance
  async analyzePerformance() {
    console.log("🔍 Database Performance Analysis");

    const slowQueries = await this.getSlowQueries(500);
    console.log("📊 Slow Queries:", slowQueries.length);

    const activeConnections = await this.getActiveConnections();
    console.log("🔗 Active Connections:", activeConnections.length);

    const idleConnections = await this.getIdleConnections();
    console.log("😴 Idle Connections:", idleConnections.length);

    const tableStats = await this.getTableStats();
    console.log("📈 Tables with most activity:", tableStats.slice(0, 5));

    const unusedIndexes = await this.getIndexStats();
    console.log("⚠️ Unused Indexes:", unusedIndexes.length);

    return {
      slowQueries,
      activeConnections: activeConnections.length,
      idleConnections: idleConnections.length,
      tableStats,
      unusedIndexes
    };
  }
}