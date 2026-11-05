import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	integer,
	timestamp,
} from "drizzle-orm/pg-core";

/**
 * Money in integer cents (R$ 92,50 = 9250), never `numeric` or float (docs/conventions.md, "Dados"). An `integer`
 * holds up to R$ 21.474.836,47 per value; a total that can outgrow that (sums in reports) is computed as `bigint`.
 */
export const moneyColumn = () => integer();

/** Percentages in basis points, 0 to 10000 (12,5% = 1250). Each table checks the range with a constraint. */
export const percentColumn = () => integer();

/** The constraint that keeps a `percentColumn` between 0% and 100%. */
export const percentRange = (name: string, column: AnyPgColumn) =>
	check(name, sql`${column} between 0 and 10000`);

/** The constraint that keeps a `moneyColumn` above zero. */
export const positiveMoney = (name: string, column: AnyPgColumn) =>
	check(name, sql`${column} > 0`);

export const timestamps = {
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
};
