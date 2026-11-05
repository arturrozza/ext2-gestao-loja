import {
	snakeCase,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { stores } from "./stores";

/** Store categories: just a name (docs/product/produtos.md). Archived, never deleted. */
export const categories = snakeCase.table(
	"categories",
	{
		id: uuid().primaryKey().defaultRandom(),
		storeId: uuid()
			.notNull()
			.references(() => stores.id),
		name: text().notNull(),
		/** `name` lowercased and without accents (`normalizeSearch`): unique per store, archived ones included. */
		normalizedName: text().notNull(),
		archivedAt: timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [uniqueIndex().on(table.storeId, table.normalizedName)],
);
