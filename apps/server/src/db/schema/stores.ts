import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const stores = snakeCase.table("stores", {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	...timestamps,
});
