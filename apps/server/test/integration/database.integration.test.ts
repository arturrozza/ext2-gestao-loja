import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { getTableName, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "../../src/db";
import { sessions, users } from "../../src/db/schema";
import { assertTestDatabase, resetDatabase } from "../support/database";

describe("assertTestDatabase", () => {
	it("accepts a *_test database", () => {
		expect(() =>
			assertTestDatabase("postgres://u:p@localhost:5432/ext2_test"),
		).not.toThrow();
	});

	it("refuses any other database", () => {
		expect(() =>
			assertTestDatabase("postgres://u:p@localhost:5432/ext2"),
		).toThrow(/Refusing to reset "ext2"/);
	});
});

describe("resetDatabase", () => {
	beforeAll(async () => {
		await db.execute(
			sql`CREATE TABLE IF NOT EXISTS reset_probe (id serial PRIMARY KEY, label text NOT NULL)`,
		);
	});

	afterAll(async () => {
		await db.execute(sql`DROP TABLE IF EXISTS reset_probe`);
	});

	it("empties public tables and restarts their sequences", async () => {
		await db.execute(sql`INSERT INTO reset_probe (label) VALUES ('a'), ('b')`);

		await resetDatabase();

		const [count] = await db.execute<{ total: number }>(
			sql`SELECT count(*)::int AS total FROM reset_probe`,
		);
		expect(count?.total).toBe(0);

		const [row] = await db.execute<{ id: number }>(
			sql`INSERT INTO reset_probe (label) VALUES ('c') RETURNING id`,
		);
		expect(row?.id).toBe(1);
	});
});

describe("schema indexes", () => {
	it("indexes the columns every request filters by", () => {
		const indexed = (table: typeof users | typeof sessions) =>
			getTableConfig(table).indexes.flatMap((index) =>
				index.config.columns.map(
					(column) => (column as { name?: string }).name,
				),
			);

		expect(indexed(users)).toEqual(["store_id"]);
		expect(indexed(sessions)).toEqual(["user_id"]);
	});
});

describe("schema foreign keys", () => {
	it("tie users to their store and sessions to their user", () => {
		const targets = (table: typeof users | typeof sessions) =>
			getTableConfig(table).foreignKeys.map((key) =>
				getTableName(key.reference().foreignTable),
			);

		expect(targets(users)).toEqual(["stores"]);
		expect(targets(sessions)).toEqual(["users"]);
	});
});
