import { Pool } from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/poppik_local",
  ssl: false,
});

interface MasterAdmin {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "master_admin";
}

const MASTER_ADMIN: MasterAdmin = {
  firstName: "Master",
  lastName: "Admin",
  email: "masteradmin@poppiklifestyle.com",
  phone: "9999999999",
  password: "MasterAdmin@2024",
  // Use 'admin' for broader compatibility across the app
  role: "admin",
};

async function createMasterAdmin() {
  const client = await pool.connect();

  try {
    console.log("🔄 Checking for existing master admin...");

    const existingAdmin = await client.query(
      "SELECT id, email, role FROM users WHERE email = $1",
      [MASTER_ADMIN.email]
    );

    // Prepare hashed password early so we can update existing user if needed
    const hashedPassword = await bcrypt.hash(MASTER_ADMIN.password, 10);

    if (existingAdmin.rows.length > 0) {
      const admin = existingAdmin.rows[0];
      if (admin.role === "admin" || admin.role === "master_admin") {
        console.log("✅ Admin already exists:", admin.email, "role:", admin.role);
        console.log("🔄 Ensuring stored password and role are up-to-date...");

        // Update password and normalize role to 'admin'
        await client.query(
          "UPDATE users SET password = $1, role = 'admin', updated_at = NOW() WHERE email = $2",
          [hashedPassword, MASTER_ADMIN.email]
        );

        console.log("✅ Password reset and role ensured to 'admin'");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:", MASTER_ADMIN.email);
        console.log("🔑 Password:", MASTER_ADMIN.password);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return;
      } else {
        console.log("🔄 Upgrading existing user to admin role and setting password...");
        await client.query(
          "UPDATE users SET password = $1, role = 'admin', updated_at = NOW() WHERE email = $2",
          [hashedPassword, MASTER_ADMIN.email]
        );
        console.log("✅ User upgraded to admin role and password set");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:", MASTER_ADMIN.email);
        console.log("🔑 Password:", MASTER_ADMIN.password);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return;
      }
    }

    console.log("🔄 Creating new master admin...");

    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, role`,
      [
        MASTER_ADMIN.firstName,
        MASTER_ADMIN.lastName,
        MASTER_ADMIN.email,
        MASTER_ADMIN.phone,
        hashedPassword,
        MASTER_ADMIN.role,
      ]
    );

    console.log("✅ Master Admin created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", MASTER_ADMIN.email);
    console.log("🔑 Password:", MASTER_ADMIN.password);
    console.log("👤 Role:", MASTER_ADMIN.role);
    console.log("🆔 ID:", result.rows[0].id);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  Please change the password after first login!");

  } catch (error: any) {
    console.error("❌ Error creating master admin:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMasterAdmin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));