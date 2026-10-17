import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema",
	dialect: "postgresql",
	dbCredentials: {
		// biome-ignore lint/style/noNonNullAssertion: drizzle-kit runs outside the app; Bun loads .env
		url: process.env.DATABASE_URL!,
	},
});
