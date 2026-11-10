import { integer, snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { percentColumn, percentRange, timestamps } from "./helpers";

export const stores = snakeCase.table(
	"stores",
	{
		id: uuid().primaryKey().defaultRandom(),
		name: text().notNull(),
		/** CPF or CNPJ, as typed (with the mask). */
		document: text(),
		phone: text(),
		address: text(),
		/** Suggested on every sale; the sale can change it (vendas.md). Zero until the store sets its own. */
		defaultTaxPercent: percentColumn().notNull().default(0),
		mercadoLivreFeePercent: percentColumn().notNull().default(0),
		/** "Perto de vencer" warning, in days (alertas.md). */
		expiryWarningDays: integer().notNull().default(30),
		...timestamps,
	},
	(table) => [
		percentRange("stores_default_tax_percent_range", table.defaultTaxPercent),
		percentRange(
			"stores_mercado_livre_fee_percent_range",
			table.mercadoLivreFeePercent,
		),
	],
);
