import { describe, expect, it } from "bun:test";
import { StoreService } from "../../src/modules/store/store.service";
import { useTestDatabase } from "../support/database";
import { createStore, signedIn } from "../support/factories/accounts";

useTestDatabase();

/** Percentages in basis points: 6% and 16,5%. */
const settings = {
	defaultTaxPercent: 600,
	mercadoLivreFeePercent: 1650,
	expiryWarningDays: 15,
};

describe("StoreService", () => {
	it("starts a store with the default settings (alertas.md)", async () => {
		const store = await createStore();

		expect(await StoreService.settings(store.id)).toEqual({
			defaultTaxPercent: 0,
			mercadoLivreFeePercent: 0,
			expiryWarningDays: 30,
		});
		expect(await StoreService.profile(store.id)).toEqual({
			name: "Loja Teste",
			document: null,
			phone: null,
			address: null,
		});
	});

	it("saves data and settings only on the given store", async () => {
		const { session } = await signedIn();
		const store = session.store;
		const other = await createStore({ name: "Outra" });

		const profile = await StoreService.updateProfile(session, {
			name: "Mundo Madam",
			document: "12.345.678/0001-90",
			phone: "(11) 99999-8888",
			address: "Rua A, 1",
		});
		const saved = await StoreService.updateSettings(session, settings);

		expect(profile.name).toBe("Mundo Madam");
		expect(saved).toEqual(settings);
		expect(await StoreService.settings(store.id)).toEqual(settings);
		expect((await StoreService.profile(other.id)).name).toBe("Outra");
		expect((await StoreService.settings(other.id)).defaultTaxPercent).toBe(0);
	});

	it("has the database refuse a percentage out of 0–10000 even past the API, and keep what was saved", async () => {
		const { session } = await signedIn();
		await StoreService.updateSettings(session, settings);

		const constraints = {
			defaultTaxPercent: "stores_default_tax_percent_range",
			mercadoLivreFeePercent: "stores_mercado_livre_fee_percent_range",
		} as const;
		for (const [field, constraint] of Object.entries(constraints)) {
			for (const value of [-1, 10_001]) {
				await expect(
					StoreService.updateSettings(session, { ...settings, [field]: value }),
				).rejects.toMatchObject({
					// Postgres names the broken constraint in its message.
					cause: expect.objectContaining({
						message: expect.stringContaining(constraint),
					}),
				});
			}
		}
		expect(await StoreService.settings(session.store.id)).toEqual(settings);
	});

	it("fails loudly for a store that doesn't exist (a broken session, not user input)", async () => {
		await expect(StoreService.profile(crypto.randomUUID())).rejects.toThrow(
			"store of the session not found",
		);
	});
});
