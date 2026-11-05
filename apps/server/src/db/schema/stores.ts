import { integer, numeric, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

/** Percentages from 0 to 100 with two decimals ("12.50"). */
const percent = () => numeric({ precision: 5, scale: 2 });

export const stores = snakeCase.table("stores", {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	/** CPF or CNPJ, as typed (with the mask). */
	document: text(),
	phone: text(),
	address: text(),
	/** Suggested on every sale; the sale can change it (vendas.md). Zero until the store sets its own. */
	defaultTaxPercent: percent().notNull().default("0"),
	mercadoLivreFeePercent: percent().notNull().default("0"),
	/** Alert thresholds, defaults from alertas.md. */
	expiryWarningDays: integer().notNull().default(30),
	staleProductDays: integer().notNull().default(60),
	lowMarginPercent: percent().notNull().default("10"),
	...timestamps,
});
