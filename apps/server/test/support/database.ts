import { beforeEach } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import { env } from "../../src/env";

/** Throws unless the URL points to a `*_test` database, so a reset can never wipe dev or production data. */
export function assertTestDatabase(databaseUrl: string): void {
	const name = new URL(databaseUrl).pathname.slice(1);
	if (!name.endsWith("_test")) {
		throw new Error(
			`Refusing to reset "${name}": tests only run against a *_test database (see .env.test).`,
		);
	}
}

/**
 * Empties every table in the `public` schema and restarts their sequences. Drizzle keeps its migrations journal in
 * the `drizzle` schema, so the applied migrations survive.
 */
export async function resetDatabase(): Promise<void> {
	assertTestDatabase(env.DATABASE_URL);
	await db.execute(sql`
		DO $$
		DECLARE tables text;
		BEGIN
			SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO tables
			FROM pg_tables WHERE schemaname = 'public';
			IF tables IS NOT NULL THEN
				EXECUTE 'TRUNCATE ' || tables || ' RESTART IDENTITY CASCADE';
			END IF;
		END $$;
	`);
}

/** Call at the top of an integration or e2e file: every test starts from an empty database. */
export function useTestDatabase(): void {
	beforeEach(resetDatabase);
}
