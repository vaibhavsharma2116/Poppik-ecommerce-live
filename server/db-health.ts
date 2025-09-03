
import { Pool } from "pg";

export class DatabaseHealth {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Monitor database load
  async checkDatabaseLoad() {
    const client = await this.pool.connect();
    try {
      // Check current connections vs max
      const connectionStats = await client.query(`
        SELECT 
          count(*) as current_connections,
          setting as max_connections
        FROM pg_stat_activity, pg_settings 
        WHERE name = 'max_connections';
      `);

      // Check for blocking queries
      const blockingQueries = await client.query(`
        SELECT 
          blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement,
          blocking_activity.query AS current_statement_in_blocking_process
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity 
          ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks 
          ON blocking_locks.locktype = blocked_locks.locktype
          AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
          AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
          AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
          AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
          AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
          AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
          AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
          AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
          AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
          AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity 
          ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.GRANTED;
      `);

      return {
        connections: connectionStats.rows[0],
        blockingQueries: blockingQueries.rows
      };
    } finally {
      client.release();
    }
  }

  // Emergency cleanup - kill all non-essential queries
  async emergencyCleanup() {
    const client = await this.pool.connect();
    try {
      console.log("🚨 Emergency database cleanup initiated");
      
      // Kill all queries longer than 2 minutes
      const killedQueries = await client.query(`
        SELECT 
          pg_terminate_backend(pid) as terminated,
          pid,
          LEFT(query, 50) as query_preview,
          EXTRACT(EPOCH FROM (now() - query_start))/60 as duration_minutes
        FROM pg_stat_activity 
        WHERE state != 'idle'
          AND EXTRACT(EPOCH FROM (now() - query_start))/60 > 2
          AND pid != pg_backend_pid()
          AND usename != 'postgres';
      `);

      console.log(`🔄 Killed ${killedQueries.rowCount} long running queries`);
      return killedQueries.rows;
    } finally {
      client.release();
    }
  }

  // Check database configuration
  async checkConfig() {
    const client = await this.pool.connect();
    try {
      const config = await client.query(`
        SELECT name, setting, unit, short_desc 
        FROM pg_settings 
        WHERE name IN (
          'max_connections',
          'shared_buffers', 
          'effective_cache_size',
          'maintenance_work_mem',
          'checkpoint_completion_target',
          'wal_buffers',
          'default_statistics_target',
          'random_page_cost',
          'effective_io_concurrency',
          'work_mem'
        );
      `);
      
      return config.rows;
    } finally {
      client.release();
    }
  }
}
