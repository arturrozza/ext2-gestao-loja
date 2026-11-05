import {
	boolean,
	index,
	snakeCase,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { users } from "./users";

/**
 * Opaque bearer sessions. Only the SHA-256 of the token is stored, so a leaked table can't be replayed. `expiresAt`
 * slides forward while the session is used (30 days without use ends it).
 */
export const sessions = snakeCase.table(
	"sessions",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: text().notNull().unique(),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		/** Opened with the master password (support), kept for auditing. */
		viaMasterPassword: boolean().notNull().default(false),
		...timestamps,
	},
	(table) => [index().on(table.userId)],
);
