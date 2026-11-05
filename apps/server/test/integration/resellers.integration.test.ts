import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import { resellers } from "../../src/db/schema";
import { ResellersService } from "../../src/modules/resellers/resellers.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createReseller, resellerBody } from "../support/factories/resellers";

useTestDatabase();

async function archivedAtOf(id: string) {
	const [row] = await db
		.select({ archivedAt: resellers.archivedAt })
		.from(resellers)
		.where(eq(resellers.id, id));
	return row?.archivedAt;
}

const NO_SALES = { salesCount: 0, salesTotal: "0.00", commissionTotal: "0.00" };

describe("ResellersService", () => {
	it("lists only the store's active resellers by name, or only the archived ones", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const bia = await createReseller(storeId, { name: "Bia" });
		const ana = await createReseller(storeId, { name: "Ana" });
		const old = await createReseller(storeId, {
			name: "Carla",
			archived: true,
		});
		const other = await signedIn();
		await createReseller(other.session.store.id, { name: "Da outra loja" });

		const active = await ResellersService.list(storeId, {});
		const archived = await ResellersService.list(storeId, { archived: true });

		expect(active.map((reseller) => reseller.id)).toEqual([ana.id, bia.id]);
		expect(archived.map((reseller) => reseller.id)).toEqual([old.id]);
	});

	it("searches by every word of the name, without accents, or by the phone digits", async () => {
		const { session } = await signedIn();
		const storeId = session.store.id;
		const ana = await createReseller(storeId, {
			name: "Ána Souza",
			phone: "(11) 99999-8888",
		});
		await createReseller(storeId, { name: "Ana Lima" });

		const byName = await ResellersService.list(storeId, {
			search: "souza ana",
		});
		const byPhone = await ResellersService.list(storeId, { search: "99998" });
		const byMaskedPhone = await ResellersService.list(storeId, {
			search: "(11) 99999-8888",
		});

		expect(byName.map((reseller) => reseller.id)).toEqual([ana.id]);
		expect(byPhone.map((reseller) => reseller.id)).toEqual([ana.id]);
		expect(byMaskedPhone.map((reseller) => reseller.id)).toEqual([ana.id]);
		// LIKE wildcards are searched as text, not as "anything".
		expect(await ResellersService.list(storeId, { search: "%" })).toEqual([]);
	});

	it("creates with the phone as digits, the commission as sent and no sales yet", async () => {
		const { session } = await signedIn();

		const created = await ResellersService.create(
			session,
			resellerBody({
				name: " Ana ",
				phone: "(11) 3333-4444",
				defaultCommission: "7.5",
				note: "Jardins",
			}),
		);

		expect(created).toEqual({
			id: expect.any(String),
			name: "Ana",
			phone: "1133334444",
			defaultCommission: "7.5",
			note: "Jardins",
			archived: false,
			...NO_SALES,
		});
		expect(await ResellersService.get(session.store.id, created.id)).toEqual(
			created,
		);
	});

	it("allows two resellers with the same name", async () => {
		const { session } = await signedIn();
		await createReseller(session.store.id, { name: "Ana" });

		await ResellersService.create(session, resellerBody({ name: "ana" }));

		expect(await ResellersService.list(session.store.id, {})).toHaveLength(2);
	});

	it("accepts a 0% and a 100% commission", async () => {
		const { session } = await signedIn();

		const none = await ResellersService.create(
			session,
			resellerBody({ defaultCommission: "0" }),
		);
		const all = await ResellersService.create(
			session,
			resellerBody({ defaultCommission: "100.00" }),
		);

		expect([none.defaultCommission, all.defaultCommission]).toEqual([
			"0",
			"100",
		]);
	});

	it("keeps the commission between 0 and 100% in the database too", async () => {
		const { session } = await signedIn();

		await expect(
			audited("system", (tx) =>
				tx.insert(resellers).values({
					storeId: session.store.id,
					name: "Ana",
					defaultCommission: "100.01",
					searchText: "ana",
				}),
			),
		).rejects.toMatchObject({
			// Postgres names the broken constraint in its message.
			cause: expect.objectContaining({
				message: expect.stringContaining("resellers_default_commission_range"),
			}),
		});
	});

	it("edits an active reseller", async () => {
		const { session } = await signedIn();
		const reseller = await createReseller(session.store.id, {
			name: "Ana",
			phone: "11999998888",
		});

		const edited = await ResellersService.update(
			session,
			reseller.id,
			resellerBody({ name: "Ana Souza", phone: null, defaultCommission: "12" }),
		);

		expect(edited).toMatchObject({
			name: "Ana Souza",
			phone: null,
			defaultCommission: "12",
		});
	});

	it("refuses to edit an archived reseller", async () => {
		const { session } = await signedIn();
		const reseller = await createReseller(session.store.id, {
			name: "Ana",
			archived: true,
		});

		await expect(
			ResellersService.update(session, reseller.id, resellerBody()),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "reseller_archived" },
		});
		expect(
			(await ResellersService.get(session.store.id, reseller.id)).name,
		).toBe("Ana");
	});

	it("archives and reactivates; archiving twice keeps it archived", async () => {
		const { session } = await signedIn();
		const reseller = await createReseller(session.store.id);

		const archived = await ResellersService.setArchived(
			session,
			reseller.id,
			true,
		);
		const firstArchivedAt = await archivedAtOf(reseller.id);
		const again = await ResellersService.setArchived(
			session,
			reseller.id,
			true,
		);
		const secondArchivedAt = await archivedAtOf(reseller.id);
		const back = await ResellersService.setArchived(
			session,
			reseller.id,
			false,
		);

		expect([archived.archived, again.archived, back.archived]).toEqual([
			true,
			true,
			false,
		]);
		expect(firstArchivedAt).toEqual(secondArchivedAt);
	});

	it("doesn't see or touch another store's reseller", async () => {
		const other = await signedIn();
		const foreign = await createReseller(other.session.store.id);
		const { session } = await signedIn();

		for (const call of [
			() => ResellersService.get(session.store.id, foreign.id),
			() => ResellersService.update(session, foreign.id, resellerBody()),
			() => ResellersService.setArchived(session, foreign.id, true),
		]) {
			await expect(call()).rejects.toMatchObject({
				code: 404,
				response: { code: "reseller_not_found" },
			});
		}
	});
});
