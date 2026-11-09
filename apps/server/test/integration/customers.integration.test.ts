import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { auditLog, customers } from "../../src/db/schema";
import { PAGE_SIZE } from "../../src/lib/pagination";
import { CustomersService } from "../../src/modules/customers/customers.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createCustomer, customerBody } from "../support/factories/customers";
import { storeDayFrom } from "../support/factories/purchases";
import {
	cancelSale,
	createSale,
	saleItem,
	stockedProduct,
} from "../support/factories/sales";

useTestDatabase();

async function archivedAtOf(id: string) {
	const [row] = await db
		.select({ archivedAt: customers.archivedAt })
		.from(customers)
		.where(eq(customers.id, id));
	return row?.archivedAt;
}

const ids = (page: { items: { id: string }[] }) =>
	page.items.map((customer) => customer.id);

const NO_PURCHASES = { purchasesCount: 0, totalSpent: 0, lastPurchaseAt: null };

describe("CustomersService", () => {
	it("lists only the store's active customers by name, or only the archived ones", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const bia = await createCustomer(storeId, { name: "Bia" });
		const ana = await createCustomer(storeId, { name: "Ana" });
		const old = await createCustomer(storeId, {
			name: "Carla",
			archived: true,
		});
		const other = await signedIn();
		await createCustomer(other.session.store.id, { name: "Da outra loja" });

		const active = await CustomersService.list(storeId, {});
		const archived = await CustomersService.list(storeId, { archived: true });

		expect(ids(active)).toEqual([ana.id, bia.id]);
		expect(active.total).toBe(2);
		expect(ids(archived)).toEqual([old.id]);
	});

	it("pages the list, with the total of every page", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		for (let i = 0; i <= PAGE_SIZE; i += 1) {
			await createCustomer(storeId, {
				name: `Cliente ${String(i).padStart(2, "0")}`,
			});
		}

		const first = await CustomersService.list(storeId, {});
		const last = await CustomersService.list(storeId, {
			cursor: first.nextCursor ?? 0,
		});

		expect(first.items).toHaveLength(PAGE_SIZE);
		expect(first.nextCursor).toBe(PAGE_SIZE);
		expect(first.total).toBe(PAGE_SIZE + 1);
		expect(last.items.map((customer) => customer.name)).toEqual([
			`Cliente ${PAGE_SIZE}`,
		]);
		expect(last.nextCursor).toBeNull();
	});

	it("searches by every word of the name, without accents, or by the phone digits", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const ana = await createCustomer(storeId, {
			name: "Ána Souza",
			phone: "(11) 99999-8888",
		});
		await createCustomer(storeId, { name: "Ana Lima" });

		const byName = await CustomersService.list(storeId, {
			search: "souza ana",
		});
		const byPhone = await CustomersService.list(storeId, { search: "99998" });
		const byMaskedPhone = await CustomersService.list(storeId, {
			search: "(11) 99999-8888",
		});

		expect(ids(byName)).toEqual([ana.id]);
		expect(ids(byPhone)).toEqual([ana.id]);
		expect(ids(byMaskedPhone)).toEqual([ana.id]);
		// LIKE wildcards are searched as text, not as "anything".
		expect((await CustomersService.list(storeId, { search: "%" })).total).toBe(
			0,
		);
	});

	it("creates with the phone as digits, no purchases yet, and logs it in the audit log", async () => {
		const { session } = await signedIn();

		const created = await CustomersService.create(
			session,
			customerBody({ name: " Ana ", phone: "(11) 3333-4444", note: "VIP" }),
		);

		expect(created).toEqual({
			id: expect.any(String),
			name: "Ana",
			phone: "1133334444",
			note: "VIP",
			archived: false,
			...NO_PURCHASES,
		});
		expect(await CustomersService.get(session.store.id, created.id)).toEqual(
			created,
		);
		const logged = await db
			.select({
				tableName: auditLog.tableName,
				action: auditLog.action,
				userId: auditLog.userId,
			})
			.from(auditLog)
			.where(eq(auditLog.recordId, created.id));
		expect(logged).toEqual([
			{ tableName: "customers", action: "insert", userId: session.user.id },
		]);
	});

	it("creates with only the name, as from a sale", async () => {
		const { session } = await signedIn();

		const created = await CustomersService.create(session, {
			name: "Bia",
			phone: null,
			note: null,
		});

		expect(created).toMatchObject({ name: "Bia", phone: null, note: null });
	});

	it("allows two customers with the same name", async () => {
		const { session } = await signedIn();
		await createCustomer(session.store.id, { name: "Ana" });

		await CustomersService.create(session, customerBody({ name: "ana" }));

		expect((await CustomersService.list(session.store.id, {})).total).toBe(2);
	});

	it("edits an active customer", async () => {
		const { session } = await signedIn();
		const customer = await createCustomer(session.store.id, {
			name: "Ana",
			phone: "11999998888",
		});

		const edited = await CustomersService.update(
			session,
			customer.id,
			customerBody({ name: "Ana Souza", phone: null, note: "Gosta de floral" }),
		);

		expect(edited).toMatchObject({
			name: "Ana Souza",
			phone: null,
			note: "Gosta de floral",
		});
	});

	it("refuses to edit an archived customer", async () => {
		const { session } = await signedIn();
		const customer = await createCustomer(session.store.id, {
			name: "Ana",
			archived: true,
		});

		await expect(
			CustomersService.update(session, customer.id, customerBody()),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "customer_archived" },
		});
		expect(
			(await CustomersService.get(session.store.id, customer.id)).name,
		).toBe("Ana");
	});

	it("archives and reactivates; archiving twice keeps the first date", async () => {
		const { session } = await signedIn();
		const customer = await createCustomer(session.store.id);

		const archived = await CustomersService.setArchived(
			session,
			customer.id,
			true,
		);
		const firstArchivedAt = await archivedAtOf(customer.id);
		const again = await CustomersService.setArchived(
			session,
			customer.id,
			true,
		);
		const secondArchivedAt = await archivedAtOf(customer.id);
		const back = await CustomersService.setArchived(
			session,
			customer.id,
			false,
		);

		expect([archived.archived, again.archived, back.archived]).toEqual([
			true,
			true,
			false,
		]);
		expect(firstArchivedAt).toEqual(secondArchivedAt);
	});

	it("doesn't see or touch another store's customer", async () => {
		const other = await signedIn();
		const foreign = await createCustomer(other.session.store.id);
		const { session } = await signedIn();

		for (const call of [
			() => CustomersService.get(session.store.id, foreign.id),
			() => CustomersService.update(session, foreign.id, customerBody()),
			() => CustomersService.setArchived(session, foreign.id, true),
		]) {
			await expect(call()).rejects.toMatchObject({
				code: 404,
				response: { code: "customer_not_found" },
			});
		}
	});

	it("sums what they bought in active sales, with the day of the last one", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const product = await stockedProduct(session);
		const customer = await createCustomer(storeId);
		expect(await CustomersService.get(storeId, customer.id)).toMatchObject(
			NO_PURCHASES,
		);
		const sell = (date: string) =>
			createSale(session, [saleItem(product.id)], {
				customerId: customer.id,
				date,
			});
		await sell(storeDayFrom(-10));
		await sell(storeDayFrom(-3));
		// The latest is canceled: it counts neither in the total nor as the last purchase.
		await cancelSale(session, (await sell(storeDayFrom(0))).id);

		expect(await CustomersService.get(storeId, customer.id)).toMatchObject({
			purchasesCount: 2,
			totalSpent: 20_000,
			lastPurchaseAt: storeDayFrom(-3),
		});
	});
});
