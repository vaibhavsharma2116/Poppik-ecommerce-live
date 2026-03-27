import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://poppikuser:poppikuser@31.97.226.116:5432/poppikdb",
  ssl: false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Adding missing columns to orders table...");
    
    // Using the actual table name 'orders' as seen in the error message
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255)');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50)');
    
    console.log("✅ Columns added successfully to 'orders' table");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
