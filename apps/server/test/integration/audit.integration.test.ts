import { describe, expect, it } from "bun:test";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import { auditLog, categories, stores } from "../../src/db/schema";
import { AuthService } from "../../src/modules/auth/auth.service";
import { ProductsService } from "../../src/modules/products/products.service";
import { StoreService } from "../../src/modules/store/store.service";
import { UsersService } from "../../src/modules/users/users.service";
import { useTestDatabase } from "../support/database";
import { createStore, signedIn } from "../support/factories/accounts";
import { createCategory, productBody } from "../support/factories/catalog";

useTestDatabase();

/**
 * Tables that are not business data: sessions are throwaway, the log doesn't log itself, and `reset_probe` is a scratch
 * table of the database tests.
 */
const NOT_AUDITED = ["audit_log", "sessions", "reset_probe"];

function logOf(recordId: string) {
	return db
		.select()
		.from(auditLog)
		.where(eq(auditLog.recordId, recordId))
		.orderBy(asc(auditLog.createdAt), asc(auditLog.id));
}

describe("audit log", () => {
	it("covers every business table", async () => {
		const rows = await db.execute<{ table: string; audited: boolean }>(sql`
			SELECT t.tablename AS table,
				EXISTS (
					SELECT 1 FROM pg_trigger g
					WHERE g.tgrelid = format('public.%I', t.tablename)::regclass
						AND g.tgname = 'audit' AND g.tgenabled = 'O'
				) AS audited
			FROM pg_tables t WHERE t.schemaname = 'public'
		`);

		const missing = rows
			.filter((row) => !row.audited && !NOT_AUDITED.includes(row.table))
			.map((row) => row.table);

		expect(missing).toEqual([]);
	});

	it("records who created and changed a product, what it was and what it became", async () => {
		const { session } = await signedIn();

		const product = await ProductsService.create(
			session,
			productBody({ name: "Antigo", basePrice: "10" }),
		);
		await ProductsService.update(
			session,
			product.id,
			productBody({ name: "Novo", basePrice: "10" }),
		);

		const [created, updated] = await logOf(product.id);
		expect(created).toMatchObject({
			action: "insert",
			tableName: "products",
			storeId: session.store.id,
			userId: session.user.id,
			oldValues: null,
			newValues: expect.objectContaining({ name: "Antigo" }),
		});
		expect(updated).toMatchObject({
			action: "update",
			userId: session.user.id,
			oldValues: expect.objectContaining({ name: "Antigo" }),
			newValues: expect.objectContaining({ name: "Novo" }),
			changedFields: ["name", "search_text"],
		});
	});

	it("skips an update that changes nothing", async () => {
		const { session } = await signedIn();
		const product = await ProductsService.create(session, productBody());

		await ProductsService.setArchived(session, product.id, false);

		expect(await logOf(product.id)).toHaveLength(1);
	});

	it("never copies a password hash", async () => {
		const { session } = await signedIn();
		const user = await UsersService.create(session, {
			name: "Bia",
			email: "bia@loja.com",
			password: "senha-da-bia",
		});

		const [created] = await logOf(user.id);

		expect(created?.newValues).not.toHaveProperty("password_hash");
		expect(created?.newValues).toMatchObject({ email: "bia@loja.com" });
	});

	it("says a password changed, by name only", async () => {
		const { session } = await signedIn({ password: "senha-antiga-1" });

		await AuthService.changePassword(session, {
			currentPassword: "senha-antiga-1",
			newPassword: "senha-nova-123",
		});

		const rows = await logOf(session.user.id);
		const changed = rows.at(-1);
		expect(changed).toMatchObject({
			action: "update",
			userId: session.user.id,
			changedFields: ["password_hash"],
		});
		expect(changed?.oldValues).not.toHaveProperty("password_hash");
		expect(changed?.newValues).not.toHaveProperty("password_hash");
	});

	it("records a delete with the row as it was", async () => {
		const store = await createStore();
		const category = await createCategory(store.id, { name: "Perfumes" });

		await audited("system", (tx) =>
			tx.delete(categories).where(eq(categories.id, category.id)),
		);

		const deleted = (await logOf(category.id)).at(-1);
		expect(deleted).toMatchObject({
			action: "delete",
			storeId: store.id,
			newValues: null,
			oldValues: expect.objectContaining({ name: "Perfumes" }),
		});
	});

	it("records a change of the store data under the store and its author", async () => {
		const { session } = await signedIn();

		await StoreService.updateProfile(session, {
			name: "Mundo Madam",
			document: null,
			phone: null,
			address: null,
		});

		const updated = (await logOf(session.store.id)).at(-1);
		expect(updated).toMatchObject({
			action: "update",
			storeId: session.store.id,
			userId: session.user.id,
			changedFields: ["name"],
		});
	});

	it("records system writes without a user, and a store under itself", async () => {
		const store = await createStore();

		const [created] = await logOf(store.id);

		expect(created).toMatchObject({ userId: null, storeId: store.id });
	});

	it("logs nothing for a write that failed", async () => {
		const { session } = await signedIn();

		await expect(
			ProductsService.create(
				session,
				productBody({ categoryId: crypto.randomUUID() }),
			),
		).rejects.toMatchObject({ code: 422 });

		const rows = await db
			.select()
			.from(auditLog)
			.where(eq(auditLog.tableName, "products"));
		expect(rows).toEqual([]);
	});

	it("refuses a write without an actor, and leaves nothing behind", async () => {
		// The query builder only runs when awaited: wrap it in a real promise for `rejects`.
		const write = async () => db.insert(stores).values({ name: "Sem autor" });
		await expect(write()).rejects.toThrow();

		expect(await db.select().from(stores)).toEqual([]);
	});

	it("can't be changed or deleted", async () => {
		const store = await createStore();

		await expect(
			audited("system", (tx) =>
				tx.delete(auditLog).where(eq(auditLog.recordId, store.id)),
			),
		).rejects.toThrow();
		expect(await logOf(store.id)).toHaveLength(1);
	});
});
