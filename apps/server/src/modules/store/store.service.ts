import { eq } from "drizzle-orm";
import { db } from "../../db";
import { audited } from "../../db/audit";
import { stores } from "../../db/schema";
import type { AuthSession } from "../auth/auth.model";
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
};

/** The one row a query on the session's store must find; its absence is a broken session, not a user error. */
function single<T>(rows: T[]): T {
	const [row] = rows;
	if (!row) throw new Error("store of the session not found");
	return row;
}

/** Data and settings of the session's store (docs/product/loja.md). */
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
		session: AuthSession,
		input: StoreModel["profile"],
	): Promise<StoreModel["profile"]> {
		const profile = normalizeProfile(input);
		return single(
			await audited(session.user.id, (tx) =>
				tx
					.update(stores)
					.set(profile)
					.where(eq(stores.id, session.store.id))
					.returning(profileColumns),
			),
		);
	},

	async settings(storeId: string): Promise<StoreModel["settings"]> {
		return single(
			await db
				.select(settingsColumns)
				.from(stores)
				.where(eq(stores.id, storeId)),
		);
	},

	async updateSettings(
		session: AuthSession,
		input: StoreModel["settings"],
	): Promise<StoreModel["settings"]> {
		// Field by field, so the update can never reach another column whatever the body carries.
		const { defaultTaxPercent, mercadoLivreFeePercent, expiryWarningDays } =
			input;
		return single(
			await audited(session.user.id, (tx) =>
				tx
					.update(stores)
					.set({
						defaultTaxPercent,
						mercadoLivreFeePercent,
						expiryWarningDays,
					})
					.where(eq(stores.id, session.store.id))
					.returning(settingsColumns),
			),
		);
	},
};
