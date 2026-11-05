import { index, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { stores } from "./stores";

/** People who sign in. Several per store; the e-mail is unique across the system because login doesn't ask the store. */
export const users = snakeCase.table(
	"users",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		name: text().notNull(),
		/** Always trimmed and lowercased (`normalizeEmail`), so the unique constraint is case-insensitive. */
		email: text().notNull().unique(),
		/** argon2id in PHC format (`Bun.password`). */
		passwordHash: text().notNull(),
		/** Users are deactivated, never deleted (they sign sales and purchases). */
		deactivatedAt: timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [index().on(table.storeId)],
);
