/**
 * FAKE BACKEND (MUN-21): the store settings come from the API now, but alerts, products and sales still run on fake
 * data and read them from the fake database. Every fake request first makes sure that copy holds what the API has,
 * so a saved threshold applies everywhere at once, including after the demo switches replace the fake data. Removed
 * in MUN-20.
 */
import { api, request } from "@/lib/api";
import type { StoreSettings } from "@/queries/store/store.types";
import { db, type SettingsRow } from "./fake-db";

/** The last settings the API returned; written over the fake database's on every fake request. */
let latest: SettingsRow | null = null;
let loading: Promise<void> | null = null;

/** Keeps what the API returned (a fetch or a save) for the fake modules. Returns it unchanged for chaining. */
export function mirrorSettings(settings: StoreSettings): StoreSettings {
	latest = {
		defaultTaxPercent: Number(settings.defaultTaxPercent),
		mercadoLivreFeePercent: Number(settings.mercadoLivreFeePercent),
		expiryWarningDays: settings.expiryWarningDays,
		staleProductDays: settings.staleProductDays,
		lowMarginPercent: Number(settings.lowMarginPercent),
	};
	db.current.settings = latest;
	return settings;
}

/**
 * Loads the settings from the API once (again after a failure) and puts them in the fake database. If the API can't be
 * reached the fake request goes on with what it has: it would fail on its own anyway when the real one replaces it.
 */
export async function syncFakeSettings(): Promise<void> {
	if (!latest) {
		loading ??= request(api.store.settings.get())
			.then((settings) => {
				mirrorSettings(settings);
			})
			.catch(() => {
				loading = null;
			});
		await loading;
	}
	if (latest) db.current.settings = latest;
}
