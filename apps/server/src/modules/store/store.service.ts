import { eq } from "drizzle-orm";
import { db } from "../../db";
import { stores } from "../../db/schema";
import type { StoreModel } from "./store.model";
import { normalizeProfile } from "./store.rules";

const profileColumns = {
	name: stores.name,
	document: stores.document,
	phone: stores.phone,
	address: stores.address,
};

const settingsColumns = {
	defaultTaxPercent: stores.defaultTaxPercent,
	mercadoLivreFeePercent: stores.mercadoLivreFeePercent,
	expiryWarningDays: stores.expiryWarningDays,
	staleProductDays: stores.staleProductDays,
	lowMarginPercent: stores.lowMarginPercent,
};

/** Postgres keeps `numeric(5,2)` as "12.50"; the API answers "12.5", like the app sends it. */
function toSettings(row: StoreModel["settings"]): StoreModel["settings"] {
	return {
		...row,
		defaultTaxPercent: String(Number(row.defaultTaxPercent)),
		mercadoLivreFeePercent: String(Number(row.mercadoLivreFeePercent)),
		lowMarginPercent: String(Number(row.lowMarginPercent)),
	};
}

/** The one row a query on the session's store must find; its absence is a broken session, not a user error. */
function single<T>(rows: T[]): T {
	const [row] = rows;
	if (!row) throw new Error("store of the session not found");
	return row;
}

/** Data and settings of the session's store (docs/product/acesso-e-loja.md). */
export const StoreService = {
	async profile(storeId: string): Promise<StoreModel["profile"]> {
		return single(
			await db
				.select(profileColumns)
				.from(stores)
				.where(eq(stores.id, storeId)),
		);
	},

	async updateProfile(
		storeId: string,
		input: StoreModel["profile"],
	): Promise<StoreModel["profile"]> {
		const profile = normalizeProfile(input);
		return single(
			await db
				.update(stores)
				.set(profile)
				.where(eq(stores.id, storeId))
				.returning(profileColumns),
		);
	},

	async settings(storeId: string): Promise<StoreModel["settings"]> {
		return toSettings(
			single(
				await db
					.select(settingsColumns)
					.from(stores)
					.where(eq(stores.id, storeId)),
			),
		);
	},

	async updateSettings(
		storeId: string,
		input: StoreModel["settings"],
	): Promise<StoreModel["settings"]> {
		// Field by field, so the update can never reach another column whatever the body carries.
		const {
			defaultTaxPercent,
			mercadoLivreFeePercent,
			expiryWarningDays,
			staleProductDays,
			lowMarginPercent,
		} = input;
		return toSettings(
			single(
				await db
					.update(stores)
					.set({
						defaultTaxPercent,
						mercadoLivreFeePercent,
						expiryWarningDays,
						staleProductDays,
						lowMarginPercent,
					})
					.where(eq(stores.id, storeId))
					.returning(settingsColumns),
			),
		);
	},
};
