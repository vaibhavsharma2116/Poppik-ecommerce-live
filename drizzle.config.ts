import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",   // तुम्हारा schema file
  out: "./migrations",            // migrations store होने का path
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL 
      || "postgresql://postgres:postgres@31.97.226.116:5432/my_pgdb",
  },
});
