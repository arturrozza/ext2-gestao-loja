/** FAKE BACKEND (MUN-21): store data and settings. */
import { db } from "@/queries/fake/fake-db";
import { fakeRequest } from "@/queries/fake/fake-server";
import type { StoreProfile, StoreSettings } from "./store.types";

function settings(): StoreSettings {
	const row = db.current.settings;
	return {
		defaultTaxPercent: String(row.defaultTaxPercent),
		mercadoLivreFeePercent: String(row.mercadoLivreFeePercent),
		expiryWarningDays: row.expiryWarningDays,
		staleProductDays: row.staleProductDays,
		lowMarginPercent: String(row.lowMarginPercent),
	};
}

export const storeFake = {
	profile: () => fakeRequest((): StoreProfile => ({ ...db.current.store })),

	updateProfile: (input: StoreProfile) =>
		fakeRequest(() => {
			db.current.store = { ...input };
			return { ...db.current.store };
		}),

	settings: () => fakeRequest(settings),

	updateSettings: (input: StoreSettings) =>
		fakeRequest(() => {
			db.current.settings = {
				defaultTaxPercent: Number(input.defaultTaxPercent),
				mercadoLivreFeePercent: Number(input.mercadoLivreFeePercent),
				expiryWarningDays: input.expiryWarningDays,
				staleProductDays: input.staleProductDays,
				lowMarginPercent: Number(input.lowMarginPercent),
			};
			return settings();
		}),
};
