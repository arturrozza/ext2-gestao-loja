import { eq } from "drizzle-orm";
import { db } from "../../db";
import { audited } from "../../db/audit";
import { stores } from "../../db/schema";
import { percentOut } from "../../lib/percent";
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
	staleProductDays: stores.staleProductDays,
	lowMarginPercent: stores.lowMarginPercent,
};

/** Percentages as the app sends them ("12.5", not "12.50"). */
function toSettings(row: StoreModel["settings"]): StoreModel["settings"] {
	return {
		...row,
		defaultTaxPercent: percentOut(row.defaultTaxPercent),
		mercadoLivreFeePercent: percentOut(row.mercadoLivreFeePercent),
		lowMarginPercent: percentOut(row.lowMarginPercent),
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
		session: AuthSession,
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
				await audited(session.user.id, (tx) =>
					tx
						.update(stores)
						.set({
							defaultTaxPercent,
							mercadoLivreFeePercent,
							expiryWarningDays,
							staleProductDays,
							lowMarginPercent,
						})
						.where(eq(stores.id, session.store.id))
						.returning(settingsColumns),
				),
			),
		);
	},
};
