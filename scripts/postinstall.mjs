import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * ATH Postinstall Hook
 * 
 * Agent Token Hub utilizes Convex as its primary reactive cloud backend.
 * Prisma is maintained for PostgreSQL/Supabase compatibility and migrations.
 * 
 * This script ensures Prisma Client is generated when needed (Supabase mode or fresh clone),
 * but avoids redundant execution when running purely on Convex.
 */

const storageMode = process.env.APP_STORAGE || "convex";
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const isSupabaseMode = storageMode === "supabase" || hasDatabaseUrl;

// Check if Prisma Client types already exist in node_modules
const prismaClientPath = path.resolve(process.cwd(), "node_modules", ".prisma", "client", "index.d.ts");
const prismaTypesExist = fs.existsSync(prismaClientPath);

if (isSupabaseMode || !prismaTypesExist) {
  try {
    console.log(
      `[ATH Postinstall] Generating Prisma Client (${isSupabaseMode ? "Supabase mode active" : "Initial TypeScript definitions setup"})...`
    );
    execSync("npx prisma generate", { stdio: "inherit" });
  } catch (err) {
    console.warn("[ATH Postinstall] Prisma Client generation skipped/failed:", err.message);
  }
} else {
  console.log(
    `[ATH Postinstall] Convex cloud backend active (APP_STORAGE=${storageMode}). Skipping Prisma generation.`
  );
}
