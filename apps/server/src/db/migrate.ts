import { join } from "node:path";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from ".";

// Resolved from this file so it works regardless of the cwd (Railway's pre-deploy doesn't guarantee one).
await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });

console.log("Migrations applied");
process.exit(0);
