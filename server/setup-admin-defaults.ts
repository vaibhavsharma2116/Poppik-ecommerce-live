import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/poppik_local",
  ssl: false,
});

const DEFAULT_SETTINGS = [
  { key: "site_name", value: "Poppik Lifestyle", type: "string", category: "general", description: "Website name" },
  { key: "site_email", value: "info@poppik.in", type: "string", category: "general", description: "Contact email" },
  { key: "site_phone", value: "+91 9999999999", type: "string", category: "general", description: "Contact phone" },
  { key: "maintenance_mode", value: "false", type: "boolean", category: "system", description: "Enable maintenance mode" },
  { key: "allow_registration", value: "true", type: "boolean", category: "security", description: "Allow new user registrations" },
  { key: "max_login_attempts", value: "5", type: "number", category: "security", description: "Maximum login attempts before lockout" },
  { key: "session_timeout", value: "1440", type: "number", category: "security", description: "Session timeout in minutes" },
  { key: "order_notification_email", value: "info@poppik.in", type: "string", category: "orders", description: "Email for order notifications" },
  { key: "cod_enabled", value: "true", type: "boolean", category: "payments", description: "Enable Cash on Delivery" },
  { key: "online_payment_enabled", value: "true", type: "boolean", category: "payments", description: "Enable online payments" },
  { key: "min_order_amount", value: "0", type: "number", category: "orders", description: "Minimum order amount" },
  { key: "free_shipping_threshold", value: "499", type: "number", category: "shipping", description: "Free shipping minimum amount" },
  { key: "gst_percentage", value: "18", type: "number", category: "tax", description: "GST percentage" },
];

const DEFAULT_FEATURES = [
  { key: "user_registration", name: "User Registration", description: "Allow new users to register", enabled: true },
  { key: "product_reviews", name: "Product Reviews", description: "Allow users to review products", enabled: true },
  { key: "wishlist", name: "Wishlist Feature", description: "Enable wishlist functionality", enabled: true },
  { key: "affiliate_program", name: "Affiliate Program", description: "Enable affiliate program", enabled: true },
  { key: "blog", name: "Blog Section", description: "Enable blog section", enabled: true },
  { key: "newsletter", name: "Newsletter Subscription", description: "Enable newsletter subscriptions", enabled: true },
  { key: "live_chat", name: "Live Chat", description: "Enable live chat support", enabled: false },
  { key: "product_comparison", name: "Product Comparison", description: "Allow product comparison", enabled: false },
  { key: "order_tracking", name: "Order Tracking", description: "Enable order tracking for customers", enabled: true },
  { key: "email_notifications", name: "Email Notifications", description: "Send email notifications", enabled: true },
];

const DEFAULT_PERMISSIONS = [
  { role: "master_admin", module: "users", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "master_admin", module: "products", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "master_admin", module: "orders", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "master_admin", module: "settings", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "master_admin", module: "reports", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "admin", module: "users", canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true },
  { role: "admin", module: "products", canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true },
  { role: "admin", module: "orders", canCreate: false, canRead: true, canUpdate: true, canDelete: false, canExport: true },
  { role: "admin", module: "settings", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: false },
  { role: "admin", module: "reports", canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: true },
];

async function setupDefaults() {
  const client = await pool.connect();
  
  try {
    console.log("🔄 Setting up default system settings...");
    
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await client.query(
        "SELECT id FROM system_settings WHERE setting_key = $1",
        [setting.key]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_editable, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
          [setting.key, setting.value, setting.type, setting.category, setting.description]
        );
        console.log(`  ✅ Added setting: ${setting.key}`);
      } else {
        console.log(`  ⏭️  Setting exists: ${setting.key}`);
      }
    }

    console.log("\n🔄 Setting up default feature toggles...");
    
    for (const feature of DEFAULT_FEATURES) {
      const existing = await client.query(
        "SELECT id FROM feature_toggles WHERE feature_key = $1",
        [feature.key]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO feature_toggles (feature_key, feature_name, description, is_enabled, enabled_for_roles, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [feature.key, feature.name, feature.description, feature.enabled, JSON.stringify([])]
        );
        console.log(`  ✅ Added feature: ${feature.name}`);
      } else {
        console.log(`  ⏭️  Feature exists: ${feature.name}`);
      }
    }

    console.log("\n🔄 Setting up default permissions...");
    
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await client.query(
        "SELECT id FROM admin_permissions WHERE role = $1 AND module = $2",
        [perm.role, perm.module]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO admin_permissions (role, module, can_create, can_read, can_update, can_delete, can_export, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [perm.role, perm.module, perm.canCreate, perm.canRead, perm.canUpdate, perm.canDelete, perm.canExport]
        );
        console.log(`  ✅ Added permission: ${perm.role} -> ${perm.module}`);
      } else {
        console.log(`  ⏭️  Permission exists: ${perm.role} -> ${perm.module}`);
      }
    }

    console.log("\n✅ All defaults setup complete!");

  } catch (error: any) {
    console.error("❌ Error setting up defaults:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDefaults()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
