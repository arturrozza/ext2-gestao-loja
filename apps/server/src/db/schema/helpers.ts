import { numeric, timestamp } from "drizzle-orm/pg-core";

/** Percentages from 0 to 100 with two decimals ("12.50"). */
export const percentColumn = () => numeric({ precision: 5, scale: 2 });

export const timestamps = {
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
};
