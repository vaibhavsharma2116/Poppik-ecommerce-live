
import { Pool } from "pg";

export class DatabaseMonitor {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Check slow queries
  async getSlowQueries(minDuration: number = 1000) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          min_time,
          max_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_time > $1
        ORDER BY total_time DESC
        LIMIT 20;
      `, [minDuration]);
      
      return result.rows;
    } catch (error) {
      console.log("pg_stat_statements extension not available");
      return [];
    } finally {
      client.release();
    }
  }

  // Check active connections
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
          query,
          EXTRACT(EPOCH FROM (now() - query_start)) as query_duration_seconds
        FROM pg_stat_activity 
        WHERE state != 'idle'
        ORDER BY query_start DESC;
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Check for missing indexes
  async suggestIndexes() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
          AND n_distinct > 100
          AND correlation < 0.1
        ORDER BY n_distinct DESC;
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
          pg_terminate_backend(pid),
          pid,
          query,
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
}
