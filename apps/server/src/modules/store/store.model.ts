import { t, type UnwrapSchema } from "elysia";

const optionalText = (maxLength: number) =>
	t.Union([t.Null(), t.String({ maxLength })]);

/** 0 to 100 with at most two decimals, as a decimal string ("12.5"), like the app's `percentField` sends. */
const percent = t.String({
	pattern: "^(100(\\.0{1,2})?|\\d{1,2}(\\.\\d{1,2})?)$",
});

/** Alert periods (docs/decisions.md: 1 to 365 days). */
const days = t.Integer({ minimum: 1, maximum: 365 });

const profile = t.Object({
	name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
	document: optionalText(30),
	phone: optionalText(30),
	address: optionalText(300),
});

const settings = t.Object({
	defaultTaxPercent: percent,
	mercadoLivreFeePercent: percent,
	expiryWarningDays: days,
	staleProductDays: days,
	lowMarginPercent: percent,
});

export const StoreModel = { profile, settings };

export type StoreModel = {
	profile: UnwrapSchema<typeof StoreModel.profile>;
	settings: UnwrapSchema<typeof StoreModel.settings>;
};
