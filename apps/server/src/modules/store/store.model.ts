import { t, type UnwrapSchema } from "elysia";
import { optionalText, percentField } from "../../lib/fields";

/** Expiry warning (docs/product/loja.md: 1 to 365 days). */
const days = t.Integer({ minimum: 1, maximum: 365 });

const profile = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	document: optionalText(30),
	phone: optionalText(30),
	address: optionalText(300),
});

const settings = t.Object({
	defaultTaxPercent: percentField,
	mercadoLivreFeePercent: percentField,
	expiryWarningDays: days,
});

export const StoreModel = { profile, settings };

export type StoreModel = {
	profile: UnwrapSchema<typeof StoreModel.profile>;
	settings: UnwrapSchema<typeof StoreModel.settings>;
};
