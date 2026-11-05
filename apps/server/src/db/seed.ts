import { sql } from "drizzle-orm";
import { type Env, env } from "../env";
import { hashPassword, normalizeEmail } from "../modules/auth/auth.crypto";
import { audited } from "./audit";
import { insertedRow } from "./rows";
import { stores, users } from "./schema";

export type SeedAccount = {
	storeName: string;
	userName: string;
	email: string;
	password: string;
};

/** The first account from `SEED_*`, or `null` when they aren't set (env.ts requires all or none). */
export function seedAccountFromEnv(source: Env = env): SeedAccount | null {
	const {
		SEED_STORE_NAME,
		SEED_USER_NAME,
		SEED_USER_EMAIL,
		SEED_USER_PASSWORD,
	} = source;
	if (
		!(
			SEED_STORE_NAME &&
			SEED_USER_NAME &&
			SEED_USER_EMAIL &&
			SEED_USER_PASSWORD
		)
	)
		return null;
	return {
		storeName: SEED_STORE_NAME,
		userName: SEED_USER_NAME,
		email: SEED_USER_EMAIL,
		password: SEED_USER_PASSWORD,
	};
}

/**
 * Creates the store and its first user while the database has no user at all. There's no sign-up in the app, so this
 * is how the first person gets in; everyone else is created by a signed-in user. Safe to run on every deploy.
 */
export async function seedFirstAccount(
	account: SeedAccount,
): Promise<"created" | "skipped"> {
	const passwordHash = await hashPassword(account.password);
	return audited("system", async (tx) => {
		// Serializes concurrent deploys: only one of them sees an empty table.
		await tx.execute(sql`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`);
		const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
		if (existing) return "skipped";

		const store = insertedRow(
			await tx
				.insert(stores)
				.values({ name: account.storeName })
				.returning({ id: stores.id }),
		);
		await tx.insert(users).values({
			storeId: store.id,
			name: account.userName,
			email: normalizeEmail(account.email),
			passwordHash,
		});
		return "created";
	});
}
