import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://poppikuser:poppikuser@31.97.226.116:5432/poppikdb",
  ssl: false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Altering orders table columns to BIGINT...");
    
    // Change id columns to BIGINT
    await client.query('ALTER TABLE orders ALTER COLUMN id TYPE BIGINT');
    await client.query('ALTER TABLE orders ALTER COLUMN user_id TYPE BIGINT');
    await client.query('ALTER TABLE orders ALTER COLUMN ithink_order_id TYPE BIGINT USING ithink_order_id::bigint');
    await client.query('ALTER TABLE orders ALTER COLUMN ithink_shipment_id TYPE BIGINT USING ithink_shipment_id::bigint');

    // Also update referencing columns in other tables if necessary
    // For example, in order_items:
    await client.query('ALTER TABLE order_items ALTER COLUMN order_id TYPE BIGINT');
    
    console.log("✅ Columns altered successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
