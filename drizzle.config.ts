
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://127.0.0.1:5432/my_pgdb",
  },
});
