import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { getTableName, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "../../src/db";
import {
	auditLog,
	categories,
	products,
	sessions,
	users,
} from "../../src/db/schema";
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

type Table =
	| typeof users
	| typeof sessions
	| typeof categories
	| typeof products
	| typeof auditLog;

describe("schema indexes", () => {
	it("indexes the columns every request filters by", () => {
		const indexed = (table: Table) =>
			getTableConfig(table).indexes.flatMap((index) =>
				index.config.columns.map(
					(column) => (column as { name?: string }).name,
				),
			);

		expect(indexed(users)).toEqual(["store_id"]);
		expect(indexed(sessions)).toEqual(["user_id"]);
		expect(indexed(categories)).toEqual(["store_id", "normalized_name"]);
		expect(indexed(auditLog)).toEqual([
			"table_name",
			"record_id",
			"store_id",
			"created_at",
		]);
	});

	it("keeps product codes unique per store and indexes the list's order and filter", () => {
		const names = getTableConfig(products).indexes.map(
			(index) => index.config.name,
		);
		const unique = getTableConfig(products)
			.indexes.filter((index) => index.config.unique)
			.map((index) => index.config.name);

		expect(unique).toEqual([
			"products_store_barcode_key",
			"products_store_internal_code_key",
		]);
		expect(names).toHaveLength(4);
	});
});

describe("schema foreign keys", () => {
	it("tie users to their store and sessions to their user", () => {
		const targets = (table: Table) =>
			getTableConfig(table).foreignKeys.map((key) =>
				getTableName(key.reference().foreignTable),
			);

		expect(targets(users)).toEqual(["stores"]);
		expect(targets(sessions)).toEqual(["users"]);
		expect(targets(categories)).toEqual(["stores"]);
		expect(targets(products)).toEqual(["stores", "categories"]);
	});
});
