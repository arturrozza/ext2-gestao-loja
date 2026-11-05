import { integer, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { percentColumn, timestamps } from "./helpers";

export const stores = snakeCase.table("stores", {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	/** CPF or CNPJ, as typed (with the mask). */
	document: text(),
	phone: text(),
	address: text(),
	/** Suggested on every sale; the sale can change it (vendas.md). Zero until the store sets its own. */
	defaultTaxPercent: percentColumn().notNull().default("0"),
	mercadoLivreFeePercent: percentColumn().notNull().default("0"),
	/** Alert thresholds, defaults from alertas.md. */
	expiryWarningDays: integer().notNull().default(30),
	staleProductDays: integer().notNull().default(60),
	lowMarginPercent: percentColumn().notNull().default("10"),
	...timestamps,
});
