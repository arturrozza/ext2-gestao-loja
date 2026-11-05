import { join } from "node:path";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from ".";
import { seedAccountFromEnv, seedFirstAccount } from "./seed";

// Resolved from this file so it works regardless of the cwd (Railway's pre-deploy doesn't guarantee one).
await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
console.log("Migrations applied");

const account = seedAccountFromEnv();
if (account) {
	const result = await seedFirstAccount(account);
	console.log(
		result === "created"
			? "First account created"
			: "First account skipped: users already exist",
	);
}

process.exit(0);
