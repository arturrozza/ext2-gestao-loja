import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { env } from "../../src/env";
import { assertTestDatabase } from "../support/database";

/**
 * The migration that moved money to cents and percentages to basis points (20261105194540_money_in_cents) converts
 * data already in production. A template database is migrated once up to the migration before it; each test clones
 * it into a scratch database, writes rows the old way (decimals), applies the rest and reads what came out.
 */
const MIGRATION = "20261105194540_money_in_cents";
const migrationsFolder = join(import.meta.dir, "../../drizzle");

/** Migrating a database from scratch takes a few seconds, more with coverage on. */
const HOOK_TIMEOUT = 60_000;

assertTestDatabase(env.DATABASE_URL);
const baseName = new URL(env.DATABASE_URL).pathname
	.slice(1)
	.replace(/_test$/, "");
const templateName = `${baseName}_money_template_test`;
const scratchName = `${baseName}_money_migration_test`;

function urlOf(name: string): string {
	const url = new URL(env.DATABASE_URL);
	url.pathname = `/${name}`;
	return url.toString();
}

const scratchUrl = urlOf(scratchName);

let admin: SQL;
let scratch: SQL;
/** Every migration up to and including this one. */
let throughThis: string;

/**
 * A copy of the migrations folder with only the migrations `keep` takes. The tests pin both ends (up to the one before
 * this migration, and up to this one), so a later migration can never change what they check.
 */
async function migrationsWhere(
	keep: (name: string) => boolean,
): Promise<string> {
	const folder = await mkdtemp(join(tmpdir(), "ext2-migrations-"));
	for (const name of await readdir(migrationsFolder)) {
		if (name.startsWith(".") || !keep(name)) continue;
		await cp(join(migrationsFolder, name), join(folder, name), {
			recursive: true,
		});
	}
	return folder;
}

async function migrateTo(
	folder: string,
	databaseUrl = scratchUrl,
): Promise<void> {
	const db = drizzle(databaseUrl);
	try {
		await migrate(db, { migrationsFolder: folder });
	} finally {
		await db.$client.close();
	}
}

/** Runs `write` as the old app would have: in a transaction with an actor, so the audit trigger takes it. */
async function asSystem(write: (tx: SQL) => Promise<unknown>): Promise<void> {
	await scratch.begin(async (tx) => {
		await tx`select set_config('app.actor', 'system', true)`;
		await write(tx);
	});
}

async function insertStore(
	tax: string,
	fee: string,
	lowMargin?: string,
): Promise<string> {
	let id = "";
	await asSystem(async (tx) => {
		const [row] =
			lowMargin === undefined
				? await tx`insert into stores (name, default_tax_percent, mercado_livre_fee_percent)
					values ('Loja', ${tax}, ${fee}) returning id`
				: await tx`insert into stores (name, default_tax_percent, mercado_livre_fee_percent, low_margin_percent)
					values ('Loja', ${tax}, ${fee}, ${lowMargin}) returning id`;
		id = row.id;
	});
	return id;
}

async function insertProduct(storeId: string, price: string): Promise<void> {
	await asSystem(
		(tx) => tx`insert into products (store_id, name, base_price, search_text)
			values (${storeId}, ${price}, ${price}, ${price})`,
	);
}

async function insertReseller(
	storeId: string,
	commission: string,
): Promise<void> {
	await asSystem(
		(
			tx,
		) => tx`insert into resellers (store_id, name, default_commission, search_text)
			values (${storeId}, ${commission}, ${commission}, ${commission})`,
	);
}

/** `name` (the old decimal, as text) → the converted value. */
async function convertedPrices(): Promise<Record<string, unknown>> {
	const rows = await scratch`select name, base_price from products`;
	return Object.fromEntries(
		rows.map((row: { name: string; base_price: unknown }) => [
			row.name,
			row.base_price,
		]),
	);
}

async function columnType(table: string, column: string): Promise<string> {
	const [row] = await scratch`select data_type from information_schema.columns
		where table_schema = 'public' and table_name = ${table} and column_name = ${column}`;
	return row.data_type;
}

async function auditCount(): Promise<number> {
	const [row] = await scratch`select count(*)::int as total from audit_log`;
	return row.total;
}

/** Postgres error code of what `run` threw. */
async function failure(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
	} catch (error) {
		// Drizzle wraps the driver's error; Bun's Postgres error keeps the SQLSTATE in `errno`.
		const cause = (error as { cause?: unknown }).cause ?? error;
		return String((cause as { errno?: string }).errno ?? error);
	}
	throw new Error("expected a failure");
}

async function dropDatabase(name: string): Promise<void> {
	await admin.unsafe(`drop database if exists "${name}" with (force)`);
}

beforeAll(async () => {
	admin = new SQL(env.DATABASE_URL);
	await dropDatabase(scratchName);
	await dropDatabase(templateName);
	await admin.unsafe(`create database "${templateName}"`);
	throughThis = await migrationsWhere((name) => name <= MIGRATION);
	if (!(await readdir(throughThis)).includes(MIGRATION)) {
		throw new Error(`${MIGRATION} not found in ${migrationsFolder}`);
	}
	const beforeFolder = await migrationsWhere((name) => name < MIGRATION);
	try {
		await migrateTo(beforeFolder, urlOf(templateName));
	} finally {
		await rm(beforeFolder, { recursive: true, force: true });
	}
}, HOOK_TIMEOUT);

afterAll(async () => {
	await dropDatabase(scratchName);
	await dropDatabase(templateName);
	await admin.close();
	await rm(throughThis, { recursive: true, force: true });
}, HOOK_TIMEOUT);

beforeEach(async () => {
	await dropDatabase(scratchName);
	await admin.unsafe(
		`create database "${scratchName}" template "${templateName}"`,
	);
	scratch = new SQL(scratchUrl);
}, HOOK_TIMEOUT);

afterEach(async () => {
	await scratch.close();
	await dropDatabase(scratchName);
}, HOOK_TIMEOUT);

describe("money in cents migration", () => {
	it("starts from decimal columns", async () => {
		expect(await columnType("products", "base_price")).toBe("numeric");
		expect(await columnType("stores", "low_margin_percent")).toBe("numeric");
	});

	it("turns every base price into the same amount in cents, with no rounding", async () => {
		const storeId = await insertStore("0", "0");
		for (const price of [
			"0.01",
			"0.10",
			"0.99",
			"1.00",
			"1.15",
			"4.35",
			"92.50",
			"92.55",
			"1234567.89",
			"21474836.47",
		]) {
			await insertProduct(storeId, price);
		}

		await migrateTo(throughThis);

		expect(await columnType("products", "base_price")).toBe("integer");
		expect(await convertedPrices()).toEqual({
			"0.01": 1,
			"0.10": 10,
			"0.99": 99,
			"1.00": 100,
			"1.15": 115,
			"4.35": 435,
			"92.50": 9250,
			"92.55": 9255,
			"1234567.89": 123456789,
			"21474836.47": 2147483647,
		});
	});

	it("turns store and reseller percentages into basis points", async () => {
		const storeId = await insertStore("6.00", "16.50", "12.25");
		const extremes = await insertStore("0.01", "100.00", "0.00");
		const defaults = await insertStore("0", "0");
		for (const commission of ["0.00", "7.50", "12.34", "100.00"]) {
			await insertReseller(storeId, commission);
		}

		await migrateTo(throughThis);

		const stores =
			await scratch`select id, default_tax_percent, mercado_livre_fee_percent, low_margin_percent
			from stores`;
		const byId = Object.fromEntries(
			stores.map((row: Record<string, unknown>) => [row.id, row]),
		);
		expect(byId[storeId]).toMatchObject({
			default_tax_percent: 600,
			mercado_livre_fee_percent: 1650,
			low_margin_percent: 1225,
		});
		expect(byId[extremes]).toMatchObject({
			default_tax_percent: 1,
			mercado_livre_fee_percent: 10_000,
			low_margin_percent: 0,
		});
		// The old default of 10% becomes 1000 basis points.
		expect(byId[defaults]).toMatchObject({
			default_tax_percent: 0,
			mercado_livre_fee_percent: 0,
			low_margin_percent: 1000,
		});

		const resellers =
			await scratch`select name, default_commission from resellers`;
		expect(
			Object.fromEntries(
				resellers.map((row: { name: string; default_commission: number }) => [
					row.name,
					row.default_commission,
				]),
			),
		).toEqual({ "0.00": 0, "7.50": 750, "12.34": 1234, "100.00": 10_000 });
		expect(await columnType("resellers", "default_commission")).toBe("integer");
	});

	it("leaves the audit log as it was: the conversion isn't a business change", async () => {
		const storeId = await insertStore("6", "16");
		await insertProduct(storeId, "92.50");
		await insertReseller(storeId, "10");
		const before = await auditCount();

		await migrateTo(throughThis);

		expect(await auditCount()).toBe(before);
	});

	it("puts the defaults and the range checks back in the new scale", async () => {
		await migrateTo(throughThis);
		const storeId = await insertStore("0", "0");
		const [store] =
			await scratch`select default_tax_percent, mercado_livre_fee_percent, low_margin_percent from stores`;
		expect(store).toEqual({
			default_tax_percent: 0,
			mercado_livre_fee_percent: 0,
			low_margin_percent: 1000,
		});

		// 23514: check_violation.
		expect(await failure(() => insertProduct(storeId, "0"))).toBe("23514");
		expect(await failure(() => insertProduct(storeId, "-1"))).toBe("23514");
		expect(await failure(() => insertReseller(storeId, "10001"))).toBe("23514");
		expect(await failure(() => insertReseller(storeId, "-1"))).toBe("23514");
		expect(await failure(() => insertStore("10001", "0"))).toBe("23514");
		expect(await failure(() => insertStore("0", "10001"))).toBe("23514");
		expect(await failure(() => insertStore("0", "0", "10001"))).toBe("23514");
		await insertReseller(storeId, "10000");
		await insertProduct(storeId, "1");
	});

	it("rolls everything back when a price doesn't fit in an integer", async () => {
		const storeId = await insertStore("6.00", "0");
		await insertProduct(storeId, "92.50");
		await insertProduct(storeId, "21474836.48");

		expect(await failure(() => migrateTo(throughThis))).toBe("22003");

		// Nothing changed: still decimals, same values, and the migration isn't recorded as applied.
		expect(await columnType("products", "base_price")).toBe("numeric");
		expect(await columnType("stores", "default_tax_percent")).toBe("numeric");
		expect(Object.keys(await convertedPrices()).sort()).toEqual([
			"21474836.48",
			"92.50",
		]);
		const prices =
			await scratch`select base_price::text as price from products`;
		expect(prices.map((row: { price: string }) => row.price).sort()).toEqual([
			"21474836.48",
			"92.50",
		]);
		const applied =
			await scratch`select name from drizzle.__drizzle_migrations where name = ${MIGRATION}`;
		expect(applied).toHaveLength(0);
	});
});
