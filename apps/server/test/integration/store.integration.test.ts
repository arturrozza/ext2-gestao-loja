import { describe, expect, it } from "bun:test";
import { StoreService } from "../../src/modules/store/store.service";
import { useTestDatabase } from "../support/database";
import { createStore, signedIn } from "../support/factories/accounts";

useTestDatabase();

const settings = {
	defaultTaxPercent: "6",
	mercadoLivreFeePercent: "16.5",
	expiryWarningDays: 15,
	staleProductDays: 90,
	lowMarginPercent: "12.25",
};

describe("StoreService", () => {
	it("starts a store with the default settings (alertas.md)", async () => {
		const store = await createStore();

		expect(await StoreService.settings(store.id)).toEqual({
			defaultTaxPercent: "0",
			mercadoLivreFeePercent: "0",
			expiryWarningDays: 30,
			staleProductDays: 60,
			lowMarginPercent: "10",
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
		expect((await StoreService.settings(other.id)).defaultTaxPercent).toBe("0");
	});

	it("fails loudly for a store that doesn't exist (a broken session, not user input)", async () => {
		await expect(StoreService.profile(crypto.randomUUID())).rejects.toThrow(
			"store of the session not found",
		);
	});
});
