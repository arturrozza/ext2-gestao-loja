import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	// The index re-exports every table; pointing at the folder would read each table twice.
	schema: "./src/db/schema/index.ts",
	dialect: "postgresql",
	dbCredentials: {
		// biome-ignore lint/style/noNonNullAssertion: drizzle-kit runs outside the app; Bun loads .env
		url: process.env.DATABASE_URL!,
	},
});
